import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  MapPin,
  Gift,
  Truck,
  Package,
  Clock,
  CheckCircle2,
  Lock,
  LogOut,
  Save,
  AlertCircle,
  ShieldCheck,
  Tag,
  ChevronRight,
  XCircle,
} from 'lucide-react';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { Order } from '../types';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { formatVietnameseDateTime } from '../utils/dateFormatter';

interface CustomerProfileModalProps {
  onOpenTracking?: (order?: Order) => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({ onOpenTracking }) => {
  const {
    customer,
    isLoggedIn,
    isProfileModalOpen,
    closeProfileModal,
    logoutCustomer,
    updateCustomerProfile,
    changePassword,
    getAvailableVouchers,
  } = useCustomerAuth();

  const [activeTab, setActiveTab] = useState<'orders' | 'vouchers' | 'profile' | 'security'>('orders');

  // Profile Edit State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [district, setDistrict] = useState('Quận 1');
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Security / Password State
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securitySuccess, setSecuritySuccess] = useState<string | null>(null);
  const [isChangingPass, setIsChangingPass] = useState(false);

  // User's isolated personal orders
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setEmail(customer.email || '');
      setAddress(customer.address || '');
      setCity(customer.city || 'Hồ Chí Minh');
      setDistrict(customer.district || 'Quận 1');
    }
  }, [customer]);

  // Fetch only this customer's real orders
  useEffect(() => {
    if (!isProfileModalOpen || !customer?.phone) return;

    const fetchMyOrders = async () => {
      setIsLoadingOrders(true);
      try {
        const cleanPhone = customer.phone.replace(/[\s.-]/g, '');
        const q = query(
          collection(db, 'orders'),
          where('customerPhone', '==', cleanPhone),
          orderBy('createdAt', 'desc')
        );
        const snap = await getDocs(q);
        const ordersList: Order[] = [];
        snap.forEach((d) => {
          ordersList.push({ ...(d.data() as Order), id: d.id });
        });
        setUserOrders(ordersList);
      } catch (err) {
        console.warn('Orders query note (falling back without compound index if needed):', err);
        try {
          // Fallback query by phone without orderBy
          const fallbackQ = query(
            collection(db, 'orders'),
            where('customerPhone', '==', customer.phone)
          );
          const snap2 = await getDocs(fallbackQ);
          const ordersList2: Order[] = [];
          snap2.forEach((d) => {
            ordersList2.push({ ...(d.data() as Order), id: d.id });
          });
          setUserOrders(ordersList2);
        } catch {
          setUserOrders([]);
        }
      } finally {
        setIsLoadingOrders(false);
      }
    };

    fetchMyOrders();
  }, [isProfileModalOpen, customer?.phone]);

  if (!isProfileModalOpen || !isLoggedIn || !customer) return null;

  const vouchers = getAvailableVouchers();

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccess(null);
    if (!name.trim() || name.trim().length < 3) return;

    setIsSavingProfile(true);
    try {
      await updateCustomerProfile({
        name: name.trim(),
        email: email.trim(),
        address: address.trim(),
        city,
        district,
      });
      setProfileSuccess('Đã cập nhật thông tin cá nhân thành công!');
      setTimeout(() => setProfileSuccess(null), 3500);
    } catch {
      // handled
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityError(null);
    setSecuritySuccess(null);

    if (!oldPassword.trim()) {
      setSecurityError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (newPassword.length < 6) {
      setSecurityError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsChangingPass(true);
    const res = await changePassword(oldPassword, newPassword);
    setIsChangingPass(false);

    if (res.success) {
      setSecuritySuccess('Đổi mật khẩu thành công!');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setSecuritySuccess(null), 3500);
    } else {
      setSecurityError(res.error || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-hidden shadow-2xl border border-emerald-100 flex flex-col relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Visual Banner */}
        <div className="bg-gradient-to-br from-[#0a2f24] via-[#008874] to-[#005c4b] p-5 sm:p-6 text-white relative">
          <button
            onClick={closeProfileModal}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3.5 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center text-white text-lg font-black shadow-inner">
              {customer.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  Thành Viên Thân Thiết
                </span>
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-400/30">
                  {customer.freeshipVouchers} Mã Freeship
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-display text-white mt-0.5">
                {customer.name}
              </h3>
              <p className="text-xs text-emerald-100/80 font-mono">{customer.phone}</p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="grid grid-cols-4 gap-1.5 mt-4 p-1 bg-black/25 rounded-2xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'orders'
                  ? 'bg-white text-[#008874] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Đơn Hàng</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('vouchers')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'vouchers'
                  ? 'bg-white text-[#008874] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Ví Ưu Đãi</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('profile')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'profile'
                  ? 'bg-white text-[#008874] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Địa Chỉ</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('security')}
              className={`py-2 px-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'security'
                  ? 'bg-white text-[#008874] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <Lock className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Mật Khẩu</span>
            </button>
          </div>
        </div>

        {/* Tab Body Contents */}
        <div className="p-5 sm:p-6 overflow-y-auto max-h-[calc(92vh-220px)] space-y-4">
          {/* TAB 1: USER'S ORDERS */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Lịch Sử Đơn Hàng Của Bạn ({userOrders.length})
                </h4>
                <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
                  Dữ liệu cá nhân bảo mật
                </span>
              </div>

              {isLoadingOrders ? (
                <div className="text-center py-10 text-xs text-slate-500">
                  <Clock className="w-6 h-6 animate-spin mx-auto mb-2 text-[#008874]" />
                  <span>Đang tải danh sách đơn hàng...</span>
                </div>
              ) : userOrders.length === 0 ? (
                <div className="text-center py-12 px-4 bg-slate-50/70 rounded-3xl border border-dashed border-slate-200">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Bạn chưa có đơn hàng nào</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Hãy dạo cửa hàng và sử dụng mã Freeship để đặt đơn hàng đầu tiên nhé!
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {userOrders.map((ord) => (
                    <div
                      key={ord.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 shadow-xs transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#008874] font-mono">
                              #{ord.id}
                            </span>
                            {ord.status === 'cancelled' ? (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <XCircle className="w-3 h-3" /> Đã hủy
                              </span>
                            ) : (
                              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                {ord.status === 'pending' && 'Chờ xác nhận'}
                                {ord.status === 'processing' && 'Đang đóng gói'}
                                {ord.status === 'shipping' && 'Đang vận chuyển'}
                                {ord.status === 'delivered' && 'Đã giao thành công'}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {formatVietnameseDateTime(ord.createdAt)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-black text-rose-600">
                            {ord.total.toLocaleString('vi-VN')}₫
                          </span>
                          <span className="text-[10px] block text-slate-400">
                            {ord.items.length} món • {ord.paymentMethod.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      {/* Items list */}
                      <div className="space-y-1.5 text-xs text-slate-700">
                        {ord.items.map((it, idx) => (
                          <div key={idx} className="flex items-center justify-between text-[12px]">
                            <span className="truncate max-w-[280px]">
                              {it.quantity}x {it.product.name}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {(it.product.price * it.quantity).toLocaleString('vi-VN')}₫
                            </span>
                          </div>
                        ))}
                      </div>

                      {/* Delivery address */}
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                        <div className="flex items-center gap-1.5 truncate max-w-[340px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{ord.shippingAddress}</span>
                        </div>
                        {onOpenTracking && (
                          <button
                            onClick={() => {
                              closeProfileModal();
                              onOpenTracking(ord);
                            }}
                            className="text-[#008874] font-bold hover:underline shrink-0 cursor-pointer"
                          >
                            Chi tiết hành trình →
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: VOUCHERS */}
          {activeTab === 'vouchers' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ví Ưu Đãi Của Bạn
                </h4>
                <span className="text-[11px] text-emerald-800 font-bold">
                  {customer.freeshipVouchers} Lượt Freeship Còn Lại
                </span>
              </div>

              <div className="space-y-2.5">
                {vouchers.map((v) => (
                  <div
                    key={v.code}
                    className="p-3.5 rounded-2xl bg-gradient-to-r from-emerald-50/90 to-teal-50/70 border border-emerald-200/80 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#008874] text-white flex items-center justify-center shrink-0">
                        {v.type === 'freeship' ? <Truck className="w-5 h-5" /> : <Tag className="w-5 h-5" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-xs text-[#008874] bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                            {v.code}
                          </span>
                          <span className="text-xs font-bold text-slate-800">{v.title}</span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">{v.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
                <Gift className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  Các mã giảm giá và Freeship sẽ được tự động áp dụng hoặc chọn tại bước thanh toán khi quý khách mua hàng.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: PROFILE & DEFAULT ADDRESS */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Thông Tin Khách Hàng & Giao Hàng Mặc Định
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Số điện thoại (Cố định theo tài khoản)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customer.phone}
                    disabled
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 text-sm text-slate-500 font-mono cursor-not-allowed"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email nhận thông báo hóa đơn
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Địa chỉ nhận hàng mặc định
                </label>
                <div className="relative mb-2">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Số nhà, tên đường, phường/xã..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  >
                    <option value="Hồ Chí Minh">Hồ Chí Minh</option>
                    <option value="Hà Nội">Hà Nội</option>
                    <option value="Đà Nẵng">Đà Nẵng</option>
                    <option value="Cần Thơ">Cần Thơ</option>
                    <option value="Hải Phòng">Hải Phòng</option>
                    <option value="Bình Dương">Bình Dương</option>
                    <option value="Đồng Nai">Đồng Nai</option>
                    <option value="Tỉnh Thành Khác">Tỉnh Thành Khác</option>
                  </select>

                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  >
                    <option value="Quận 1">Quận 1</option>
                    <option value="Quận 3">Quận 3</option>
                    <option value="Quận 7">Quận 7</option>
                    <option value="Quận Bình Thạnh">Quận Bình Thạnh</option>
                    <option value="TP. Thủ Đức">TP. Thủ Đức</option>
                    <option value="Quận Cầu Giấy">Quận Cầu Giấy</option>
                    <option value="Quận Hoàn Kiếm">Quận Hoàn Kiếm</option>
                    <option value="Quận / Huyện Khác">Quận / Huyện Khác</option>
                  </select>
                </div>
              </div>

              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full py-3 rounded-xl bg-[#008874] hover:bg-[#007052] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md shadow-emerald-900/10"
              >
                <Save className="w-4 h-4" />
                <span>{isSavingProfile ? 'Đang lưu...' : 'Lưu Thay Đổi Thông Tin'}</span>
              </button>
            </form>
          )}

          {/* TAB 4: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Đổi Mật Khẩu Tài Khoản
              </h4>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu hiện tại <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="Nhập mật khẩu đang dùng..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Xác nhận lại mật khẩu mới <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>

              {securityError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{securityError}</span>
                </div>
              )}

              {securitySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{securitySuccess}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isChangingPass}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
              >
                <Lock className="w-4 h-4 text-amber-400" />
                <span>{isChangingPass ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}</span>
              </button>
            </form>
          )}
        </div>

        {/* Footer with Logout and Privacy Guarantee */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span className="text-[11px]">Bảo mật riêng tư 100% giữa các khách hàng</span>
          </div>

          <button
            onClick={() => {
              closeProfileModal();
              logoutCustomer();
            }}
            className="flex items-center gap-1 text-rose-600 font-bold hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </div>
  );
};
