import { CartItem } from '../types';
import { db } from '../lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { sanitizeFirestoreData } from './sanitizeFirestore';

const CART_STORAGE_KEY = 'tingo_cart_items_storage';
const CART_COOKIE_NAME = 'tingo_cart_cookie';

/**
 * Helper to set cookie with standard SameSite and path
 */
export function setCookie(name: string, value: string, days = 30) {
  try {
    if (typeof document === 'undefined') return;
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn('Set cookie error:', e);
  }
}

/**
 * Helper to read cookie by name
 */
export function getCookie(name: string): string | null {
  try {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

/**
 * Helper to delete cookie by name
 */
export function deleteCookie(name: string) {
  try {
    if (typeof document === 'undefined') return;
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
  } catch (e) {
    console.warn('Delete cookie error:', e);
  }
}

/**
 * Load cart items from LocalStorage or Cookie fallback
 */
export function loadStoredCart(): CartItem[] {
  try {
    // 1. Try LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(CART_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    }

    // 2. Try Cookie fallback
    const cookieRaw = getCookie(CART_COOKIE_NAME);
    if (cookieRaw) {
      const parsed = JSON.parse(cookieRaw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Also restore to localStorage
        try {
          localStorage.setItem(CART_STORAGE_KEY, cookieRaw);
        } catch {
          // ignore
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Failed to load stored cart:', err);
  }
  return [];
}

/**
 * Save cart items to both LocalStorage and Cookie
 */
export function saveStoredCart(items: CartItem[], customerPhone?: string) {
  try {
    const jsonStr = JSON.stringify(items);

    // 1. Save to LocalStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(CART_STORAGE_KEY, jsonStr);
    }

    // 2. Save to Cookie (persists across reloads & sessions for 30 days)
    setCookie(CART_COOKIE_NAME, jsonStr, 30);

    // 3. If customer is logged in, sync to Firestore for cross-device persistence
    if (customerPhone) {
      const cleanPhone = customerPhone.trim().replace(/[\s.-]/g, '');
      if (cleanPhone) {
        try {
          const docRef = doc(db, 'customers', cleanPhone);
          updateDoc(docRef, sanitizeFirestoreData({ savedCart: items })).catch(() => {});
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('Failed to save stored cart:', err);
  }
}

/**
 * Clear cart storage completely (called ONLY on explicit user logout or checkout clear)
 */
export function clearCartStorage(customerPhone?: string) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.removeItem(CART_STORAGE_KEY);
    }
    deleteCookie(CART_COOKIE_NAME);

    if (customerPhone) {
      const cleanPhone = customerPhone.trim().replace(/[\s.-]/g, '');
      if (cleanPhone) {
        try {
          const docRef = doc(db, 'customers', cleanPhone);
          updateDoc(docRef, { savedCart: [] }).catch(() => {});
        } catch {
          // ignore
        }
      }
    }
  } catch (err) {
    console.warn('Failed to clear cart storage:', err);
  }
}

/**
 * Sync cart from Firestore for a logged in customer
 */
export async function fetchCustomerCloudCart(phone: string): Promise<CartItem[] | null> {
  const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
  if (!cleanPhone) return null;
  try {
    const snap = await getDoc(doc(db, 'customers', cleanPhone));
    if (snap.exists()) {
      const data = snap.data();
      if (Array.isArray(data.savedCart) && data.savedCart.length > 0) {
        return data.savedCart as CartItem[];
      }
    }
  } catch (e) {
    console.warn('Cloud cart fetch note:', e);
  }
  return null;
}
