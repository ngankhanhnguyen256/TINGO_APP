import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Eye,
  ShoppingBag,
  Sparkles,
  Video,
  Edit3,
  ArrowRight,
  X,
  Maximize2,
  ExternalLink,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { Product, VerticalVideoItem } from '../types';
import { VerticalVideoEditorModal } from './admin/VerticalVideoEditorModal';
import { EditableElement } from './admin/EditableElement';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { parseVideoUrl } from '../utils/videoUrlHelper';

interface VerticalVideoCarouselSectionProps {
  onAddToCart?: (product: Product, quantity?: number) => void;
  onSelectProduct?: (product: Product) => void;
}

export const VerticalVideoCarouselSection: React.FC<VerticalVideoCarouselSectionProps> = ({
  onAddToCart,
  onSelectProduct,
}) => {
  const { config, isVisualEditActive, isAdmin } = useVisualEditor();
  
  // Real-time videos state from Firebase Firestore (collection `videos`)
  const [videos, setVideos] = useState<VerticalVideoItem[]>(() => {
    return config.verticalVideos?.items || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Active Native Playing Video state (Lazy Load Architecture)
  const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null);
  
  // Modal states
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeModalVideo, setActiveModalVideo] = useState<VerticalVideoItem | null>(null);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const carouselRef = useRef<HTMLDivElement>(null);

  // Section Header Info
  const sectionData = config.verticalVideos || {
    badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
    titleLine1: 'Khách Hàng & Chuyên Gia',
    titleLine2: 'Nói Gì Về TINGO?',
    subtitle: 'Xem video review thực tế, cảm nhận hương vị và trải nghiệm dinh dưỡng từ cộng đồng người dùng TINGO.',
    items: [],
  };

  // -------------------------------------------------------------
  // YÊU CẦU 1: KẾT NỐI DỮ LIỆU THỜI GIAN THỰC (REAL-TIME UPDATE)
  // Lắng nghe collection `videos` trên Firebase Firestore qua onSnapshot
  // -------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const videosCollectionRef = collection(db, 'videos');
    
    // Subscribe to Firestore collection 'videos' in real-time
    const unsubscribe = onSnapshot(
      videosCollectionRef,
      (snapshot) => {
        if (!isMounted) return;

        if (!snapshot.empty) {
          const fetchedVideos: VerticalVideoItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || 'Video trải nghiệm TINGO',
              author: data.author || 'Khách hàng TINGO',
              authorAvatar: data.authorAvatar || '',
              videoUrl: data.videoUrl || '',
              thumbnailUrl: data.thumbnailUrl || '',
              viewsCount: data.viewsCount || '12.5K',
              likesCount: data.likesCount || '1.8K',
              badge: data.badge || 'Trải Nghiệm',
              linkedProductId: data.linkedProductId,
              linkedProductName: data.linkedProductName,
              linkedProductPrice: data.linkedProductPrice,
              order: typeof data.order === 'number' ? data.order : 0,
            } as VerticalVideoItem & { order?: number };
          });

          // Sort by order ascending
          fetchedVideos.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
          setVideos(fetchedVideos);
        } else {
          // Fallback to local config if collection is empty
          if (config.verticalVideos?.items && config.verticalVideos.items.length > 0) {
            setVideos(config.verticalVideos.items);
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('Firebase videos onSnapshot notice:', error);
        if (isMounted) {
          if (config.verticalVideos?.items && config.verticalVideos.items.length > 0) {
            setVideos(config.verticalVideos.items);
          }
          setIsLoading(false);
        }
      }
    );

    // Cleanup: Unsubscribe when component unmounts to prevent memory leaks
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [config.verticalVideos?.items]);

  // Carousel navigation
  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // -------------------------------------------------------------
  // YÊU CẦU 2: KIẾN TRÚC HIỂN THỊ (LAZY LOAD THUMBNAIL & VIDEO NATIVE)
  // Khi Click: Unmount <img> -> Mount thẻ <video autoPlay controls playsInline>
  // -------------------------------------------------------------
  const handleCardClick = (item: VerticalVideoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    const parsed = parseVideoUrl(item.videoUrl);

    // If it's a social embed (TikTok/YouTube Shorts), open the modal player for optimal view
    if (parsed.type === 'tiktok' || parsed.type === 'youtube') {
      setActiveModalVideo(item);
      return;
    }

    // If this video is already playing, let the user interact with the native controls
    if (activePlayingVideoId === item.id) {
      return;
    }

    // Unmount <img> and mount <video> for seamless native playback
    setActivePlayingVideoId(item.id);
  };

  const openVideoModal = (e: React.MouseEvent, item: VerticalVideoItem) => {
    e.stopPropagation();
    setActiveModalVideo(item);
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
    if (!activeModalVideo || videos.length === 0) return;
    const currIdx = videos.findIndex((v) => v.id === activeModalVideo.id);
    const nextIdx = (currIdx + 1) % videos.length;
    setActiveModalVideo(videos[nextIdx]);
  };

  const handlePrevModalVideo = () => {
    if (!activeModalVideo || videos.length === 0) return;
    const currIdx = videos.findIndex((v) => v.id === activeModalVideo.id);
    const prevIdx = (currIdx - 1 + videos.length) % videos.length;
    setActiveModalVideo(videos[prevIdx]);
  };

  if (videos.length === 0 && !isAdmin && !isVisualEditActive) {
    return null;
  }

  return (
    <section
      id="video-reels"
      className="py-14 sm:py-20 bg-gradient-to-b from-[#f4faf6] via-white to-[#f4faf6] relative overflow-hidden"
    >
      {/* Subtle Ambient Background Glows */}
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

          {/* Header Action Controls */}
          <div className="flex items-center gap-3 self-start md:self-end">
            {(isAdmin || isVisualEditActive) && (
              <button
                onClick={() => setVideoModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-105"
                title="Quản lý video Firestore collection 'videos'"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Quản Lý Video (Firebase)</span>
              </button>
            )}

            {/* Carousel Arrow Controls */}
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

        {/* 9:16 Vertical Video Carousel Container */}
        <div
          ref={carouselRef}
          className="flex gap-4 sm:gap-6 overflow-x-auto pb-6 pt-2 snap-x snap-mandatory no-scrollbar cursor-grab active:cursor-grabbing"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {videos.map((item) => {
            const isPlaying = activePlayingVideoId === item.id;
            const isLiked = likedMap[item.id];
            const parsed = parseVideoUrl(item.videoUrl);

            return (
              <div
                key={item.id}
                onClick={(e) => handleCardClick(item, e)}
                className="snap-start shrink-0 w-[240px] sm:w-[280px] md:w-[300px] aspect-[9/16] rounded-3xl bg-slate-950 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-emerald-900/30 select-none hover:-translate-y-1"
              >
                {/* ======================================================== */}
                {/* 1. TRẠNG THÁI ĐỘNG (KHI CLICK): THAY THẺ VIDEO NATIVE    */}
                {/* ======================================================== */}
                {isPlaying ? (
                  <video
                    src={item.videoUrl}
                    autoPlay
                    controls
                    playsInline
                    className="w-full h-full object-cover rounded-3xl"
                    onEnded={() => setActivePlayingVideoId(null)}
                  />
                ) : (
                  /* ======================================================== */
                  /* 2. TRẠNG THÁI TĨNH (FAST LOAD): CHỈ RENDER THẺ <img>     */
                  /* ======================================================== */
                  <>
                    {/* Lazy-loaded Thumbnail Image with Rounded Corners */}
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title || item.author}
                        loading="lazy"
                        className="w-full h-full object-cover rounded-3xl transition-transform duration-500 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=600&q=80';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                        <Video className="w-12 h-12 text-emerald-400 mb-2 opacity-80" />
                        <span className="text-xs font-semibold">{item.title || 'Video Trải Nghiệm'}</span>
                      </div>
                    )}

                    {/* Dark Gradient Overlay for text readability */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/30 pointer-events-none z-10" />

                    {/* PULSING PLAY BUTTON (▶) in the Center */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                      <div className="relative flex items-center justify-center">
                        {/* CSS Pulse Ring 1 */}
                        <span className="absolute w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-emerald-400/30 animate-ping pointer-events-none" />
                        {/* CSS Pulse Ring 2 */}
                        <span className="absolute w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#008874]/60 animate-pulse pointer-events-none" />
                        {/* Main Center Play Button */}
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-gradient-to-tr from-[#006e5e] to-[#00a892] text-white flex items-center justify-center shadow-2xl shadow-emerald-950/70 border border-emerald-300/50 group-hover:scale-110 transition-transform duration-300">
                          <Play className="w-6 h-6 sm:w-7 sm:h-7 fill-white text-white ml-1 drop-shadow-md" />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Top Badge & Controls (Overlay on static state) */}
                {!isPlaying && (
                  <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between z-20">
                    <span className={`px-2.5 py-0.5 sm:py-1 rounded-full text-white text-[10px] sm:text-[11px] font-bold shadow-md truncate max-w-[140px] flex items-center gap-1 ${
                      parsed.type === 'tiktok'
                        ? 'bg-black/80 border border-white/20'
                        : parsed.type === 'youtube'
                        ? 'bg-rose-600/90'
                        : 'bg-emerald-600/90 backdrop-blur-md'
                    }`}>
                      {parsed.type === 'tiktok' ? '🎵 TikTok' : parsed.type === 'youtube' ? '▶ Shorts' : (item.badge || 'TINGO Reel')}
                    </span>

                    {/* Top Action Icons: Fullscreen Watch & Like */}
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => openVideoModal(e, item)}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                        title="Xem toàn màn hình"
                      >
                        <Maximize2 className="w-3.5 h-3.5" />
                      </button>

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
                )}

                {/* Bottom Overlay: Customer Info, Title & Linked Product */}
                {!isPlaying && (
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 z-20 space-y-2 text-white">
                    {/* Author Info */}
                    <div className="flex items-center gap-2">
                      {item.authorAvatar ? (
                        <img
                          src={item.authorAvatar}
                          alt={item.author}
                          className="w-6 h-6 sm:w-7 sm:h-7 rounded-full object-cover border border-white/40 shadow-xs"
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
                    <h4 className="font-bold text-xs sm:text-sm leading-snug line-clamp-2 text-white drop-shadow-md">
                      {item.title}
                    </h4>

                    {/* Attached Product Link Card */}
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
                )}

              </div>
            );
          })}
        </div>

      </div>

      {/* Fullscreen Video Modal Watch Mode */}
      {activeModalVideo && (() => {
        const parsed = parseVideoUrl(activeModalVideo.videoUrl);

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveModalVideo(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
          >
            <div className="relative w-full max-w-sm sm:max-w-md aspect-[9/16] max-h-[92vh] rounded-3xl bg-black overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between">
              
              {/* Modal Top Bar */}
              <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between text-white pointer-events-auto">
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-white text-xs font-bold shadow-md ${
                    parsed.type === 'tiktok'
                      ? 'bg-black/80 border border-white/20'
                      : parsed.type === 'youtube'
                      ? 'bg-rose-600'
                      : 'bg-emerald-600'
                  }`}>
                    {parsed.type === 'tiktok' ? '🎵 TikTok Video' : parsed.type === 'youtube' ? '▶ YouTube Shorts' : (activeModalVideo.badge || 'TINGO Reel')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {parsed.type === 'tiktok' && (
                    <a
                      href={activeModalVideo.videoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                      title="Mở trên TikTok"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  <button
                    onClick={() => setActiveModalVideo(null)}
                    className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Video Player */}
              <div className="relative w-full h-full flex items-center justify-center bg-black overflow-hidden">
                {parsed.type === 'tiktok' && parsed.embedUrl ? (
                  <iframe
                    src={parsed.embedUrl}
                    title={activeModalVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : parsed.type === 'youtube' && parsed.embedUrl ? (
                  <iframe
                    src={parsed.embedUrl}
                    title={activeModalVideo.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                ) : (
                  <video
                    src={activeModalVideo.videoUrl}
                    poster={activeModalVideo.thumbnailUrl}
                    autoPlay
                    playsInline
                    loop
                    controls
                    className="relative z-10 w-full h-full object-cover"
                  />
                )}
              </div>

              {/* Bottom Navigation & Product Link */}
              <div className="absolute bottom-4 left-4 right-4 z-30 space-y-2.5 text-white bg-gradient-to-t from-black/95 via-black/60 to-transparent p-3 rounded-2xl">
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
                    className="p-2 rounded-xl bg-white/20 hover:bg-white/30 backdrop-blur-md border border-white/30 flex items-center justify-between cursor-pointer"
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

                {/* Prev / Next Modal Buttons */}
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={handlePrevModalVideo}
                    className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" /> Video Trước
                  </button>
                  <button
                    onClick={handleNextModalVideo}
                    className="px-3 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    Video Kế Tiếp <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

            </div>
          </div>
        );
      })()}

      {/* Admin Video Editor Modal */}
      <VerticalVideoEditorModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
      />
    </section>
  );
};
