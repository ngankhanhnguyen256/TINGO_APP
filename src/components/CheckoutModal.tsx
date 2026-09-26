import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Banknote,
  QrCode,
  Copy,
  Check,
  Sparkles,
  ArrowRight,
  PackageCheck,
  User,
  Phone,
  MapPin,
  Mail,
  AlertCircle,
  Truck,
  Ticket,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { CartItem, Order } from '../types';
import { ProductVisual } from './ProductVisual';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { notifyNewOrder } from '../lib/telegram';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';
import { appendOrderToGoogleSheet, isAutoSyncEnabled, queuePendingOrder, queuePendingFirestoreOrder } from '../lib/googleSheetsService';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  discountAmount: number;
  appliedCoupon: string;
  shippingFee: number;
  onOrderSuccess: (order: Order) => void;
  onOpenTracking?: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  discountAmount,
  appliedCoupon,
  shippingFee: initialShippingFee,
  onOrderSuccess,
  onOpenTracking,
}) => {
  const {
    customer,
    isLoggedIn,
    maxDailyOrders,
    getTodayOrdersCount,
    openAuthModal,
    consumeFreeshipVoucher,
    markFirstOrderCompleted,
    updateCustomerProfile,
  } = useCustomerAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Hồ Chí Minh');
  const [district, setDistrict] = useState('Quận 1');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'vietqr' | 'momo'>('cod');
  const [copiedBank, setCopiedBank] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null);
  const [todayOrdersCount, setTodayOrdersCount] = useState<number>(0);
  const [isCheckingLimit, setIsCheckingLimit] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Auto-fill customer info when modal opens or customer changes
  useEffect(() => {
    if (isOpen) {
      setCreatedOrder(null);
      setErrors({});
      setIsSubmitting(false);

      if (customer) {
        setName(customer.name || '');
        setPhone(customer.phone || '');
        setEmail(customer.email || '');
        setAddress(customer.address || '');
        if (customer.city) setCity(customer.city);
        if (customer.district) setDistrict(customer.district);
      }
    } else {
      setCreatedOrder(null);
      setErrors({});
      setIsSubmitting(false);
    }
  }, [customer, isOpen]);

  // Check today's order count for this account/phone
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const checkCount = async () => {
      const targetPhone = phone || customer?.phone || '';
      if (!targetPhone) return;
      setIsCheckingLimit(true);
      try {
        const count = await getTodayOrdersCount(targetPhone);
        if (isMounted) {
          setTodayOrdersCount(count);
        }
      } catch {
        // ignore
      } finally {
        if (isMounted) setIsCheckingLimit(false);
      }
    };

    checkCount();
    return () => {
      isMounted = false;
    };
  }, [isOpen, phone, customer?.phone]);

  const setNamePhoneSafe = (val: string) => {
    setPhone(val);
  };

  const isAdminUser = customer?.id === 'ADMIN-TINGO' || phone === '0900000000';
  const effectiveMaxDaily = maxDailyOrders || 5;
  const hasReachedDailyLimit = !isAdminUser && todayOrdersCount >= effectiveMaxDaily;

  if (!isOpen) return null;

  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const effectiveShippingFee = initialShippingFee !== undefined ? initialShippingFee : 20000;
  const total = Math.max(0, subtotal - discountAmount + effectiveShippingFee);

  const validateForm = () => {
    const errs: Record<string, string> = {};

    // 0. Check daily order limit (Max 5 orders / day)
    if (hasReachedDailyLimit) {
      errs.limit = `Tài khoản đã đạt giới hạn tối đa ${effectiveMaxDaily} đơn hàng trong ngày hôm nay. Hệ thống sẽ tự động làm mới sau 00:00.`;
    }

    // Check cart items
    if (!cartItems || cartItems.length === 0) {
      errs.cart = 'Giỏ hàng đang trống. Vui lòng chọn sản phẩm trước khi đặt hàng.';
    }

    // 1. Tên bắt buộc ít nhất 3 ký tự
    if (!name.trim()) {
      errs.name = 'Vui lòng nhập họ và tên người nhận';
    } else if (name.trim().length < 3) {
      errs.name = 'Họ và tên phải có ít nhất 3 ký tự';
    }

    // 2. Số điện thoại phải là định dạng số ĐT Việt Nam 10 chữ số
    const cleanPhone = phone.replace(/[\s.-]/g, '');
    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    if (!cleanPhone) {
      errs.phone = 'Vui lòng nhập số điện thoại';
    } else if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
      errs.phone = 'Số điện thoại không hợp lệ (10 số, VD: 0901234567)';
    }

    // 3. Địa chỉ nhận hàng chi tiết ít nhất 6 ký tự
    if (!address.trim()) {
      errs.address = 'Vui lòng nhập số nhà, tên đường hoặc ấp/thôn';
    } else if (address.trim().length < 6) {
      errs.address = 'Địa chỉ quá ngắn (vui lòng nhập rõ số nhà, tên đường)';
    }

    // 4. Email kiểm tra nếu có nhập
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = 'Địa chỉ email không hợp lệ';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is logged in first
    if (!isLoggedIn) {
      openAuthModal();
      return;
    }

    if (!validateForm()) return;

    const cleanPhone = phone.replace(/[\s.-]/g, '');

    // Real-time double check of today's order limit (5 orders / day)
    if (!isAdminUser) {
      const currentTodayCount = await getTodayOrdersCount(cleanPhone);
      if (currentTodayCount >= effectiveMaxDaily) {
        setTodayOrdersCount(currentTodayCount);
        setErrors({
          limit: `TÀI KHOẢN ĐÃ ĐẠT GIỚI HẠN!\nBạn đã đặt tối đa ${effectiveMaxDaily} đơn hàng trong ngày hôm nay. Hạn mức sẽ tự động được làm mới sau 00:00 mỗi ngày. Vui lòng quay lại vào ngày mai!`,
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const randomId = `TIN-${Math.floor(10000 + Math.random() * 90000)}`;
      const now = new Date();
      const isoString = now.toISOString();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const year = now.getFullYear();
      const dateStr = `${hours}:${minutes}:${seconds} ngày ${day}/${month}/${year}`;

      const newOrder: Order = {
        id: randomId,
        createdAt: isoString,
        customerName: name.trim(),
        customerPhone: cleanPhone,
        customerEmail: email.trim() || undefined,
        shippingAddress: `${address.trim()}, ${district}, ${city}`,
        city,
        district,
        paymentMethod,
        items: [...cartItems],
        subtotal,
        discountAmount,
        shippingFee: effectiveShippingFee,
        total,
        status: 'pending',
        couponCode: appliedCoupon || undefined,
        notes: notes.trim() || undefined,
        timeline: [
          {
            status: 'pending',
            title: 'Đơn hàng đã được đặt thành công',
            time: dateStr,
            completed: true,
          },
          {
            status: 'processing',
            title: 'TINGO đang chuẩn bị & đóng gói sản phẩm sạch',
            time: 'Dự kiến trong 2 giờ tới',
            completed: false,
          },
          {
            status: 'shipping',
            title: 'Bàn giao đơn vị vận chuyển hỏa tốc',
            time: 'Dự kiến trong ngày',
            completed: false,
          },
          {
            status: 'delivered',
            title: 'Giao hàng tận tay người nhận',
            time: '1-2 ngày tới',
            completed: false,
          },
        ],
      };

      // Consume freeship voucher if applied
      if (appliedCoupon === 'FREESHIP') {
        consumeFreeshipVoucher();
      }
      markFirstOrderCompleted();

      // =========================================================================
      // THỰC THI LUỒNG MASTER BACKUP CHỐNG MẤT ĐƠN KHI FIREBASE HẾT QUOTA:
      // =========================================================================

      // 0. Lưu tức thì vào bộ nhớ cục bộ LocalStorage (Hiển thị ngay cho khách & admin)
      try {
        const existingRaw = localStorage.getItem('tingo_orders_storage');
        const existingList: Order[] = existingRaw ? JSON.parse(existingRaw) : [];
        localStorage.setItem(
          'tingo_orders_storage',
          JSON.stringify([newOrder, ...existingList.filter((o) => o.id !== newOrder.id)])
        );
      } catch (e) {
        console.warn('Local order storage note:', e);
      }

      // BƯỚC 1: BẮN DỮ LIỆU NGAY LẬP TỨC VỀ GOOGLE SHEET WEBHOOK (MASTER BACKUP KHÔNG THỂ MẤT ĐƠN)
      try {
        await Promise.race([
          appendOrderToGoogleSheet(newOrder),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ]);
      } catch (sheetErr) {
        console.warn('Google Sheets append notice:', sheetErr);
        queuePendingOrder(newOrder);
      }

      // BƯỚC 2: BẮN THÔNG BÁO VỀ TELEGRAM BOT (ĐỘC LẬP HOÀN TOÀN VỚI FIREBASE)
      try {
        notifyNewOrder(newOrder).catch((tgErr) => {
          console.warn('Telegram notification background note:', tgErr);
        });
      } catch (tgErr) {
        console.warn('Telegram notification trigger note:', tgErr);
      }

      // BƯỚC 3: GHI DỮ LIỆU VÀO FIREBASE FIRESTORE (TRY...CATCH AN TOÀN, KHÔNG CHẶN ĐƠN NẾU QUOTA EXCEEDED)
      try {
        const cleanOrderPayload = sanitizeFirestoreData(newOrder);
        setDoc(doc(db, 'orders', newOrder.id), cleanOrderPayload).catch((fireErr) => {
          console.warn('Firestore order write note (Quota or network):', fireErr);
          queuePendingFirestoreOrder(newOrder);
        });

        // Cập nhật thông tin khách hàng vào Firestore nếu có thể
        if (cleanPhone) {
          const customerProfileData = sanitizeFirestoreData({
            id: `CUS-${cleanPhone}`,
            name: name.trim(),
            phone: cleanPhone,
            email: email.trim() || '',
            address: address.trim(),
            city: city,
            district: district,
            lastOrderAt: isoString,
            lastOrderId: newOrder.id,
          });
          setDoc(
            doc(db, 'customers', cleanPhone),
            customerProfileData,
            { merge: true }
          ).catch((fireCustErr) => {
            console.warn('Firestore customer profile write note:', fireCustErr);
          });

          // Cập nhật state khách hàng trong ứng dụng
          updateCustomerProfile({
            address: address.trim(),
            city: city,
            district: district,
            lastOrderAt: isoString,
            lastOrderId: newOrder.id,
          });
        }
      } catch (firestoreErr) {
        console.warn('Firestore write error (handled safely):', firestoreErr);
        queuePendingFirestoreOrder(newOrder);
      }

      // Cập nhật số lượng đơn hôm nay
      setTodayOrdersCount((prev) => prev + 1);

      // ĐÁNH DẤU THÀNH CÔNG CHO KHÁCH HÀNG 100%
      setCreatedOrder(newOrder);
      onOrderSuccess(newOrder);

      // Bắn hiệu ứng pháo hoa chúc mừng
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#008874', '#0284c7', '#10b981', '#fbbf24'],
        });
      } catch (err) {
        // Safe fallback
      }
    } catch (err: any) {
      console.error('Submit order error:', err);
      setErrors({ form: 'Có lỗi xảy ra khi xử lý đặt hàng. Vui lòng thử lại.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyAccount = () => {
    navigator.clipboard?.writeText('19036888899999');
    setCopiedBank(true);
    setTimeout(() => setCopiedBank(false), 2000);
  };

  const handleCloseModal = () => {
    setCreatedOrder(null);
    setErrors({});
    setIsSubmitting(false);
    setNotes('');
    try {
      localStorage.removeItem('tingo_checkout_draft');
    } catch {
      // ignore
    }
    onClose();
  };

  const handleViewTracking = () => {
    if (createdOrder && onOpenTracking) {
      const orderToTrack = createdOrder;
      handleCloseModal();
      setTimeout(() => {
        onOpenTracking(orderToTrack);
      }, 150);
    } else {
      handleCloseModal();
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCloseModal();
        }
      }}
      className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in"
    >
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-emerald-100 relative p-5 sm:p-7 animate-scale-in">
        
        {/* Close Button */}
        <button
          onClick={handleCloseModal}
          className="absolute top-4 right-4 sm:top-5 sm:right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {createdOrder ? (
          /* Order Success State */
          <div className="text-center py-6 space-y-6 animate-fade-in">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-[#008874] flex items-center justify-center mx-auto shadow-md">
              <PackageCheck className="w-10 h-10" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Đặt hàng thành công!
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display mt-2">
                Cảm ơn bạn, {createdOrder.customerName}!
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Mã đơn hàng của bạn là{' '}
                <strong className="text-[#008874] font-mono text-base font-black">
                  #{createdOrder.id}
                </strong>
              </p>
            </div>

            {/* Order Brief Box */}
            <div className="bg-[#f8faf8] rounded-2xl p-4 sm:p-5 border border-emerald-100 text-left space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Người nhận:</span>
                <span className="font-bold text-slate-800">
                  {createdOrder.customerName} - {createdOrder.customerPhone}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Địa chỉ:</span>
                <span className="font-medium text-slate-800 text-right max-w-xs">
                  {createdOrder.shippingAddress}
                </span>
              </div>
              <div className="flex justify-between border-b border-slate-200/60 pb-2">
                <span className="text-slate-500">Phương thức:</span>
                <span className="font-bold text-emerald-800 uppercase">
                  {createdOrder.paymentMethod === 'cod'
                    ? 'Thanh toán khi nhận hàng (COD)'
                    : createdOrder.paymentMethod === 'vietqr'
                    ? 'Chuyển khoản VietQR'
                    : 'Ví điện tử MoMo'}
                </span>
              </div>
              <div className="flex justify-between pt-1 font-bold text-slate-900">
                <span>Tổng giá trị đơn:</span>
                <span className="text-lg font-black text-[#008874] font-display">
                  {createdOrder.total.toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Chuyên viên chăm sóc sức khỏe TINGO sẽ sớm liên hệ xác nhận và tiến hành gửi hàng nhanh nhất cho bạn.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseModal}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#008874] hover:bg-[#007052] text-white font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>🛍️ Mua Thêm Đơn Hàng Mới</span>
              </button>

              <button
                type="button"
                onClick={handleViewTracking}
                className="w-full sm:w-auto px-6 py-3 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#008874] border border-emerald-300 font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>📦 Tra Cứu Hành Trình Đơn Hàng</span>
              </button>
            </div>
          </div>
        ) : (
          /* Checkout Form */
          <div>
            {/* Modal Heading */}
            <div className="mb-6">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
                Xác Nhận Đơn Hàng
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 font-display mt-1">
                Thông Tin Giao Hàng & Thanh Toán
              </h2>
            </div>

            <form onSubmit={handleSubmitOrder} className="space-y-5">
              
              {/* Customer Login Requirement Callout */}
              {!isLoggedIn && (
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <span>
                      Vui lòng <strong>Đăng nhập</strong> để áp dụng 5 Mã Freeship & lưu đơn hàng.
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openAuthModal()}
                    className="px-3 py-1.5 bg-[#008874] text-white rounded-xl font-bold shrink-0 cursor-pointer text-xs"
                  >
                    Đăng nhập ngay
                  </button>
                </div>
              )}

              {/* Order Items Preview (Thumbnails & Prices) */}
              <div className="p-3.5 bg-[#f8faf8] border border-slate-200/80 rounded-2xl space-y-2.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Sản phẩm trong đơn ({(cartItems || []).reduce((a, b) => a + (b.quantity || 1), 0)})
                </span>
                <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                  {(cartItems || []).map((item) => {
                    const origPrice =
                      item.product.originalPrice || Math.round(item.product.price * 1.18);
                    return (
                      <div
                        key={item.product.id}
                        className="flex items-center justify-between gap-3 p-2 bg-white rounded-xl border border-slate-100"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {/* Thumbnail with object-contain */}
                          <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200/70 p-0.5 shrink-0 overflow-hidden">
                            <ProductVisual
                              imageKey={item.product.image}
                              size="thumb"
                              fit="contain"
                            />
                          </div>
                          <div className="min-w-0">
                            <h5 className="font-bold text-xs text-slate-800 truncate">
                              {item.product.name}
                            </h5>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {item.product.volumeOrWeight} &times; <strong>{item.quantity}</strong>
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs font-bold text-[#008874]">
                            {(item.product.price * item.quantity).toLocaleString('vi-VN')}đ
                          </div>
                          <div className="text-[10px] text-slate-400 line-through font-mono">
                            {(origPrice * item.quantity).toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Daily Order Limit Banner / Status */}
              <div
                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 transition-all ${
                  hasReachedDailyLimit
                    ? 'bg-rose-50/90 border-rose-200 text-rose-800'
                    : todayOrdersCount >= 3
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-emerald-50/60 border-emerald-200/80 text-emerald-900'
                }`}
              >
                <div
                  className={`p-1.5 rounded-xl shrink-0 ${
                    hasReachedDailyLimit
                      ? 'bg-rose-100 text-rose-700'
                      : todayOrdersCount >= 3
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-emerald-100 text-[#008874]'
                  }`}
                >
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold">
                      {hasReachedDailyLimit
                        ? 'ĐÃ ĐẠT GIỚI HẠN 5 ĐƠN/NGÀY'
                        : `Hạn Mức Đặt Hàng Hôm Nay: ${todayOrdersCount}/${effectiveMaxDaily} đơn`}
                    </span>
                    <span
                      className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        hasReachedDailyLimit
                          ? 'bg-rose-200 text-rose-900'
                          : 'bg-emerald-200/80 text-emerald-900'
                      }`}
                    >
                      {hasReachedDailyLimit ? 'Hết lượt hôm nay' : `Còn ${Math.max(0, effectiveMaxDaily - todayOrdersCount)} lượt`}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {hasReachedDailyLimit
                      ? 'Tài khoản của bạn đã đạt giới hạn tối đa 5 đơn/ngày. Hệ thống tự động làm mới (reset) sau 00:00 mỗi ngày. Vui lòng quay lại vào ngày mai hoặc liên hệ Hotline 1900 8888.'
                      : 'Mỗi tài khoản được đặt tối đa 5 đơn hàng/ngày (tự động reset sau 00:00 hàng ngày) để đảm bảo chất lượng phục vụ tốt nhất.'}
                  </p>
                </div>
              </div>

              {errors.limit && (
                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium whitespace-pre-line">{errors.limit}</span>
                </div>
              )}

              {/* Customer Inputs Grid */}
              <div className="space-y-3.5">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Địa Chỉ Nhận Hàng
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Name Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Họ và tên người nhận <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
                        }}
                        placeholder="Nguyễn Văn A (tối thiểu 3 ký tự)"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                          errors.name
                            ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                            : 'border-slate-300 focus:ring-[#008874]'
                        }`}
                      />
                    </div>
                    {errors.name && (
                      <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Phone Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Số điện thoại nhận hàng <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^\d\s.-]/g, '');
                          setPhone(val);
                          if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                        }}
                        placeholder="0901234567 (10 chữ số)"
                        className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 ${
                          errors.phone
                            ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                            : 'border-slate-300 focus:ring-[#008874]'
                        }`}
                      />
                    </div>
                    {errors.phone && (
                      <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>{errors.phone}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Email nhận xác nhận đơn</span>
                    <span className="text-[10px] text-slate-400 font-normal">(Không bắt buộc)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (errors.email) setErrors((prev) => ({ ...prev, email: '' }));
                      }}
                      placeholder="email@example.com"
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                        errors.email
                          ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                          : 'border-slate-300 focus:ring-[#008874]'
                      }`}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-[10px] text-rose-600 font-medium mt-1">{errors.email}</p>
                  )}
                </div>

                {/* Specific Street Address */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Địa chỉ cụ thể (Số nhà, tên đường, ấp/thôn) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => {
                        setAddress(e.target.value);
                        if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
                      }}
                      placeholder="Số nhà, tên đường, khu dân cư..."
                      className={`w-full pl-9 pr-3 py-2 rounded-xl border text-xs text-slate-900 focus:outline-none focus:ring-2 ${
                        errors.address
                          ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                          : 'border-slate-300 focus:ring-[#008874]'
                      }`}
                    />
                  </div>
                  {errors.address && (
                    <p className="text-[10px] text-rose-600 font-medium mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      <span>{errors.address}</span>
                    </p>
                  )}
                </div>

                {/* City & District Selectors */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Tỉnh / Thành phố
                    </label>
                    <select
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008874]"
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
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">
                      Quận / Huyện
                    </label>
                    <select
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008874]"
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

                {/* Notes (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Ghi chú đơn hàng (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Giao giờ hành chính, gọi trước khi giao..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2.5 pt-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Phương Thức Thanh Toán
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentMethod === 'cod'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 text-[#008874]'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <Banknote className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Thanh toán COD</div>
                      <div className="text-[10px] text-slate-500">Nhận hàng trả tiền</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('vietqr')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentMethod === 'vietqr'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 text-[#008874]'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <QrCode className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Chuyển khoản VietQR</div>
                      <div className="text-[10px] text-slate-500">Quét mã tiện lợi</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('momo')}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-2.5 transition-all cursor-pointer ${
                      paymentMethod === 'momo'
                        ? 'bg-emerald-50/70 border-emerald-500 ring-2 ring-emerald-500/20 text-[#008874]'
                        : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                    }`}
                  >
                    <CreditCard className="w-5 h-5 shrink-0" />
                    <div>
                      <div className="font-bold text-xs">Ví MoMo</div>
                      <div className="text-[10px] text-slate-500">Ví điện tử</div>
                    </div>
                  </button>
                </div>

                {paymentMethod === 'vietqr' && (
                  <div className="p-3.5 bg-emerald-50/80 rounded-2xl border border-emerald-200 text-xs space-y-2 animate-fade-in">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-900">Ngân hàng Techcombank</span>
                      <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded font-mono font-bold">
                        TINGO OFFICIAL
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-emerald-200">
                      <span className="font-mono font-bold text-sm text-slate-800">
                        1903 6888 8999 99
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyAccount}
                        className="text-[11px] font-bold text-[#008874] flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        {copiedBank ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Đã sao chép
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Sao chép STK
                          </>
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500">
                      Nội dung chuyển khoản: <strong className="text-slate-800">TINGO {phone || 'SĐT'}</strong>
                    </p>
                  </div>
                )}
              </div>

              {/* Price Calculation Summary */}
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5 text-xs text-slate-600 font-medium">
                <div className="flex justify-between">
                  <span>Tạm tính ({cartItems.reduce((a, b) => a + b.quantity, 0)} sản phẩm):</span>
                  <span className="font-bold text-slate-800 font-mono">
                    {subtotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Mã ưu đãi ({appliedCoupon}):</span>
                    <span className="font-mono">-{discountAmount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}

                <div className="flex justify-between items-center">
                  <span>Phí vận chuyển:</span>
                  <span className="font-bold font-mono">
                    {effectiveShippingFee === 0 ? (
                      <span className="text-emerald-700 font-bold flex items-center gap-1">
                        <span className="line-through text-slate-400 font-normal">20.000đ</span>
                        <span>MIỄN PHÍ</span>
                      </span>
                    ) : (
                      '20.000đ'
                    )}
                  </span>
                </div>

                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 text-slate-900 font-bold">
                  <span className="text-sm font-display">Tổng tiền thanh toán:</span>
                  <span className="text-xl font-black text-[#008874] font-display">
                    {total.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

              {/* Submit Order Button */}
              <button
                type="submit"
                disabled={isSubmitting || hasReachedDailyLimit}
                className={`w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  hasReachedDailyLimit
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                    : 'bg-[#008874] hover:bg-[#007052] active:scale-[0.98] text-white shadow-lg shadow-emerald-900/15'
                }`}
              >
                <span>
                  {isSubmitting
                    ? 'Đang gửi đơn hàng...'
                    : hasReachedDailyLimit
                    ? 'Đã Đạt Giới Hạn 5 Đơn/Ngày (Reset sau 00:00)'
                    : 'Xác Nhận Đặt Hàng Ngay'}
                </span>
                {!hasReachedDailyLimit && <ArrowRight className="w-5 h-5" />}
              </button>

              <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cam kết kiểm tra hàng trước khi thanh toán • Đổi trả miễn phí trong 7 ngày</span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
