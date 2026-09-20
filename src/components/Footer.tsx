import React from 'react';
import { MapPin, Phone, Mail, Facebook, Instagram, Youtube, ArrowUp, Lock, Edit } from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

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
  const { config, updateFooter, openTextEditor, isAdmin, setAdminLoginModalOpen } = useVisualEditor();
  const footer = config.footer;

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="tingo-footer" className="bg-[#052319] text-white pt-14 pb-10 border-t border-emerald-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid (Screenshot 5) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-12 border-b border-emerald-900/60">
          
          {/* Column 1: Brand & Tagline & Socials (Screenshot 5) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-[#008874] flex items-center justify-center text-white shadow-md">
                <span className="font-extrabold text-xl">T</span>
              </div>
              <span className="text-2xl font-black tracking-tight text-white font-display">
                TINGO
              </span>
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

            {/* Social Icons (Screenshot 5) */}
            <div className="flex items-center gap-3 pt-2">
              <a
                href="#facebook"
                aria-label="Facebook TINGO"
                className="w-9 h-9 rounded-full bg-emerald-900/60 hover:bg-[#008874] text-emerald-100 flex items-center justify-center transition-colors border border-emerald-800/60"
              >
                <Facebook className="w-4 h-4" />
              </a>
              <a
                href="#instagram"
                aria-label="Instagram TINGO"
                className="w-9 h-9 rounded-full bg-emerald-900/60 hover:bg-[#008874] text-emerald-100 flex items-center justify-center transition-colors border border-emerald-800/60"
              >
                <Instagram className="w-4 h-4" />
              </a>
              <a
                href="#youtube"
                aria-label="YouTube TINGO"
                className="w-9 h-9 rounded-full bg-emerald-900/60 hover:bg-[#008874] text-emerald-100 flex items-center justify-center transition-colors border border-emerald-800/60"
              >
                <Youtube className="w-4 h-4" />
              </a>
            </div>
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
                <a href="#support" className="hover:text-emerald-300 transition-colors">
                  Câu hỏi thường gặp
                </a>
              </li>
              <li>
                <button
                  onClick={onOpenStory}
                  className="hover:text-emerald-300 transition-colors text-left cursor-pointer"
                >
                  Liên hệ
                </button>
              </li>
            </ul>
          </div>

          {/* Column 4: LIÊN HỆ (3 Rounded Pill Cards - Screenshot 5) */}
          <div className="lg:col-span-4 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-emerald-400 font-display mb-4">
              LIÊN HỆ
            </h4>

            {/* Address Card */}
            <EditableElement
              label="Địa chỉ"
              onEdit={() =>
                openTextEditor('Sửa địa chỉ', footer.address, (val) =>
                  updateFooter({ address: val })
                )
              }
            >
              <div className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 hover:border-emerald-700 transition-colors">
                <div className="w-10 h-10 rounded-full bg-emerald-200/90 text-[#052319] flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                    ĐỊA CHỈ
                  </span>
                  <span className="text-xs font-medium text-emerald-100 leading-snug block">
                    {footer.address}
                  </span>
                </div>
              </div>
            </EditableElement>

            {/* Hotline Card */}
            <EditableElement
              label="Hotline"
              onEdit={() =>
                openTextEditor('Sửa hotline', footer.hotline, (val) =>
                  updateFooter({ hotline: val })
                )
              }
            >
              <a
                href={`tel:${footer.hotline.replace(/\s+/g, '')}`}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 hover:border-emerald-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-cyan-200/90 text-[#052319] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 block">
                    HOTLINE
                  </span>
                  <span className="text-sm font-bold text-white tracking-wide block">
                    {footer.hotline}
                  </span>
                </div>
              </a>
            </EditableElement>

            {/* Email Card */}
            <EditableElement
              label="Email"
              onEdit={() =>
                openTextEditor('Sửa email', footer.email, (val) =>
                  updateFooter({ email: val })
                )
              }
            >
              <a
                href={`mailto:${footer.email}`}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-emerald-950/70 border border-emerald-800/40 hover:border-emerald-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-emerald-300/90 text-[#052319] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                    EMAIL
                  </span>
                  <span className="text-xs font-bold text-white block">
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
    </footer>
  );
};
