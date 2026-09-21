import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Package,
  CheckCircle2,
  Clock,
  MapPin,
  AlertCircle,
  ShieldCheck,
  Lock,
  Trash2,
  XCircle,
  Truck,
  RefreshCw,
  Gift,
  ArrowRight,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyCancelOrder } from '../lib/telegram';
import { formatVietnameseDateTime } from '../utils/dateFormatter';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';
import { getSynchronizedTimeline } from '../utils/orderTimelineHelper';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentOrders: Order[];
  initialOrder?: Order | null;
  onOrderCancelled?: (order: Order) => void;
}

const CANCEL_REASONS = [
  'Tôi đổi ý, tạm thời chưa muốn mua',
  'Muốn thay đổi địa chỉ hoặc số điện thoại nhận hàng',
  'Muốn thay đổi số lượng hoặc thêm bớt sản phẩm trong giỏ',
  'Tìm thấy sản phẩm khác phù hợp hơn',
  'Đặt trùng đơn hàng / nhầm lẫn thông tin',
  'Lý do khác (Nhập chi tiết bên dưới)',
];

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  recentOrders,
  initialOrder = null,
  onOrderCancelled,
}) => {
  const { customer, isLoggedIn, openAuthModal, refundFreeshipVoucher } = useCustomerAuth();
  const [orderCode, setOrderCode] = useState('');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // Cancel order modal / form state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<Order | null>(null);
  const [selectedReason, setSelectedReason] = useState<string>(CANCEL_REASONS[0]);
  const [customReasonText, setCustomReasonText] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrder) {
      // Find fresh copy from recentOrders if available
      const fresh = recentOrders.find((o) => o.id === initialOrder.id);
      setSearchedOrder(fresh || initialOrder);
    } else {
      setSearchedOrder(null);
    }
    setSearchError(null);
    setCancelSuccessMsg(null);
    setIsCancelModalOpen(false);
    setOrderToCancel(null);
  }, [initialOrder, isOpen]);

  // Keep searchedOrder in sync with recentOrders updates
  useEffect(() => {
    if (searchedOrder) {
      const updated = recentOrders.find((o) => o.id === searchedOrder.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(searchedOrder)) {
        setSearchedOrder(updated);
      }
    }
  }, [recentOrders]);

  if (!isOpen) return null;

  // Filter orders strictly for the logged in customer & deduplicate by ID
  const rawMyOrders =
    isLoggedIn && customer?.phone
      ? recentOrders.filter(
          (o) =>
            o.customerPhone.replace(/[\s.-]/g, '') === customer.phone.replace(/[\s.-]/g, '') ||
            (customer.email &&
              o.customerEmail &&
              o.customerEmail.toLowerCase() === customer.email.toLowerCase())
        )
      : [];

  const seenIds = new Set<string>();
  const myOrders: Order[] = [];
  rawMyOrders.forEach((o) => {
    if (o && o.id && !seenIds.has(o.id)) {
      seenIds.add(o.id);
      myOrders.push(o);
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setCancelSuccessMsg(null);
    const cleanCode = orderCode.trim().toUpperCase().replace('#', '');
    const cleanPhone = verifyPhone.trim().replace(/[\s.-]/g, '');

    if (!cleanCode) {
      setSearchError('Vui lòng nhập Mã đơn hàng (VD: TIN-12345).');
      return;
    }

    // Privacy Protection Rule:
    // If not logged in as the order owner, must provide recipient phone number
    if (!isLoggedIn && !cleanPhone) {
      setSearchError(
        'Vì lý do bảo mật riêng tư, quý khách vui lòng nhập Số điện thoại nhận hàng để xác thực.'
      );
      return;
    }

    const found = recentOrders.find((o) => {
      const matchCode = o.id.toUpperCase() === cleanCode;
      if (!matchCode) return false;

      // If logged in customer owns this order, allow view
      if (
        isLoggedIn &&
        customer &&
        (o.customerPhone.replace(/[\s.-]/g, '') === customer.phone.replace(/[\s.-]/g, '') ||
          o.customerEmail === customer.email)
      ) {
        return true;
      }

      // If guest, verify phone matches
      if (cleanPhone) {
        return o.customerPhone.replace(/[\s.-]/g, '') === cleanPhone;
      }

      return false;
    });

    if (found) {
      setSearchedOrder(found);
    } else {
      setSearchedOrder(null);
      setSearchError(
        'Không tìm thấy đơn hàng hoặc thông tin xác thực số điện thoại không khớp. Quý khách vui lòng kiểm tra lại.'
      );
    }
  };

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <Clock className="w-3 h-3" /> Chờ xác nhận
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <RefreshCw className="w-3 h-3 animate-spin" /> Đang chuẩn bị
          </span>
        );
      case 'shipping':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
            <Truck className="w-3 h-3" /> Đang vận chuyển
          </span>
        );
      case 'delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Đã giao hàng
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <XCircle className="w-3 h-3" /> Đã hủy đơn
          </span>
        );
      default:
        return null;
    }
  };

  // Open Cancel Modal for a specific order
  const handleOpenCancelModal = (order: Order, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setOrderToCancel(order);
    setSelectedReason(CANCEL_REASONS[0]);
    setCustomReasonText('');
    setIsCancelModalOpen(true);
  };

  // Handle Cancel Order Confirmation
  const handleConfirmCancelOrder = async () => {
    const target = orderToCancel || searchedOrder;
    if (!target) return;

    // Check cancellation rule: only before shipping
    if (target.status === 'shipping' || target.status === 'delivered') {
      alert('Đơn hàng này đã chuyển sang giai đoạn vận chuyển hoặc đã giao thành công, không thể hủy.');
      setIsCancelModalOpen(false);
      return;
    }

    if (target.status === 'cancelled') {
      alert('Đơn hàng này đã bị hủy trước đó.');
      setIsCancelModalOpen(false);
      return;
    }

    const finalReason =
      selectedReason === 'Lý do khác (Nhập chi tiết bên dưới)'
        ? customReasonText.trim() || 'Khách hàng hủy đơn với lý do khác'
        : selectedReason;

    setIsCancelling(true);

    try {
      const now = new Date();
      const isoString = now.toISOString();
      const timeStr = formatVietnameseDateTime(isoString, true);

      const updatedTimeline = [
        ...(target.timeline || []),
        {
          status: 'cancelled',
          title: `Đơn hàng đã được khách hàng hủy (Lý do: ${finalReason})`,
          time: timeStr,
          completed: true,
        },
      ];

      const updatedOrder: Order = {
        ...target,
        status: 'cancelled',
        cancelledAt: isoString,
        cancelledBy: 'customer',
        cancelReason: finalReason,
        timeline: updatedTimeline,
      };

      // 1. Update in Firestore
      try {
        const payload = sanitizeFirestoreData({
          status: 'cancelled',
          cancelledAt: isoString,
          cancelledBy: 'customer',
          cancelReason: finalReason,
          timeline: updatedTimeline,
        });
        await updateDoc(doc(db, 'orders', target.id), payload);
      } catch (err) {
        console.warn('Firestore cancel order update warning:', err);
        // Fallback setDoc
        await setDoc(doc(db, 'orders', target.id), sanitizeFirestoreData(updatedOrder), {
          merge: true,
        });
      }

      // 2. Update Local Storage cache
      try {
        const raw = localStorage.getItem('tingo_orders_storage');
        if (raw) {
          const list: Order[] = JSON.parse(raw);
          const newList = list.map((o) => (o.id === target.id ? updatedOrder : o));
          localStorage.setItem('tingo_orders_storage', JSON.stringify(newList));
        }
      } catch {
        // ignore
      }

      // 3. Refund 1 Freeship voucher if this order used it
      if (
        target.couponCode === 'FREESHIP' ||
        target.discountAmount === 20000 ||
        target.shippingFee === 0
      ) {
        refundFreeshipVoucher(1);
      }

      // 4. Send Telegram Bot notification to Admin
      try {
        await notifyCancelOrder(updatedOrder, finalReason, 'customer');
      } catch (e) {
        console.warn('Telegram cancel notification note:', e);
      }

      // 5. Update local state
      if (searchedOrder && searchedOrder.id === target.id) {
        setSearchedOrder(updatedOrder);
      }
      if (onOrderCancelled) {
        onOrderCancelled(updatedOrder);
      }

      setIsCancelModalOpen(false);
      setOrderToCancel(null);
      setCancelSuccessMsg(
        `Đã HỦY ĐƠN HÀNG #${target.id} thành công! Hệ thống đã đồng bộ trạng thái tới Admin và tự động hoàn lại voucher Freeship (nếu có) vào ví của bạn.`
      );
    } catch (err: any) {
      console.error('Cancel order error:', err);
      alert('Không thể hủy đơn hàng lúc này. Vui lòng liên hệ Hotline 1900 8888 để được hỗ trợ.');
    } finally {
      setIsCancelling(false);
    }
  };

  const isCurrentOrderCancellable = (order: Order | null) => {
    if (!order) return false;
    return order.status === 'pending' || order.status === 'processing';
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-emerald-100 relative p-5 sm:p-8">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#008874]">
              HỆ THỐNG TRA CỨU ĐƠN HÀNG
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Đồng bộ Real-time
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Theo Dõi Đơn Hàng
          </h2>
        </div>

        {/* Search Bar with Privacy Verification */}
        <form onSubmit={handleSearch} className="mb-5 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="Mã đơn hàng (VD: TIN-12345)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
              />
            </div>

            {!isLoggedIn && (
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={verifyPhone}
                  onChange={(e) => setVerifyPhone(e.target.value)}
                  placeholder="SĐT đặt hàng (xác thực bảo mật)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <p className="text-[11px] text-slate-400">
              {isLoggedIn
                ? `Đang tra cứu cho: ${customer?.name} (${customer?.phone})`
                : 'Nhập mã đơn kèm số điện thoại nhận hàng để tra cứu.'}
            </p>
            <button
              type="submit"
              className="px-5 py-2 bg-[#008874] hover:bg-[#007052] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Tra Cứu Tiến Trình
            </button>
          </div>

          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium animate-fade-in">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}

          {cancelSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900 font-medium animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{cancelSuccessMsg}</span>
            </div>
          )}
        </form>

        {/* Quick Order Selector for logged in user */}
        {isLoggedIn && myOrders.length > 0 && !searchedOrder && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Đơn hàng gần đây của bạn ({myOrders.length}):
              </h4>
              <span className="text-[11px] text-emerald-700 font-medium">Bấm để xem chi tiết</span>
            </div>
            <div className="space-y-2.5">
              {myOrders.slice(0, 10).map((ord) => {
                const canCancel = ord.status === 'pending' || ord.status === 'processing';
                const isShipping = ord.status === 'shipping';
                const isDelivered = ord.status === 'delivered';
                const isCancelled = ord.status === 'cancelled';

                return (
                  <div
                    key={ord.id}
                    onClick={() => {
                      setSearchedOrder(ord);
                      setCancelSuccessMsg(null);
                    }}
                    className="p-3.5 rounded-2xl bg-white hover:bg-emerald-50/40 border border-slate-200 hover:border-emerald-300 shadow-xs transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono font-bold text-xs text-[#008874]">#{ord.id}</span>
                        {getStatusBadge(ord.status)}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-3">
                        <span>{formatVietnameseDateTime(ord.createdAt)}</span>
                        <span>•</span>
                        <span className="font-bold text-slate-800">
                          {ord.items?.reduce((sum, item) => sum + item.quantity, 0)} sản phẩm
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                      <div className="text-left sm:text-right">
                        <span className="text-xs font-black text-rose-600 block font-mono">
                          {ord.total.toLocaleString('vi-VN')}₫
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase">
                          {ord.paymentMethod}
                        </span>
                      </div>

                      {/* Cancel Action or Status Warning */}
                      {canCancel && (
                        <button
                          type="button"
                          onClick={(e) => handleOpenCancelModal(ord, e)}
                          title="Hủy đơn hàng này"
                          className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs flex items-center gap-1 transition-all cursor-pointer shadow-xs shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Hủy Đơn</span>
                        </button>
                      )}

                      {isShipping && (
                        <span className="text-[10px] text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-lg shrink-0">
                          Đang giao (Không thể hủy)
                        </span>
                      )}

                      <span className="text-xs text-emerald-700 font-bold group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-0.5 shrink-0 pl-1">
                        Chi tiết <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty / Initial State */}
        {!searchedOrder && !searchError && (!isLoggedIn || myOrders.length === 0) && (
          <div className="text-center py-10 px-4 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 text-[#008874] flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">Tra cứu tiến trình đơn hàng</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Nhập mã đơn hàng và số điện thoại đã đặt hàng để xem lộ trình đóng gói, vận chuyển và
              quản lý đơn hàng của bạn.
            </p>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="mt-3.5 px-4 py-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-[#008874] font-bold text-xs cursor-pointer transition-colors"
              >
                Đăng nhập tài khoản để tự động xem đơn hàng
              </button>
            )}
          </div>
        )}

        {/* Order Details Display */}
        {searchedOrder && (
          <div className="space-y-5 animate-fade-in">
            {/* Back button to search another order */}
            {isLoggedIn && myOrders.length > 1 && (
              <button
                type="button"
                onClick={() => setSearchedOrder(null)}
                className="text-xs text-slate-500 hover:text-[#008874] font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                ← Quay lại danh sách đơn hàng
              </button>
            )}

            {/* Header info card */}
            <div className="bg-[#f4faf6] rounded-2xl p-4 sm:p-5 border border-emerald-100 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-slate-500 block">Mã đơn hàng</span>
                <span className="text-lg font-black text-[#008874] font-mono">
                  #{searchedOrder.id}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Thời gian đặt</span>
                <span className="text-xs font-bold text-slate-800">
                  {formatVietnameseDateTime(searchedOrder.createdAt)}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block mb-0.5">Trạng thái</span>
                {getStatusBadge(searchedOrder.status)}
              </div>
            </div>

            {/* Cancellation Notice Banner (If cancelled) */}
            {searchedOrder.status === 'cancelled' && (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs space-y-1.5 animate-fade-in">
                <div className="flex items-center gap-2 text-rose-800 font-bold">
                  <XCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>ĐƠN HÀNG ĐÃ ĐƯỢC HỦY</span>
                </div>
                <div className="pl-6 space-y-1 text-slate-700">
                  <p>
                    <strong>Người thực hiện:</strong>{' '}
                    {searchedOrder.cancelledBy === 'customer'
                      ? 'Khách hàng chủ động hủy'
                      : 'Quản trị viên TINGO hủy'}
                  </p>
                  {searchedOrder.cancelledAt && (
                    <p>
                      <strong>Thời gian hủy:</strong>{' '}
                      {formatVietnameseDateTime(searchedOrder.cancelledAt)}
                    </p>
                  )}
                  {searchedOrder.cancelReason && (
                    <p>
                      <strong>Lý do:</strong> <em>"{searchedOrder.cancelReason}"</em>
                    </p>
                  )}
                  <p className="text-[11px] text-emerald-800 font-medium pt-1">
                    ✓ Các voucher ưu đãi và quyền lợi (nếu có) đã được hoàn lại vào tài khoản của bạn.
                  </p>
                </div>
              </div>
            )}

            {/* Timeline Steps - Fully synchronized with order status */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#008874]" />
                  <span>Tiến độ hành trình chi tiết:</span>
                </h4>
                <span className="text-[11px] text-emerald-800 font-semibold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Tự động đồng bộ thời gian thực
                </span>
              </div>

              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                {getSynchronizedTimeline(searchedOrder).map((step, idx) => {
                  const isCancelled = step.isCancelled;
                  const isCompleted = step.completed;
                  const isCurrent = step.isCurrent;

                  return (
                    <div
                      key={step.id || idx}
                      className={`relative flex items-start gap-3.5 p-2.5 rounded-xl transition-all ${
                        isCurrent && !isCancelled
                          ? 'bg-emerald-50/80 border border-emerald-200 shadow-xs'
                          : ''
                      }`}
                    >
                      <div
                        className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-xs transition-all ${
                          isCancelled
                            ? 'bg-rose-500 text-white ring-4 ring-rose-100 shadow-xs'
                            : isCurrent
                            ? 'bg-[#008874] text-white ring-4 ring-emerald-200 shadow-md animate-pulse'
                            : isCompleted
                            ? 'bg-[#008874] text-white shadow-xs'
                            : 'bg-slate-200 text-slate-500'
                        }`}
                      >
                        {isCancelled ? (
                          <XCircle className="w-3.5 h-3.5" />
                        ) : isCompleted || isCurrent ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Clock className="w-3 h-3" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-xs font-bold block ${
                              isCancelled
                                ? 'text-rose-700'
                                : isCurrent
                                ? 'text-[#007052] font-black'
                                : isCompleted
                                ? 'text-slate-900'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.title}
                          </span>
                          {step.badge && (
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isCancelled
                                  ? 'bg-rose-100 text-rose-800'
                                  : isCurrent
                                  ? 'bg-emerald-600 text-white animate-pulse'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {step.badge}
                            </span>
                          )}
                        </div>

                        {step.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                            {step.description}
                          </p>
                        )}

                        {step.time && (
                          <span
                            className={`text-[11px] block mt-1 font-mono ${
                              isCurrent
                                ? 'text-emerald-700 font-semibold'
                                : isCompleted
                                ? 'text-slate-500'
                                : 'text-slate-400'
                            }`}
                          >
                            {step.time}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Shipping Details & Items */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3.5">
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700 block">Địa chỉ nhận hàng:</span>
                <p className="text-slate-900 font-semibold">
                  {searchedOrder.customerName}{' '}
                  <span className="font-mono text-slate-600 font-normal">
                    ({searchedOrder.customerPhone})
                  </span>
                </p>
                <p className="text-slate-600 text-[11px] flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{searchedOrder.shippingAddress}</span>
                </p>
                {searchedOrder.notes && (
                  <p className="text-[11px] text-slate-500 italic">
                    Ghi chú: "{searchedOrder.notes}"
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-2">
                  Sản phẩm đã đặt ({searchedOrder.items?.reduce((s, i) => s + i.quantity, 0)} món):
                </span>
                <div className="space-y-1.5 text-xs">
                  {searchedOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700">
                      <span className="truncate max-w-[280px]">
                        {it.quantity}x {it.product.name}
                      </span>
                      <span className="font-semibold text-slate-900 font-mono">
                        {(it.product.price * it.quantity).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Calculation */}
              <div className="pt-3 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Tạm tính:</span>
                  <span className="font-mono">
                    {(searchedOrder.subtotal || 0).toLocaleString('vi-VN')}₫
                  </span>
                </div>
                {searchedOrder.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Mã giảm giá ({searchedOrder.couponCode || 'Ưu đãi'}):</span>
                    <span className="font-mono">
                      -{searchedOrder.discountAmount.toLocaleString('vi-VN')}₫
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Phí vận chuyển:</span>
                  <span className="font-mono">
                    {searchedOrder.shippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold">MIỄN PHÍ</span>
                    ) : (
                      `${searchedOrder.shippingFee.toLocaleString('vi-VN')}₫`
                    )}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between font-bold text-slate-900">
                  <span>
                    Tổng thanh toán (
                    {searchedOrder.paymentMethod === 'vietqr'
                      ? 'Chuyển khoản VietQR'
                      : searchedOrder.paymentMethod === 'momo'
                      ? 'Ví MoMo'
                      : 'Tiền mặt COD'}
                    ):
                  </span>
                  <span className="text-base text-[#008874] font-black font-mono">
                    {searchedOrder.total.toLocaleString('vi-VN')}₫
                  </span>
                </div>
              </div>
            </div>

            {/* ACTION BUTTONS / STATUS NOTICES: CANCEL ORDER */}
            {isCurrentOrderCancellable(searchedOrder) && (
              <div className="p-4 rounded-2xl bg-rose-50/70 border border-rose-200 flex flex-col sm:flex-row items-center justify-between gap-3 animate-fade-in">
                <div>
                  <span className="text-xs font-bold text-rose-900 block flex items-center gap-1.5">
                    <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                    Bạn muốn hủy đơn hàng này?
                  </span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Đơn hàng đang ở giai đoạn chuẩn bị. Quý khách chỉ có thể hủy đơn trước khi hàng được chuyển giao cho bên vận chuyển.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleOpenCancelModal(searchedOrder)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hủy Đơn Hàng Này</span>
                </button>
              </div>
            )}

            {searchedOrder.status === 'shipping' && (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5 animate-fade-in">
                <Truck className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Đơn hàng đang trên đường vận chuyển</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Đơn hàng đã được xuất kho và bàn giao cho bưu tá giao hàng nên không thể hủy trực tuyến. Vui lòng liên hệ Hotline TINGO nếu quý khách cần hỗ trợ thêm.
                  </p>
                </div>
              </div>
            )}

            {searchedOrder.status === 'delivered' && (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-center gap-2.5 animate-fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-bold">Đơn hàng đã được giao thành công tới quý khách.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CONFIRM CANCELLATION MODAL */}
      {isCancelModalOpen && (orderToCancel || searchedOrder) && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 relative space-y-4 animate-scale-in">
            <button
              onClick={() => {
                setIsCancelModalOpen(false);
                setOrderToCancel(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900 font-display">
                Xác Nhận Hủy Đơn #{orderToCancel?.id || searchedOrder?.id}
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Vui lòng cho TINGO biết lý do bạn muốn hủy đơn để chúng tôi phục vụ bạn tốt hơn:
              </p>
            </div>

            {/* Select Reason */}
            <div className="space-y-2">
              {CANCEL_REASONS.map((reason) => (
                <label
                  key={reason}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    selectedReason === reason
                      ? 'border-rose-400 bg-rose-50/60 font-semibold text-rose-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <input
                    type="radio"
                    name="cancel_reason"
                    checked={selectedReason === reason}
                    onChange={() => setSelectedReason(reason)}
                    className="accent-rose-600"
                  />
                  <span>{reason}</span>
                </label>
              ))}

              {selectedReason === 'Lý do khác (Nhập chi tiết bên dưới)' && (
                <textarea
                  rows={2}
                  value={customReasonText}
                  onChange={(e) => setCustomReasonText(e.target.value)}
                  placeholder="Nhập lý do cụ thể của bạn tại đây..."
                  className="w-full p-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-400 mt-1"
                />
              )}
            </div>

            {/* Notice about voucher refund */}
            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11px] text-emerald-900 leading-relaxed flex items-start gap-2">
              <Gift className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <span>
                <strong>Hoàn trả ưu đãi:</strong> Nếu đơn hàng có sử dụng mã Freeship hoặc voucher,
                mã sẽ được tự động hoàn lại tài khoản của bạn ngay sau khi hủy.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                disabled={isCancelling}
                onClick={() => setIsCancelModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Giữ Lại Đơn
              </button>
              <button
                type="button"
                disabled={isCancelling}
                onClick={handleConfirmCancelOrder}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white font-bold text-xs cursor-pointer transition-all shadow-md shadow-rose-600/20 flex items-center justify-center gap-1.5"
              >
                {isCancelling ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang xử lý hủy...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xác Nhận Hủy Đơn</span>
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
