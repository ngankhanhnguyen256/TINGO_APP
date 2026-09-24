import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { saveVideoBlob, loadVideoBlob } from './storageHelper';

/**
 * In-memory cache of active resolved video URLs to prevent redundant network/IDB calls
 */
const resolvedBlobCache = new Map<string, string>();

/**
 * Upload video with safe local IndexedDB persistence + lightweight Firestore metadata sync.
 * Prevents Firestore Spark Free Tier quota exhaustion by avoiding large multi-chunk doc flooding.
 */
export async function uploadVideoToCloud(
  videoId: string,
  dataUrlOrFile: string | Blob | File,
  metadata?: {
    title?: string;
    author?: string;
    onProgress?: (pct: number) => void;
  }
): Promise<string> {
  const safeId = videoId.replace(/[^a-zA-Z0-9_-]/g, '_');

  if (metadata?.onProgress) metadata.onProgress(20);

  // 1. Convert to string dataUrl if it is a File or Blob
  let dataUrl = '';
  if (typeof dataUrlOrFile === 'string') {
    dataUrl = dataUrlOrFile;
  } else {
    dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(dataUrlOrFile);
    });
  }

  if (metadata?.onProgress) metadata.onProgress(50);

  // 2. Persist locally to IndexedDB for immediate 0ms playback on this device
  try {
    await saveVideoBlob(safeId, dataUrl);
    await saveVideoBlob(videoId, dataUrl);
    resolvedBlobCache.set(safeId, dataUrl);
    resolvedBlobCache.set(videoId, dataUrl);
  } catch (e) {
    console.warn('Local video IDB cache note:', e);
  }

  if (metadata?.onProgress) metadata.onProgress(80);

  // 3. Lightweight Firestore sync (small videos under 300KB or metadata only to save quota)
  try {
    const totalLength = dataUrl.length;
    const headerRef = doc(db, 'uploaded_videos', safeId);
    
    // Only store dataUrl directly in Firestore if it's very small (< 300KB)
    const canStoreInDoc = totalLength < 300 * 1024;

    await setDoc(
      headerRef,
      {
        id: safeId,
        title: metadata?.title || '',
        author: metadata?.author || 'TINGO Admin',
        totalSize: totalLength,
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
        ...(canStoreInDoc ? { dataUrl } : {}),
      },
      { merge: true }
    );
  } catch (err: any) {
    // Gracefully handle quota exhaustion without crashing
    if (err?.code === 'resource-exhausted' || err?.message?.includes('Quota limit exceeded')) {
      console.warn('Firestore quota reached - video is safely stored locally in IndexedDB.');
    } else {
      console.warn('Cloud video Firestore metadata note:', err);
    }
  }

  if (metadata?.onProgress) metadata.onProgress(100);
  return `cloud-video://${safeId}`;
}

/**
 * Safely load and reconstruct video playable URL from local IndexedDB, Memory Cache, Direct Link, or Firestore.
 */
export async function loadVideoFromCloudOrLocal(
  idOrUrl: string,
  fallbackUrl?: string
): Promise<string | null> {
  if (!idOrUrl && !fallbackUrl) return null;

  const rawId = (idOrUrl || '').trim();
  const cleanId = rawId
    .replace('indexeddb://', '')
    .replace('cloud-video://', '')
    .replace('local-video://', '')
    .replace(/[^a-zA-Z0-9_-]/g, '_');

  // 1. Check in-memory active cache
  if (resolvedBlobCache.has(cleanId)) {
    return resolvedBlobCache.get(cleanId)!;
  }
  if (resolvedBlobCache.has(rawId)) {
    return resolvedBlobCache.get(rawId)!;
  }

  // 2. Check local IndexedDB cache (instant playback)
  try {
    const localData = await loadVideoBlob(cleanId);
    if (localData) {
      resolvedBlobCache.set(cleanId, localData);
      return localData;
    }
  } catch {
    // Continue fallback
  }

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

  // 3. Direct HTTP/HTTPS or direct Data URL
  const targetUrl = (fallbackUrl || idOrUrl || '').trim();
  if (
    targetUrl.startsWith('http://') ||
    targetUrl.startsWith('https://') ||
    targetUrl.startsWith('data:video/')
  ) {
    return targetUrl;
  }

  // 4. Cloud Resolution from Firestore (if small video was stored)
  if (cleanId) {
    try {
      const headerRef = doc(db, 'uploaded_videos', cleanId);
      const headerSnap = await getDoc(headerRef);
      if (headerSnap.exists()) {
        const headerData = headerSnap.data();
        if (headerData?.dataUrl) {
          resolvedBlobCache.set(cleanId, headerData.dataUrl);
          saveVideoBlob(cleanId, headerData.dataUrl).catch(() => {});
          return headerData.dataUrl;
        }
      }
    } catch (err: any) {
      if (err?.code === 'resource-exhausted') {
        console.warn('Firestore quota reached during video load - continuing with fallback.');
      }
    }
  }

  return fallbackUrl || null;
}
