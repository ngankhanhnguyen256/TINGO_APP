import React, { useState } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Sparkles,
  Tag,
  Check,
  ShieldCheck,
  Truck,
  Gift,
  User,
  ChevronRight,
  Ticket,
} from 'lucide-react';
import { CartItem, Product, Voucher } from '../types';
import { ProductVisual } from './ProductVisual';
import { useCustomerAuth } from '../context/CustomerAuthContext';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onProceedToCheckout: (appliedCoupon: string, discount: number, shippingFee: number) => void;
  onExploreProducts: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onUpdateQuantity,
  onRemoveItem,
  onProceedToCheckout,
  onExploreProducts,
}) => {
  const { customer, isLoggedIn, openAuthModal, getAvailableVouchers } = useCustomerAuth();

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>('FREESHIP');
  const [couponError, setCouponError] = useState<string | null>(null);
  const [showVoucherList, setShowVoucherList] = useState(false);

  if (!isOpen) return null;

  const totalItemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  // Calculate Subtotal and Total Original Price
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const totalOriginal = cartItems.reduce((sum, item) => {
    const orig = item.product.originalPrice || Math.round(item.product.price * 1.18);
    return sum + orig * item.quantity;
  }, 0);

  const totalProductSavings = Math.max(0, totalOriginal - subtotal);

  // Standard shipping fee = 20,000đ (as requested: đồng giá ship 20000/lần ship)
  const standardShippingFee = 20000;

  // Freeship Voucher calculation
  const freeshipAvailable = customer ? customer.freeshipVouchers > 0 : true;
  let isShippingFree = false;
  let shippingDiscount = 0;

  if (appliedCoupon === 'FREESHIP' && freeshipAvailable) {
    isShippingFree = true;
    shippingDiscount = standardShippingFee;
  }

  // Base shipping fee before discount
  const baseShippingFee = cartItems.length === 0 ? 0 : standardShippingFee;
  const currentShippingFee = isShippingFree ? 0 : baseShippingFee;

  // Additional discounts (CHAOBAN20K = 20k for 1st order, TINGO10 = 10%)
  let itemDiscountAmount = 0;
  if (appliedCoupon === 'CHAOBAN20K') {
    itemDiscountAmount = 20000;
  } else if (appliedCoupon === 'TINGO10') {
    itemDiscountAmount = Math.round(subtotal * 0.1);
  }

  const finalTotal = Math.max(0, subtotal - itemDiscountAmount + currentShippingFee);

  const availableVouchers = getAvailableVouchers();

  const handleApplyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    setCouponError(null);
    const code = couponCode.trim().toUpperCase();

    if (!code) return;

    if (code === 'FREESHIP') {
      if (customer && customer.freeshipVouchers <= 0) {
        setCouponError('Tài khoản của bạn đã dùng hết 5 mã Freeship');
      } else {
        setAppliedCoupon('FREESHIP');
        setCouponCode('');
      }
    } else if (code === 'CHAOBAN20K' || code === 'NEW20K' || code === 'WELCOME20K') {
      if (customer && !customer.isFirstOrder) {
        setCouponError('Mã này chỉ dành riêng cho khách hàng mua đơn hàng đầu tiên');
      } else {
        setAppliedCoupon('CHAOBAN20K');
        setCouponCode('');
      }
    } else if (code === 'TINGO10') {
      setAppliedCoupon('TINGO10');
      setCouponCode('');
    } else {
      setCouponError('Mã không hợp lệ hoặc đã hết hạn');
    }
  };

  const handleSelectVoucher = (v: Voucher) => {
    setCouponError(null);
    if (v.code === 'FREESHIP') {
      setAppliedCoupon('FREESHIP');
    } else if (v.code === 'CHAOBAN20K') {
      setAppliedCoupon('CHAOBAN20K');
    } else if (v.code === 'TINGO10') {
      setAppliedCoupon('TINGO10');
    }
    setShowVoucherList(false);
  };

  const handleCheckoutClick = () => {
    if (!isLoggedIn) {
      // Prompt Mandatory Customer Login first
      openAuthModal(() => {
        onProceedToCheckout(appliedCoupon || '', itemDiscountAmount, currentShippingFee);
      });
      return;
    }

    onProceedToCheckout(appliedCoupon || '', itemDiscountAmount, currentShippingFee);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col justify-between animate-slide-left">
          
          {/* 1. Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-[#f8faf8]">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 flex items-center justify-center text-[#008874] shadow-xs">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-slate-900 font-display">
                  Giỏ Hàng Của Bạn
                </h3>
                <span className="text-xs text-slate-500 font-medium">
                  ({totalItemCount} sản phẩm)
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white hover:bg-slate-100 border border-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* 2. Customer Account & Freeship Status Banner */}
          <div className="px-4 sm:px-5 py-2.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-emerald-50 border-b border-emerald-100/80 text-xs">
            {isLoggedIn ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-900">
                  <User className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="font-bold truncate max-w-[170px]">{customer?.name}</span>
                </div>
                <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded-full border border-emerald-200 text-emerald-800 font-bold text-[11px] shadow-2xs">
                  <Truck className="w-3 h-3 text-emerald-600" />
                  <span>Còn {customer?.freeshipVouchers ?? 5}/5 Mã Freeship</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-slate-700">
                <div className="flex items-center gap-1.5 text-emerald-800 font-medium">
                  <Gift className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Tặng <strong>5 Mã Freeship</strong> & <strong>-20K đơn đầu</strong></span>
                </div>
                <button
                  onClick={() => openAuthModal()}
                  className="text-[11px] font-bold text-[#008874] underline hover:text-[#005c4b] cursor-pointer"
                >
                  Đăng nhập
                </button>
              </div>
            )}
          </div>

          {/* 3. Cart Items List */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12 space-y-4">
                <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center text-[#008874]">
                  <ShoppingBag className="w-10 h-10" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base font-display">
                    Giỏ hàng đang trống
                  </h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed">
                    Hãy lựa chọn các thức uống & dinh dưỡng hữu cơ tốt cho sức khỏe từ TINGO nhé!
                  </p>
                </div>
                <button
                  onClick={() => {
                    onClose();
                    onExploreProducts();
                  }}
                  className="px-6 py-2.5 rounded-full bg-[#008874] hover:bg-[#007052] text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  Khám Phá Sản Phẩm Ngay
                </button>
              </div>
            ) : (
              cartItems.map((item) => {
                const itemOriginalPrice =
                  item.product.originalPrice || Math.round(item.product.price * 1.18);
                const hasDiscount = itemOriginalPrice > item.product.price;

                return (
                  <div
                    key={item.product.id}
                    className="flex gap-3 p-3 rounded-2xl bg-white border border-slate-100 hover:border-emerald-200 shadow-xs transition-all relative group"
                  >
                    {/* FULL VISIBLE THUMBNAIL (No Cropping!) */}
                    <div className="w-20 h-20 rounded-xl bg-slate-50/80 border border-slate-200/70 shrink-0 overflow-hidden flex items-center justify-center p-0.5">
                      <ProductVisual
                        imageKey={item.product.image}
                        size="thumb"
                        fit="contain"
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 flex flex-col justify-between min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-snug line-clamp-2 font-display">
                            {item.product.name}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.product.id)}
                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 cursor-pointer shrink-0"
                            title="Xóa sản phẩm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <span className="text-[11px] text-slate-500 font-mono block mt-0.5">
                          {item.product.volumeOrWeight}
                        </span>
                      </div>

                      {/* Pricing & Quantity Controls */}
                      <div className="flex items-end justify-between mt-2 pt-1">
                        {/* Quantity Counter */}
                        <div className="flex items-center border border-slate-200 rounded-full bg-slate-50">
                          <button
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.quantity - 1)
                            }
                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold text-xs cursor-pointer"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-xs text-slate-800">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              onUpdateQuantity(item.product.id, item.quantity + 1)
                            }
                            className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold text-xs cursor-pointer"
                          >
                            +
                          </button>
                        </div>

                        {/* Price Breakdown: Current Promo Price + Original Strikethrough */}
                        <div className="text-right">
                          <div className="font-black text-sm text-[#008874] font-display">
                            {(item.product.price * item.quantity).toLocaleString('vi-VN')}đ
                          </div>
                          {hasDiscount && (
                            <div className="text-[10px] text-slate-400 line-through font-mono">
                              {(itemOriginalPrice * item.quantity).toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* 4. Footer & Checkout Section */}
          {cartItems.length > 0 && (
            <div className="p-4 sm:p-5 border-t border-slate-100 bg-[#f8faf8] space-y-3">
              
              {/* Promo code & Available Vouchers section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowVoucherList(!showVoucherList)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-950 cursor-pointer"
                  >
                    <Ticket className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chọn Mã Ưu Đãi / Voucher Có Sẵn ({availableVouchers.length})</span>
                    <ChevronRight
                      className={`w-3 h-3 transition-transform ${
                        showVoucherList ? 'rotate-90' : ''
                      }`}
                    />
                  </button>

                  {appliedCoupon && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Đang dùng: {appliedCoupon}
                    </span>
                  )}
                </div>

                {/* Voucher Quick Selector Tray */}
                {showVoucherList && (
                  <div className="space-y-1.5 p-2.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl animate-fade-in text-xs max-h-48 overflow-y-auto">
                    {availableVouchers.map((v) => {
                      const isSelected = appliedCoupon === v.code;
                      return (
                        <div
                          key={v.code}
                          onClick={() => handleSelectVoucher(v)}
                          className={`p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isSelected
                              ? 'bg-white border-emerald-500 shadow-xs ring-1 ring-emerald-400'
                              : 'bg-white/80 border-slate-200 hover:border-emerald-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-slate-800 flex items-center gap-1.5">
                              <span className="bg-emerald-100 text-emerald-800 font-mono px-1.5 py-0.2 rounded text-[10px]">
                                {v.code}
                              </span>
                              <span>{v.title}</span>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{v.description}</p>
                          </div>

                          <button
                            type="button"
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-100 text-slate-700 hover:bg-emerald-100'
                            }`}
                          >
                            {isSelected ? 'Đã Dùng' : 'Áp Dụng'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Promo Code Input Form */}
                <form onSubmit={handleApplyCoupon} className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="Nhập mã ưu đãi khác..."
                      className="w-full bg-white border border-slate-200 rounded-full pl-8 pr-3 py-1.5 text-xs font-semibold uppercase placeholder:normal-case placeholder:font-normal focus:outline-none focus:border-[#008874]"
                    />
                  </div>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#008874] hover:bg-[#007052] text-white rounded-full text-xs font-bold transition-colors cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </form>

                {appliedCoupon && (
                  <div className="flex items-center justify-between text-xs bg-emerald-100/90 text-emerald-900 px-3 py-1.5 rounded-xl font-medium">
                    <span className="flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-emerald-700" />
                      Đã áp dụng: <strong>{appliedCoupon}</strong>{' '}
                      {appliedCoupon === 'FREESHIP'
                        ? '(Miễn phí ship 20K)'
                        : appliedCoupon === 'CHAOBAN20K'
                        ? '(-20.000đ đơn đầu)'
                        : '(-10%)'}
                    </span>
                    <button
                      onClick={() => setAppliedCoupon(null)}
                      className="text-slate-500 hover:text-rose-600 font-bold text-[11px] cursor-pointer"
                    >
                      Bỏ chọn
                    </button>
                  </div>
                )}

                {couponError && (
                  <p className="text-[11px] text-rose-500 font-medium">{couponError}</p>
                )}
              </div>

              {/* Price Calculation Breakdown */}
              <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-200/80 font-medium">
                <div className="flex justify-between">
                  <span>Tạm tính sản phẩm:</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {subtotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {itemDiscountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>
                      Giảm giá voucher ({appliedCoupon}):
                    </span>
                    <span className="font-mono">
                      -{itemDiscountAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span>Phí vận chuyển:</span>
                    <span className="text-[10px] text-slate-400">(Đồng giá 20K)</span>
                  </div>
                  <span className="font-bold font-mono">
                    {isShippingFree ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="line-through text-slate-400 font-normal">20.000đ</span>
                        <span>MIỄN PHÍ</span>
                      </span>
                    ) : (
                      '20.000đ'
                    )}
                  </span>
                </div>

                {totalProductSavings > 0 && (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg flex items-center justify-between">
                    <span>Tiết kiệm trực tiếp:</span>
                    <strong className="font-bold font-mono">
                      {(totalProductSavings + (isShippingFree ? 20000 : 0) + itemDiscountAmount).toLocaleString('vi-VN')}đ
                    </strong>
                  </div>
                )}

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900">
                  <span className="font-extrabold text-sm font-display">Tổng thanh toán:</span>
                  <span className="text-xl font-black text-[#008874] font-display">
                    {finalTotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Checkout Action Button */}
              <button
                id="drawer-checkout-btn"
                onClick={handleCheckoutClick}
                className="w-full py-3.5 rounded-2xl bg-[#008874] hover:bg-[#007052] active:scale-[0.98] text-white font-bold text-sm sm:text-base shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <span>Tiến Hành Đặt Hàng</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center text-[10px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bảo mật thông tin & Cam kết chính hãng TINGO 100%</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
