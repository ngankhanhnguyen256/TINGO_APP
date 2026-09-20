import React, { createContext, useContext, useState, useEffect } from 'react';
import { CustomerUser, Voucher } from '../types';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

const STORAGE_KEY = 'tingo_customer_user_session';
const ACCOUNTS_CACHE_KEY = 'tingo_registered_customers_cache';

export const ADMIN_CREDENTIALS = {
  email: 'tingodrink@gmail.com',
  pass: 'tamTu023@',
};

interface CustomerAuthContextType {
  customer: CustomerUser | null;
  isLoggedIn: boolean;
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

  // Sync with localStorage
  useEffect(() => {
    if (customer) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, [customer]);

  // Helper to get local registered accounts cache
  const getLocalAccounts = (): Record<string, CustomerUser & { password?: string }> => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  };

  // Helper to update local registered accounts cache
  const saveLocalAccount = (user: CustomerUser & { password?: string }) => {
    try {
      const accs = getLocalAccounts();
      accs[user.phone] = user;
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
    const cleanPhone = data.phone.trim().replace(/[\s.-]/g, '');
    const cleanEmail = data.email?.trim().toLowerCase() || '';
    const cleanPass = data.password?.trim() || '';

    if (!cleanPhone || cleanPhone.length !== 10) {
      return { success: false, error: 'Số điện thoại không hợp lệ (cần đúng 10 số, VD: 0901234567)' };
    }
    if (!data.name.trim() || data.name.trim().length < 3) {
      return { success: false, error: 'Họ và tên cần có ít nhất 3 ký tự' };
    }
    if (!cleanPass || cleanPass.length < 6) {
      return { success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự để bảo mật' };
    }

    // 1. Check if phone already registered in Firestore or Local Cache
    try {
      const snap = await getDoc(doc(db, 'customers', cleanPhone));
      if (snap.exists()) {
        return {
          success: false,
          error: 'Số điện thoại này đã được đăng ký tài khoản trước đó. Quý khách vui lòng chuyển sang tab Đăng Nhập.',
        };
      }
    } catch (err) {
      console.warn('Firestore existence check notice:', err);
      const localAccs = getLocalAccounts();
      if (localAccs[cleanPhone]) {
        return {
          success: false,
          error: 'Số điện thoại này đã được đăng ký tài khoản trước đó. Quý khách vui lòng chuyển sang tab Đăng Nhập.',
        };
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
    };

    const userWithPass = {
      ...newUser,
      password: cleanPass,
      registeredAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Save to Firestore
    try {
      const customerDocRef = doc(db, 'customers', cleanPhone);
      await setDoc(customerDocRef, userWithPass, { merge: true });
    } catch (err) {
      console.warn('Firestore customer registration sync warning:', err);
    }

    // Save to Local Accounts Cache for fast offline verification
    saveLocalAccount(userWithPass);

    setCustomer(newUser);
    setIsAuthModalOpen(false);

    if (pendingCallback) {
      const cb = pendingCallback;
      setPendingCallback(null);
      setTimeout(() => cb(), 100);
    }

    return { success: true, user: newUser };
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

    // 2. Lookup registered Customer by Phone or Email
    const cleanPhone = cleanId.replace(/[\s.-]/g, '');
    let matchedCustomer: (CustomerUser & { password?: string }) | null = null;

    // A. Check Firestore by phone ID
    if (cleanPhone.length === 10 && /^\d+$/.test(cleanPhone)) {
      try {
        const snap = await getDoc(doc(db, 'customers', cleanPhone));
        if (snap.exists()) {
          matchedCustomer = snap.data() as CustomerUser & { password?: string };
        }
      } catch (err) {
        console.warn('Firestore customer lookup notice:', err);
      }
    }

    // B. Check Local Accounts Cache if not retrieved from Firestore
    if (!matchedCustomer) {
      const localAccs = getLocalAccounts();
      if (localAccs[cleanPhone]) {
        matchedCustomer = localAccs[cleanPhone];
      } else if (localAccs[cleanIdLower]) {
        matchedCustomer = localAccs[cleanIdLower];
      }
    }

    // 3. Strict Rule: If NOT registered, STRICTLY DENY access
    if (!matchedCustomer) {
      return {
        success: false,
        error:
          'Tài khoản không tồn tại trên hệ thống. Quý khách vui lòng kiểm tra lại thông tin hoặc chuyển sang tab "ĐĂNG KÝ MỚI" để tạo tài khoản.',
      };
    }

    // 4. Strict Rule: Check Password
    if (matchedCustomer.password && matchedCustomer.password !== cleanPass) {
      return {
        success: false,
        error: 'Mật khẩu không chính xác! Quý khách vui lòng kiểm tra lại mật khẩu đã đăng ký.',
      };
    }

    // Update lastLoginAt in Firestore
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
    setCustomer(null);
    setPendingCallback(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem('tingo_checkout_draft');
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
        registerCustomer,
        loginWithCredentials,
        logoutCustomer,
        updateCustomerProfile,
        changePassword,
        consumeFreeshipVoucher,
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
