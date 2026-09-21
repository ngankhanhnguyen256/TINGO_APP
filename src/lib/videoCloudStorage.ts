import { doc, getDoc, setDoc, collection, getDocs, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { saveVideoBlob, loadVideoBlob } from './storageHelper';

const CHUNK_SIZE = 600 * 1024; // 600KB per Firestore document chunk (well within 1MB limit)

/**
 * Upload a large video data URL (Base64) to Firestore in chunks so any device can stream/load it.
 */
export async function uploadVideoToCloud(
  videoId: string,
  dataUrl: string,
  metadata?: { title?: string; author?: string }
): Promise<string> {
  try {
    // 1. Cache immediately in local IndexedDB for zero-latency playback on the current device
    await saveVideoBlob(videoId, dataUrl);

    // 2. Extract MIME type and raw base64 payload
    const match = dataUrl.match(/^data:([^;]+);base64,(.*)$/s);
    let mimeType = 'video/mp4';
    let base64Data = dataUrl;

    if (match) {
      mimeType = match[1];
      base64Data = match[2];
    }

    const totalLength = base64Data.length;
    const totalChunks = Math.ceil(totalLength / CHUNK_SIZE);

    // Save metadata manifest in Firestore
    const videoDocRef = doc(db, 'uploaded_videos', videoId);
    await setDoc(videoDocRef, {
      id: videoId,
      mimeType,
      totalChunks,
      totalLength,
      title: metadata?.title || '',
      author: metadata?.author || '',
      updatedAt: new Date().toISOString(),
      timestamp: Date.now(),
    });

    // Save chunks in sub-documents
    const batchSize = 10;
    for (let i = 0; i < totalChunks; i += batchSize) {
      const batch = writeBatch(db);
      for (let j = i; j < Math.min(i + batchSize, totalChunks); j++) {
        const start = j * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, totalLength);
        const chunkData = base64Data.substring(start, end);
        const chunkRef = doc(db, 'uploaded_videos', videoId, 'chunks', `chunk_${j.toString().padStart(4, '0')}`);
        batch.set(chunkRef, {
          index: j,
          data: chunkData,
        });
      }
      await batch.commit();
    }

    return `cloud-video://${videoId}`;
  } catch (err) {
    console.error('Failed to upload video to Firestore cloud storage:', err);
    return dataUrl;
  }
}

/**
 * Memory cache of resolved blob URLs to prevent redundant downloads/decodes
 */
const resolvedBlobCache = new Map<string, string>();

/**
 * Load and reconstruct a video Blob URL from local IndexedDB or Firestore cloud chunks
 */
export async function loadVideoFromCloudOrLocal(
  videoIdOrUrl: string
): Promise<string | null> {
  if (!videoIdOrUrl) return null;

  // Direct HTTP/HTTPS or data URL
  if (videoIdOrUrl.startsWith('http://') || videoIdOrUrl.startsWith('https://')) {
    return videoIdOrUrl;
  }

  if (videoIdOrUrl.startsWith('data:video/')) {
    return videoIdOrUrl;
  }

  // Extract pure ID if prefixed with cloud-video://
  const videoId = videoIdOrUrl.replace('cloud-video://', '');

  // Check in-memory cache
  if (resolvedBlobCache.has(videoId)) {
    return resolvedBlobCache.get(videoId)!;
  }

  // 1. Try loading from local IndexedDB cache first
  try {
    const localData = await loadVideoBlob(videoId);
    if (localData) {
      if (localData.startsWith('data:') || localData.startsWith('http')) {
        resolvedBlobCache.set(videoId, localData);
        return localData;
      }
    }
  } catch {
    // continue to cloud fetch
  }

  // 2. Fetch from Firestore uploaded_videos
  try {
    const videoDocRef = doc(db, 'uploaded_videos', videoId);
    const metaSnap = await getDoc(videoDocRef);

    if (!metaSnap.exists()) {
      return null;
    }

    const meta = metaSnap.data();
    const totalChunks = Number(meta.totalChunks || 1);
    const mimeType = meta.mimeType || 'video/mp4';

    // Fetch all chunks
    const chunksColl = collection(db, 'uploaded_videos', videoId, 'chunks');
    const chunksSnap = await getDocs(chunksColl);

    if (chunksSnap.empty) {
      return null;
    }

    const chunkMap: Record<number, string> = {};
    chunksSnap.forEach((d) => {
      const cData = d.data();
      if (typeof cData.index === 'number' && cData.data) {
        chunkMap[cData.index] = cData.data;
      }
    });

    let fullBase64 = '';
    for (let i = 0; i < totalChunks; i++) {
      if (chunkMap[i]) {
        fullBase64 += chunkMap[i];
      }
    }

    if (!fullBase64) return null;

    // Convert base64 to Blob URL for high performance and low memory
    const byteCharacters = atob(fullBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const blobUrl = URL.createObjectURL(blob);

    // Cache locally in IndexedDB for fast subsequent loads
    const dataUrl = `data:${mimeType};base64,${fullBase64}`;
    saveVideoBlob(videoId, dataUrl).catch(() => {});

    resolvedBlobCache.set(videoId, blobUrl);
    return blobUrl;
  } catch (err) {
    console.warn(`Could not load cloud video ${videoId}:`, err);
    return null;
  }
}
