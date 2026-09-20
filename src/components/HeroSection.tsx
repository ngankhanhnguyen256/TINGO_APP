import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, ArrowRight, Play, ChevronLeft, ChevronRight, Edit3, Image as ImageIcon, ShoppingCart, Eye } from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import { Product } from '../types';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

interface HeroSectionProps {
  onShopNow: () => void;
  onOpenStory: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onShopNow,
  onOpenStory,
  onSelectProduct,
  onAddToCart,
}) => {
  const {
    config,
    updateHero,
    openTextEditor,
    openImagePicker,
    updateProduct,
    openProductEditor,
    isVisualEditActive,
  } = useVisualEditor();
  const hero = config.hero;
  const products = config.products;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Strictly synchronize 5 Top Products directly from config.products
  const topProducts = useMemo(() => {
    return products.slice(0, 5);
  }, [products]);

  // Dynamic slides completely derived in real-time from top 5 products
  const activeSlides = useMemo(() => {
    return topProducts.map((prod) => ({
      productId: prod.id,
      imageKey: prod.image, // Directly reactive to product's current image
      title: prod.name,
      subtitle: prod.shortDesc,
      badge: prod.badge || prod.categoryLabel || 'Sản Phẩm Tinh Hoa',
      highlight: prod.volumeOrWeight || 'Chính Hãng TINGO',
      product: prod,
    }));
  }, [topProducts]);

  useEffect(() => {
    if (activeSlides.length === 0 || isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [activeSlides.length, isPaused]);

  const activeSlideIdx = Math.min(currentSlide, Math.max(0, activeSlides.length - 1));
  const slide = activeSlides[activeSlideIdx] || activeSlides[0];

  const activeProduct =
    products.find((p) => p.id === slide?.productId) ||
    topProducts[activeSlideIdx] ||
    products[0];

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + activeSlides.length) % activeSlides.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % activeSlides.length);
  };

  return (
    <section
      id="hero"
      className="relative overflow-hidden pt-6 sm:pt-10 pb-12 sm:pb-16 bg-gradient-to-b from-[#e8f6ed] via-[#f1f9f4] to-[#f8faf7]"
    >
      {/* Soft background glowing orbs */}
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-300/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-96 h-96 bg-teal-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          
          {/* Left Column: Typography & CTAs */}
          <div className="lg:col-span-6 space-y-6 sm:space-y-7">
            {/* Top pill badge */}
            <EditableElement
              label="Huy hiệu Hero"
              onEdit={() =>
                openTextEditor('Sửa huy hiệu đầu trang', hero.badgeText, (val) =>
                  updateHero({ badgeText: val })
                )
              }
            >
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/90 border border-emerald-300/60 text-[#007a5e] text-xs sm:text-sm font-semibold tracking-wide shadow-xs cursor-pointer">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{hero.badgeText}</span>
              </div>
            </EditableElement>

            {/* Massive Display Title */}
            <EditableElement
              label="Tiêu đề Hero"
              onEdit={() =>
                openTextEditor(
                  'Sửa dòng 2 & 4 (Dinh Dưỡng / Từ Thiên Nhiên)',
                  `${hero.titleLine2} | ${hero.titleLine4}`,
                  (val) => {
                    const parts = val.split('|');
                    updateHero({
                      titleLine2: parts[0]?.trim() || hero.titleLine2,
                      titleLine4: parts[1]?.trim() || hero.titleLine4,
                    });
                  }
                )
              }
            >
              <div className="space-y-1 sm:space-y-2 cursor-pointer">
                <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-black tracking-tight text-[#0a2f24] font-display leading-[1.08]">
                  {hero.titleLine1}
                  <span className="block text-[#008874]">{hero.titleLine2}</span>
                  <span className="block text-[#0a2f24]">{hero.titleLine3}</span>
                  <span className="block text-[#008874]">{hero.titleLine4}</span>
                </h1>
              </div>
            </EditableElement>

            {/* Subtitle */}
            <EditableElement
              label="Mô tả Hero"
              onEdit={() =>
                openTextEditor('Sửa mô tả Hero', hero.subtitle, (val) =>
                  updateHero({ subtitle: val }),
                  true
                )
              }
            >
              <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-xl font-normal cursor-pointer">
                {hero.subtitle}
              </p>
            </EditableElement>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3.5 sm:gap-4 pt-1">
              {/* Primary Green CTA */}
              <button
                id="hero-buy-now-btn"
                onClick={onShopNow}
                className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-full bg-[#008764] hover:bg-[#007355] active:bg-[#006046] text-white font-bold text-base shadow-lg shadow-emerald-900/20 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>{hero.primaryBtnText || 'Mua Ngay'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Secondary Light Story CTA */}
              <button
                id="hero-story-btn"
                onClick={onOpenStory}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-full bg-white/90 hover:bg-white text-slate-800 hover:text-[#008764] font-semibold text-base border border-slate-200 shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                <span>{hero.secondaryBtnText || 'Xem Câu Chuyện'}</span>
              </button>
            </div>

            {/* Trust Highlights */}
            <EditableElement
              label="Số liệu thống kê"
              onEdit={() =>
                openTextEditor(
                  'Sửa số liệu (VD: 100% Thuần thực vật, 24+ Vi chất, 4.9★ 12.000+ Đánh giá)',
                  hero.stats.map((s) => `${s.value}: ${s.label}`).join(' | '),
                  (val) => {
                    const parsed = val.split('|').map((part) => {
                      const [v, ...lbl] = part.split(':');
                      return { value: v.trim(), label: lbl.join(':').trim() };
                    });
                    if (parsed.length > 0) updateHero({ stats: parsed });
                  }
                )
              }
            >
              <div className="pt-4 border-t border-emerald-200/60 grid grid-cols-3 gap-2 text-left cursor-pointer">
                {hero.stats.map((st, idx) => (
                  <div key={idx}>
                    <div className="text-xl sm:text-2xl font-black text-[#008764] font-display">{st.value}</div>
                    <div className="text-xs text-slate-500 font-medium">{st.label}</div>
                  </div>
                ))}
              </div>
            </EditableElement>
          </div>

          {/* Right Column: Hero Visual Card (Synchronized 5 Top Products) */}
          <div 
            className="lg:col-span-6 relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            <EditableElement
              label="Ảnh Hero Showcase"
              onEditImage={() => {
                if (!activeProduct) return;
                openImagePicker(
                  `Đổi ảnh Showcase cho ${activeProduct.name}`,
                  (newImgUrl) => {
                    updateProduct(activeProduct.id, { image: newImgUrl });
                  },
                  activeProduct.image
                );
              }}
              onEdit={() => {
                if (!activeProduct) return;
                openProductEditor(activeProduct);
              }}
            >
              <div className="relative rounded-3xl p-3.5 sm:p-5 bg-gradient-to-br from-white/95 via-emerald-50/75 to-emerald-100/50 border border-white/90 shadow-2xl shadow-emerald-950/10 backdrop-blur-sm group/banner">
                
                {/* Product Visual Showcase with Transition */}
                <div 
                  className="cursor-pointer relative overflow-hidden rounded-2xl min-h-[300px] sm:min-h-[340px] flex items-center justify-center transition-all"
                  onClick={() => onSelectProduct(activeProduct as Product)}
                  title="Nhấn để xem chi tiết sản phẩm"
                >
                  <ProductVisual key={`${slide.productId}-${slide.imageKey}`} imageKey={slide.imageKey} size="hero" />

                  {/* Left / Right Arrow Navigation Overlay */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevSlide();
                    }}
                    aria-label="Sản phẩm trước"
                    className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-[#008764] shadow-md flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-all cursor-pointer z-10"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextSlide();
                    }}
                    aria-label="Sản phẩm tiếp theo"
                    className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 hover:text-[#008764] shadow-md flex items-center justify-center opacity-0 group-hover/banner:opacity-100 transition-all cursor-pointer z-10"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>

                {/* Floating Quick Action Badge */}
                <div className="absolute top-5 right-5 flex items-center gap-2 z-10">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(activeProduct as Product);
                    }}
                    className="px-3.5 py-1.5 rounded-full bg-white/95 hover:bg-[#008764] text-slate-800 hover:text-white text-xs font-bold shadow-md border border-slate-100 transition-all flex items-center gap-1.5 cursor-pointer group/btn"
                  >
                    <ShoppingCart className="w-3.5 h-3.5 text-emerald-600 group-hover/btn:text-white" />
                    <span>Thêm nhanh</span>
                    <span className="text-[#008764] group-hover/btn:text-white font-mono font-black">
                      {(activeProduct?.price || 0).toLocaleString('vi-VN')}đ
                    </span>
                  </button>
                </div>

                {/* Bottom Product Info & Pagination Indicator */}
                <div className="mt-3.5 flex flex-col sm:flex-row sm:items-end justify-between gap-3 px-1.5">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] sm:text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        {slide.badge}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 bg-white/80 px-2 py-0.5 rounded-full border border-slate-200/60 font-mono">
                        TOP {activeSlideIdx + 1}/5
                      </span>
                    </div>
                    
                    <h3 className="text-base sm:text-lg font-bold text-slate-900 mt-1 font-display truncate">
                      {slide.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 font-medium line-clamp-1">
                      {slide.subtitle}
                    </p>
                  </div>

                  {/* 5 Indicator Dots with Quick Switch */}
                  <div className="flex items-center gap-1.5 self-center sm:self-end bg-white/90 p-1.5 rounded-full shadow-xs border border-slate-200/60 shrink-0">
                    {activeSlides.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        aria-label={`Sản phẩm Top ${idx + 1}`}
                        title={`Sản phẩm Top ${idx + 1}`}
                        className={`transition-all duration-300 rounded-full h-2 cursor-pointer ${
                          activeSlideIdx === idx
                            ? 'w-6 bg-[#008764]'
                            : 'w-2 bg-slate-300 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                {/* 5 Quick-Pill Switcher Strip */}
                <div className="mt-3 pt-2.5 border-t border-emerald-100/80 grid grid-cols-5 gap-1 text-[11px]">
                  {activeSlides.map((s, idx) => {
                    const isSelected = activeSlideIdx === idx;
                    const prod = topProducts[idx];
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setCurrentSlide(idx)}
                        className={`py-1 px-1 rounded-lg text-center transition-all cursor-pointer font-medium truncate ${
                          isSelected
                            ? 'bg-[#008764] text-white font-bold shadow-xs'
                            : 'bg-white/70 hover:bg-white text-slate-600 hover:text-[#008764] border border-slate-100'
                        }`}
                        title={prod?.name || s.title}
                      >
                        <span className="block text-[9px] opacity-75 font-mono">TOP {idx + 1}</span>
                        <span className="truncate block text-[10px]">
                          {prod ? prod.name.split(' ')[0] : `SP ${idx + 1}`}
                        </span>
                      </button>
                    );
                  })}
                </div>

              </div>
            </EditableElement>
          </div>

        </div>
      </div>
    </section>
  );
};
