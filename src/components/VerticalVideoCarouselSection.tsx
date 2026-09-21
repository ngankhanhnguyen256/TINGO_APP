import React, { useState, useRef, useEffect } from 'react';
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
  X,
  Maximize2,
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
  const [activeModalVideo, setActiveModalVideo] = useState<VerticalVideoItem | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [videoLoadedMap, setVideoLoadedMap] = useState<Record<string, boolean>>({});

  const carouselRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Record<string, HTMLVideoElement | null>>({});
  const modalVideoRef = useRef<HTMLVideoElement | null>(null);

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
    if (!videoEl) {
      // If direct video element not ready, open in modal
      const item = items.find((v) => v.id === id);
      if (item) setActiveModalVideo(item);
      return;
    }

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

      // Always try playing muted first to satisfy browser autoplay policy
      videoEl.muted = muted;
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setPlayingVideoId(id);
          })
          .catch(() => {
            videoEl.muted = true;
            setMuted(true);
            videoEl.play().then(() => {
              setPlayingVideoId(id);
            }).catch(() => {
              // Open modal player as seamless fallback
              const item = items.find((v) => v.id === id);
              if (item) setActiveModalVideo(item);
            });
          });
      }
    }
  };

  const openVideoModal = (e: React.MouseEvent, item: VerticalVideoItem) => {
    e.stopPropagation();
    // Pause inline video
    if (playingVideoId) {
      const el = videoRefs.current[playingVideoId];
      if (el) el.pause();
      setPlayingVideoId(null);
    }
    setActiveModalVideo(item);
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !muted;
    setMuted(nextMuted);
    Object.values(videoRefs.current).forEach((el) => {
      if (el) el.muted = nextMuted;
    });
    if (modalVideoRef.current) {
      modalVideoRef.current.muted = nextMuted;
    }
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

  const handleNextModalVideo = () => {
    if (!activeModalVideo) return;
    const currIdx = items.findIndex((v) => v.id === activeModalVideo.id);
    const nextIdx = (currIdx + 1) % items.length;
    setActiveModalVideo(items[nextIdx]);
  };

  const handlePrevModalVideo = () => {
    if (!activeModalVideo) return;
    const currIdx = items.findIndex((v) => v.id === activeModalVideo.id);
    const prevIdx = (currIdx - 1 + items.length) % items.length;
    setActiveModalVideo(items[prevIdx]);
  };

  if (!items || items.length === 0) {
    if (!isAdmin && !isVisualEditActive) return null;
  }

  return (
    <section
      id="video-reels"
      className="py-14 sm:py-20 bg-gradient-to-b from-[#f4faf6] via-white to-[#f4faf6] relative overflow-hidden"
    >
      {/* Subtle Background Glows */}
      <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-200/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-teal-200/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8 sm:mb-12">
          <div className="space-y-2.5 max-w-2xl">
            <EditableElement
              label="Tiêu Đề Khu Vực Video Dọc"
              onEdit={() => setVideoModalOpen(true)}
            >
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-900 text-xs font-bold uppercase tracking-wider">
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
                <p className="text-slate-600 text-xs sm:text-base leading-relaxed mt-1.5 font-normal">
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
                className="w-10 h-10 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
                aria-label="Previous videos"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => scroll('right')}
                className="w-10 h-10 rounded-full bg-white hover:bg-emerald-50 border border-slate-200 text-slate-700 hover:text-emerald-700 shadow-sm flex items-center justify-center transition-all cursor-pointer active:scale-95"
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
            const isVideoLoaded = videoLoadedMap[item.id];

            return (
              <div
                key={item.id}
                onClick={() => togglePlay(item.id)}
                className="snap-start shrink-0 w-[240px] sm:w-[280px] md:w-[300px] aspect-[9/16] rounded-3xl bg-slate-900 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-emerald-900/30 select-none"
              >
                {/* 1. Underlying Crisp Thumbnail Poster Layer (Guarantees card is NEVER pitch black) */}
                {item.thumbnailUrl && (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Fallback image placeholder
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                )}

                {/* 2. Video Player Element */}
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
                  onLoadedData={() => {
                    setVideoLoadedMap((prev) => ({ ...prev, [item.id]: true }));
                  }}
                  onError={() => {
                    console.warn(`Video ${item.id} load notice`);
                  }}
                  className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                    isPlaying ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'
                  }`}
                />

                {/* 3. Dark Gradients Overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/40 pointer-events-none" />

                {/* 4. Top Controls & Badge */}
                <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-10">
                  {item.badge ? (
                    <span className="px-2.5 py-0.5 sm:py-1 rounded-full bg-emerald-600/90 backdrop-blur-md text-white text-[10px] sm:text-[11px] font-bold shadow-md truncate max-w-[140px]">
                      {item.badge}
                    </span>
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-black/50 backdrop-blur-md text-white text-[10px] font-bold">
                      TINGO Reel
                    </span>
                  )}

                  {/* Top Action Icons: Fullscreen, Mute & Like */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={(e) => openVideoModal(e, item)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                      title="Mở toàn màn hình"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                    </button>

                    {isPlaying && (
                      <button
                        onClick={toggleMute}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
                      >
                        {muted ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>
                    )}

                    <button
                      onClick={(e) => toggleLike(e, item.id)}
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer ${
                        isLiked
                          ? 'bg-rose-600 text-white'
                          : 'bg-black/60 hover:bg-black/80 text-white'
                      }`}
                      title="Thích video này"
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${isLiked ? 'fill-white' : ''}`}
                      />
                    </button>
                  </div>
                </div>

                {/* 5. Center Play / Pause Indicator */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#008874]/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform backdrop-blur-xs">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                    </div>
                  </div>
                )}

                {/* 6. Bottom Metadata & Product Tag */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 z-10 space-y-2 text-white">
                  
                  {/* Author / Creator */}
                  <div className="flex items-center gap-2">
                    {item.authorAvatar ? (
                      <img
                        src={item.authorAvatar}
                        alt={item.author}
                        className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-white/40"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-emerald-500 text-white text-xs font-bold flex items-center justify-center">
                        {item.author.charAt(0)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] sm:text-xs font-bold text-emerald-200 truncate">
                        @{item.author}
                      </p>
                    </div>
                    {item.viewsCount && (
                      <span className="text-[9px] sm:text-[10px] text-white/90 font-medium flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-full">
                        <Eye className="w-3 h-3 text-emerald-400" />
                        {item.viewsCount}
                      </span>
                    )}
                  </div>

                  {/* Video Title */}
                  <h4 className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-white drop-shadow-sm">
                    {item.title}
                  </h4>

                  {/* Attached Product Link Pill */}
                  {item.linkedProductId && item.linkedProductName && (
                    <div
                      onClick={(e) => handleProductClick(e, item.linkedProductId)}
                      className="p-1.5 sm:p-2 rounded-xl sm:rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/20 flex items-center justify-between gap-1.5 transition-all group/prod cursor-pointer"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <div className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                          <ShoppingBag className="w-3 h-3" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] sm:text-[11px] font-bold text-white truncate group-hover/prod:text-emerald-300">
                            {item.linkedProductName}
                          </p>
                          {item.linkedProductPrice ? (
                            <p className="text-[9px] sm:text-[10px] text-emerald-300 font-semibold">
                              {item.linkedProductPrice.toLocaleString('vi-VN')}đ
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <div className="px-2 py-0.5 sm:py-1 rounded-full bg-[#008874] text-white text-[9px] sm:text-[10px] font-bold shrink-0 flex items-center gap-0.5 shadow-sm group-hover/prod:bg-emerald-400 group-hover/prod:text-slate-950">
                        <span>Mua</span>
                        <ArrowRight className="w-2.5 h-2.5" />
                      </div>
                    </div>
                  )}

                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* Fullscreen Video Reel Viewer Modal (Popup Watch Mode) */}
      {activeModalVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-md aspect-[9/16] max-h-[92vh] rounded-3xl bg-black overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between">
            
            {/* Top Bar */}
            <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between text-white">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                  {activeModalVideo.badge || 'TINGO Reel'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  onClick={() => setActiveModalVideo(null)}
                  className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Video Player */}
            <div className="relative w-full h-full flex items-center justify-center bg-black">
              {activeModalVideo.thumbnailUrl && (
                <img
                  src={activeModalVideo.thumbnailUrl}
                  alt={activeModalVideo.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              )}
              <video
                ref={modalVideoRef}
                src={activeModalVideo.videoUrl}
                poster={activeModalVideo.thumbnailUrl}
                autoPlay
                playsInline
                loop
                muted={muted}
                controls
                className="relative z-10 w-full h-full object-contain"
              />
            </div>

            {/* Bottom Floating Navigation & Product Tag */}
            <div className="absolute bottom-4 left-4 right-4 z-20 space-y-3 text-white">
              <div>
                <p className="text-xs font-bold text-emerald-300">@{activeModalVideo.author}</p>
                <h3 className="text-sm font-bold mt-0.5 line-clamp-2">{activeModalVideo.title}</h3>
              </div>

              {activeModalVideo.linkedProductId && (
                <div
                  onClick={(e) => {
                    handleProductClick(e, activeModalVideo.linkedProductId);
                    setActiveModalVideo(null);
                  }}
                  className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <ShoppingBag className="w-4 h-4 text-emerald-300 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{activeModalVideo.linkedProductName}</p>
                      {activeModalVideo.linkedProductPrice ? (
                        <p className="text-xs font-bold text-emerald-300">
                          {activeModalVideo.linkedProductPrice.toLocaleString('vi-VN')}đ
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-[#008874] text-white text-xs font-bold shrink-0">
                    Mua Ngay
                  </span>
                </div>
              )}

              {/* Next/Prev Reel Nav Buttons */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={handlePrevModalVideo}
                  className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" /> Video Trước
                </button>
                <button
                  onClick={handleNextModalVideo}
                  className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/25 text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  Video Kế Tiếp <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Admin Video Editor Modal */}
      <VerticalVideoEditorModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />
    </section>
  );
};
