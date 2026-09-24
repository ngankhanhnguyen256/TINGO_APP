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
  ExternalLink,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { Product, VerticalVideoItem } from '../types';
import { VerticalVideoEditorModal } from './admin/VerticalVideoEditorModal';
import { EditableElement } from './admin/EditableElement';
import { loadVideoFromCloudOrLocal } from '../lib/videoCloudStorage';
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
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeModalVideo, setActiveModalVideo] = useState<VerticalVideoItem | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const [loadingVideoId, setLoadingVideoId] = useState<string | null>(null);
  const [muted, setMuted] = useState<boolean>(true);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});
  const [resolvedVideoUrls, setResolvedVideoUrls] = useState<Record<string, string>>({});

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

  // Load video blobs and cloud storage for custom uploaded videos
  useEffect(() => {
    let isMounted = true;
    const fetchBlobUrls = async () => {
      const resolved: Record<string, string> = {};
      for (const item of items) {
        try {
          const parsed = parseVideoUrl(item.videoUrl);
          if (parsed.type === 'cloud' || parsed.type === 'blob') {
            const resolvedUrl = await loadVideoFromCloudOrLocal(item.id, item.videoUrl);
            if (resolvedUrl && isMounted) {
              resolved[item.id] = resolvedUrl;
            }
          }
        } catch {
          // fallback to direct URL
        }
      }
      if (isMounted && Object.keys(resolved).length > 0) {
        setResolvedVideoUrls((prev) => ({ ...prev, ...resolved }));
      }
    };
    fetchBlobUrls();
    return () => {
      isMounted = false;
    };
  }, [items]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const togglePlay = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const item = items.find((v) => v.id === id);
    if (!item) return;

    const parsed = parseVideoUrl(item.videoUrl);

    // If it's TikTok or YouTube -> open full popup watch mode for optimal playback
    if (parsed.type === 'tiktok' || parsed.type === 'youtube') {
      setActiveModalVideo(item);
      return;
    }

    if (playingVideoId === id) {
      const currentEl = videoRefs.current[id];
      if (currentEl) currentEl.pause();
      setPlayingVideoId(null);
      return;
    }

    // Pause all other videos
    Object.entries(videoRefs.current).forEach(([key, el]) => {
      if (el && key !== id) {
        el.pause();
      }
    });

    // Ensure resolved URL is loaded
    let activeUrl = resolvedVideoUrls[id];
    if (!activeUrl) {
      setLoadingVideoId(id);
      try {
        const res = await loadVideoFromCloudOrLocal(item.id, item.videoUrl);
        if (res) {
          activeUrl = res;
          setResolvedVideoUrls((prev) => ({ ...prev, [id]: res }));
        }
      } catch (err) {
        console.warn('Video load catch:', err);
      } finally {
        setLoadingVideoId(null);
      }
    }

    const videoEl = videoRefs.current[id];
    if (videoEl) {
      if (activeUrl && (!videoEl.src || videoEl.src === window.location.href)) {
        videoEl.src = activeUrl;
        videoEl.load();
      }
      videoEl.muted = muted;
      try {
        await videoEl.play();
        setPlayingVideoId(id);
      } catch {
        videoEl.muted = true;
        setMuted(true);
        try {
          await videoEl.play();
          setPlayingVideoId(id);
        } catch {
          setActiveModalVideo(item);
        }
      }
    }
  };

  const openVideoModal = async (e: React.MouseEvent, item: VerticalVideoItem) => {
    e.stopPropagation();
    if (playingVideoId) {
      const el = videoRefs.current[playingVideoId];
      if (el) el.pause();
      setPlayingVideoId(null);
    }
    setMuted(false); // Unmute for full experience in modal
    setActiveModalVideo(item);

    const parsed = parseVideoUrl(item.videoUrl);
    if ((parsed.type === 'cloud' || parsed.type === 'blob') && !resolvedVideoUrls[item.id]) {
      const res = await loadVideoFromCloudOrLocal(item.id, item.videoUrl);
      if (res) {
        setResolvedVideoUrls((prev) => ({ ...prev, [item.id]: res }));
      }
    }
  };

  // Keyboard navigation for modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activeModalVideo) return;
      if (e.key === 'Escape') {
        setActiveModalVideo(null);
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        handleNextModalVideo();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        handlePrevModalVideo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeModalVideo, items]);

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
                title="Dán link TikTok hoặc sửa danh sách video"
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
            const isLoadingThisVideo = loadingVideoId === item.id;
            const isLiked = likedMap[item.id];
            const parsed = parseVideoUrl(item.videoUrl);
            const isSocialVideo = parsed.type === 'tiktok' || parsed.type === 'youtube';
            const effectiveVideoUrl = resolvedVideoUrls[item.id] || (item.videoUrl?.startsWith('http') ? item.videoUrl : undefined);

            return (
              <div
                key={item.id}
                onClick={(e) => togglePlay(item.id, e)}
                className="snap-start shrink-0 w-[240px] sm:w-[280px] md:w-[300px] aspect-[9/16] rounded-3xl bg-slate-900 relative overflow-hidden shadow-xl hover:shadow-2xl transition-all duration-300 group cursor-pointer border border-emerald-900/30 select-none hover:-translate-y-1"
              >
                {/* 1. Underlying Crisp Thumbnail Poster Layer */}
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                      isPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100 group-hover:scale-105'
                    }`}
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=600&q=80';
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 w-full h-full bg-slate-900 flex items-center justify-center">
                    <Video className="w-12 h-12 text-slate-600" />
                  </div>
                )}

                {/* 2. Direct HTML5 Video Player Element (for uploaded files) */}
                {!isSocialVideo && effectiveVideoUrl && (
                  <video
                    ref={(el) => {
                      videoRefs.current[item.id] = el;
                    }}
                    src={effectiveVideoUrl}
                    poster={item.thumbnailUrl}
                    playsInline
                    loop
                    muted={muted}
                    preload="metadata"
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                      isPlaying ? 'opacity-100 z-5' : 'opacity-0 pointer-events-none'
                    }`}
                  />
                )}

                {/* 3. Dark Gradients Overlay for legibility */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/25 to-black/40 pointer-events-none z-10" />

                {/* 4. Top Controls & Badge */}
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

                  {/* Top Action Icons: Sound Mute/Unmute, Fullscreen, Like */}
                  <div className="flex items-center gap-1.5">
                    {isPlaying && !isSocialVideo && (
                      <button
                        onClick={toggleMute}
                        className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white flex items-center justify-center transition-colors cursor-pointer"
                        title={muted ? 'Bật âm thanh' : 'Tắt tiếng'}
                      >
                        {muted ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-400" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                        )}
                      </button>
                    )}

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

                {/* 5. Center Play Button */}
                {isLoadingThisVideo ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-12 h-12 rounded-full bg-black/70 text-white flex flex-col items-center justify-center shadow-xl backdrop-blur-xs">
                      <div className="w-6 h-6 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                ) : !isPlaying ? (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-[#008874]/90 text-white flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform backdrop-blur-xs">
                      <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white ml-0.5" />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-xs">
                      <Pause className="w-5 h-5 fill-white" />
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
      {activeModalVideo && (() => {
        const parsed = parseVideoUrl(activeModalVideo.videoUrl);
        const modalEffectiveUrl =
          resolvedVideoUrls[activeModalVideo.id] ||
          (activeModalVideo.videoUrl?.startsWith('http') ? activeModalVideo.videoUrl : undefined);

        return (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) setActiveModalVideo(null);
            }}
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-md animate-fadeIn"
          >
            <div className="relative w-full max-w-sm sm:max-w-md aspect-[9/16] max-h-[92vh] rounded-3xl bg-black overflow-hidden shadow-2xl border border-white/10 flex flex-col justify-between">
              
              {/* Top Bar */}
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
                      title="Mở trên ứng dụng TikTok"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                  {parsed.type !== 'tiktok' && parsed.type !== 'youtube' && (
                    <button
                      onClick={toggleMute}
                      className="w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
                    >
                      {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                    </button>
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
                ) : modalEffectiveUrl ? (
                  <video
                    ref={modalVideoRef}
                    src={modalEffectiveUrl}
                    poster={activeModalVideo.thumbnailUrl}
                    autoPlay
                    playsInline
                    loop
                    muted={muted}
                    controls
                    preload="auto"
                    className="relative z-10 w-full h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-slate-400 p-4">
                    <Video className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">Không tìm thấy nguồn phát video</p>
                  </div>
                )}
              </div>

              {/* Bottom Floating Navigation & Product Tag */}
              <div className="absolute bottom-4 left-4 right-4 z-30 space-y-2.5 text-white bg-gradient-to-t from-black/90 via-black/60 to-transparent p-3 rounded-2xl">
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

                {/* Next/Prev Reel Nav Buttons */}
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
