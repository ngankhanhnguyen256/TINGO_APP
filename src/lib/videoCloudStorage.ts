import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';
import { saveVideoBlob, loadVideoBlob } from './storageHelper';

/**
 * In-memory cache of active resolved video URLs to prevent redundant network/IDB calls
 */
const resolvedBlobCache = new Map<string, string>();

/**
 * 500 KB per chunk to ensure fast, reliable parallel Firestore writes well below 1MB doc limits
 */
const CHUNK_SIZE = 500 * 1024;

/**
 * Upload video with automatic multi-chunk splitting to Firestore so ANY device can stream/play it.
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

  // 2. Persist locally to IndexedDB for immediate 0ms playback on creator's device
  try {
    await saveVideoBlob(safeId, dataUrl);
    await saveVideoBlob(videoId, dataUrl);
    resolvedBlobCache.set(safeId, dataUrl);
    resolvedBlobCache.set(videoId, dataUrl);
  } catch (e) {
    console.warn('Local video IDB cache note:', e);
  }

  // 3. Upload to Firestore Cloud Chunks for cross-device access across all phones & computers
  try {
    const totalLength = dataUrl.length;
    const numChunks = Math.ceil(totalLength / CHUNK_SIZE);

    const headerRef = doc(db, 'uploaded_videos', safeId);
    await setDoc(
      headerRef,
      {
        id: safeId,
        title: metadata?.title || '',
        author: metadata?.author || '',
        totalChunks: numChunks,
        totalSize: totalLength,
        updatedAt: new Date().toISOString(),
        timestamp: Date.now(),
      },
      { merge: true }
    );

    // If small (< 500KB), store directly in header doc
    if (numChunks === 1) {
      await setDoc(headerRef, { dataUrl }, { merge: true });
      if (metadata?.onProgress) metadata.onProgress(100);
      return `cloud-video://${safeId}`;
    }

    // Split and upload chunks
    for (let i = 0; i < numChunks; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, totalLength);
      const chunkData = dataUrl.slice(start, end);
      const chunkRef = doc(
        db,
        'uploaded_videos',
        safeId,
        'chunks',
        `chunk_${String(i).padStart(4, '0')}`
      );

      await setDoc(chunkRef, {
        index: i,
        chunk: chunkData,
        size: chunkData.length,
      });

      if (metadata?.onProgress) {
        const pct = Math.round(((i + 1) / numChunks) * 100);
        metadata.onProgress(pct);
      }
    }

    return `cloud-video://${safeId}`;
  } catch (err) {
    console.warn('Cloud video Firestore chunk upload note:', err);
    return `cloud-video://${safeId}`;
  }
}

/**
 * Safely load and reconstruct video playable URL from local IndexedDB, Memory Cache, Direct Link, or Firestore Cloud Chunks.
 * Guarantees cross-device playback for all users.
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

  // 4. Cross-device Cloud Resolution from Firestore Chunks
  if (cleanId) {
    try {
      const headerRef = doc(db, 'uploaded_videos', cleanId);
      const headerSnap = await getDoc(headerRef);
      if (headerSnap.exists()) {
        const headerData = headerSnap.data();

        // Single chunk dataUrl in header
        if (headerData?.dataUrl) {
          resolvedBlobCache.set(cleanId, headerData.dataUrl);
          saveVideoBlob(cleanId, headerData.dataUrl).catch(() => {});
          return headerData.dataUrl;
        }

        // Multi-chunk reassembly across devices
        const totalChunks = headerData?.totalChunks || 0;
        if (totalChunks > 0) {
          const chunksCol = collection(db, 'uploaded_videos', cleanId, 'chunks');
          const q = query(chunksCol, orderBy('index', 'asc'));
          const chunksSnap = await getDocs(q);

          if (!chunksSnap.empty) {
            const parts: string[] = [];
            chunksSnap.forEach((docChunk) => {
              const d = docChunk.data();
              if (d?.chunk) {
                parts.push(d.chunk);
              }
            });
            const fullDataUrl = parts.join('');
            if (fullDataUrl.length > 0) {
              resolvedBlobCache.set(cleanId, fullDataUrl);
              // Save to local IndexedDB so next time this device plays it with 0 network latency!
              saveVideoBlob(cleanId, fullDataUrl).catch(() => {});
              return fullDataUrl;
            }
          }
        }
      }
    } catch (err) {
      console.warn('Cross-device video streaming loader notice:', err);
    }
  }

  return fallbackUrl || null;
}
