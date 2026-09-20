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
  Award
} from 'lucide-react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  doc,
  updateDoc,
  deleteDoc,
  setDoc
} from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Order, OrderStatus, CustomerUser } from '../../types';

interface AdminOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  localOrders: Order[];
  defaultTab?: 'orders' | 'customers';
}

export const AdminOrdersModal: React.FC<AdminOrdersModalProps> = ({
  isOpen,
  onClose,
  localOrders,
  defaultTab = 'orders',
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'customers'>(defaultTab);

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
  const [isCustomerModalEditing, setIsCustomerModalEditing] = useState(false);
  const [editCustomerForm, setEditCustomerForm] = useState<Partial<CustomerUser>>({});
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: 'Hồ Chí Minh',
    district: 'Quận 1',
    freeshipVouchers: 5,
  });

  const [isFirebaseConnected, setIsFirebaseConnected] = useState(true);

  // Real-time Firestore synchronization for Orders
  useEffect(() => {
    if (!isOpen) return;

    try {
      const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setIsFirebaseConnected(true);
          const firebaseOrders: Order[] = [];
          snapshot.forEach((docSnap) => {
            firebaseOrders.push({
              ...(docSnap.data() as Order),
              id: docSnap.id,
            });
          });

          // Only sync real orders from Firestore, do not inject fake orders
          setOrders(firebaseOrders);
        },
        (error) => {
          console.warn('Firestore orders real-time subscription note:', error);
          setOrders([]);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Firebase order listener fallback', err);
      setOrders([]);
    }
  }, [isOpen]);

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
              createdAt: data.createdAt || data.lastOrderAt || new Date().toISOString(),
            });
          });

          setCustomers(loadedCustomers);
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

  // Filter Customers
  const filteredCustomers = customers.filter((cus) => {
    const q = customerSearchTerm.toLowerCase();
    return (
      cus.name.toLowerCase().includes(q) ||
      cus.phone.includes(q) ||
      (cus.email && cus.email.toLowerCase().includes(q)) ||
      (cus.address && cus.address.toLowerCase().includes(q))
    );
  });

  const totalRevenue = orders
    .filter((o) => o.status !== 'cancelled')
    .reduce((acc, o) => acc + (o.total || 0), 0);

  // Orders Actions
  const handleUpdateStatus = async (orderId: string, newStatus: OrderStatus) => {
    setIsUpdatingOrder(true);
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      });
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null));
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

  // Customers Actions
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
      setIsCustomerModalEditing(false);
    } catch (err) {
      console.error('Failed to save customer', err);
    }
  };

  const handleDeleteCustomer = async (phone: string) => {
    if (!confirm(`Bạn có chắc muốn xóa tài khoản khách hàng số ${phone} khỏi Firestore?`)) return;
    try {
      await deleteDoc(doc(db, 'customers', phone));
      setCustomers((prev) => prev.filter((c) => c.phone !== phone));
      if (selectedCustomer?.phone === phone) setSelectedCustomer(null);
    } catch (err) {
      console.error('Failed to delete customer', err);
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
      createdAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(db, 'customers', cleanPhone), newCus);
      setCustomers((prev) => [newCus, ...prev.filter((c) => c.phone !== cleanPhone)]);
      setSelectedCustomer(newCus);
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">
                  Quản Trị Firebase Firestore
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Real-time Cloud Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Đồng bộ trực tiếp Đơn hàng ({orders.length}) & Tài khoản Khách hàng ({customers.length})
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
        <div className="px-4 bg-slate-100 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2 pt-2">
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
              <span>Tài Khoản Khách Hàng ({customers.length})</span>
            </button>
          </div>

          {activeTab === 'customers' && (
            <button
              onClick={() => setIsNewCustomerModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#008764] hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all cursor-pointer mb-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Khách Hàng</span>
            </button>
          )}
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

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 text-xs">
                {(
                  ['all', 'pending', 'processing', 'shipping', 'delivered', 'cancelled'] as const
                ).map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all shrink-0 cursor-pointer ${
                      statusFilter === st
                        ? 'bg-[#008764] text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
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
                      ? 'Đã xong'
                      : 'Đã hủy'}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Content Body */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-hidden">
              {/* Order List */}
              <div className="lg:col-span-7 overflow-y-auto max-h-[55vh] lg:max-h-[60vh] p-3 space-y-2">
                {filteredOrders.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm">Không tìm thấy đơn hàng nào</p>
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
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-xs text-slate-900">
                                #{ord.id}
                              </span>
                              {getStatusBadge(ord.status)}
                            </div>
                            <div className="font-semibold text-slate-800 text-sm mt-1 truncate">
                              {ord.customerName} &bull;{' '}
                              <span className="text-slate-500 font-normal">
                                {ord.customerPhone}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="font-bold text-sm text-[#008764] font-mono">
                              {(ord.total || 0).toLocaleString('vi-VN')}đ
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {ord.createdAt}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                          <span className="truncate max-w-[280px]">
                            {ord.items.length} món &bull; {ord.shippingAddress}
                          </span>
                          <span className="text-emerald-700 font-medium shrink-0 flex items-center gap-0.5">
                            Chi tiết <ChevronRight className="w-3.5 h-3.5" />
                          </span>
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
                        <span className="text-xs text-slate-400">Chi tiết đơn hàng</span>
                        <h3 className="font-mono font-bold text-lg text-slate-900">
                          #{selectedOrder.id}
                        </h3>
                      </div>
                      <div>{getStatusBadge(selectedOrder.status)}</div>
                    </div>

                    {/* Quick Status Updater */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                      <label className="text-xs font-bold text-slate-600 block">
                        Cập nhật trạng thái giao hàng:
                      </label>
                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        {(
                          [
                            { id: 'pending', label: 'Chờ xử lý' },
                            { id: 'processing', label: 'Đang chuẩn bị' },
                            { id: 'shipping', label: 'Đang giao hàng' },
                            { id: 'delivered', label: 'Đã hoàn thành' },
                            { id: 'cancelled', label: 'Hủy đơn' },
                          ] as const
                        ).map((st) => (
                          <button
                            key={st.id}
                            onClick={() => handleUpdateStatus(selectedOrder.id, st.id)}
                            disabled={isUpdatingOrder}
                            className={`py-1.5 px-2 rounded-lg font-medium transition-all text-center cursor-pointer ${
                              selectedOrder.status === st.id
                                ? 'bg-[#008764] text-white font-bold'
                                : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                            }`}
                          >
                            {st.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Customer Info */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 flex items-center gap-1.5">
                        <User className="w-4 h-4 text-emerald-600" /> Thông tin người nhận
                      </div>
                      <div className="space-y-1 text-slate-600 pl-5">
                        <div>
                          <strong className="text-slate-800">Tên:</strong>{' '}
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
                              -
                              {(selectedOrder.discountAmount || 0).toLocaleString('vi-VN')}
                              đ
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
        {/* TAB 2: CUSTOMERS MANAGEMENT */}
        {/* ======================================================== */}
        {activeTab === 'customers' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Search & Overview bar */}
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-center justify-between bg-slate-50/70">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Tìm theo tên, SĐT, email, địa chỉ..."
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008764] bg-white"
                />
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 font-medium border border-emerald-100">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Tổng: <strong>{customers.length}</strong> khách hàng</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 text-amber-800 font-medium border border-amber-100">
                  <Gift className="w-4 h-4 text-amber-600" />
                  <span>
                    Tổng voucher: <strong>
                      {customers.reduce((sum, c) => sum + (c.freeshipVouchers || 0), 0)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Customers Master-Detail Split */}
            <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 overflow-hidden">
              {/* Customer List */}
              <div className="lg:col-span-7 overflow-y-auto max-h-[55vh] lg:max-h-[60vh] p-3 space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                    <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chưa có khách hàng nào</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Khách hàng đăng nhập hoặc đặt đơn sẽ tự động xuất hiện tại đây
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
                    const customerOrders = orders.filter(
                      (o) => o.customerPhone === cus.phone
                    );
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
                          isSelected
                            ? 'bg-emerald-50/80 border-emerald-500 shadow-sm'
                            : 'bg-white hover:bg-slate-50 border-slate-200/80 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs shrink-0 border border-emerald-200">
                              {cus.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 text-sm truncate">
                                {cus.name}
                              </div>
                              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span className="font-mono">{cus.phone}</span>
                              </div>
                            </div>
                          </div>

                          {/* Freeship voucher badge */}
                          <div className="text-right shrink-0">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Gift className="w-3 h-3 text-amber-600" />
                              {cus.freeshipVouchers} Freeship
                            </span>
                            <div className="text-[10px] text-slate-400 mt-1">
                              {customerOrders.length} đơn &bull; {totalSpent.toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        </div>

                        {/* Customer Address Preview */}
                        {cus.address && (
                          <div className="mt-2 text-xs text-slate-500 truncate flex items-center gap-1">
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
                    {/* Customer Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shadow-md">
                          {selectedCustomer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-bold text-base text-slate-900">
                            {selectedCustomer.name}
                          </h3>
                          <p className="text-xs text-slate-500 font-mono">
                            {selectedCustomer.phone}
                          </p>
                        </div>
                      </div>

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
                          onClick={() => handleDeleteCustomer(selectedCustomer.phone)}
                          className="p-1.5 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 text-xs transition-colors cursor-pointer"
                          title="Xóa khách hàng"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
                        </div>
                      </div>
                    )}

                    {/* Order History for this customer */}
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 text-xs">
                      <div className="font-bold text-slate-700 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <ShoppingBag className="w-4 h-4 text-emerald-600" />
                          <span>Lịch sử đơn hàng của khách này</span>
                        </div>
                        <span className="text-slate-400 font-normal">
                          {orders.filter((o) => o.customerPhone === selectedCustomer.phone).length}{' '}
                          đơn
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {orders.filter((o) => o.customerPhone === selectedCustomer.phone).length ===
                        0 ? (
                          <div className="py-3 text-center text-slate-400 text-[11px]">
                            Khách hàng này chưa phát sinh đơn hàng nào
                          </div>
                        ) : (
                          orders
                            .filter((o) => o.customerPhone === selectedCustomer.phone)
                            .map((ord) => (
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
                                  <div className="text-[11px] text-slate-400">{ord.createdAt}</div>
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
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                    <User className="w-10 h-10 mb-2 text-slate-300" />
                    <p className="text-sm font-medium">Chọn một khách hàng để xem chi tiết</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>
              Firestore Database: <strong>ai-studio-tingodinhdngsngt-a34b6c3b</strong>
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold cursor-pointer"
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
    </div>
  );
};
