import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { saveVideoBlob, loadVideoBlob } from './storageHelper';

/**
 * Memory cache of active resolved blob URLs
 */
const resolvedBlobCache = new Map<string, string>();

/**
 * Upload or persist video to IndexedDB and optionally sync light metadata
 */
export async function uploadVideoToCloud(
  videoId: string,
  dataUrlOrFile: string | Blob | File,
  metadata?: { title?: string; author?: string }
): Promise<string> {
  try {
    // 1. Always store to local IndexedDB first
    await saveVideoBlob(videoId, dataUrlOrFile);

    if (typeof dataUrlOrFile === 'string' && dataUrlOrFile.startsWith('data:')) {
      if (dataUrlOrFile.length < 500000) {
        try {
          const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');
          const videoDocRef = doc(db, 'uploaded_videos', safeId);
          await setDoc(
            videoDocRef,
            {
              id: safeId,
              dataUrl: dataUrlOrFile,
              title: metadata?.title || '',
              author: metadata?.author || '',
              updatedAt: new Date().toISOString(),
              timestamp: Date.now(),
            },
            { merge: true }
          );
        } catch {
          // Ignore cloud write errors
        }
      }
    }

    return `indexeddb://${videoId}`;
  } catch (err) {
    console.error('Video storage notice:', err);
    return `indexeddb://${videoId}`;
  }
}

/**
 * Safely load and reconstruct a video playable URL from local IndexedDB, Memory Cache, or Direct Link.
 * Completely immune to expired blob URLs and Firestore invalid path crashes.
 */
export async function loadVideoFromCloudOrLocal(
  idOrUrl: string,
  fallbackUrl?: string
): Promise<string | null> {
  if (!idOrUrl && !fallbackUrl) return null;

  // Extract candidate ID
  const rawId = (idOrUrl || '').trim();
  const cleanId = rawId
    .replace('indexeddb://', '')
    .replace('cloud-video://', '')
    .replace('local-video://', '');

  // 1. Check in-memory active cache by cleanId
  if (resolvedBlobCache.has(cleanId)) {
    const cached = resolvedBlobCache.get(cleanId);
    if (cached) return cached;
  }

  // 2. Try loading from persistent IndexedDB by cleanId (Primary & most reliable source)
  try {
    const localData = await loadVideoBlob(cleanId);
    if (localData) {
      resolvedBlobCache.set(cleanId, localData);
      return localData;
    }
  } catch {
    // Continue fallback
  }

  // 3. If id is also stored under rawId
  if (rawId !== cleanId) {
    try {
      const localDataRaw = await loadVideoBlob(rawId);
      if (localDataRaw) {
        resolvedBlobCache.set(cleanId, localDataRaw);
        return localDataRaw;
      }
    } catch {
      // Continue fallback
    }
  }

  // 4. If fallbackUrl or rawId is a valid external URL (HTTP/HTTPS) or Data URL, return directly
  const targetUrl = (fallbackUrl || idOrUrl || '').trim();
  if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('data:video/')) {
    return targetUrl;
  }

  // 5. Check Firestore metadata only if safeId is clean and valid (No slashes or colons)
  const safeId = cleanId.replace(/[^a-zA-Z0-9_-]/g, '');
  if (safeId && !safeId.includes('/') && !safeId.includes(':')) {
    try {
      const videoDocRef = doc(db, 'uploaded_videos', safeId);
      const metaSnap = await getDoc(videoDocRef);
      if (metaSnap.exists()) {
        const meta = metaSnap.data();
        if (meta?.dataUrl) {
          resolvedBlobCache.set(cleanId, meta.dataUrl);
          saveVideoBlob(cleanId, meta.dataUrl).catch(() => {});
          return meta.dataUrl;
        }
      }
    } catch {
      // Ignore cloud query errors
    }
  }

  return null;
}
