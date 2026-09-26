import React, { useState, useEffect } from 'react';
import {
  X,
  Package,
  Search,
  Filter,
  CheckCircle,
  Truck,
  Clock,
  XCircle,
  RefreshCw,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  User,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Database,
  Users,
  Gift,
  Plus,
  Trash2,
  Edit3,
  Check,
  Tag,
  Mail,
  ShieldCheck,
  Award,
  Ban,
  Unlock,
  Lock,
  Send,
  Bell,
  CheckSquare,
  Square,
  AlertTriangle,
  Info,
  Key,
  Eye,
  EyeOff,
  Radio,
  CheckCircle2,
  FileSpreadsheet,
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc,
  writeBatch
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, OrderStatus, CustomerUser } from '../../types';
import {
  TelegramConfig,
  getTelegramConfig,
  saveTelegramConfig,
  sendTelegramMessage,
  notifyCancelOrder
} from '../../lib/telegram';
import { formatVietnameseDateTime } from '../../utils/dateFormatter';
import { sanitizeFirestoreData } from '../../utils/sanitizeFirestore';
import { buildUpdatedFirestoreTimeline, getSynchronizedTimeline } from '../../utils/orderTimelineHelper';
import {
  updateCustomerStatusInGoogleSheet,
  syncAllExistingCustomers,
  appendCustomerToGoogleSheet
} from '../../lib/googleSheetsService';

const ACCOUNTS_CACHE_KEY = 'tingo_registered_customers_cache';
const BLOCKED_CACHE_KEY = 'tingo_blocked_identifiers_cache';

interface AdminOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  localOrders: Order[];
  defaultTab?: 'orders' | 'customers' | 'telegram';
  onOpenGoogleSheets?: () => void;
}

export const AdminOrdersModal: React.FC<AdminOrdersModalProps> = ({
  isOpen,
  onClose,
  localOrders,
  defaultTab = 'orders',
  onOpenGoogleSheets,
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'customers' | 'telegram'>(defaultTab);

  // Orders State
  const [orders, setOrders] = useState<Order[]>(localOrders);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderSearchTerm, setOrderSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

  // Customers State
  const [customers, setCustomers] = useState<CustomerUser[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerUser | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'active' | 'blocked' | 'with_orders'>('all');
  const [selectedCustomerPhones, setSelectedCustomerPhones] = useState<string[]>([]);
  const [isCustomerModalEditing, setIsCustomerModalEditing] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState<Partial<CustomerUser>>({});
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [deleteConfirmState, setDeleteConfirmState] = useState<{
    isOpen: boolean;
    type: 'single' | 'bulk';
    customer?: CustomerUser;
    count?: number;
  } | null>(null);
  const [actionToast, setActionToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    freeshipVouchers: 5,
  });

  // Telegram Settings State
  const [telegramConfig, setTelegramConfig] = useState<TelegramConfig>({
    botToken: '',
    chatId: '',
    enabledNewCustomer: true,
    enabledNewOrder: true,
    notifyOnAdminLogin: false,
  });
  const [showBotToken, setShowBotToken] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);
  const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null);
  const [isSavingTelegram, setIsSavingTelegram] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  // Load Telegram Config
  useEffect(() => {
    if (!isOpen) return;
    getTelegramConfig().then((cfg) => {
      setTelegramConfig(cfg);
    });
  }, [isOpen]);

  // Real-time Firestore synchronization for Orders
  useEffect(() => {
    if (!isOpen) return;

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'orders'),
        (snapshot) => {
          setIsFirebaseConnected(true);
          const firebaseOrders: Order[] = [];
          const seenIds = new Set<string>();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Order;
            firebaseOrders.push({
              ...data,
              id: docSnap.id,
            });
            seenIds.add(docSnap.id);
          });

          // Check if there are locally cached orders not yet synced to Firestore
          try {
            const cachedRaw = localStorage.getItem('tingo_orders_storage');
            const cachedList: Order[] = cachedRaw ? JSON.parse(cachedRaw) : [];
            const missingOrders = cachedList.filter((o) => o && o.id && !seenIds.has(o.id));

            if (missingOrders.length > 0) {
              // Auto-sync missing orders to Firestore so they are never lost
              missingOrders.forEach((o) => {
                try {
                  setDoc(doc(db, 'orders', o.id), sanitizeFirestoreData(o), { merge: true }).catch(() => {});
                } catch {
                  // ignore
                }
                firebaseOrders.push(o);
                seenIds.add(o.id);
              });
            }
          } catch {
            // ignore
          }

          // Resilient in-memory sort: latest orders first
          const sorted = firebaseOrders.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || (a as any).createdAtTimestamp || 0;
            const timeB = new Date(b.createdAt).getTime() || (b as any).createdAtTimestamp || 0;
            return timeB - timeA;
          });

          setOrders(sorted);
          try {
            localStorage.setItem('tingo_orders_storage', JSON.stringify(sorted));
          } catch {
            // ignore
          }
        },
        (error) => {
          console.warn('Firestore orders real-time subscription note:', error);
          if (localOrders && localOrders.length > 0) {
            setOrders(localOrders);
          }
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firebase order listener fallback', err);
      if (localOrders && localOrders.length > 0) {
        setOrders(localOrders);
      }
    }
  }, [isOpen, localOrders]);

  // Real-time Firestore synchronization for Customers
  useEffect(() => {
    if (!isOpen) return;

    try {
      const unsubscribe = onSnapshot(
        collection(db, 'customers'),
        (snapshot) => {
          const loadedCustomers: CustomerUser[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            loadedCustomers.push({
              id: data.id || `CUS-${docSnap.id}`,
              name: data.name || 'Khách hàng',
              phone: data.phone || docSnap.id,
              email: data.email || '',
              address: data.address || '',
              city: data.city || 'Hồ Chí Minh',
              district: data.district || '',
              freeshipVouchers: typeof data.freeshipVouchers === 'number' ? data.freeshipVouchers : 5,
              isFirstOrder: data.isFirstOrder !== false,
              isBlocked: data.isBlocked === true,
              blockedAt: data.blockedAt || undefined,
              blockedReason: data.blockedReason || undefined,
              lastLoginAt: data.lastLoginAt || undefined,
              createdAt: data.createdAt || data.registeredAt || data.lastOrderAt || new Date().toISOString(),
            });
          });

          // Sort latest created / registered customers first
          const sorted = loadedCustomers.sort((a, b) => {
            const timeA = new Date(a.createdAt).getTime() || 0;
            const timeB = new Date(b.createdAt).getTime() || 0;
            return timeB - timeA;
          });

          setCustomers(sorted);
        },
        (error) => {
          console.warn('Firestore customers listener error:', error);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firestore customers init error:', err);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Filter Orders
  const filteredOrders = orders.filter((ord) => {
    const matchesSearch =
      ord.id.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      ord.customerName.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
      ord.customerPhone.includes(orderSearchTerm);
    const matchesStatus = statusFilter === 'all' || ord.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Helper to reliably match orders with a customer by normalized phone or email
  const getCustomerOrders = (phone?: string, email?: string): Order[] => {
    const cleanP = (phone || '').trim().replace(/[\s.-]/g, '');
    const cleanE = (email || '').trim().toLowerCase();
    if (!cleanP && !cleanE) return [];
    return orders.filter((o) => {
      const oP = (o.customerPhone || '').trim().replace(/[\s.-]/g, '');
      const oE = (o.customerEmail || '').trim().toLowerCase();
      return (cleanP && oP && cleanP === oP) || (cleanE && oE && cleanE === oE);
    });
  };

  // Filter Customers
  const filteredCustomers = customers.filter((cus) => {
    const q = customerSearchTerm.toLowerCase();
    const matchesSearch =
      cus.name.toLowerCase().includes(q) ||
      cus.phone.includes(q) ||
      (cus.email && cus.email.toLowerCase().includes(q)) ||
      (cus.address && cus.address.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (customerFilter === 'active') return !cus.isBlocked;
    if (customerFilter === 'blocked') return !!cus.isBlocked;
    if (customerFilter === 'with_orders') {
      return getCustomerOrders(cus.phone, cus.email).length > 0;
    }

    return true;
  });

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.total || 0), 0);

  // Orders Actions
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingOrder(true);
    try {
      const now = new Date();
      const isoString = now.toISOString();
      const currentOrder = orders.find((o) => o.id === orderId);

      const cancelReason = currentOrder?.cancelReason || 'Quản trị viên chuyển trạng thái';
      const updatedTimeline = currentOrder
        ? buildUpdatedFirestoreTimeline(currentOrder, newStatus, cancelReason)
        : [];

      const updatePayload: Record<string, any> = {
        status: newStatus,
        updatedAt: isoString,
        timeline: updatedTimeline,
      };

      if (newStatus === 'cancelled') {
        updatePayload.cancelledAt = isoString;
        updatePayload.cancelledBy = 'admin';
        updatePayload.cancelReason = updatePayload.cancelReason || 'Quản trị viên hủy đơn';
      }

      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, sanitizeFirestoreData(updatePayload));

      const updatedOrder: Order = {
        ...(currentOrder || ({} as Order)),
        ...updatePayload,
        id: orderId,
        status: newStatus,
        timeline: updatedTimeline,
      };

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? updatedOrder : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(updatedOrder);
      }

      // If cancelled by admin, also notify telegram
      if (newStatus === 'cancelled' && currentOrder) {
        try {
          await notifyCancelOrder(updatedOrder, 'Quản trị viên hủy đơn', 'admin');
        } catch (e) {
          console.warn('Admin cancel notification error:', e);
        }
      }
    } catch (err) {
      console.error('Failed to update order status on Firestore', err);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } finally {
      setIsUpdatingOrder(false);
    }
  };

  // -------------------------------------------------------------
  // HELPER: Clear user completely from Local Storage caches
  // -------------------------------------------------------------
  const purgeLocalAccountData = (phone: string, email?: string) => {
    try {
      // 1. Remove from accounts cache
      const rawAccounts = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (rawAccounts) {
        const accs = JSON.parse(rawAccounts);
        delete accs[phone];
        if (email) delete accs[email.toLowerCase()];
        localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(accs));
      }

      // 2. Remove from blocked cache
      const rawBlocked = localStorage.getItem(BLOCKED_CACHE_KEY);
      if (rawBlocked) {
        let blockedList: string[] = JSON.parse(rawBlocked);
        blockedList = blockedList.filter((item) => item !== phone && item !== email?.toLowerCase());
        localStorage.setItem(BLOCKED_CACHE_KEY, JSON.stringify(blockedList));
      }

      // 3. Dispatch invalidation event to kick active session if it matches
      window.dispatchEvent(
        new CustomEvent('tingo-customer-session-cleared', {
          detail: { phone, email },
        })
      );
    } catch (err) {
      console.warn('Purge local account error:', err);
    }
  };

  const addLocalBlockedCache = (phone: string, email?: string) => {
    try {
      const rawBlocked = localStorage.getItem(BLOCKED_CACHE_KEY);
      const blockedList: string[] = rawBlocked ? JSON.parse(rawBlocked) : [];
      if (!blockedList.includes(phone)) blockedList.push(phone);
      if (email && !blockedList.includes(email.toLowerCase())) blockedList.push(email.toLowerCase());
      localStorage.setItem(BLOCKED_CACHE_KEY, JSON.stringify(blockedList));
    } catch (err) {
      console.warn('Add local blocked cache error:', err);
    }
  };

  const removeLocalBlockedCache = (phone: string, email?: string) => {
    try {
      const rawBlocked = localStorage.getItem(BLOCKED_CACHE_KEY);
      if (rawBlocked) {
        let blockedList: string[] = JSON.parse(rawBlocked);
        blockedList = blockedList.filter((item) => item !== phone && item !== email?.toLowerCase());
        localStorage.setItem(BLOCKED_CACHE_KEY, JSON.stringify(blockedList));
      }
    } catch (err) {
      console.warn('Remove local blocked cache error:', err);
    }
  };

  // -------------------------------------------------------------
  // CUSTOMER ACTIONS: DELETE, BLOCK, UNBLOCK, VOUCHERS
  // -------------------------------------------------------------

  /**
   * Delete customer completely:
   * When deleted, ONLY the specific phone's document is deleted from Firestore and caches.
   * They can now register freshly as if they never registered before.
   */
  const executeDeleteCustomer = async (phone: string, email?: string) => {
    setIsActionLoading(true);
    try {
      const cleanPhone = phone.trim().replace(/[\s.-]/g, '');
      const cleanEmail = email?.trim().toLowerCase();

      // 1. Delete customer doc from Firestore: customers/{cleanPhone} and customers/CUS-{cleanPhone}
      await deleteDoc(doc(db, 'customers', cleanPhone)).catch(() => {});
      await deleteDoc(doc(db, 'customers', `CUS-${cleanPhone}`)).catch(() => {});

      // Query and delete any doc where phone matches cleanPhone exactly
      try {
        const phoneQ = query(collection(db, 'customers'), where('phone', '==', cleanPhone));
        const phoneSnap = await getDocs(phoneQ);
        for (const docSnap of phoneSnap.docs) {
          if (docSnap.id === cleanPhone || docSnap.id === `CUS-${cleanPhone}` || docSnap.data().phone === cleanPhone) {
            await deleteDoc(docSnap.ref).catch(() => {});
          }
        }
      } catch (e) {
        console.warn('Phone docs delete query note:', e);
      }

      // 2. Delete blocked entries if any
      await deleteDoc(doc(db, 'blocked_identifiers', cleanPhone)).catch(() => {});
      if (cleanEmail) {
        await deleteDoc(doc(db, 'blocked_identifiers', encodeURIComponent(cleanEmail))).catch(() => {});
      }

      // 3. Purge from local caches & sessions
      purgeLocalAccountData(cleanPhone, cleanEmail);

      // 3b. Sync status 'Đã xóa' to Google Sheet
      updateCustomerStatusInGoogleSheet(cleanPhone, 'Đã xóa').catch(() => {});

      // 4. Notify client session to immediately clear & show alert
      window.dispatchEvent(
        new CustomEvent('tingo-customer-session-cleared', {
          detail: { phone: cleanPhone, email: cleanEmail, blocked: false, deleted: true },
        })
      );

      // 5. Update UI state
      setCustomers((prev) => prev.filter((c) => c.phone.trim().replace(/[\s.-]/g, '') !== cleanPhone));
      setSelectedCustomerPhones((prev) => prev.filter((p) => p.trim().replace(/[\s.-]/g, '') !== cleanPhone));
      if (selectedCustomer && selectedCustomer.phone.trim().replace(/[\s.-]/g, '') === cleanPhone) {
        setSelectedCustomer(null);
      }

      setActionToast({
        type: 'success',
        message: `Đã XÓA VĨNH VIỄN khách hàng (SĐT: ${cleanPhone}). Dữ liệu đã được giải phóng hoàn toàn!`,
      });
      setTimeout(() => setActionToast(null), 4500);
    } catch (err) {
      console.error('Failed to delete customer', err);
      setActionToast({
        type: 'error',
        message: 'Lỗi khi xóa khách hàng. Vui lòng thử lại.',
      });
      setTimeout(() => setActionToast(null), 4500);
    } finally {
      setIsActionLoading(false);
      setDeleteConfirmState(null);
    }
  };

  const executeBulkDelete = async () => {
    if (selectedCustomerPhones.length === 0) return;

    setIsActionLoading(true);
    try {
      const phonesToDelete = [...selectedCustomerPhones].map((p) => p.trim().replace(/[\s.-]/g, ''));
      const targets = customers.filter((c) =>
        phonesToDelete.includes(c.phone.trim().replace(/[\s.-]/g, ''))
      );

      for (const cus of targets) {
        const cleanPhone = cus.phone.trim().replace(/[\s.-]/g, '');
        const cleanEmail = cus.email?.trim().toLowerCase();

        await deleteDoc(doc(db, 'customers', cleanPhone)).catch(() => {});
        await deleteDoc(doc(db, 'customers', `CUS-${cleanPhone}`)).catch(() => {});
        await deleteDoc(doc(db, 'blocked_identifiers', cleanPhone)).catch(() => {});
        if (cleanEmail) {
          await deleteDoc(doc(db, 'blocked_identifiers', encodeURIComponent(cleanEmail))).catch(() => {});
        }
        purgeLocalAccountData(cleanPhone, cleanEmail);
        updateCustomerStatusInGoogleSheet(cleanPhone, 'Đã xóa').catch(() => {});

        window.dispatchEvent(
          new CustomEvent('tingo-customer-session-cleared', {
            detail: { phone: cleanPhone, email: cleanEmail, blocked: false, deleted: true },
          })
        );
      }

      setCustomers((prev) =>
        prev.filter((c) => !phonesToDelete.includes(c.phone.trim().replace(/[\s.-]/g, '')))
      );
      if (
        selectedCustomer &&
        phonesToDelete.includes(selectedCustomer.phone.trim().replace(/[\s.-]/g, ''))
      ) {
        setSelectedCustomer(null);
      }
      setSelectedCustomerPhones([]);

      setActionToast({
        type: 'success',
        message: `Đã XÓA VĨNH VIỄN ${targets.length} tài khoản khách hàng đã chọn!`,
      });
      setTimeout(() => setActionToast(null), 4500);
    } catch (err) {
      console.error('Bulk delete error', err);
      setActionToast({
        type: 'error',
        message: 'Lỗi khi xóa hàng loạt khách hàng.',
      });
      setTimeout(() => setActionToast(null), 4500);
    } finally {
      setIsActionLoading(false);
      setDeleteConfirmState(null);
    }
  };

  /**
   * Block customer:
   * SĐT và Gmail đó không thể đăng ký mới và không thể đăng nhập vô app.
   */
  const handleBlockCustomer = async (customer: CustomerUser, reason = 'Bị quản trị viên chặn') => {
    setIsActionLoading(true);
    try {
      const nowStr = new Date().toISOString();

      // 1. Update customer doc
      await updateDoc(doc(db, 'customers', customer.phone), {
        isBlocked: true,
        blockedAt: nowStr,
        blockedReason: reason,
      });

      // 2. Write to blocked_identifiers collection
      await setDoc(doc(db, 'blocked_identifiers', customer.phone), {
        phone: customer.phone,
        email: customer.email || '',
        name: customer.name,
        blockedAt: nowStr,
        reason,
      });

      if (customer.email) {
        await setDoc(
          doc(db, 'blocked_identifiers', encodeURIComponent(customer.email.toLowerCase())),
          {
            phone: customer.phone,
            email: customer.email.toLowerCase(),
            name: customer.name,
            blockedAt: nowStr,
            reason,
          }
        );
      }

      // 3. Update local caches & kick session if active
      addLocalBlockedCache(customer.phone, customer.email);
      updateCustomerStatusInGoogleSheet(customer.phone, 'Bị khóa').catch(() => {});
      window.dispatchEvent(
        new CustomEvent('tingo-customer-session-cleared', {
          detail: { phone: customer.phone, email: customer.email },
        })
      );

      // 4. Update state
      setCustomers((prev) =>
        prev.map((c) =>
          c.phone === customer.phone
            ? { ...c, isBlocked: true, blockedAt: nowStr, blockedReason: reason }
            : c
        )
      );
      if (selectedCustomer?.phone === customer.phone) {
        setSelectedCustomer((prev) =>
          prev ? { ...prev, isBlocked: true, blockedAt: nowStr, blockedReason: reason } : null
        );
      }
    } catch (err) {
      console.error('Failed to block customer', err);
      alert('Không thể chặn khách hàng lúc này. Vui lòng thử lại.');
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Unblock customer:
   * Cho phép khách hàng đăng nhập hoặc đăng ký lại bình thường.
   */
  const handleUnblockCustomer = async (customer: CustomerUser) => {
    setIsActionLoading(true);
    try {
      // 1. Update customer doc
      await updateDoc(doc(db, 'customers', customer.phone), {
        isBlocked: false,
        blockedAt: null,
        blockedReason: null,
      });

      // 2. Delete from blocked_identifiers
      await deleteDoc(doc(db, 'blocked_identifiers', customer.phone)).catch(() => {});
      if (customer.email) {
        await deleteDoc(
          doc(db, 'blocked_identifiers', encodeURIComponent(customer.email.toLowerCase()))
        ).catch(() => {});
      }

      // 3. Remove from local cache
      removeLocalBlockedCache(customer.phone, customer.email);
      updateCustomerStatusInGoogleSheet(customer.phone, 'Hoạt động').catch(() => {});

      // 4. Update state
      setCustomers((prev) =>
        prev.map((c) =>
          c.phone === customer.phone
            ? { ...c, isBlocked: false, blockedAt: undefined, blockedReason: undefined }
            : c
        )
      );
      if (selectedCustomer?.phone === customer.phone) {
        setSelectedCustomer((prev) =>
          prev ? { ...prev, isBlocked: false, blockedAt: undefined, blockedReason: undefined } : null
        );
      }
    } catch (err) {
      console.error('Failed to unblock customer', err);
      alert('Không thể mở chặn khách hàng lúc này. Vui lòng thử lại.');
    } finally {
      setIsActionLoading(false);
    }
  };

  /**
   * Bulk actions for multiple selected customers
   */
  const handleBulkBlock = async () => {
    if (selectedCustomerPhones.length === 0) return;
    if (
      !confirm(
        `Bạn có chắc muốn CHẶN ${selectedCustomerPhones.length} tài khoản khách hàng đã chọn?\nCác khách hàng này sẽ không thể đăng ký hoặc đăng nhập vô app.`
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const batch = writeBatch(db);
      const nowStr = new Date().toISOString();

      const targets = customers.filter((c) => selectedCustomerPhones.includes(c.phone));
      for (const cus of targets) {
        batch.update(doc(db, 'customers', cus.phone), {
          isBlocked: true,
          blockedAt: nowStr,
          blockedReason: 'Chặn hàng loạt bởi Quản trị viên',
        });
        batch.set(doc(db, 'blocked_identifiers', cus.phone), {
          phone: cus.phone,
          email: cus.email || '',
          name: cus.name,
          blockedAt: nowStr,
          reason: 'Chặn hàng loạt bởi Quản trị viên',
        });
        if (cus.email) {
          batch.set(doc(db, 'blocked_identifiers', encodeURIComponent(cus.email.toLowerCase())), {
            phone: cus.phone,
            email: cus.email.toLowerCase(),
            name: cus.name,
            blockedAt: nowStr,
            reason: 'Chặn hàng loạt bởi Quản trị viên',
          });
        }
        addLocalBlockedCache(cus.phone, cus.email);
        window.dispatchEvent(
          new CustomEvent('tingo-customer-session-cleared', {
            detail: { phone: cus.phone, email: cus.email },
          })
        );
      }

      await batch.commit();

      setCustomers((prev) =>
        prev.map((c) =>
          selectedCustomerPhones.includes(c.phone)
            ? { ...c, isBlocked: true, blockedAt: nowStr, blockedReason: 'Chặn hàng loạt' }
            : c
        )
      );
      setSelectedCustomerPhones([]);
    } catch (err) {
      console.error('Bulk block error', err);
      alert('Lỗi khi chặn hàng loạt khách hàng.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkUnblock = async () => {
    if (selectedCustomerPhones.length === 0) return;
    if (
      !confirm(
        `Bạn có chắc muốn MỞ CHẶN cho ${selectedCustomerPhones.length} tài khoản khách hàng đã chọn?`
      )
    ) {
      return;
    }

    setIsActionLoading(true);
    try {
      const batch = writeBatch(db);
      const targets = customers.filter((c) => selectedCustomerPhones.includes(c.phone));

      for (const cus of targets) {
        batch.update(doc(db, 'customers', cus.phone), {
          isBlocked: false,
          blockedAt: null,
          blockedReason: null,
        });
        batch.delete(doc(db, 'blocked_identifiers', cus.phone));
        if (cus.email) {
          batch.delete(doc(db, 'blocked_identifiers', encodeURIComponent(cus.email.toLowerCase())));
        }
        removeLocalBlockedCache(cus.phone, cus.email);
      }

      await batch.commit();

      setCustomers((prev) =>
        prev.map((c) =>
          selectedCustomerPhones.includes(c.phone)
            ? { ...c, isBlocked: false, blockedAt: undefined, blockedReason: undefined }
            : c
        )
      );
      setSelectedCustomerPhones([]);
    } catch (err) {
      console.error('Bulk unblock error', err);
      alert('Lỗi khi mở chặn hàng loạt khách hàng.');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleBulkAddVouchers = async (countDelta: number) => {
    if (selectedCustomerPhones.length === 0) return;
    setIsActionLoading(true);
    try {
      const batch = writeBatch(db);
      const targets = customers.filter((c) => selectedCustomerPhones.includes(c.phone));

      for (const cus of targets) {
        const newCount = Math.max(0, (cus.freeshipVouchers || 0) + countDelta);
        batch.update(doc(db, 'customers', cus.phone), {
          freeshipVouchers: newCount,
        });
      }

      await batch.commit();

      setCustomers((prev) =>
        prev.map((c) =>
          selectedCustomerPhones.includes(c.phone)
            ? { ...c, freeshipVouchers: Math.max(0, (c.freeshipVouchers || 0) + countDelta) }
            : c
        )
      );
    } catch (err) {
      console.error('Bulk voucher error', err);
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleSelectAllCustomers = () => {
    if (selectedCustomerPhones.length === filteredCustomers.length) {
      setSelectedCustomerPhones([]);
    } else {
      setSelectedCustomerPhones(filteredCustomers.map((c) => c.phone));
    }
  };

  const toggleSelectCustomer = (phone: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomerPhones((prev) =>
      prev.includes(phone) ? prev.filter((p) => p !== phone) : [...prev, phone]
    );
  };

  const handleAddVouchers = async (customerPhone: string, countDelta: number) => {
    const target = customers.find((c) => c.phone === customerPhone);
    if (!target) return;
    const newCount = Math.max(0, target.freeshipVouchers + countDelta);

    try {
      await updateDoc(doc(db, 'customers', customerPhone), {
        freeshipVouchers: newCount,
      });
      setCustomers((prev) =>
        prev.map((c) => (c.phone === customerPhone ? { ...c, freeshipVouchers: newCount } : c))
      );
      if (selectedCustomer && selectedCustomer.phone === customerPhone) {
        setSelectedCustomer((prev) => (prev ? { ...prev, freeshipVouchers: newCount } : null));
      }
    } catch (err) {
      console.warn('Update customer voucher error:', err);
    }
  };

  const handleSaveCustomerProfile = async () => {
    if (!selectedCustomer) return;
    try {
      await updateDoc(doc(db, 'customers', selectedCustomer.phone), editCustomerForm);
      const updated = { ...selectedCustomer, ...editCustomerForm };
      setSelectedCustomer(updated);
      setCustomers((prev) =>
        prev.map((c) => (c.phone === selectedCustomer.phone ? updated : c))
      );
      // Synchronize update to Google Sheet
      appendCustomerToGoogleSheet(updated).catch(() => {});
      setIsCustomerModalEditing(false);
    } catch (err) {
      console.error('Failed to save customer', err);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = newCustomerForm.phone.trim().replace(/[\s.-]/g, '');
    if (!cleanPhone || !newCustomerForm.name) {
      alert('Vui lòng nhập họ tên và số điện thoại');
      return;
    }

    const newCus: CustomerUser = {
      id: `CUS-${cleanPhone}`,
      name: newCustomerForm.name.trim(),
      phone: cleanPhone,
      email: newCustomerForm.email.trim(),
      address: newCustomerForm.address.trim(),
      city: newCustomerForm.city,
      district: newCustomerForm.district,
      freeshipVouchers: Number(newCustomerForm.freeshipVouchers) || 5,
      isFirstOrder: true,
      isBlocked: false,
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'customers', cleanPhone), sanitizeFirestoreData(newCus), { merge: true });
      await deleteDoc(doc(db, 'blocked_identifiers', cleanPhone)).catch(() => {});
      if (newCustomerForm.email) {
        await deleteDoc(doc(db, 'blocked_identifiers', encodeURIComponent(newCustomerForm.email.toLowerCase()))).catch(() => {});
      }
      removeLocalBlockedCache(cleanPhone, newCustomerForm.email);
      setCustomers((prev) => [newCus, ...prev.filter((c) => c.phone !== cleanPhone)]);
      setSelectedCustomer(newCus);
      // Synchronize immediately to Google Sheet
      appendCustomerToGoogleSheet(newCus).catch(() => {});
      setIsNewCustomerModalOpen(false);
      setNewCustomerForm({
        name: '',
        phone: '',
        email: '',
        address: '',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        freeshipVouchers: 5,
      });
    } catch (err) {
      console.error('Failed to create customer', err);
    }
  };

  // -------------------------------------------------------------
  // TELEGRAM BOT ACTIONS
  // -------------------------------------------------------------
  const handleTestTelegram = async () => {
    if (!telegramConfig.botToken.trim() || !telegramConfig.chatId.trim()) {
      setTestResult({
        success: false,
        message: 'Vui lòng điền đầy đủ Bot Token và Chat ID trước khi kiểm tra!',
      });
      return;
    }

    setIsTestingTelegram(true);
    setTestResult(null);

    const testMessage = `
🔔 <b>KIỂM TRA KẾT NỐI BOT TELEGRAM TINGO THÀNH CÔNG!</b>
━━━━━━━━━━━━━━━━━━━━
✅ <b>Trạng thái:</b> Đã kết nối thông suốt với máy chủ TINGO Store
⏰ <b>Thời gian kiểm tra:</b> ${new Date().toLocaleString('vi-VN')}
🤖 <b>Tính năng tự động:</b>
  • Thông báo khi có Khách hàng mới đăng ký
  • Thông báo khi có Đơn hàng mới phát sinh
━━━━━━━━━━━━━━━━━━━━
🎉 <i>Hệ thống thông báo Telegram đã sẵn sàng hoạt động 24/7!</i>
`.trim();

    const res = await sendTelegramMessage(testMessage, {
      botToken: telegramConfig.botToken,
      chatId: telegramConfig.chatId,
    });

    setIsTestingTelegram(false);
    if (res.success) {
      // Auto save configuration to Firestore & LocalStorage so it's instantly active 24/7!
      await saveTelegramConfig(telegramConfig);
      setTestResult({
        success: true,
        message: 'Tuyệt vời! Kết nối thành công và ĐÃ TỰ ĐỘNG LƯU CẤU HÌNH lên hệ thống! Từ bây giờ khi có Đơn hàng hoặc Khách mới, Bot sẽ tự động báo về Telegram ngay lập tức.',
      });
    } else {
      setTestResult({
        success: false,
        message: `Lỗi kết nối: ${res.error}. Vui lòng kiểm tra lại Bot Token hoặc Chat ID (chắc chắn bạn đã bấm /start với bot hoặc thêm bot vào nhóm).`,
      });
    }
  };

  const handleSaveTelegram = async () => {
    setIsSavingTelegram(true);
    setSaveSuccessMsg('');
    try {
      await saveTelegramConfig(telegramConfig);
      setSaveSuccessMsg('Đã lưu và đồng bộ cấu hình Telegram lên Firebase thành công!');
      setTimeout(() => setSaveSuccessMsg(''), 4000);
    } catch (err) {
      alert('Không thể lưu cấu hình Telegram lúc này.');
    } finally {
      setIsSavingTelegram(false);
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Chờ xử lý
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" /> Đang chuẩn bị
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Truck className="w-3 h-3" /> Đang giao hàng
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle className="w-3 h-3" /> Đã hoàn thành
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Đã hủy
          </span>
        );
    }
  };

  const blockedCustomersCount = customers.filter((c) => c.isBlocked).length;
  const activeCustomersCount = customers.filter((c) => !c.isBlocked).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Trung Tâm Quản Trị Hệ Thống TINGO
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Cloud Real-time
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đơn hàng ({orders.length}) • Khách hàng ({customers.length}) • {blockedCustomersCount > 0 ? `${blockedCustomersCount} đã bị chặn • ` : ''}Thông báo Telegram
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation Switcher */}
        <div className="px-4 bg-slate-100 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 pt-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('orders')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border-t border-x ${
                activeTab === 'orders'
                  ? 'bg-white text-emerald-700 border-slate-200 border-b-white -mb-px shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Đơn Hàng ({orders.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('customers')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border-t border-x ${
                activeTab === 'customers'
                  ? 'bg-white text-emerald-700 border-slate-200 border-b-white -mb-px shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Users className="w-4 h-4 text-emerald-600" />
              <span>Quản Lý Khách Hàng ({customers.length})</span>
              {blockedCustomersCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-bold">
                  {blockedCustomersCount} khóa
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('telegram')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-bold text-xs sm:text-sm transition-all cursor-pointer border-t border-x ${
                activeTab === 'telegram'
                  ? 'bg-white text-sky-700 border-slate-200 border-b-white -mb-px shadow-xs'
                  : 'bg-transparent text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              <Send className="w-4 h-4 text-sky-600" />
              <span>Kết Nối API Telegram</span>
              {telegramConfig.botToken && telegramConfig.chatId ? (
                <span className="w-2 h-2 rounded-full bg-emerald-500" title="Đã có cấu hình" />
              ) : (
                <span className="w-2 h-2 rounded-full bg-amber-400" title="Chưa cấu hình" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-2 mb-1">
            {onOpenGoogleSheets && (
              <button
                type="button"
                onClick={onOpenGoogleSheets}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                title="Đồng bộ 2 chiều dữ liệu Khách hàng & Đơn hàng với Google Sheets"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-teal-200" />
                <span>Google Sheets & Khôi Phục</span>
              </button>
            )}

            {activeTab === 'customers' && (
              <button
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#008764] hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Khách Hàng</span>
              </button>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: ORDERS MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'orders' && (
          <>
            {/* Stats bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 p-4 border-b border-slate-100 bg-emerald-50/40">
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Tổng số đơn</div>
                <div className="text-xl font-bold text-slate-900 font-display">
                  {orders.length}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Chờ xử lý</div>
                <div className="text-xl font-bold text-amber-600 font-display">
                  {orders.filter((o) => o.status === 'pending').length}
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Đang giao</div>
                <div className="text-xl font-bold text-indigo-600 font-display">
                  {
                    orders.filter((o) => o.status === 'shipping' || o.status === 'processing')
                      .length
                  }
                </div>
              </div>
              <div className="bg-white p-3 rounded-xl border border-emerald-100 shadow-xs">
                <div className="text-xs text-slate-500 font-medium">Doanh thu tạm tính</div>
                <div className="text-xl font-bold text-[#008764] font-display">
                  {totalRevenue.toLocaleString('vi-VN')}đ
                </div>
              </div>
            </div>

            {/* Filters & Search */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo mã đơn, tên, số điện thoại..."
                  value={orderSearchTerm}
                  onChange={(e) => setOrderSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008764] bg-slate-50 focus:bg-white"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                {(['all', 'pending', 'processing', 'shipping', 'delivered', 'cancelled'] as const).map(
                  (st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                        statusFilter === st
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'all'
                        ? 'Tất cả'
                        : st === 'pending'
                        ? 'Chờ xử lý'
                        : st === 'processing'
                        ? 'Đang chuẩn bị'
                        : st === 'shipping'
                        ? 'Đang giao'
                        : st === 'delivered'
                        ? 'Đã giao'
                        : 'Đã hủy'}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Orders Split View */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-hidden">
              {/* Order List */}
              <div className="lg:col-span-7 overflow-y-auto max-h-[55vh] lg:max-h-[60vh] p-3 space-y-2">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Không tìm thấy đơn hàng nào</p>
                  </div>
                ) : (
                  filteredOrders.map((ord) => {
                    const isSelected = selectedOrder?.id === ord.id;
                    return (
                      <div
                        key={ord.id}
                        onClick={() => setSelectedOrder(ord)}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-900 text-sm">
                                #{ord.id}
                              </span>
                              {getStatusBadge(ord.status)}
                            </div>
                            <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                              <span>{formatVietnameseDateTime(ord.createdAt)}</span>
                              <span>&bull;</span>
                              <span className="font-medium text-slate-800">{ord.customerName}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900 font-mono">
                              {(ord.total || 0).toLocaleString('vi-VN')}đ
                            </div>
                            <div className="text-[11px] text-slate-400 uppercase font-semibold mt-0.5">
                              {ord.paymentMethod === 'vietqr'
                                ? 'VietQR'
                                : ord.paymentMethod === 'momo'
                                ? 'MoMo'
                                : 'COD'}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-500 truncate flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{ord.shippingAddress}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Order Detail View */}
              <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-50/50 overflow-y-auto max-h-[55vh] lg:max-h-[60vh]">
                {selectedOrder ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase">
                          Chi tiết đơn hàng
                        </span>
                        <h3 className="font-mono font-bold text-lg text-slate-900">
                          #{selectedOrder.id}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Thời gian đặt: <span className="font-medium text-slate-700">{formatVietnameseDateTime(selectedOrder.createdAt)}</span>
                        </p>
                      </div>
                      <div>{getStatusBadge(selectedOrder.status)}</div>
                    </div>

                    {/* Status Changer */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <div className="text-xs font-bold text-slate-700">Cập nhật trạng thái:</div>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {(['pending', 'processing', 'shipping', 'delivered', 'cancelled'] as const).map(
                          (st) => (
                            <button
                              key={st}
                              onClick={() => handleUpdateStatus(selectedOrder.id, st)}
                              disabled={isUpdatingOrder}
                              className={`py-1.5 px-2 rounded-lg font-semibold transition-all cursor-pointer text-center ${
                                selectedOrder.status === st
                                  ? 'bg-emerald-600 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                              }`}
                            >
                              {st === 'pending'
                                ? 'Chờ xử lý'
                                : st === 'processing'
                                ? 'Chuẩn bị hàng'
                                : st === 'shipping'
                                ? 'Giao hàng'
                                : st === 'delivered'
                                ? 'Hoàn thành'
                                : 'Hủy đơn'}
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-600" /> Thông tin nhận hàng
                      </div>
                      <div className="space-y-1 text-slate-600 pl-5">
                        <div>
                          <strong className="text-slate-800">Khách hàng:</strong>{' '}
                          {selectedOrder.customerName}
                        </div>
                        <div>
                          <strong className="text-slate-800">SĐT:</strong>{' '}
                          <a
                            href={`tel:${selectedOrder.customerPhone}`}
                            className="text-emerald-700 font-mono hover:underline"
                          >
                            {selectedOrder.customerPhone}
                          </a>
                        </div>
                        {selectedOrder.customerEmail && (
                          <div>
                            <strong className="text-slate-800">Email:</strong>{' '}
                            {selectedOrder.customerEmail}
                          </div>
                        )}
                        <div>
                          <strong className="text-slate-800">Địa chỉ:</strong>{' '}
                          {selectedOrder.shippingAddress}
                        </div>
                        {selectedOrder.notes && (
                          <div className="pt-1 text-amber-800 italic">
                            <strong>Ghi chú:</strong> {selectedOrder.notes}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Product Items List */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <ShoppingBag className="w-4 h-4 text-emerald-600" /> Sản phẩm đã đặt
                      </div>
                      <div className="divide-y divide-slate-100">
                        {selectedOrder.items.map((item, idx) => (
                          <div
                            key={idx}
                            className="py-2 flex items-center justify-between gap-2"
                          >
                            <div className="min-w-0">
                              <p className="font-medium text-slate-800 truncate">
                                {item.product.name}
                              </p>
                              <p className="text-slate-400 text-[11px]">
                                {item.quantity} x {item.product.price.toLocaleString('vi-VN')}đ
                              </p>
                            </div>
                            <div className="font-mono font-bold text-slate-800 text-right">
                              {(item.quantity * item.product.price).toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Pricing Breakdown */}
                      <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500">
                        <div className="flex justify-between">
                          <span>Tạm tính:</span>
                          <span>
                            {(selectedOrder.subtotal || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        {selectedOrder.discountAmount ? (
                          <div className="flex justify-between text-emerald-600 font-medium">
                            <span>
                              Giảm giá ({selectedOrder.couponCode || 'Voucher'}):
                            </span>
                            <span>
                              -{(selectedOrder.discountAmount || 0).toLocaleString('vi-VN')}đ
                            </span>
                          </div>
                        ) : null}
                        <div className="flex justify-between">
                          <span>Phí giao hàng:</span>
                          <span>
                            {(selectedOrder.shippingFee || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                        <div className="flex justify-between pt-1 border-t border-slate-100 font-bold text-sm text-slate-900">
                          <span>Tổng thu:</span>
                          <span className="text-[#008764]">
                            {(selectedOrder.total || 0).toLocaleString('vi-VN')}đ
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <Package className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chọn một đơn hàng để xem chi tiết</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ======================================================== */}
        {/* TAB 2: ADVANCED CUSTOMER MANAGEMENT & BULK ACTIONS */}
        {/* ======================================================== */}
        {activeTab === 'customers' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Filter bar */}
            <div className="p-3 sm:p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/80">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT, email, địa chỉ..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008764] bg-white shadow-2xs"
                />
              </div>

              {/* Status Filters */}
              <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                <button
                  onClick={() => setCustomerFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'all'
                      ? 'bg-slate-800 text-white shadow-xs'
                      : 'bg-white text-slate-600 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  Tất cả ({customers.length})
                </button>
                <button
                  onClick={() => setCustomerFilter('active')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'active'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-white text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                  }`}
                >
                  Đang hoạt động ({activeCustomersCount})
                </button>
                <button
                  onClick={() => setCustomerFilter('blocked')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'blocked'
                      ? 'bg-rose-700 text-white shadow-xs'
                      : 'bg-white text-rose-700 hover:bg-rose-50 border border-rose-200'
                  }`}
                >
                  Đã bị chặn ({blockedCustomersCount})
                </button>
                <button
                  onClick={() => setCustomerFilter('with_orders')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    customerFilter === 'with_orders'
                      ? 'bg-indigo-700 text-white shadow-xs'
                      : 'bg-white text-indigo-700 hover:bg-indigo-50 border border-indigo-200'
                  }`}
                >
                  Có đơn hàng
                </button>
              </div>
            </div>

            {/* Bulk Action Controls Bar (Active when 1+ selected) */}
            <div className="px-4 py-2 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAllCustomers}
                  className="flex items-center gap-1.5 font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  {selectedCustomerPhones.length > 0 &&
                  selectedCustomerPhones.length === filteredCustomers.length ? (
                    <CheckSquare className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  <span>
                    {selectedCustomerPhones.length === filteredCustomers.length && filteredCustomers.length > 0
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </span>
                </button>

                {selectedCustomerPhones.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
                    Đã chọn {selectedCustomerPhones.length} tài khoản
                  </span>
                )}
              </div>

              {selectedCustomerPhones.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-slate-500 font-medium mr-1">Thao tác hàng loạt:</span>
                  <button
                    onClick={handleBulkBlock}
                    disabled={isActionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Chặn không cho các tài khoản này đăng ký hoặc đăng nhập"
                  >
                    <Ban className="w-3.5 h-3.5" />
                    <span>Chặn ({selectedCustomerPhones.length})</span>
                  </button>

                  <button
                    onClick={handleBulkUnblock}
                    disabled={isActionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Bỏ chặn cho các tài khoản đã chọn"
                  >
                    <Unlock className="w-3.5 h-3.5" />
                    <span>Mở Chặn</span>
                  </button>

                  <button
                    onClick={() => handleBulkAddVouchers(1)}
                    disabled={isActionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-50 font-bold cursor-pointer transition-colors"
                  >
                    <Gift className="w-3.5 h-3.5 text-amber-600" />
                    <span>+1 Freeship</span>
                  </button>

                  <button
                    onClick={() =>
                      setDeleteConfirmState({
                        isOpen: true,
                        type: 'bulk',
                        count: selectedCustomerPhones.length,
                      })
                    }
                    disabled={isActionLoading}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Xóa vĩnh viễn dữ liệu để họ có thể đăng ký lại hoàn toàn mới"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa Vĩnh Viễn ({selectedCustomerPhones.length})</span>
                  </button>
                </div>
              )}
            </div>

            {/* Customers Master-Detail Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-hidden">
              {/* Customer List */}
              <div className="lg:col-span-7 overflow-y-auto max-h-[55vh] lg:max-h-[60vh] p-3 space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Không tìm thấy khách hàng nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Thử thay đổi từ khóa hoặc bộ lọc trạng thái
                    </p>
                    <button
                      onClick={() => setIsNewCustomerModalOpen(true)}
                      className="mt-3 px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-bold hover:bg-emerald-800"
                    >
                      + Thêm Khách Hàng Thủ Công
                    </button>
                  </div>
                ) : (
                  filteredCustomers.map((cus) => {
                    const isSelected = selectedCustomer?.phone === cus.phone;
                    const isChecked = selectedCustomerPhones.includes(cus.phone);
                    const customerOrders = getCustomerOrders(cus.phone, cus.email);
                    const totalSpent = customerOrders.reduce(
                      (sum, o) => sum + (o.total || 0),
                      0
                    );

                    return (
                      <div
                        key={cus.phone}
                        onClick={() => {
                          setSelectedCustomer(cus);
                          setIsCustomerModalEditing(false);
                        }}
                        className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                          cus.isBlocked
                            ? 'bg-rose-50/50 border-rose-200'
                            : isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Multi-select checkbox */}
                            <button
                              type="button"
                              onClick={(e) => toggleSelectCustomer(cus.phone, e)}
                              className="p-1 text-slate-400 hover:text-emerald-600 cursor-pointer"
                            >
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300 hover:text-slate-500" />
                              )}
                            </button>

                            {/* Avatar */}
                            <div
                              className={`w-9 h-9 rounded-full font-bold flex items-center justify-center text-xs shrink-0 border ${
                                cus.isBlocked
                                  ? 'bg-rose-100 text-rose-800 border-rose-300'
                                  : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              }`}
                            >
                              {cus.isBlocked ? (
                                <Ban className="w-4 h-4 text-rose-600" />
                              ) : (
                                cus.name.charAt(0).toUpperCase()
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="font-bold text-slate-900 text-sm truncate">
                                  {cus.name}
                                </div>
                                {cus.isBlocked ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                                    <Lock className="w-2.5 h-2.5" /> ĐÃ CHẶN
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="w-2.5 h-2.5" /> Hoạt động
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                                <span className="font-mono text-slate-700 font-medium">
                                  {cus.phone}
                                </span>
                                {cus.email && (
                                  <>
                                    <span>&bull;</span>
                                    <span className="truncate text-slate-400">{cus.email}</span>
                                  </>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                Ngày tạo: <span className="text-slate-600 font-medium">{formatVietnameseDateTime(cus.createdAt, false)}</span>
                              </div>
                            </div>
                          </div>

                          {/* Vouchers & Action Buttons */}
                          <div className="flex items-center gap-2 shrink-0">
                            <div className="text-right">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                <Gift className="w-3 h-3 text-amber-600" />
                                {cus.freeshipVouchers} Freeship
                              </span>
                              <div className="text-[10px] text-slate-400 mt-1">
                                {customerOrders.length} đơn &bull; {totalSpent.toLocaleString('vi-VN')}đ
                              </div>
                            </div>

                            {/* Quick Delete Trash Button on Card */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmState({
                                  isOpen: true,
                                  type: 'single',
                                  customer: cus,
                                });
                              }}
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Xóa vĩnh viễn tài khoản này"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Customer Address Preview */}
                        {cus.address && (
                          <div className="mt-2 text-xs text-slate-500 truncate flex items-center gap-1 pl-8">
                            <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">
                              {cus.address}
                              {cus.district ? `, ${cus.district}` : ''}
                              {cus.city ? `, ${cus.city}` : ''}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Customer Detail View */}
              <div className="lg:col-span-5 p-4 sm:p-5 bg-slate-50/50 overflow-y-auto max-h-[55vh] lg:max-h-[60vh]">
                {selectedCustomer ? (
                  <div className="space-y-4">
                    {/* Customer Header & Quick Controls */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-12 h-12 rounded-full font-bold text-lg flex items-center justify-center shadow-md ${
                            selectedCustomer.isBlocked
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h3 className="font-bold text-base text-slate-900">
                              {selectedCustomer.name}
                            </h3>
                          </div>
                          <p className="text-xs text-slate-500 font-mono">
                            {selectedCustomer.phone}
                          </p>
                        </div>
                      </div>

                      {/* Top Action Buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setIsCustomerModalEditing(true);
                            setEditCustomerForm(selectedCustomer);
                          }}
                          className="p-1.5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs transition-colors cursor-pointer"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            setDeleteConfirmState({
                              isOpen: true,
                              type: 'single',
                              customer: selectedCustomer,
                            })
                          }
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs transition-colors cursor-pointer"
                          title="Xóa vĩnh viễn (SĐT/Gmail có thể đăng ký lại từ đầu)"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Block / Unblock Banner & Controls */}
                    <div
                      className={`p-3.5 rounded-xl border ${
                        selectedCustomer.isBlocked
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {selectedCustomer.isBlocked ? (
                            <Ban className="w-5 h-5 text-rose-600 shrink-0" />
                          ) : (
                            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                          )}
                          <div>
                            <div className="font-bold text-xs">
                              {selectedCustomer.isBlocked
                                ? 'TÀI KHOẢN ĐANG BỊ CHẶN'
                                : 'TÀI KHOẢN HOẠT ĐỘNG BÌNH THƯỜNG'}
                            </div>
                            <p className="text-[11px] opacity-80 mt-0.5">
                              {selectedCustomer.isBlocked
                                ? 'SĐT & Email này không thể đăng nhập hoặc tạo đơn mới.'
                                : 'Khách hàng có thể đăng nhập & đặt hàng không giới hạn.'}
                            </p>
                          </div>
                        </div>

                        {selectedCustomer.isBlocked ? (
                          <button
                            onClick={() => handleUnblockCustomer(selectedCustomer)}
                            disabled={isActionLoading}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all whitespace-nowrap"
                          >
                            <Unlock className="w-3.5 h-3.5 inline mr-1" />
                            Bỏ Chặn
                          </button>
                        ) : (
                          <button
                            onClick={() => handleBlockCustomer(selectedCustomer)}
                            disabled={isActionLoading}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs cursor-pointer shadow-xs transition-all whitespace-nowrap"
                          >
                            <Ban className="w-3.5 h-3.5 inline mr-1" />
                            Chặn Tài Khoản
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Freeship Voucher Controls */}
                    <div className="p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/80 rounded-xl border border-amber-200/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <Gift className="w-4 h-4 text-amber-600" />
                          <span>Mã Freeship Miễn Phí Giao Hàng</span>
                        </div>
                        <span className="font-bold font-mono text-base text-amber-900">
                          {selectedCustomer.freeshipVouchers} mã
                        </span>
                      </div>
                      <p className="text-[11px] text-amber-700">
                        Điều chỉnh số lượng voucher Freeship của khách hàng này:
                      </p>
                      <div className="flex items-center gap-1.5 pt-1">
                        <button
                          onClick={() => handleAddVouchers(selectedCustomer.phone, 1)}
                          className="flex-1 py-1.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 text-xs font-bold border border-amber-300 shadow-2xs transition-all cursor-pointer text-center"
                        >
                          +1 Mã
                        </button>
                        <button
                          onClick={() => handleAddVouchers(selectedCustomer.phone, 5)}
                          className="flex-1 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer text-center"
                        >
                          +5 Mã
                        </button>
                        <button
                          onClick={() => handleAddVouchers(selectedCustomer.phone, -1)}
                          disabled={selectedCustomer.freeshipVouchers <= 0}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 text-xs font-bold border border-slate-200 transition-all cursor-pointer text-center disabled:opacity-40"
                        >
                          -1 Mã
                        </button>
                      </div>
                    </div>

                    {/* Customer Info Form / Display */}
                    {isCustomerModalEditing ? (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 text-xs">
                        <div className="font-bold text-slate-800 flex items-center justify-between">
                          <span>Sửa thông tin khách hàng</span>
                          <button
                            onClick={() => setIsCustomerModalEditing(false)}
                            className="text-slate-400 hover:text-slate-600"
                          >
                            Hủy
                          </button>
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500">Họ và tên</label>
                          <input
                            type="text"
                            value={editCustomerForm.name || ''}
                            onChange={(e) =>
                              setEditCustomerForm({ ...editCustomerForm, name: e.target.value })
                            }
                            className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500">Email</label>
                          <input
                            type="email"
                            value={editCustomerForm.email || ''}
                            onChange={(e) =>
                              setEditCustomerForm({ ...editCustomerForm, email: e.target.value })
                            }
                            className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-medium text-slate-500">Địa chỉ</label>
                          <input
                            type="text"
                            value={editCustomerForm.address || ''}
                            onChange={(e) =>
                              setEditCustomerForm({ ...editCustomerForm, address: e.target.value })
                            }
                            className="w-full mt-1 p-2 rounded-lg border border-slate-200 text-xs"
                          />
                        </div>
                        <button
                          onClick={handleSaveCustomerProfile}
                          className="w-full py-2 rounded-lg bg-[#008764] hover:bg-emerald-700 text-white font-bold text-xs shadow-xs cursor-pointer"
                        >
                          Lưu Thông Tin Lên Firestore
                        </button>
                      </div>
                    ) : (
                      <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                        <div className="font-bold text-slate-700 flex items-center gap-1.5">
                          <User className="w-4 h-4 text-emerald-600" /> Hồ sơ chi tiết
                        </div>
                        <div className="space-y-1.5 text-slate-600 pl-5">
                          <div>
                            <strong className="text-slate-800">Họ và tên:</strong>{' '}
                            {selectedCustomer.name}
                          </div>
                          <div>
                            <strong className="text-slate-800">Số điện thoại:</strong>{' '}
                            <a
                              href={`tel:${selectedCustomer.phone}`}
                              className="text-emerald-700 font-mono hover:underline"
                            >
                              {selectedCustomer.phone}
                            </a>
                          </div>
                          <div>
                            <strong className="text-slate-800">Email:</strong>{' '}
                            {selectedCustomer.email || 'Chưa cập nhật'}
                          </div>
                          <div>
                            <strong className="text-slate-800">Địa chỉ nhận hàng:</strong>{' '}
                            {selectedCustomer.address
                              ? `${selectedCustomer.address}${
                                  selectedCustomer.district ? `, ${selectedCustomer.district}` : ''
                                }${selectedCustomer.city ? `, ${selectedCustomer.city}` : ''}`
                              : 'Chưa có địa chỉ'}
                          </div>
                          <div>
                            <strong className="text-slate-800">Ngày tạo tài khoản:</strong>{' '}
                            <span className="font-semibold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block mt-0.5">
                              {formatVietnameseDateTime(selectedCustomer.createdAt)}
                            </span>
                          </div>
                          {selectedCustomer.isBlocked && selectedCustomer.blockedAt && (
                            <div>
                              <strong className="text-slate-800">Thời gian bị chặn:</strong>{' '}
                              <span className="font-semibold text-rose-800 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 inline-block mt-0.5">
                                {formatVietnameseDateTime(selectedCustomer.blockedAt)}
                              </span>
                            </div>
                          )}
                          {selectedCustomer.lastLoginAt && (
                            <div>
                              <strong className="text-slate-800">Đăng nhập gần nhất:</strong>{' '}
                              <span className="text-slate-600 font-medium">
                                {formatVietnameseDateTime(selectedCustomer.lastLoginAt)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Order History for this customer */}
                    {(() => {
                      const customerHistoryOrders = getCustomerOrders(
                        selectedCustomer.phone,
                        selectedCustomer.email
                      );
                      return (
                        <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                          <div className="font-bold text-slate-700 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <ShoppingBag className="w-4 h-4 text-emerald-600" />
                              <span>Lịch sử đơn hàng của khách này</span>
                            </div>
                            <span className="text-slate-400 font-normal">
                              {customerHistoryOrders.length} đơn
                            </span>
                          </div>

                          <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto">
                            {customerHistoryOrders.length === 0 ? (
                              <div className="py-3 text-center text-slate-400 text-[11px]">
                                Khách hàng này chưa phát sinh đơn hàng nào
                              </div>
                            ) : (
                              customerHistoryOrders.map((ord) => (
                                <div
                                  key={ord.id}
                                  onClick={() => {
                                    setSelectedOrder(ord);
                                    setActiveTab('orders');
                                  }}
                                  className="py-2 flex items-center justify-between gap-2 hover:bg-slate-50 p-1.5 rounded-lg cursor-pointer transition-colors"
                                >
                                  <div>
                                    <div className="font-mono font-bold text-slate-900">
                                      #{ord.id}
                                    </div>
                                    <div className="text-[11px] text-slate-500 font-medium">
                                      {formatVietnameseDateTime(ord.createdAt)}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="font-mono font-bold text-emerald-700">
                                      {(ord.total || 0).toLocaleString('vi-VN')}đ
                                    </div>
                                    <div>{getStatusBadge(ord.status)}</div>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <User className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chọn một khách hàng để xem & quản lý</p>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Bạn có thể chọn từng khách hàng để khóa/mở khóa hoặc tích chọn nhiều tài khoản để thao tác hàng loạt
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: TELEGRAM BOT INTEGRATION CONFIG & TUTORIAL */}
        {/* ======================================================== */}
        {activeTab === 'telegram' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 bg-slate-50/50">
            {/* Connection Banner */}
            <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white rounded-2xl p-5 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                  <Send className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg">
                    Cấu Hình Thông Báo Tự Động Qua Telegram Bot
                  </h3>
                  <p className="text-xs text-sky-100 mt-0.5">
                    Nhận thông báo ngay lập tức về điện thoại mỗi khi có Khách hàng mới đăng ký & Đơn hàng mới phát sinh.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {telegramConfig.botToken && telegramConfig.chatId ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-700 font-bold text-xs shadow-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    Đã cấu hình
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 text-amber-950 font-bold text-xs shadow-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Chưa kết nối
                  </span>
                )}
              </div>
            </div>

            {/* Config Form Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Form settings */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
                  <Key className="w-4 h-4 text-sky-600" /> Thông Tin Kết Nối API Telegram
                </h4>

                {/* Bot Token input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Telegram Bot Token <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showBotToken ? 'text' : 'password'}
                      placeholder="Ví dụ: 7891234567:AAHxyzabcdef123456..."
                      value={telegramConfig.botToken}
                      onChange={(e) =>
                        setTelegramConfig({ ...telegramConfig, botToken: e.target.value.trim() })
                      }
                      className="w-full pr-10 pl-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBotToken(!showBotToken)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showBotToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nhận từ <code>@BotFather</code> khi tạo bot.
                  </p>
                </div>

                {/* Chat ID input */}
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Telegram Chat ID (Cá nhân hoặc Nhóm) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ví dụ: 987654321 (cá nhân) hoặc -1001234567890 (nhóm)"
                    value={telegramConfig.chatId}
                    onChange={(e) =>
                      setTelegramConfig({ ...telegramConfig, chatId: e.target.value.trim() })
                    }
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50 focus:bg-white"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Nhận từ <code>@userinfobot</code> hoặc ID của nhóm Telegram.
                  </p>
                </div>

                {/* Triggers selection */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-700 mb-1">
                    Loại thông báo kích hoạt:
                  </div>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={telegramConfig.enabledNewCustomer}
                      onChange={(e) =>
                        setTelegramConfig({
                          ...telegramConfig,
                          enabledNewCustomer: e.target.checked,
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Thông báo khi có <strong>Khách hàng mới đăng ký tài khoản</strong></span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={telegramConfig.enabledNewOrder}
                      onChange={(e) =>
                        setTelegramConfig({
                          ...telegramConfig,
                          enabledNewOrder: e.target.checked,
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Thông báo khi có <strong>Đơn hàng mới được đặt</strong></span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer p-2 rounded-lg hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={telegramConfig.enabledCancelOrder ?? true}
                      onChange={(e) =>
                        setTelegramConfig({
                          ...telegramConfig,
                          enabledCancelOrder: e.target.checked,
                        })
                      }
                      className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4 cursor-pointer"
                    />
                    <span>Thông báo khi có <strong>Đơn hàng bị hủy</strong> (từ khách hoặc admin)</span>
                  </label>
                </div>

                {/* Test Result Feedback */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
                      testResult.success
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <span className="font-medium">{testResult.message}</span>
                  </div>
                )}

                {saveSuccessMsg && (
                  <div className="p-3 rounded-xl text-xs bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    {saveSuccessMsg}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleTestTelegram}
                    disabled={isTestingTelegram || !telegramConfig.botToken || !telegramConfig.chatId}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isTestingTelegram ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                    ) : (
                      <Send className="w-4 h-4 text-sky-600" />
                    )}
                    <span>Gửi Tin Nhắn Thử Nghiệm</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveTelegram}
                    disabled={isSavingTelegram}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4" />
                    <span>Lưu Cấu Hình Lên Cloud</span>
                  </button>
                </div>
              </div>

              {/* Step by Step Visual Guide */}
              <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2 border-b pb-3">
                  <Info className="w-4 h-4 text-sky-600" /> Hướng Dẫn Chi Tiết Cách Kết Nối (3 Bước)
                </h4>

                <div className="space-y-4 text-xs text-slate-600">
                  {/* Step 1 */}
                  <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 space-y-1">
                    <div className="font-bold text-sky-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[11px] font-bold flex items-center justify-center">
                        1
                      </span>
                      <span>Tạo Telegram Bot miễn phí với @BotFather</span>
                    </div>
                    <p className="pl-6 text-[11px] text-slate-600 leading-relaxed">
                      1. Mở ứng dụng Telegram, tìm kiếm <strong>@BotFather</strong> (có tích xanh).<br />
                      2. Gõ lệnh <code>/newbot</code> và gửi.<br />
                      3. Đặt tên hiển thị cho bot (VD: <em>TINGO Store Notifier</em>) và username kết thúc bằng chữ "bot" (VD: <em>tingo_order_bot</em>).<br />
                      4. Sao chép chuỗi <strong>HTTP API Token</strong> dài (VD: <code>7891234567:AAHxyz...</code>) dán vào ô <strong>Telegram Bot Token</strong> ở bên trái.
                    </p>
                  </div>

                  {/* Step 2 */}
                  <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 space-y-1">
                    <div className="font-bold text-amber-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                        2
                      </span>
                      <span>Lấy Chat ID của bạn (hoặc Nhóm Chat)</span>
                    </div>
                    <p className="pl-6 text-[11px] text-slate-600 leading-relaxed">
                      • <strong>Nhận tin nhắn riêng vào tài khoản cá nhân:</strong> Tìm bot <strong>@userinfobot</strong> trên Telegram, bấm <code>/start</code>. Bạn sẽ thấy dòng <code>Id: 123456789</code> &rarr; Sao chép số này dán vào ô <strong>Chat ID</strong>.<br />
                      <strong className="text-amber-800">⚠️ RẤT QUAN TRỌNG:</strong> Bạn phải tìm con Bot bạn vừa tạo ở Bước 1 và bấm <code>/start</code> với nó ít nhất 1 lần để cho phép bot gửi tin nhắn cho bạn.<br />
                      • <strong>Nhận tin nhắn vào Nhóm Telegram:</strong> Thêm Bot vào nhóm, cấp quyền Admin cho bot, sau đó lấy Group Chat ID (thường có dấu trừ phía trước, VD: <code>-1001234567890</code>).
                    </p>
                  </div>

                  {/* Step 3 */}
                  <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
                    <div className="font-bold text-emerald-900 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[11px] font-bold flex items-center justify-center">
                        3
                      </span>
                      <span>Kiểm tra & Lưu cấu hình</span>
                    </div>
                    <p className="pl-6 text-[11px] text-slate-600 leading-relaxed">
                      Bấm nút <strong>"Gửi Tin Nhắn Thử Nghiệm"</strong>. Nếu điện thoại bạn nhận được tin nhắn từ Bot &rarr; Bấm tiếp <strong>"Lưu Cấu Hình Lên Cloud"</strong>. Kể từ giờ, mọi đơn hàng mới hoặc khách hàng mới đều sẽ tự động báo về Telegram!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Firestore Database: <strong>ai-studio-tingodinhdngsngt-a34b6c3b</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer transition-colors"
          >
            Đóng bảng
          </button>
        </div>
      </div>

      {/* Modal Add New Customer */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" /> Thêm Khách Hàng Mới
              </h3>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Nguyễn Văn An"
                  value={newCustomerForm.name}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, name: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số điện thoại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  placeholder="0912345678"
                  value={newCustomerForm.phone}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email (tùy chọn)</label>
                <input
                  type="email"
                  placeholder="khachhang@gmail.com"
                  value={newCustomerForm.email}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, email: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Địa chỉ giao hàng</label>
                <input
                  type="text"
                  placeholder="Số 123 Đường ABC..."
                  value={newCustomerForm.address}
                  onChange={(e) =>
                    setNewCustomerForm({ ...newCustomerForm, address: e.target.value })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Số mã Freeship tặng ban đầu
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={newCustomerForm.freeshipVouchers}
                  onChange={(e) =>
                    setNewCustomerForm({
                      ...newCustomerForm,
                      freeshipVouchers: Number(e.target.value) || 0,
                    })
                  }
                  className="w-full p-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#008764] hover:bg-emerald-700 text-white font-bold shadow-md cursor-pointer"
                >
                  Tạo Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Action Toast Notification */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-[9999] max-w-md animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div
            className={`p-4 rounded-2xl shadow-2xl flex items-start gap-3 border ${
              actionToast.type === 'success'
                ? 'bg-emerald-900/95 text-white border-emerald-500/50 backdrop-blur-md'
                : 'bg-rose-900/95 text-white border-rose-500/50 backdrop-blur-md'
            }`}
          >
            {actionToast.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {actionToast.message}
            </div>
            <button
              onClick={() => setActionToast(null)}
              className="text-white/70 hover:text-white text-xs font-bold px-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmState?.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-lg font-black text-slate-900 font-display mb-2">
              {deleteConfirmState.type === 'single'
                ? 'Xác nhận xóa vĩnh viễn tài khoản'
                : `Xóa hàng loạt (${deleteConfirmState.count} tài khoản)`}
            </h3>

            <div className="text-xs text-slate-600 space-y-2 mb-6 leading-relaxed">
              {deleteConfirmState.type === 'single' && deleteConfirmState.customer ? (
                <>
                  <p>
                    Bạn có chắc chắn muốn xóa tài khoản của{' '}
                    <strong className="text-slate-900 font-bold">
                      {deleteConfirmState.customer.name}
                    </strong>{' '}
                    (SĐT:{' '}
                    <span className="font-mono font-bold text-slate-900">
                      {deleteConfirmState.customer.phone}
                    </span>
                    {deleteConfirmState.customer.email ? ` • ${deleteConfirmState.customer.email}` : ''})?
                  </p>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px]">
                    ⚠️ Sau khi xóa, tất cả dữ liệu tài khoản sẽ được dọn sạch khỏi Firestore & LocalStorage. Số điện thoại & Gmail này coi như <strong>chưa từng đăng ký</strong> và có thể đăng ký mới lại từ đầu.
                  </div>
                </>
              ) : (
                <>
                  <p>
                    Bạn đang chuẩn bị xóa vĩnh viễn{' '}
                    <strong className="text-rose-600 font-bold">
                      {deleteConfirmState.count} tài khoản
                    </strong>{' '}
                    đã chọn.
                  </p>
                  <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-rose-800 text-[11px]">
                    ⚠️ Thao tác này không thể hoàn tác. Toàn bộ các SĐT & Gmail được chọn sẽ được gỡ bỏ hoàn toàn khỏi hệ thống và có thể đăng ký mới lại bình thường.
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => setDeleteConfirmState(null)}
                className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={isActionLoading}
                onClick={() => {
                  if (deleteConfirmState.type === 'single' && deleteConfirmState.customer) {
                    executeDeleteCustomer(
                      deleteConfirmState.customer.phone,
                      deleteConfirmState.customer.email
                    );
                  } else if (deleteConfirmState.type === 'bulk') {
                    executeBulkDelete();
                  }
                }}
                className="flex-1 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-98 text-white font-bold text-xs shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                {isActionLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang xóa...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Xóa Vĩnh Viễn</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
