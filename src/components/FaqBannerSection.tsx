import React from 'react';
import { HelpCircle, ArrowRight, Sparkles, ExternalLink, ShieldCheck, MessageCircle } from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

interface FaqBannerSectionProps {
  onOpenFaqModal?: () => void;
}

export const FaqBannerSection: React.FC<FaqBannerSectionProps> = ({ onOpenFaqModal }) => {
  const { config, updateFooter, openTextEditor, isVisualEditActive } = useVisualEditor();
  const footer = config.footer;

  const bannerTitle = footer.faqBannerTitle || 'CÂU HỎI THƯỜNG GẶP (FAQ)';
  const bannerSubtitle =
    footer.faqBannerSubtitle ||
    'Giải đáp nhanh 100% thắc mắc về nguồn gốc nguyên liệu, cách dùng, giao hàng & chứng nhận an toàn TINGO';
  const bannerUrl = footer.faqBannerUrl || '#faq';

  const handleClickBanner = (e: React.MouseEvent) => {
    if (isVisualEditActive) return;

    if (bannerUrl.startsWith('http://') || bannerUrl.startsWith('https://')) {
      window.open(bannerUrl, '_blank', 'noopener,noreferrer');
    } else if (bannerUrl.startsWith('#')) {
      const targetId = bannerUrl.replace('#', '');
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else if (onOpenFaqModal) {
        onOpenFaqModal();
      }
    } else {
      window.location.href = bannerUrl;
    }
  };

  return (
    <section id="faq-banner" className="py-8 sm:py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EditableElement
          label="Banner Câu Hỏi Thường Gặp (FAQ)"
          onEdit={() =>
            openTextEditor(
              'Sửa Banner FAQ (Tiêu đề | Mô tả | Link URL)',
              `${bannerTitle} | ${bannerSubtitle} | ${bannerUrl}`,
              (val) => {
                const [title, sub, url] = val.split('|');
                updateFooter({
                  faqBannerTitle: title?.trim() || bannerTitle,
                  faqBannerSubtitle: sub?.trim() || bannerSubtitle,
                  faqBannerUrl: url?.trim() || bannerUrl,
                });
              }
            )
          }
        >
          <div
            onClick={handleClickBanner}
            className="group relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#052e23] via-[#008874] to-[#046c5c] text-white p-6 sm:p-8 md:p-10 shadow-xl shadow-emerald-950/10 cursor-pointer border border-emerald-500/30 hover:shadow-2xl hover:border-emerald-400 transition-all duration-300"
          >
            {/* Ambient background decoration */}
            <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full bg-emerald-400/20 blur-3xl pointer-events-none group-hover:scale-110 transition-transform" />
            <div className="absolute -left-16 -bottom-16 w-64 h-64 rounded-full bg-teal-300/15 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              
              {/* Left Content */}
              <div className="space-y-3 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-emerald-100 text-[11px] font-extrabold uppercase tracking-wider border border-white/20">
                  <HelpCircle className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Trung Tâm Trợ Giúp & Hướng Dẫn</span>
                </div>

                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black font-display text-white tracking-tight leading-snug">
                  {bannerTitle}
                </h3>

                <p className="text-emerald-100/90 text-sm sm:text-base leading-relaxed">
                  {bannerSubtitle}
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-1 text-xs text-emerald-200/90 font-medium">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-300" />
                    <span>Cam kết chất lượng</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Hỗ trợ 24/7 qua Hotline & Zalo</span>
                  </span>
                </div>
              </div>

              {/* Right Action Button / URL Link Indicator */}
              <div className="shrink-0 flex items-center">
                <div className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-full bg-white text-[#008874] hover:bg-emerald-50 font-black text-sm shadow-lg shadow-black/10 group-hover:scale-105 group-hover:gap-3 transition-all">
                  <span>Xem Chi Tiết Câu Hỏi & Trả Lời</span>
                  <ArrowRight className="w-4 h-4 text-[#008874] transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>

            </div>
          </div>
        </EditableElement>
      </div>
    </section>
  );
};
