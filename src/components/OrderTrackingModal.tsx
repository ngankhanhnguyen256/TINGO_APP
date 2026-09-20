import React, { useState, useEffect } from 'react';
import { X, Search, Package, CheckCircle2, Clock, MapPin, AlertCircle, ShieldCheck, Lock } from 'lucide-react';
import { Order } from '../types';
import { useCustomerAuth } from '../context/CustomerAuthContext';

interface OrderTrackingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentOrders: Order[];
  initialOrder?: Order | null;
}

export const OrderTrackingModal: React.FC<OrderTrackingModalProps> = ({
  isOpen,
  onClose,
  recentOrders,
  initialOrder = null,
}) => {
  const { customer, isLoggedIn, openAuthModal } = useCustomerAuth();
  const [orderCode, setOrderCode] = useState('');
  const [verifyPhone, setVerifyPhone] = useState('');
  const [searchedOrder, setSearchedOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  useEffect(() => {
    if (initialOrder) {
      setSearchedOrder(initialOrder);
    } else {
      setSearchedOrder(null);
    }
    setSearchError(null);
  }, [initialOrder, isOpen]);

  if (!isOpen) return null;

  // Filter orders strictly for the logged in customer
  const myOrders = isLoggedIn && customer?.phone
    ? recentOrders.filter(
        (o) =>
          o.customerPhone === customer.phone ||
          (customer.email && o.customerEmail && o.customerEmail.toLowerCase() === customer.email.toLowerCase())
      )
    : [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    const cleanCode = orderCode.trim().toUpperCase().replace('#', '');
    const cleanPhone = verifyPhone.trim().replace(/[\s.-]/g, '');

    if (!cleanCode) {
      setSearchError('Vui lòng nhập Mã đơn hàng (VD: TIN-12345).');
      return;
    }

    // Privacy Protection Rule:
    // If not logged in as the order owner, must provide the recipient's phone number to verify identity
    if (!isLoggedIn && !cleanPhone) {
      setSearchError('Vì lý do bảo mật riêng tư, quý khách vui lòng nhập Số điện thoại nhận hàng để xác thực.');
      return;
    }

    const found = recentOrders.find((o) => {
      const matchCode = o.id.toUpperCase() === cleanCode;
      if (!matchCode) return false;

      // If logged in customer owns this order, allow view
      if (isLoggedIn && customer && (o.customerPhone === customer.phone || o.customerEmail === customer.email)) {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-emerald-100 relative p-6 sm:p-8">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-[#008874]">
              TRA CỨU HÀNH TRÌNH
            </span>
            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              Bảo mật riêng tư
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
            Theo Dõi Đơn Hàng
          </h2>
        </div>

        {/* Search Bar with Privacy Verification */}
        <form onSubmit={handleSearch} className="mb-6 space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderCode}
                onChange={(e) => setOrderCode(e.target.value)}
                placeholder="Mã đơn hàng (VD: TIN-12345)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
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
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-slate-400">
              {isLoggedIn
                ? `Đang xem với tư cách: ${customer?.name} (${customer?.phone})`
                : 'Nhập mã đơn kèm số điện thoại để mở thông tin đơn hàng.'}
            </p>
            <button
              type="submit"
              className="px-5 py-2 bg-[#008874] hover:bg-[#007052] text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              Tra cứu
            </button>
          </div>

          {searchError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-700 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{searchError}</span>
            </div>
          )}
        </form>

        {/* If logged in customer has orders, list their quick order selectors */}
        {isLoggedIn && myOrders.length > 0 && !searchedOrder && (
          <div className="mb-6">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2.5">
              Đơn hàng gần đây của bạn:
            </h4>
            <div className="space-y-2">
              {myOrders.slice(0, 3).map((ord) => (
                <div
                  key={ord.id}
                  onClick={() => setSearchedOrder(ord)}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#008874]">#{ord.id}</span>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {ord.status === 'pending' && 'Chờ xác nhận'}
                        {ord.status === 'processing' && 'Đang đóng gói'}
                        {ord.status === 'shipping' && 'Đang vận chuyển'}
                        {ord.status === 'delivered' && 'Đã giao thành công'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">{ord.createdAt}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-rose-600">
                      {ord.total.toLocaleString('vi-VN')}₫
                    </span>
                    <span className="text-[10px] text-emerald-700 block font-semibold">Xem chi tiết →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty / Initial State when no order searched yet */}
        {!searchedOrder && !searchError && (!isLoggedIn || myOrders.length === 0) && (
          <div className="text-center py-10 px-4 bg-slate-50/60 rounded-3xl border border-dashed border-slate-200">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-emerald-100 text-[#008874] flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-800 mb-1">
              Tra cứu tiến trình đơn hàng
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Nhập mã đơn hàng và số điện thoại đã sử dụng khi đặt hàng để xem chi tiết trạng thái vận chuyển và danh sách sản phẩm.
            </p>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="mt-3 px-4 py-1.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-[#008874] font-bold text-xs cursor-pointer transition-colors"
              >
                Đăng nhập tài khoản để xem tự động
              </button>
            )}
          </div>
        )}

        {/* Order Details Display */}
        {searchedOrder && (
          <div className="space-y-5">
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
                  {searchedOrder.createdAt}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 block">Trạng thái</span>
                <span className="inline-block text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                  {searchedOrder.status === 'pending' && 'Chờ xác nhận'}
                  {searchedOrder.status === 'processing' && 'Đang đóng gói'}
                  {searchedOrder.status === 'shipping' && 'Đang vận chuyển'}
                  {searchedOrder.status === 'delivered' && 'Đã giao hàng'}
                </span>
              </div>
            </div>

            {/* Timeline Steps */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
                Tiến độ xử lý:
              </h4>
              <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-emerald-200">
                {searchedOrder.timeline?.map((step, idx) => (
                  <div key={idx} className="relative flex items-start gap-3.5">
                    <div
                      className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        step.completed
                          ? 'bg-[#008874] text-white shadow-xs'
                          : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      {step.completed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                    </div>
                    <div>
                      <span
                        className={`text-xs font-bold block ${
                          step.completed ? 'text-slate-900' : 'text-slate-400'
                        }`}
                      >
                        {step.title}
                      </span>
                      {step.time && (
                        <span className="text-[11px] text-slate-400 block">{step.time}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Shipping Details & Items */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="text-xs">
                <span className="font-bold text-slate-700 block mb-1">Người nhận:</span>
                <p className="text-slate-800">
                  <strong>{searchedOrder.customerName}</strong> ({searchedOrder.customerPhone})
                </p>
                <p className="text-slate-600 text-[11px] mt-0.5 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{searchedOrder.shippingAddress}</span>
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Sản phẩm đã đặt ({searchedOrder.items?.length || 0}):
                </span>
                <div className="space-y-1 text-xs">
                  {searchedOrder.items?.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700">
                      <span>
                        {it.quantity}x {it.product.name}
                      </span>
                      <span className="font-semibold text-slate-900">
                        {(it.product.price * it.quantity).toLocaleString('vi-VN')}₫
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-slate-900">
                <span>Tổng tiền thanh toán ({searchedOrder.paymentMethod.toUpperCase()}):</span>
                <span className="text-sm text-rose-600 font-black">
                  {searchedOrder.total.toLocaleString('vi-VN')}₫
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
