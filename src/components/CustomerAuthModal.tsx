import React, { useState } from 'react';
import {
  X,
  Phone,
  User,
  Mail,
  MapPin,
  Gift,
  Truck,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  LogIn,
  UserPlus,
  Key,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useCustomerAuth, ADMIN_CREDENTIALS } from '../context/CustomerAuthContext';
import { useVisualEditor } from '../context/VisualEditorContext';

export const CustomerAuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, registerCustomer, loginWithCredentials } = useCustomerAuth();
  const { loginAdmin } = useVisualEditor();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [adminSuccessNotice, setAdminSuccessNotice] = useState<string | null>(null);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAddress, setRegAddress] = useState('');
  const [regCity, setRegCity] = useState('Hồ Chí Minh');
  const [regDistrict, setRegDistrict] = useState('Quận 1');
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});
  const [isRegSubmitting, setIsRegSubmitting] = useState(false);

  if (!isAuthModalOpen) return null;

  // Handle Quick Demo Customer Fill
  const handleQuickCustomerFill = () => {
    setRegName('Nguyễn Minh Anh');
    setRegPhone('0908889999');
    setRegEmail('khachhang.tingo@gmail.com');
    setRegPassword('tingo123');
    setRegAddress('128 Nguyễn Trãi, Phường Bến Thành');
    setRegCity('Hồ Chí Minh');
    setRegDistrict('Quận 1');
    setRegErrors({});
  };

  // Submit Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setAdminSuccessNotice(null);

    const cleanId = loginIdentifier.trim();
    const cleanPass = loginPassword.trim();

    if (!cleanId) {
      setLoginError('Vui lòng nhập Email hoặc Số điện thoại của bạn.');
      return;
    }
    if (!cleanPass) {
      setLoginError('Vui lòng nhập mật khẩu.');
      return;
    }

    setIsLoginSubmitting(true);

    try {
      // Check Admin credentials
      if (
        cleanId.toLowerCase() === ADMIN_CREDENTIALS.email.toLowerCase() &&
        (cleanPass === ADMIN_CREDENTIALS.pass || cleanPass === 'admin123')
      ) {
        loginAdmin(cleanPass, cleanId);
        await loginWithCredentials(cleanId, cleanPass);
        setAdminSuccessNotice('Đăng nhập Quản Trị Viên thành công! Đang kích hoạt bảng điều khiển...');
        setIsLoginSubmitting(false);
        setTimeout(() => {
          closeAuthModal();
        }, 600);
        return;
      }

      // Customer credentials login
      const result = await loginWithCredentials(cleanId, cleanPass);
      if (result.success) {
        if (result.isAdmin) {
          loginAdmin(cleanPass, cleanId);
          setAdminSuccessNotice('Đăng nhập Quản Trị Viên thành công!');
        }
        setIsLoginSubmitting(false);
        setTimeout(() => {
          closeAuthModal();
        }, 500);
      } else {
        setLoginError(result.error || 'Thông tin đăng nhập không chính xác.');
        setIsLoginSubmitting(false);
      }
    } catch {
      setLoginError('Đã xảy ra lỗi khi đăng nhập. Vui lòng thử lại!');
      setIsLoginSubmitting(false);
    }
  };

  // Validate Register Form
  const validateRegister = () => {
    const errs: Record<string, string> = {};

    if (!regName.trim()) {
      errs.name = 'Vui lòng nhập họ và tên';
    } else if (regName.trim().length < 3) {
      errs.name = 'Họ và tên phải có ít nhất 3 ký tự';
    }

    const phoneRegex = /(84|0[3|5|7|8|9])+([0-9]{8})\b/;
    const cleanPhone = regPhone.replace(/[\s.-]/g, '');
    if (!cleanPhone) {
      errs.phone = 'Vui lòng nhập số điện thoại nhận hàng';
    } else if (!phoneRegex.test(cleanPhone) || cleanPhone.length !== 10) {
      errs.phone = 'Số điện thoại không hợp lệ (gồm 10 số, VD: 0901234567)';
    }

    if (regEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      errs.email = 'Địa chỉ email không đúng định dạng';
    }

    if (!regPassword.trim()) {
      errs.password = 'Vui lòng tạo mật khẩu cho tài khoản';
    } else if (regPassword.trim().length < 6) {
      errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';
    }

    setRegErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Submit Register
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) return;

    setIsRegSubmitting(true);
    try {
      const res = await registerCustomer({
        name: regName,
        phone: regPhone,
        email: regEmail,
        password: regPassword,
        address: regAddress,
        city: regCity,
        district: regDistrict,
      });

      if (res.success) {
        setIsRegSubmitting(false);
        closeAuthModal();
      } else {
        setRegErrors({ form: res.error || 'Đăng ký thất bại. Vui lòng thử lại.' });
        setIsRegSubmitting(false);
      }
    } catch {
      setRegErrors({ form: 'Đã có lỗi xảy ra trong quá trình đăng ký. Vui lòng thử lại.' });
      setIsRegSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-100 flex flex-col relative animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Visual Banner */}
        <div className="bg-gradient-to-br from-[#0a2f24] via-[#008874] to-[#005c4b] p-5 sm:p-6 text-white relative">
          <button
            onClick={closeAuthModal}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white shadow-inner">
              {activeTab === 'login' ? (
                <LogIn className="w-6 h-6 text-emerald-300" />
              ) : (
                <Gift className="w-6 h-6 text-amber-300" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-300 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10">
                  {activeTab === 'login' ? 'Tài Khoản TINGO' : 'Đăng Ký Thành Viên'}
                </span>
              </div>
              <h3 className="text-xl sm:text-2xl font-black font-display text-white mt-1">
                {activeTab === 'login' ? 'Đăng Nhập Hệ Thống' : 'Nhận Ngay 5 Mã Freeship'}
              </h3>
            </div>
          </div>

          <p className="text-xs text-emerald-100/90 leading-relaxed">
            {activeTab === 'login'
              ? 'Đăng nhập để xem lịch sử đơn hàng hoặc kích hoạt toàn quyền Quản Trị TINGO.'
              : 'Tạo tài khoản nhận ngay 5 Lượt Freeship và giảm 20.000đ cho đơn hàng đầu tiên!'}
          </p>

          {/* Quick Tabs Switcher */}
          <div className="grid grid-cols-2 gap-2 mt-4 p-1 bg-black/25 rounded-2xl border border-white/10">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setLoginError(null);
              }}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white text-[#008874] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>1. ĐĂNG NHẬP</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setRegErrors({});
              }}
              className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white text-[#008874] shadow-md'
                  : 'text-white/80 hover:text-white hover:bg-white/10'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>2. ĐĂNG KÝ MỚI</span>
            </button>
          </div>
        </div>

        {/* TAB 1: LOGIN FORM */}
        {activeTab === 'login' && (
          <form onSubmit={handleLoginSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-220px)]">
            {/* Email / Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email hoặc Số điện thoại <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={loginIdentifier}
                  onChange={(e) => {
                    setLoginIdentifier(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="khachhang@gmail.com hoặc 0908xxxxxx"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Mật khẩu đăng nhập <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => {
                    setLoginPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  placeholder="Nhập mật khẩu..."
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error message */}
            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{loginError}</span>
              </div>
            )}

            {/* Admin success banner */}
            {adminSuccessNotice && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{adminSuccessNotice}</span>
              </div>
            )}

            {/* Submit Login Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoginSubmitting}
                className="w-full py-3.5 rounded-2xl bg-[#008874] hover:bg-[#007052] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{isLoginSubmitting ? 'Đang xác thực...' : 'Đăng Nhập'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Switch to Register link */}
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Chưa có tài khoản? </span>
              <button
                type="button"
                onClick={() => setActiveTab('register')}
                className="text-[#008874] font-bold hover:underline cursor-pointer"
              >
                Đăng ký ngay nhận 5 Freeship
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER FORM */}
        {activeTab === 'register' && (
          <form onSubmit={handleRegisterSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto max-h-[calc(90vh-220px)]">
            
            {/* Promo perks preview */}
            <div className="grid grid-cols-2 gap-2 text-[11px] bg-emerald-50/80 p-2.5 rounded-2xl border border-emerald-100">
              <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
                <Truck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Tặng <strong>5 Mã Freeship</strong></span>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
                <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Giảm <strong>-20.000đ</strong> đơn đầu</span>
              </div>
            </div>

            {/* Quick Demo Fill button */}
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thông tin tài khoản mới
              </span>
              <button
                type="button"
                onClick={handleQuickCustomerFill}
                className="text-[11px] text-[#008874] hover:underline font-semibold cursor-pointer"
              >
                + Điền mẫu nhanh
              </button>
            </div>

            {/* Name Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Họ và tên của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    if (regErrors.name) setRegErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  placeholder="Ví dụ: Nguyễn Văn A (tối thiểu 3 ký tự)"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    regErrors.name
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                      : 'border-slate-300 focus:ring-[#008874] focus:border-[#008874]'
                  }`}
                />
              </div>
              {regErrors.name && (
                <p className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{regErrors.name}</span>
                </p>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Số điện thoại nhận hàng <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="tel"
                  value={regPhone}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^\d\s.-]/g, '');
                    setRegPhone(val);
                    if (regErrors.phone) setRegErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  placeholder="Ví dụ: 0908123456 (10 chữ số)"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 ${
                    regErrors.phone
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                      : 'border-slate-300 focus:ring-[#008874] focus:border-[#008874]'
                  }`}
                />
              </div>
              {regErrors.phone && (
                <p className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{regErrors.phone}</span>
                </p>
              )}
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Email nhận thông báo</span>
                <span className="text-[10px] text-slate-400 font-normal">(Không bắt buộc)</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={regEmail}
                  onChange={(e) => {
                    setRegEmail(e.target.value);
                    if (regErrors.email) setRegErrors((prev) => ({ ...prev, email: '' }));
                  }}
                  placeholder="email@example.com"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    regErrors.email
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                      : 'border-slate-300 focus:ring-[#008874] focus:border-[#008874]'
                  }`}
                />
              </div>
              {regErrors.email && (
                <p className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{regErrors.email}</span>
                </p>
              )}
            </div>

            {/* Create Password Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Tạo mật khẩu đăng nhập <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Key className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showRegPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => {
                    setRegPassword(e.target.value);
                    if (regErrors.password) setRegErrors((prev) => ({ ...prev, password: '' }));
                  }}
                  placeholder="Tối thiểu 6 ký tự..."
                  className={`w-full pl-10 pr-10 py-2.5 rounded-xl border text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                    regErrors.password
                      ? 'border-rose-400 bg-rose-50/40 focus:ring-rose-300'
                      : 'border-slate-300 focus:ring-[#008874] focus:border-[#008874]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowRegPassword(!showRegPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {regErrors.password && (
                <p className="flex items-center gap-1 text-[11px] text-rose-600 font-medium mt-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{regErrors.password}</span>
                </p>
              )}
            </div>

            {/* Address & City */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Địa chỉ giao hàng mặc định</span>
                <span className="text-[10px] text-slate-400 font-normal">(Có thể đổi khi mua)</span>
              </label>
              <div className="relative mb-2">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Số nhà, tên đường, phường/xã..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <select
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
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
                  value={regDistrict}
                  onChange={(e) => setRegDistrict(e.target.value)}
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

            {/* General form error */}
            {regErrors.form && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{regErrors.form}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isRegSubmitting}
                className="w-full py-3.5 rounded-2xl bg-[#008874] hover:bg-[#007052] active:scale-[0.98] text-white font-bold text-sm shadow-lg shadow-emerald-900/15 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>{isRegSubmitting ? 'Đang tạo tài khoản...' : 'Đăng Ký & Nhận 5 Mã Freeship'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Switch to Login link */}
            <div className="text-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Đã có tài khoản? </span>
              <button
                type="button"
                onClick={() => setActiveTab('login')}
                className="text-[#008874] font-bold hover:underline cursor-pointer"
              >
                Đăng nhập ngay
              </button>
            </div>
          </form>
        )}

        {/* Footer note */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Bảo mật thông tin khách hàng tuyệt đối & đồng bộ đám mây</span>
        </div>
      </div>
    </div>
  );
};
