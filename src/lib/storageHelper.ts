import { LandingPageConfig } from '../types';

const DB_NAME = 'tingo_store_db';
const DB_VERSION = 1;
const STORE_NAME = 'app_config';

/**
 * Open or initialize IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save data to IndexedDB (No 5MB quota limit)
 */
export async function saveToIndexedDB(key: string, value: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(value, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('IndexedDB save notice:', err);
  }
}

/**
 * Read data from IndexedDB
 */
export async function loadFromIndexedDB(key: string): Promise<string | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/**
 * Compress an image file or Base64 string to a compact WebP/JPEG (max width/height 800px, quality 0.8)
 * Shrinks 5MB-10MB files down to 30KB-80KB.
 */
export function compressImage(
  imageSource: string | File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    const processImage = (src: string) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(src);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        try {
          // Prefer webp for super compact size, fallback to jpeg
          let compressed = canvas.toDataURL('image/webp', quality);
          if (!compressed.startsWith('data:image/webp')) {
            compressed = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(compressed);
        } catch {
          resolve(src);
        }
      };
      img.onerror = () => resolve(src);
      img.src = src;
    };

    if (typeof imageSource === 'string') {
      processImage(imageSource);
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const res = e.target?.result as string;
        if (res) processImage(res);
        else reject(new Error('Failed to read file'));
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(imageSource);
    }
  });
}

/**
 * Sanitize all bloated Base64 images inside a LandingPageConfig to compact versions (< 60KB each)
 */
export async function sanitizeConfigImages(config: LandingPageConfig): Promise<LandingPageConfig> {
  const newConfig = JSON.parse(JSON.stringify(config)) as LandingPageConfig;

  const sanitizeImageStr = async (imgStr?: string): Promise<string | undefined> => {
    if (!imgStr) return imgStr;
    // If it's a huge base64 string (> 80KB)
    if (imgStr.startsWith('data:image/') && imgStr.length > 80000) {
      try {
        return await compressImage(imgStr, 800, 800, 0.78);
      } catch {
        return imgStr;
      }
    }
    return imgStr;
  };

  if (Array.isArray(newConfig.hero?.slides)) {
    for (const slide of newConfig.hero.slides) {
      if (slide.imageKey) {
        slide.imageKey = (await sanitizeImageStr(slide.imageKey)) || slide.imageKey;
      }
    }
  }

  if (Array.isArray(newConfig.products)) {
    for (const p of newConfig.products) {
      if (p.image) {
        p.image = (await sanitizeImageStr(p.image)) || p.image;
      }
    }
  }

  if (Array.isArray(newConfig.testimonials)) {
    for (const t of newConfig.testimonials) {
      if (t.avatar) {
        t.avatar = (await sanitizeImageStr(t.avatar)) || t.avatar;
      }
    }
  }

  if (Array.isArray(newConfig.articles)) {
    for (const a of newConfig.articles) {
      if (a.image) {
        a.image = (await sanitizeImageStr(a.image)) || a.image;
      }
    }
  }

  if (Array.isArray(newConfig.customBlocks)) {
    for (const b of newConfig.customBlocks) {
      if (b.image) {
        b.image = (await sanitizeImageStr(b.image)) || b.image;
      }
    }
  }

  return newConfig;
}
