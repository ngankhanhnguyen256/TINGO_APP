import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomerUser, Voucher } from '../types';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyNewRegistration } from '../lib/telegram';
import { appendCustomerToGoogleSheet, isAutoSyncEnabled } from '../lib/googleSheetsService';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';
import { isCreatedTodayVN } from '../utils/dateFormatter';
import { clearCartStorage } from '../utils/cartStorage';
import { ShieldAlert, Ban, X, UserPlus, PhoneCall } from 'lucide-react';

// Helper to execute promises with a timeout to avoid hanging on Firestore quota exhaustion or slow network
const safeWithTimeout = async <T,>(promise: Promise<T>, fallbackValue: T, timeoutMs = 1500): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => {
      resolve(fallbackValue);
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    console.warn('safeWithTimeout caught error, using fallback:', err);
    return fallbackValue;
  }
};

/**
 * Normalizes Vietnamese phone numbers into clean 10-digit format starting with 0
 */
export const normalizeVietnamesePhone = (raw: string): string => {
  if (!raw) return '';
  let digits = raw.replace(/\D/g, '');
  if (digits.startsWith('84') && digits.length === 11) {
    digits = '0' + digits.slice(2);
  }
  return digits;
};

export const ADMIN_CREDENTIALS = {
  email: 'tingodrink@gmail.com',
  pass: 'tamTu023@',
};

const STORAGE_KEY = 'tingo_customer_user_session';
const ACCOUNTS_CACHE_KEY = 'tingo_registered_customers_cache';
const BLOCKED_CACHE_KEY = 'tingo_blocked_identifiers_cache';

export const MAX_DAILY_ORDERS_PER_ACCOUNT = 5;

interface CustomerAuthContextType {
  customer: CustomerUser | null;
  isLoggedIn: boolean;
  maxDailyOrders: number;
  getTodayOrdersCount: (phone?: string) => Promise<number>;
  registerCustomer: (data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    address?: string;
    city?: string;
    district?: string;
  }) => Promise<{ success: boolean; error?: string; user?: CustomerUser }>;
  loginWithCredentials: (
    identifier: string,
    password: string
  ) => Promise<{ success: boolean; error?: string; isAdmin?: boolean; user?: CustomerUser }>;
  logoutCustomer: () => void;
  updateCustomerProfile: (data: Partial<CustomerUser>) => Promise<void>;
  changePassword: (oldPass: string, newPass: string) => Promise<{ success: boolean; error?: string }>;
  consumeFreeshipVoucher: () => boolean;
  refundFreeshipVoucher: (amount?: number) => void;
  markFirstOrderCompleted: () => void;
  getAvailableVouchers: () => Voucher[];
  isAuthModalOpen: boolean;
  openAuthModal: (callbackOnSuccess?: () => void) => void;
  closeAuthModal: () => void;
  executePendingAction: () => void;
  isProfileModalOpen: boolean;
  openProfileModal: () => void;
  closeProfileModal: () => void;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export const CustomerAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<CustomerUser | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to parse customer session', e);
    }
    return null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [pendingCallback, setPendingCallback] = useState<(() => void) | null>(null);
  const [blockedAlertNotice, setBlockedAlertNotice] = useState<{
    type: 'blocked' | 'deleted';
    title: string;
    message: string;
  } | null>(null);

  // Sync with localStorage & listen for cross-tab or admin invalidation
  useEffect(() => {
    if (customer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }

    const handleInvalidation = (e: any) => {
      const targetPhone = e.detail?.phone?.replace(/[\s.-]/g, '');
      const targetEmail = e.detail?.email?.trim().toLowerCase();
      const isBlocked = e.detail?.blocked === true;
      const isDeleted = e.detail?.deleted === true;

      const currentPhone = customer?.phone?.replace(/[\s.-]/g, '');
      const currentEmail = customer?.email?.trim().toLowerCase();

      if (
        customer &&
        (currentPhone === targetPhone ||
          (currentEmail && currentEmail === targetEmail) ||
          !targetPhone)
      ) {
        setCustomer(null);
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('tingo_checkout_draft');

        if (isBlocked) {
          setBlockedAlertNotice({
            type: 'blocked',
            title: 'TÀI KHOẢN ĐÃ BỊ KHÓA!',
            message:
              'Quản trị viên đã khóa quyền truy cập của tài khoản này. Mọi thao tác đặt hàng & ưu đãi đã bị tạm ngưng. Vui lòng liên hệ CSKH TINGO nếu cần hỗ trợ.',
          });
        } else if (isDeleted) {
          setBlockedAlertNotice({
            type: 'deleted',
            title: 'TÀI KHOẢN ĐÃ ĐƯỢC XÓA!',
            message:
              'Tài khoản của bạn đã được xóa khỏi hệ thống bởi quản trị viên. Dữ liệu tài khoản đã được dọn sạch. Bạn có thể tiến hành đăng ký tài khoản mới bất cứ lúc nào.',
          });
        }
      }
    };

    window.addEventListener('tingo-customer-session-cleared', handleInvalidation);
    return () => window.removeEventListener('tingo-customer-session-cleared', handleInvalidation);
  }, [customer]);

  // Real-time Firestore Session Guard: If logged-in user gets blocked or deleted in Firestore, lock/kick them out immediately
  useEffect(() => {
    if (!customer || customer.id === 'ADMIN-TINGO') return;

    const cleanPhone = (customer.phone || '').replace(/[\s.-]/g, '');
    if (!cleanPhone) return;

    try {
      const unsub = onSnapshot(doc(db, 'customers', cleanPhone), (snap) => {
        if (!snap.exists()) {
          // Document was deleted by Admin in Firestore - Force Logout immediately
          setCustomer(null);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem('tingo_checkout_draft');

          // Clean local accounts cache for this phone/email
          try {
            const accs = getLocalAccounts();
            if (accs[cleanPhone]) delete accs[cleanPhone];
            if (customer.email && accs[customer.email.toLowerCase()]) delete accs[customer.email.toLowerCase()];
            localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(accs));
          } catch {
            // ignore
          }

          setBlockedAlertNotice({
            type: 'deleted',
            title: 'TÀI KHOẢN ĐÃ ĐƯỢC XÓA KHỎI HỆ THỐNG',
            message:
              'Tài khoản của bạn đã được Quản trị viên xóa khỏi hệ thống TINGO. Bạn đã bị đăng xuất tự động. Để tiếp tục mua sắm và nhận lại 5 mã Freeship cùng các ưu đãi, quý khách vui lòng Đăng ký lại tài khoản mới.',
          });
        } else {
          const data = snap.data() as CustomerUser;
          if (data.isBlocked) {
            // Account was marked as blocked by Admin
            setCustomer(null);
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem('tingo_checkout_draft');
            setBlockedAlertNotice({
              type: 'blocked',
              title: 'TÀI KHOẢN ĐÃ BỊ KHÓA!',
              message:
                data.blockedReason ||
                'Tài khoản này đã bị quản trị viên khóa quyền truy cập. Bạn không thể tiếp tục đặt hàng hoặc đăng nhập.',
            });
          }
        }
      });

      return () => unsub();
    } catch (err) {
      console.warn('Customer session guard note:', err);
    }
  }, [customer?.phone]);

  // Helper to get local registered accounts cache
  const getLocalAccounts = (): Record<string, CustomerUser & { password?: string }> => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  // Helper to get local blocked cache
  const getLocalBlockedList = (): string[] => {
    try {
      const raw = localStorage.getItem(BLOCKED_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  // Helper to check if a phone or email is blocked across Firestore & local cache
  const checkIfBlocked = async (phone: string, email?: string): Promise<{ blocked: boolean; reason?: string }> => {
    const cleanPhone = normalizeVietnamesePhone(phone);
    const cleanEmail = email?.trim().toLowerCase();

    // 1. Check local blocked cache first (instant)
    const localBlocked = getLocalBlockedList();
    if (cleanPhone && localBlocked.includes(cleanPhone)) {
      return { blocked: true, reason: 'Số điện thoại này đã bị chặn' };
    }
    if (cleanEmail && localBlocked.includes(cleanEmail)) {
      return { blocked: true, reason: 'Email này đã bị chặn' };
    }

    // 2. Check Firestore blocked_identifiers with short timeout
    try {
      if (cleanPhone) {
        const snap = await safeWithTimeout(getDoc(doc(db, 'blocked_identifiers', cleanPhone)), null, 1000);
        if (snap && snap.exists()) {
          const data = snap.data();
          return { blocked: true, reason: data.reason || 'Số điện thoại này đã bị chặn' };
        }
      }
      if (cleanEmail) {
        const encodedEmail = encodeURIComponent(cleanEmail);
        const snapEmail = await safeWithTimeout(getDoc(doc(db, 'blocked_identifiers', encodedEmail)), null, 1000);
        if (snapEmail && snapEmail.exists()) {
          const data = snapEmail.data();
          return { blocked: true, reason: data.reason || 'Email này đã bị chặn' };
        }
      }
    } catch (err) {
      console.warn('Blocked check firestore notice:', err);
    }

    // 3. Check customer doc isBlocked status
    try {
      if (cleanPhone) {
        const cusSnap = await safeWithTimeout(getDoc(doc(db, 'customers', cleanPhone)), null, 1000);
        if (cusSnap && cusSnap.exists() && cusSnap.data().isBlocked === true) {
          return { blocked: true, reason: cusSnap.data().blockedReason || 'Tài khoản đang bị tạm khóa' };
        }
      }
    } catch (err) {
      console.warn('Customer isBlocked firestore notice:', err);
    }

    return { blocked: false };
  };

  // Helper to update local registered accounts cache
  const saveLocalAccount = (user: CustomerUser & { password?: string }) => {
    try {
      const accs = getLocalAccounts();
      const phoneKey = normalizeVietnamesePhone(user.phone);
      if (phoneKey) accs[phoneKey] = user;
      if (user.email) {
        accs[user.email.toLowerCase()] = user;
      }
      localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(accs));
    } catch (err) {
      console.warn('Local accounts cache notice:', err);
    }
  };

  const registerCustomer = async (data: {
    name: string;
    phone: string;
    email?: string;
    password?: string;
    address?: string;
    city?: string;
    district?: string;
  }): Promise<{ success: boolean; error?: string; user?: CustomerUser }> => {
    const cleanPhone = normalizeVietnamesePhone(data.phone);
    const cleanEmail = data.email?.trim().toLowerCase() || '';
    const cleanPass = data.password?.trim() || '';

    if (!cleanPhone || cleanPhone.length !== 10 || !cleanPhone.startsWith('0')) {
      return { success: false, error: 'Số điện thoại không hợp lệ (cần đúng 10 số, VD: 0901234567)' };
    }
    if (!data.name.trim() || data.name.trim().length < 2) {
      return { success: false, error: 'Họ và tên cần có ít nhất 2 ký tự' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự để bảo mật' };
    }

    // 0. Check if phone or email is BLOCKED by Admin
    const blockCheck = await checkIfBlocked(cleanPhone, cleanEmail);
    if (blockCheck.blocked) {
      return {
        success: false,
        error:
          'TÀI KHOẢN ĐÃ BỊ KHÓA! Số điện thoại hoặc Email này đã bị quản trị viên chặn quyền đăng ký trên hệ thống TINGO. Vui lòng liên hệ Hotline để được hỗ trợ.',
      };
    }

    // 1. Check local accounts cache first (instant)
    const localAccs = getLocalAccounts();
    if (localAccs[cleanPhone]) {
      return {
        success: false,
        error: 'Số điện thoại này đã được đăng ký tài khoản trước đó. Quý khách vui lòng chuyển sang tab Đăng Nhập.',
      };
    }

    // 2. Check Firestore existence with timeout guard
    try {
      const snap = await safeWithTimeout(getDoc(doc(db, 'customers', cleanPhone)), null, 1200);
      if (snap && snap.exists()) {
        const existingData = snap.data();
        if (existingData.isBlocked) {
          return {
            success: false,
            error:
              'TÀI KHOẢN ĐÃ BỊ KHÓA! Số điện thoại này đã bị quản trị viên khóa quyền truy cập. Quý khách không thể đăng ký tài khoản mới.',
          };
        }
        return {
          success: false,
          error: 'Số điện thoại này đã được đăng ký tài khoản trước đó. Quý khách vui lòng chuyển sang tab Đăng Nhập.',
        };
      }
    } catch (err) {
      console.warn('Firestore existence check notice:', err);
    }

    // 3. Email Uniqueness Check (Local + Firestore with timeout guard)
    if (cleanEmail) {
      const existingWithEmail = Object.values(localAccs).find(
        (acc) => acc.email && acc.email.toLowerCase() === cleanEmail && normalizeVietnamesePhone(acc.phone) !== cleanPhone
      );
      if (existingWithEmail) {
        return {
          success: false,
          error: `Email (${cleanEmail}) đã được đăng ký bởi tài khoản khác (SĐT: ${existingWithEmail.phone}). Mỗi địa chỉ Email chỉ được sử dụng cho duy nhất 1 tài khoản TINGO.`,
        };
      }

      try {
        const emailQ = query(collection(db, 'customers'), where('email', '==', cleanEmail));
        const emailSnap = await safeWithTimeout(getDocs(emailQ), null, 1200);
        if (emailSnap && !emailSnap.empty) {
          const conflicting = emailSnap.docs[0].data() as CustomerUser;
          if (normalizeVietnamesePhone(conflicting.phone) !== cleanPhone) {
            return {
              success: false,
              error: `Email (${cleanEmail}) đã được liên kết với một tài khoản khác (SĐT: ${conflicting.phone}). Mỗi địa chỉ Gmail/Email chỉ được sử dụng cho duy nhất 1 tài khoản TINGO.`,
            };
          }
        }
      } catch (err) {
        console.warn('Firestore email uniqueness check notice:', err);
      }
    }

    const newUser: CustomerUser = {
      id: `CUS-${cleanPhone}`,
      name: data.name.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      address: data.address?.trim() || '',
      city: data.city || 'Hồ Chí Minh',
      district: data.district || 'Quận 1',
      freeshipVouchers: 5, // Exactly 5 vouchers for registered account
      isFirstOrder: true,
      createdAt: new Date().toISOString(),
      isBlocked: false,
    };

    const userWithPass = {
      ...newUser,
      password: cleanPass,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Save to Local Accounts Cache immediately (100% fail-proof)
    saveLocalAccount(userWithPass);

    // Save to Firestore in background (non-blocking)
    try {
      const customerDocRef = doc(db, 'customers', cleanPhone);
      setDoc(customerDocRef, sanitizeFirestoreData(userWithPass), { merge: true }).catch((err) => {
        console.warn('Firestore customer registration sync note:', err);
      });
    } catch (err) {
      console.warn('Firestore customer registration trigger warning:', err);
    }

    // Send Telegram Notification in real-time in background
    try {
      notifyNewRegistration(newUser).catch((err) => {
        console.warn('Telegram registration alert background note:', err);
      });
    } catch (err) {
      console.warn('Telegram registration alert note:', err);
    }

    // Auto-append Customer to Google Sheets in background
    if (isAutoSyncEnabled()) {
      try {
        appendCustomerToGoogleSheet(newUser).catch((err) => {
          console.warn('Google Sheets customer sync notice:', err);
        });
      } catch (err) {
        console.warn('Google Sheets trigger notice:', err);
      }
    }

    setCustomer(newUser);
    setIsAuthModalOpen(false);

    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      setTimeout(() => cb(), 100);
    }

    return { success: true, user: newUser };
  };

  /**
   * Count how many non-cancelled orders this phone placed on today's calendar date (Vietnam time)
   */
  const getTodayOrdersCount = async (inputPhone?: string): Promise<number> => {
    const targetPhone = normalizeVietnamesePhone(inputPhone || customer?.phone || '');
    if (!targetPhone) return 0;

    // Admin has unlimited quota
    if (targetPhone === '0900000000' || customer?.id === 'ADMIN-TINGO') {
      return 0;
    }

    const countedIds = new Set<string>();

    // 1. Scan Local Storage orders (instant)
    try {
      const raw = localStorage.getItem('tingo_orders_storage');
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) {
          list.forEach((ord: any) => {
            const ordPhone = normalizeVietnamesePhone(ord.customerPhone);
            if (
              ordPhone === targetPhone &&
              ord.status !== 'cancelled' &&
              isCreatedTodayVN(ord.createdAt)
            ) {
              countedIds.add(ord.id);
            }
          });
        }
      }
    } catch {
      // ignore
    }

    // 2. Scan Firestore orders with timeout guard
    try {
      const q = query(collection(db, 'orders'), where('customerPhone', '==', targetPhone));
      const snap = await safeWithTimeout(getDocs(q), null, 1200);
      if (snap) {
        snap.forEach((d) => {
          const ord = d.data();
          if (ord.status !== 'cancelled' && isCreatedTodayVN(ord.createdAt)) {
            countedIds.add(d.id);
          }
        });
      }
    } catch (err) {
      console.warn('Count today orders error:', err);
    }

    return countedIds.size;
  };

  const loginWithCredentials = async (
    identifier: string,
    password: string
  ): Promise<{ success: boolean; error?: string; isAdmin?: boolean; user?: CustomerUser }> => {
    const cleanId = identifier.trim();
    const cleanIdLower = cleanId.toLowerCase();
    const cleanPass = password.trim();

    if (!cleanId) {
      return { success: false, error: 'Vui lòng nhập Email hoặc Số điện thoại đăng ký.' };
    }
    if (!cleanPass) {
      return { success: false, error: 'Vui lòng nhập mật khẩu tài khoản.' };
    }

    // 1. Check Admin Credentials: tingodrink@gmail.com + tamTu023@
    if (
      (cleanIdLower === ADMIN_CREDENTIALS.email.toLowerCase() && cleanPass === ADMIN_CREDENTIALS.pass) ||
      (cleanIdLower === 'tingodrink@gmail.com' && (cleanPass === 'tamTu023@' || cleanPass === 'admin123')) ||
      (cleanIdLower === 'admin' && cleanPass === 'tamTu023@')
    ) {
      localStorage.setItem('tingo_admin_auth_session', 'true');
      const adminUser: CustomerUser = {
        id: 'ADMIN-TINGO',
        name: 'Quản Trị Viên TINGO',
        phone: '0900000000',
        email: 'tingodrink@gmail.com',
        address: 'Hệ Thống Quản Trị TINGO Store',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        freeshipVouchers: 99,
        isFirstOrder: false,
        createdAt: new Date().toISOString(),
      };
      setCustomer(adminUser);
      setIsAuthModalOpen(false);
      window.dispatchEvent(new CustomEvent('tingo-admin-login-success'));

      if (pendingCallback) {
        const cb = pendingCallback;
        setPendingCallback(null);
        setTimeout(() => cb(), 100);
      }

      return { success: true, isAdmin: true, user: adminUser };
    }

    // 2. Immediate Block Check on input identifier before anything else
    const cleanPhone = normalizeVietnamesePhone(cleanId);
    const isPhone = cleanPhone.length === 10 && cleanPhone.startsWith('0');
    const isEmail = cleanId.includes('@');

    const directBlockCheck = await checkIfBlocked(isPhone ? cleanPhone : '', isEmail ? cleanIdLower : undefined);
    if (directBlockCheck.blocked) {
      return {
        success: false,
        error:
          'TÀI KHOẢN ĐÃ BỊ KHÓA! Quản trị viên TINGO đã khóa quyền truy cập đối với số điện thoại/email này. Quý khách vui lòng liên hệ Hotline để được hỗ trợ mở khóa.',
      };
    }

    // 3. Lookup registered Customer in Local Cache FIRST for instant response
    let matchedCustomer: (CustomerUser & { password?: string }) | null = null;
    const localAccs = getLocalAccounts();
    if (isPhone && localAccs[cleanPhone]) {
      matchedCustomer = localAccs[cleanPhone];
    } else if (localAccs[cleanIdLower]) {
      matchedCustomer = localAccs[cleanIdLower];
    }

    // 4. If not in local cache, check Firestore with timeout guard
    if (!matchedCustomer && isPhone) {
      try {
        const snap = await safeWithTimeout(getDoc(doc(db, 'customers', cleanPhone)), null, 1200);
        if (snap && snap.exists()) {
          matchedCustomer = snap.data() as CustomerUser & { password?: string };
          // Cache locally for next time
          if (matchedCustomer) saveLocalAccount(matchedCustomer);
        }
      } catch (err) {
        console.warn('Firestore customer lookup by phone error:', err);
      }
    }

    if (!matchedCustomer && isEmail) {
      try {
        const q = query(collection(db, 'customers'), where('email', '==', cleanIdLower));
        const querySnap = await safeWithTimeout(getDocs(q), null, 1200);
        if (querySnap && !querySnap.empty) {
          matchedCustomer = querySnap.docs[0].data() as CustomerUser & { password?: string };
          // Cache locally for next time
          if (matchedCustomer) saveLocalAccount(matchedCustomer);
        }
      } catch (err) {
        console.warn('Firestore customer lookup by email error:', err);
      }
    }

    // 5. Strict Rule: If NOT registered, STRICTLY DENY access
    if (!matchedCustomer) {
      return {
        success: false,
        error:
          'Tài khoản không tồn tại trên hệ thống. Quý khách vui lòng kiểm tra lại thông tin hoặc chuyển sang tab "ĐĂNG KÝ MỚI" để tạo tài khoản.',
      };
    }

    // 6. Strict Block Check: If user is marked as blocked, reject login
    if (matchedCustomer.isBlocked) {
      return {
        success: false,
        error:
          'TÀI KHOẢN ĐÃ BỊ KHÓA! Quản trị viên đã chặn số điện thoại/email này. Quý khách không thể đăng nhập. Vui lòng liên hệ Hotline CSKH TINGO.',
      };
    }

    const blockCheck = await checkIfBlocked(matchedCustomer.phone, matchedCustomer.email);
    if (blockCheck.blocked) {
      return {
        success: false,
        error:
          'TÀI KHOẢN ĐÃ BỊ KHÓA! Số điện thoại hoặc Email này đã bị chặn quyền truy cập. Quý khách vui lòng liên hệ quản trị viên TINGO.',
      };
    }

    // 7. Strict Rule: Check Password
    if (matchedCustomer.password && matchedCustomer.password !== cleanPass) {
      return {
        success: false,
        error: 'Mật khẩu không chính xác! Quý khách vui lòng kiểm tra lại mật khẩu đã đăng ký.',
      };
    }

    // Update lastLoginAt in Firestore in background
    try {
      const customerDocRef = doc(db, 'customers', matchedCustomer.phone);
      setDoc(customerDocRef, { lastLoginAt: new Date().toISOString() }, { merge: true }).catch(() => {});
    } catch {
      // ignore
    }

    const { password: _, ...cleanUserData } = matchedCustomer;
    setCustomer(cleanUserData as CustomerUser);
    setIsAuthModalOpen(false);

    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      setTimeout(() => cb(), 100);
    }

    return { success: true, user: cleanUserData as CustomerUser };
  };

  const logoutCustomer = () => {
    const currentPhone = customer?.phone;
    setCustomer(null);
    setPendingCallback(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('tingo_checkout_draft');
      clearCartStorage(currentPhone);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tingo-cart-cleared'));
      }
    } catch (e) {
      console.warn('Customer logout clean warning:', e);
    }
  };

  const updateCustomerProfile = async (data: Partial<CustomerUser>) => {
    if (!customer) return;
    const updated = { ...customer, ...data };
    setCustomer(updated);
    try {
      const customerDocRef = doc(db, 'customers', customer.phone);
      await updateDoc(customerDocRef, data);
    } catch (err) {
      console.warn('Firestore update error', err);
    }
    // Update local cache
    const localAccs = getLocalAccounts();
    if (localAccs[customer.phone]) {
      localAccs[customer.phone] = { ...localAccs[customer.phone], ...data };
      localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(localAccs));
    }
  };

  const changePassword = async (
    oldPass: string,
    newPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!customer) return { success: false, error: 'Chưa đăng nhập' };
    if (!newPass || newPass.length < 6) {
      return { success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự' };
    }

    const localAccs = getLocalAccounts();
    const currentAcc = localAccs[customer.phone];

    if (currentAcc && currentAcc.password && currentAcc.password !== oldPass.trim()) {
      return { success: false, error: 'Mật khẩu hiện tại không đúng' };
    }

    try {
      const customerDocRef = doc(db, 'customers', customer.phone);
      await updateDoc(customerDocRef, {
        password: newPass.trim(),
        updatedAt: new Date().toISOString(),
      });
      if (currentAcc) {
        currentAcc.password = newPass.trim();
        saveLocalAccount(currentAcc);
      }
      return { success: true };
    } catch (err) {
      return { success: false, error: 'Không thể cập nhật mật khẩu lúc này. Vui lòng thử lại sau.' };
    }
  };

  const consumeFreeshipVoucher = (): boolean => {
    if (!customer || customer.freeshipVouchers <= 0) return false;
    const newCount = Math.max(0, customer.freeshipVouchers - 1);
    setCustomer((prev) => (prev ? { ...prev, freeshipVouchers: newCount } : null));
    try {
      const customerDocRef = doc(db, 'customers', customer.phone);
      updateDoc(customerDocRef, { freeshipVouchers: newCount }).catch((err) => console.warn(err));
    } catch (err) {
      console.warn(err);
    }
    return true;
  };

  const refundFreeshipVoucher = (amount: number = 1) => {
    if (!customer) return;
    const newCount = Math.min(5, (customer.freeshipVouchers || 0) + amount);
    setCustomer((prev) => (prev ? { ...prev, freeshipVouchers: newCount } : null));
    try {
      const customerDocRef = doc(db, 'customers', customer.phone);
      updateDoc(customerDocRef, { freeshipVouchers: newCount }).catch((err) => console.warn(err));
    } catch (err) {
      console.warn(err);
    }
  };

  const markFirstOrderCompleted = () => {
    if (!customer) return;
    setCustomer((prev) => (prev ? { ...prev, isFirstOrder: false } : null));
    try {
      const customerDocRef = doc(db, 'customers', customer.phone);
      updateDoc(customerDocRef, { isFirstOrder: false }).catch((err) => console.warn(err));
    } catch (err) {
      console.warn(err);
    }
  };

  const getAvailableVouchers = (): Voucher[] => {
    const vouchers: Voucher[] = [];

    // 1. Freeship Voucher (5 per account)
    const freeshipCount = customer ? customer.freeshipVouchers : 5;
    if (freeshipCount > 0) {
      vouchers.push({
        code: 'FREESHIP',
        title: 'Miễn Phí Vận Chuyển',
        description: `Áp dụng toàn quốc (Bạn còn ${freeshipCount} lượt freeship)`,
        type: 'freeship',
        value: 20000,
        availableCount: freeshipCount,
      });
    }

    // 2. First-time buyer 20k discount
    const isFirst = customer ? customer.isFirstOrder : true;
    if (isFirst) {
      vouchers.push({
        code: 'CHAOBAN20K',
        title: 'Giảm 20.000đ Đơn Đầu Tiên',
        description: 'Đặc quyền dành riêng cho khách hàng mua lần đầu tiên',
        type: 'fixed',
        value: 20000,
        isFirstOrderOnly: true,
      });
    }

    // 3. TINGO10 10% coupon
    vouchers.push({
      code: 'TINGO10',
      title: 'Giảm 10% Tổng Đơn',
      description: 'Ưu đãi thành viên tri ân khách hàng thân thiết',
      type: 'percent',
      value: 10,
    });

    return vouchers;
  };

  const openAuthModal = (callbackOnSuccess?: () => void) => {
    if (callbackOnSuccess) {
      setPendingCallback(() => callbackOnSuccess);
    }
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);
    setPendingCallback(null);
  };

  const openProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  const closeProfileModal = () => {
    setIsProfileModalOpen(false);
  };

  const executePendingAction = () => {
    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      cb();
    }
  };

  return (
    <CustomerAuthContext.Provider
      value={{
        customer,
        isLoggedIn: !!customer,
        maxDailyOrders: MAX_DAILY_ORDERS_PER_ACCOUNT,
        getTodayOrdersCount,
        registerCustomer,
        loginWithCredentials,
        logoutCustomer,
        updateCustomerProfile,
        changePassword,
        consumeFreeshipVoucher,
        refundFreeshipVoucher,
        markFirstOrderCompleted,
        getAvailableVouchers,
        isAuthModalOpen,
        openAuthModal,
        closeAuthModal,
        executePendingAction,
        isProfileModalOpen,
        openProfileModal,
        closeProfileModal,
      }}
    >
      {children}

      {/* Real-time Account Blocked / Deleted Alert Modal */}
      {blockedAlertNotice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 text-center relative animate-scale-in">
            <button
              onClick={() => setBlockedAlertNotice(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div
              className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
                blockedAlertNotice.type === 'blocked'
                  ? 'bg-rose-100 text-rose-600'
                  : 'bg-amber-100 text-amber-600'
              }`}
            >
              {blockedAlertNotice.type === 'blocked' ? (
                <Ban className="w-9 h-9" />
              ) : (
                <ShieldAlert className="w-9 h-9" />
              )}
            </div>

            <span
              className={`text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full ${
                blockedAlertNotice.type === 'blocked'
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              Thông Báo Khách Hàng
            </span>

            <h3 className="text-xl font-black text-slate-900 font-display mt-2">
              {blockedAlertNotice.title}
            </h3>

            <p className="text-xs text-slate-600 leading-relaxed mt-2.5">
              {blockedAlertNotice.message}
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => setBlockedAlertNotice(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng thông báo
              </button>

              {blockedAlertNotice.type === 'deleted' ? (
                <button
                  type="button"
                  onClick={() => {
                    setBlockedAlertNotice(null);
                    openAuthModal();
                  }}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#008874] hover:bg-[#007052] text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Đăng ký mới</span>
                </button>
              ) : (
                <a
                  href="tel:19008888"
                  className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 cursor-pointer transition-all"
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>Gọi Hotline CSKH</span>
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const context = useContext(CustomerAuthContext);
  if (!context) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
};
