import React, { useState, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Heart,
  Eye,
  ShoppingBag,
  Sparkles,
  Video,
  Edit3,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { Product, VerticalVideoItem } from '../types';
import { VerticalVideoEditorModal } from './admin/VerticalVideoEditorModal';
import { EditableElement } from './admin/EditableElement';

interface VerticalVideoCarouselSectionProps {
  onAddToCart?: (product: Product, quantity?: number) => void;
  onSelectProduct?: (product: Product) => void;
}

export const VerticalVideoCarouselSection: React.FC<VerticalVideoCarouselSectionProps> = ({
  onAddToCart,
  onSelectProduct,
}) => {
  const { config, isVisualEditActive, isAdmin } = useVisualEditor();
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});

  const sectionData = config.verticalVideos || {
    badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
    titleLine1: 'Khách Hàng & Chuyên Gia',
    titleLine2: 'Nói Gì Về TINGO?',
    subtitle: 'Xem video review thực tế, cách pha chế và trải nghiệm dinh dưỡng từ cộng đồng người dùng TINGO.',
    items: [],
  };

  const items = sectionData.items || [];

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const togglePlay = (id: string) => {
    const videoEl = videoRefs.current[id];
    if (!videoEl) return;

    if (playingVideoId === id) {
      videoEl.pause();
      setPlayingVideoId(null);
    } else {
      // Pause all other videos
      Object.entries(videoRefs.current).forEach(([key, el]) => {
        if (el && key !== id) {
          el.pause();
        }
      });
      videoEl.play().catch(() => {
        // Autoplay policy fallback
        videoEl.muted = true;
        setMuted(true);
        videoEl.play();
      });
      setPlayingVideoId(id);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !muted;
    setMuted(nextMuted);
    Object.values(videoRefs.current).forEach((el) => {
      if (el) el.muted = nextMuted;
    });
  };

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleProductClick = (e: React.MouseEvent, productId?: string) => {
    e.stopPropagation();
    if (!productId) return;
    const prod = config.products.find((p) => p.id === productId);
    if (prod) {
      if (onSelectProduct) onSelectProduct(prod);
      else if (onAddToCart) onAddToCart(prod, 1);
    }
  };

  if (!items || items.length === 0) {
    if (!isAdmin && !isVisualEditActive) return null;
  }

  return (
    <section
      id="video-reels"
      className="py-16 sm:py-24 bg-gradient-to-b from-[#f4faf6] via-white to-[#f4faf6] relative overflow-hidden"
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-200/25 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-14">
          <div className="space-y-3 max-w-2xl">
            <EditableElement
              label="Tiêu Đề Khu Vực Video Dọc"
              onEdit={() => setVideoModalOpen(true)}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/90 text-emerald-900 text-xs font-bold uppercase tracking-wider">
                <Video className="w-3.5 h-3.5 text-emerald-700" />
                <span>{sectionData.badge || 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)'}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 font-display tracking-tight mt-2">
                <span>{sectionData.titleLine1 || 'Khách Hàng & Chuyên Gia'} </span>
                <span className="text-[#008874]">
                  {sectionData.titleLine2 || 'Nói Gì Về TINGO?'}
                </span>
              </h2>
              {sectionData.subtitle && (
                <p className="text-slate-600 text-sm sm:text-base leading-relaxed mt-2 font-normal">
                  {sectionData.subtitle}
                </p>
              )}
            </EditableElement>
          </div>

          {/* Controls & Admin Button */}
          <div className="flex items-center gap-3 self-start md:self-end">
            {(isAdmin || isVisualEditActive) && (
              <button
                onClick={() => setVideoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105"
                title="Tải video 9:16 mới từ thiết bị hoặc sửa danh sách video"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Quản Lý Video 9:16</span>
              </button>
            )}

            {/* Carousel Navigation Arrows */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => scroll('left')}
                className="w-11 h-11 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Previous videos"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-11 h-11 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Next videos"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 9:16 Vertical Carousel Container */}
        <div
          ref={carouselRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map((item) => {
            const isPlaying = playingVideoId === item.id;
            const isLiked = likedMap[item.id];

            return (
              <div
                key={item.id}
                onClick={() => togglePlay(item.id)}
                className="snap-start shrink-0 w-[260px] sm:w-[290px] md:w-[310px] aspect-[9/16] rounded-3xl bg-slate-950 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-emerald-900/40 select-none"
              >
                {/* 1. Video Element */}
                <video
                  ref={(el) => {
                    videoRefs.current[item.id] = el;
                  }}
                  src={item.videoUrl}
                  poster={item.thumbnailUrl}
                  playsInline
                  loop
                  muted={muted}
                  preload="metadata"
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* 2. Dark Gradients Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-black/40 pointer-events-none" />

                {/* 3. Top Controls & Badge */}
                <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-10">
                  {item.badge ? (
                    <span className="px-2.5 py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[11px] font-bold shadow-md">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-md text-white text-[11px] font-bold">
                      TINGO Reel
                    </span>
                  )}

                  {/* Sound & Like Icons */}
                  <div className="flex items-center gap-1.5">
                    {isPlaying && (
                      <button
                        onClick={toggleMute}
                        className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                      >
                        {muted ? (
                          <VolumeX className="w-4 h-4" />
                        ) : (
                          <Volume2 className="w-4 h-4 text-emerald-400" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={(e) => toggleLike(e, item.id)}
                      className={`w-8 h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer ${
                        isLiked
                          ? 'bg-rose-600 text-white'
                          : 'bg-black/60 hover:bg-black/80 text-white'
                      }`}
                      title="Thích video này"
                    >
                      <Heart
                        className={`w-4 h-4 ${isLiked ? 'fill-white' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* 4. Center Play / Pause Indicator */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-14 h-14 rounded-full bg-emerald-600/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform backdrop-blur-xs">
                      <Play className="w-6 h-6 fill-white ml-1" />
                    </div>
                  </div>
                )}

                {/* 5. Bottom Metadata & Product Tag */}
                <div className="absolute bottom-4 left-4 right-4 z-10 space-y-2.5 text-white">
                  
                  {/* Author / Creator */}
                  <div className="flex items-center gap-2">
                    {item.authorAvatar ? (
                      <img
                        src={item.authorAvatar}
                        alt={item.author}
                        className="w-7 h-7 rounded-full object-cover border border-white/40"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                        {item.author.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-emerald-200 truncate">
                        @{item.author}
                      </p>
                    </div>
                    {item.viewsCount && (
                      <span className="text-[10px] text-white/80 font-medium flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3 text-emerald-400" />
                        {item.viewsCount}
                      </span>
                    )}
                  </div>

                  {/* Video Title */}
                  <h4 className="font-bold text-sm leading-snug line-clamp-2 text-white drop-shadow-sm">
                    {item.title}
                  </h4>

                  {/* Attached Product Link Pill */}
                  {item.linkedProductId && item.linkedProductName && (
                    <div
                      onClick={(e) => handleProductClick(e, item.linkedProductId)}
                      className="p-2 rounded-2xl bg-white/15 hover:bg-white/25 backdrop-blur-md border border-white/20 flex items-center justify-between gap-2 transition-all group/prod cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[11px] font-bold text-white truncate group-hover/prod:text-emerald-300">
                            {item.linkedProductName}
                          </p>
                          {item.linkedProductPrice ? (
                            <p className="text-[10px] text-emerald-300 font-semibold">
                              {item.linkedProductPrice.toLocaleString('vi-VN')}đ
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="px-2 py-1 rounded-full bg-[#008874] text-white text-[10px] font-bold shrink-0 flex items-center gap-0.5 shadow-sm group-hover/prod:bg-emerald-400 group-hover/prod:text-slate-950">
                        <span>Mua</span>
                        <ArrowRight className="w-3 h-3" />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Admin Video Editor Modal */}
      <VerticalVideoEditorModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />
    </section>
  );
};
