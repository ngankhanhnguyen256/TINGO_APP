import React, { useState } from 'react';
import {
  MapPin,
  Phone,
  Mail,
  Facebook,
  Instagram,
  Youtube,
  ArrowUp,
  Lock,
  Edit,
  ExternalLink,
  Link as LinkIcon,
  MessageCircle,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';
import { FooterLinksEditorModal } from './admin/FooterLinksEditorModal';

interface FooterProps {
  onSelectCategory?: (catId: string) => void;
  onOpenTracking?: () => void;
  onOpenStory?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onSelectCategory,
  onOpenTracking,
  onOpenStory,
}) => {
  const {
    config,
    updateFooter,
    openTextEditor,
    isAdmin,
    setAdminLoginModalOpen,
    isVisualEditActive,
  } = useVisualEditor();

  const footer = config.footer;
  const logo = config.logo;
  const [linksModalOpen, setLinksModalOpen] = useState(false);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fanpageHref =
    footer.fanpageUrl ||
    footer.facebookUrl ||
    'https://www.facebook.com/tingodrink';
  const hotlineHref =
    footer.hotlineLink || `tel:${footer.hotline.replace(/\s+/g, '')}`;
  const emailHref = footer.emailLink || `mailto:${footer.email}`;

  return (
    <footer id="tingo-footer" className="bg-[#052319] text-white pt-14 pb-10 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid (Screenshot 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-emerald-900/60">
          
          {/* Column 1: Brand & Tagline */}
          <div className="lg:col-span-4 space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              {logo?.type === 'image' && logo?.imageUrl ? (
                <img
                  src={logo.imageUrl}
                  alt={logo.text || 'TINGO'}
                  className="h-10 w-auto object-contain max-w-[180px]"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full bg-[#008874] flex items-center justify-center text-white shadow-md">
                    <span className="font-extrabold text-xl">
                      {logo?.text ? logo.text.charAt(0) : 'T'}
                    </span>
                  </div>
                  <span className="text-2xl font-black tracking-tight text-white font-display">
                    {logo?.text || 'TINGO'}
                  </span>
                </>
              )}
            </div>

            <EditableElement
              label="Mô tả Chân Trang"
              onEdit={() =>
                openTextEditor('Sửa mô tả thương hiệu', footer.brandDesc, (val) =>
                  updateFooter({ brandDesc: val })
                )
              }
            >
              <p className="text-emerald-200/80 text-sm leading-relaxed max-w-sm">
                {footer.brandDesc}
              </p>
            </EditableElement>

            {/* Admin Quick Trigger to Edit All Links */}
            {isVisualEditActive && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setLinksModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-sm transition-all cursor-pointer"
                  title="Sửa tất cả liên kết Fanpage, Hotline, Email, FAQ"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  <span>Cài đặt Links Chuyển Hướng Footer</span>
                </button>
              </div>
            )}
          </div>

          {/* Column 2: SẢN PHẨM (Screenshot 5) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-display">
              SẢN PHẨM
            </h4>
            <ul className="space-y-2.5 text-sm text-emerald-100/80 font-medium">
              <li>
                <a href="#products" className="hover:text-emerald-300 transition-colors">
                  TINGO Chocolate
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-emerald-300 transition-colors">
                  TINGO Cereal
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-emerald-300 transition-colors">
                  TINGO Curcumin
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-emerald-300 transition-colors">
                  TINGO Protein
                </a>
              </li>
              <li>
                <a href="#products" className="hover:text-emerald-300 transition-colors">
                  TINGO Quantum
                </a>
              </li>
            </ul>
          </div>

          {/* Column 3: HỖ TRỢ (Screenshot 5) */}
          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-display">
              HỖ TRỢ
            </h4>
            <ul className="space-y-2.5 text-sm text-emerald-100/80 font-medium">
              <li>
                <a href="#support" className="hover:text-emerald-300 transition-colors">
                  Chính sách vận chuyển
                </a>
              </li>
              <li>
                <a href="#support" className="hover:text-emerald-300 transition-colors">
                  Chính sách đổi trả
                </a>
              </li>
              <li>
                <a href="#support" className="hover:text-emerald-300 transition-colors">
                  Chính sách bảo mật
                </a>
              </li>
              <li>
                <a href="#faq-banner" className="hover:text-emerald-300 transition-colors">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenStory}
                  className="hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Câu chuyện TINGO
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: LIÊN HỆ (3 Rounded Pill Cards with Auto-Redirect Links) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-display mb-4 flex items-center justify-between">
              <span>LIÊN HỆ TRỰC TIẾP</span>
              {isVisualEditActive && (
                <button
                  onClick={() => setLinksModalOpen(true)}
                  className="text-[10px] text-amber-300 hover:underline cursor-pointer normal-case flex items-center gap-1"
                >
                  <Edit className="w-3 h-3" />
                  <span>Cài đặt URLs</span>
                </button>
              )}
            </h4>

            {/* Fanpage Card (Auto Redirects to Facebook Fanpage) */}
            <EditableElement
              label="Fanpage & Link Fanpage"
              onEdit={() => setLinksModalOpen(true)}
            >
              <a
                href={fanpageHref}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 hover:border-emerald-400 hover:bg-emerald-900/60 transition-all group"
                title="Nhấp để chuyển hướng đến Fanpage chính thức"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-400 text-slate-950 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Facebook className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      FANPAGE
                    </span>
                    <ExternalLink className="w-3 h-3 text-emerald-400/60 group-hover:text-emerald-300" />
                  </div>
                  <span className="text-xs font-bold text-emerald-100 leading-snug block line-clamp-2">
                    {footer.fanpageName || 'Fanpage TINGO - Dinh Dưỡng'}
                  </span>
                </div>
              </a>
            </EditableElement>

            {/* Hotline Card (Auto Redirects to Call) */}
            <EditableElement
              label="Hotline & Link Gọi"
              onEdit={() => setLinksModalOpen(true)}
            >
              <a
                href={hotlineHref}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 hover:border-cyan-400 hover:bg-emerald-900/60 transition-all group"
                title="Nhấp để gọi ngay hotline"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-200/90 text-[#052319] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                      HOTLINE TƯ VẤN
                    </span>
                    <ExternalLink className="w-3 h-3 text-cyan-400/60 group-hover:text-cyan-300" />
                  </div>
                  <span className="text-sm font-bold text-white tracking-wide block">
                    {footer.hotline}
                  </span>
                </div>
              </a>
            </EditableElement>

            {/* Email Card (Auto Redirects to Mail) */}
            <EditableElement
              label="Email & Link Gửi Thư"
              onEdit={() => setLinksModalOpen(true)}
            >
              <a
                href={emailHref}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 hover:border-emerald-400 hover:bg-emerald-900/60 transition-all group"
                title="Nhấp để gửi email tới TINGO"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-300/90 text-[#052319] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                      EMAIL HỖ TRỢ
                    </span>
                    <ExternalLink className="w-3 h-3 text-emerald-400/60 group-hover:text-emerald-300" />
                  </div>
                  <span className="text-xs font-bold text-white block truncate">
                    {footer.email}
                  </span>
                </div>
              </a>
            </EditableElement>
          </div>

        </div>

        {/* Bottom copyright & Scroll to Top */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-emerald-300/60 font-medium">
          <p>{footer.copyright}</p>
          
          <div className="flex items-center gap-4">
            {/* Admin trigger button */}
            {!isAdmin && (
              <button
                onClick={() => setAdminLoginModalOpen(true)}
                className="flex items-center gap-1 text-emerald-400/40 hover:text-emerald-300 text-[11px] transition-colors cursor-pointer"
                title="Đăng nhập quản trị viên để bật Visual Edit"
              >
                <Lock className="w-3 h-3" />
                <span>Quản trị (Admin)</span>
              </button>
            )}

            <button
              onClick={scrollToTop}
              className="flex items-center gap-1.5 text-emerald-300 hover:text-white transition-colors bg-emerald-900/40 hover:bg-emerald-800/60 px-3 py-1.5 rounded-full border border-emerald-800/40 cursor-pointer"
            >
              <span>Về đầu trang</span>
              <ArrowUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* Modal for editing all footer URLs & contact links */}
      <FooterLinksEditorModal
        isOpen={linksModalOpen}
        onClose={() => setLinksModalOpen(false)}
      />
    </footer>
  );
};
