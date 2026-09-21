import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ShoppingBag, Menu, X, ArrowRight, Sparkles, Sliders, ShieldCheck, Eye, EyeOff, Truck, LogOut, Gift, Edit3, Image as ImageIcon, Camera, Upload } from 'lucide-react';
import { CartItem } from '../types';
import { useVisualEditor } from '../context/VisualEditorContext';
import { useCustomerAuth } from '../context/CustomerAuthContext';
import { LogoEditorModal } from './admin/LogoEditorModal';

interface HeaderProps {
  cartItems: CartItem[];
  onOpenCart: () => void;
  onOpenSearch: () => void;
  onOpenTracking: () => void;
  onOpenStory: () => void;
  activeSection: string;
  onNavigate: (sectionId: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  cartItems,
  onOpenCart,
  onOpenSearch,
  onOpenTracking,
  onOpenStory,
  activeSection,
  onNavigate,
}) => {
  const { config, updateLogo, isAdmin, isVisualEditActive, toggleVisualEdit } = useVisualEditor();
  const { customer, isLoggedIn, openAuthModal, openProfileModal, logoutCustomer } = useCustomerAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [logoModalOpen, setLogoModalOpen] = useState(false);
  const directLogoInputRef = useRef<HTMLInputElement>(null);

  const logo = config.logo || {
    type: 'badge',
    imageUrl: '',
    text: 'TINGO',
    tagline: 'Dinh Dưỡng Từ Thiên Nhiên',
    height: 44,
  };

  const totalCartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems = [
    { id: 'hero', label: 'Trang Chủ' },
    { id: 'why-tingo', label: 'Vì Sao Chọn TINGO' },
    { id: 'products', label: 'Sản Phẩm' },
    { id: 'featured', label: 'Combo Tiết Kiệm' },
    { id: 'story', label: 'Câu Chuyện', action: onOpenStory },
    { id: 'health', label: 'Sức Khỏe' },
    { id: 'tracking', label: 'Theo Dõi Đơn Hàng', action: onOpenTracking },
  ];

  const handleNavClick = (item: typeof navItems[0]) => {
    if (item.action) {
      item.action();
    } else {
      onNavigate(item.id);
    }
    setMobileMenuOpen(false);
  };

  const handleDirectLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        updateLogo({
          type: 'image',
          imageUrl: dataUrl,
          text: logo.text || 'TINGO',
          tagline: logo.tagline,
          height: logo.height || 44,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <header
      id="tingo-header"
      className={`sticky top-0 z-40 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.06)] border-b border-emerald-100/60 py-2.5'
          : 'bg-[#f4faf6]/90 backdrop-blur-sm border-b border-emerald-100/40 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="relative group/logo flex items-center gap-2">
          <input
            type="file"
            ref={directLogoInputRef}
            accept="image/*"
            onChange={handleDirectLogoUpload}
            className="hidden"
          />

          <div
            onClick={() => onNavigate('hero')}
            className="flex items-center gap-2.5 cursor-pointer select-none transition-transform hover:opacity-95"
          >
            {logo.type === 'image' && logo.imageUrl ? (
              <img
                src={logo.imageUrl}
                alt={logo.text || 'TINGO Logo'}
                style={{ height: `${Math.min(52, Math.max(28, logo.height || 42))}px` }}
                className="w-auto object-contain max-w-[180px] sm:max-w-[220px]"
                referrerPolicy="no-referrer"
              />
            ) : (
              <>
                <div
                  style={{
                    width: `${Math.min(48, Math.max(34, (logo.height || 42) - 2))}px`,
                    height: `${Math.min(48, Math.max(34, (logo.height || 42) - 2))}px`,
                  }}
                  className="rounded-full bg-[#008874] flex items-center justify-center text-white shadow-md shadow-emerald-900/15 group-hover/logo:scale-105 transition-transform"
                >
                  <span className="font-extrabold text-xl sm:text-2xl tracking-tighter">
                    {logo.text ? logo.text.charAt(0) : 'T'}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xl sm:text-2xl font-black tracking-tight text-[#008874] font-display leading-tight">
                    {logo.text || 'TINGO'}
                  </span>
                  {logo.tagline && (
                    <span className="text-[9px] sm:text-[10px] text-slate-500 font-medium tracking-wider uppercase hidden sm:block">
                      {logo.tagline}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Direct "Đổi Logo / Tải Ảnh" button - easily visible and accessible */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLogoModalOpen(true);
            }}
            title="Đổi Logo / Tải ảnh từ thiết bị"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100/90 hover:bg-[#008874] text-emerald-800 hover:text-white text-[11px] font-bold transition-all shadow-xs border border-emerald-200 cursor-pointer"
          >
            <Camera className="w-3 h-3" />
            <span className="hidden xs:inline">Đổi Logo</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-6 xl:gap-7">
          {navItems.map((item) => {
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                id={`nav-link-${item.id}`}
                onClick={() => handleNavClick(item)}
                className={`text-[14px] xl:text-[15px] font-medium transition-colors cursor-pointer relative py-1.5 ${
                  isActive
                    ? 'text-[#008874] font-semibold'
                    : 'text-slate-700 hover:text-[#008874]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#008874] rounded-full animate-fade-in" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Action Icons & Admin Pill */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Admin Visual Edit Quick Pill (Only shown when Admin is logged in) */}
          {isAdmin && (
            <button
              onClick={() => toggleVisualEdit()}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isVisualEditActive
                  ? 'bg-emerald-600 text-white shadow-emerald-900/20'
                  : 'bg-slate-800 text-emerald-300 hover:bg-slate-700'
              }`}
              title="Bật/Tắt chế độ Visual Edit"
            >
              {isVisualEditActive ? (
                <>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Sửa Visual: BẬT</span>
                </>
              ) : (
                <>
                  <EyeOff className="w-3.5 h-3.5" />
                  <span>Sửa Visual: TẮT</span>
                </>
              )}
            </button>
          )}

          {/* Search Button */}
          <button
            id="header-search-btn"
            onClick={onOpenSearch}
            aria-label="Tìm kiếm sản phẩm"
            className="w-10 h-10 rounded-full hover:bg-emerald-50 flex items-center justify-center text-slate-700 hover:text-[#008874] transition-colors cursor-pointer"
          >
            <Search className="w-5 h-5" />
          </button>

          {/* User Account / Order Tracking */}
          <div className="relative">
            {isLoggedIn ? (
              <button
                id="header-user-btn"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                aria-label="Tài khoản khách hàng"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[#008874] transition-all cursor-pointer text-xs font-bold shadow-2xs"
              >
                <div className="w-5 h-5 rounded-full bg-[#008874] text-white flex items-center justify-center text-[10px]">
                  {customer?.name.charAt(0).toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:inline max-w-[90px] truncate">{customer?.name}</span>
                <span className="text-[10px] bg-emerald-200/80 px-1.5 py-0.2 rounded-full font-bold">
                  {customer?.freeshipVouchers ?? 5} FS
                </span>
              </button>
            ) : (
              <button
                id="header-user-btn"
                onClick={() => openAuthModal()}
                aria-label="Đăng nhập tài khoản"
                title="Đăng nhập nhận 5 mã Freeship"
                className="w-10 h-10 rounded-full hover:bg-emerald-50 flex items-center justify-center text-slate-700 hover:text-[#008874] transition-colors cursor-pointer"
              >
                <User className="w-5 h-5" />
              </button>
            )}

            {/* User Dropdown Menu */}
            {userDropdownOpen && isLoggedIn && (
              <div
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-2xl shadow-xl border border-emerald-100 p-3 z-50 animate-scale-in text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-2 bg-emerald-50/70 rounded-xl mb-2">
                  <div className="font-bold text-slate-800 text-sm">{customer?.name}</div>
                  <div className="text-[11px] text-slate-500 font-mono">{customer?.phone}</div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-800 font-semibold">
                    <Truck className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Còn {customer?.freeshipVouchers ?? 5}/5 Lượt Freeship</span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    openProfileModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-emerald-50 text-[#008874] font-bold flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    <span>Ví Voucher & Thông Tin Cá Nhân</span>
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-600" />
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    onOpenTracking();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Lịch sử & Theo dõi đơn hàng</span>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                </button>

                <button
                  onClick={() => {
                    setUserDropdownOpen(false);
                    logoutCustomer();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-50 text-rose-600 font-medium flex items-center gap-1.5 cursor-pointer mt-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            )}
          </div>

          {/* Shopping Cart with Badge */}
          <button
            id="header-cart-btn"
            onClick={onOpenCart}
            aria-label="Giỏ hàng"
            className="relative w-10 h-10 rounded-full hover:bg-emerald-50 flex items-center justify-center text-slate-700 hover:text-[#008874] transition-colors cursor-pointer"
          >
            <ShoppingBag className="w-5 h-5" />
            {totalCartCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#0284c7] text-white text-[11px] font-bold flex items-center justify-center shadow-sm animate-scale-in">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Mobile Menu Toggle */}
          <button
            id="mobile-menu-toggle-btn"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu di động"
            className="lg:hidden w-10 h-10 rounded-full hover:bg-emerald-50 flex items-center justify-center text-slate-700 cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-emerald-100 px-4 pt-3 pb-5 shadow-xl animate-slide-down">
          <div className="flex flex-col space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                id={`mobile-nav-${item.id}`}
                onClick={() => handleNavClick(item)}
                className="flex items-center justify-between text-left py-2.5 px-3 rounded-lg text-slate-700 hover:bg-emerald-50 hover:text-[#008874] font-medium text-base transition-colors"
              >
                <span>{item.label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400" />
              </button>
            ))}

            {isAdmin && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    toggleVisualEdit();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 text-emerald-300 font-bold text-xs flex items-center justify-between"
                >
                  <span>Chế độ Visual Edit:</span>
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded">
                    {isVisualEditActive ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                  </span>
                </button>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3 text-xs text-emerald-800 font-semibold">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                Hotline tư vấn: 028 2210 7946
              </span>
              <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">Freeship từ 500k</span>
            </div>
          </div>
        </div>
      )}

      {/* Admin Logo Editor Modal */}
      <LogoEditorModal
        isOpen={logoModalOpen}
        onClose={() => setLogoModalOpen(false)}
      />
    </header>
  );
};
