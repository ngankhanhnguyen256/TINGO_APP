import React, { useState, useRef, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Play,
  Heart,
  Eye,
  Video,
  Edit3,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { Product, VerticalVideoItem } from '../types';
import { VerticalVideoEditorModal } from './admin/VerticalVideoEditorModal';
import { EditableElement } from './admin/EditableElement';
import { collection, onSnapshot } from 'firebase/firestore';
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
  
  const [videos, setVideos] = useState<VerticalVideoItem[]>(() => {
    return config.verticalVideos?.items || [];
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activePlayingVideoId, setActivePlayingVideoId] = useState<string | null>(null);
  
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [likedMap, setLikedMap] = useState<Record<string, boolean>>({});

  const carouselRef = useRef<HTMLDivElement>(null);

  const sectionData = config.verticalVideos || {
    badge: 'VIDEO TRáº¢I NGHIá»†M THá»°C Táº¾ (9:16)',
    titleLine1: 'KhÃ¡ch HÃ ng & ChuyÃªn Gia',
    titleLine2: 'NÃ³i GÃ¬ Vá» TINGO?',
    subtitle: 'Xem video review thá»±c táº¿, cáº£m nháº­n hÆ°Æ¡ng vá»‹ vÃ  tráº£i nghiá»‡m dinh dÆ°á»¡ng.',
    items: [],
  };

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    const videosCollectionRef = collection(db, 'videos');
    
    const unsubscribe = onSnapshot(
      videosCollectionRef,
      (snapshot) => {
        if (!isMounted) return;
        if (!snapshot.empty) {
          const fetchedVideos: VerticalVideoItem[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              title: data.title || 'Video tráº£i nghiá»‡m TINGO',
              author: data.author || 'KhÃ¡ch hÃ ng TINGO',
              authorAvatar: data.authorAvatar || '',
              videoUrl: data.videoUrl || '',
              thumbnailUrl: data.thumbnailUrl || '',
              viewsCount: data.viewsCount || '12.5K',
              likesCount: data.likesCount || '1.8K',
              badge: data.badge || 'Tráº£i Nghiá»‡m',
              order: typeof data.order === 'number' ? data.order : 0,
            } as VerticalVideoItem & { order?: number };
          });
          fetchedVideos.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          setVideos(fetchedVideos);
        } else {
          if (config.verticalVideos?.items) {
            setVideos(config.verticalVideos.items);
          }
        }
        setIsLoading(false);
      },
      (error) => {
        console.warn('Firebase videos onSnapshot error:', error);
        if (isMounted) setIsLoading(false);
      }
    );

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [config.verticalVideos?.items]);

  const scroll = (direction: 'left' | 'right') => {
    if (carouselRef.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      carouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCardClick = (item: VerticalVideoItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activePlayingVideoId === item.id) return;
    setActivePlayingVideoId(item.id);
  };

  const toggleLike = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setLikedMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <section className="py-16 bg-white overflow-hidden relative">
      <div className="container mx-auto px-4">
        {/* TiÃªu Ä‘á» */}
        <div className="mb-10 max-w-2xl relative">
          <EditableElement
            element="span"
            field="verticalVideos.badge"
            className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full mb-4 flex items-center gap-1 w-fit"
          >
            <Video className="w-3 h-3" />
            {sectionData.badge}
          </EditableElement>
          
          <h2 className="text-3xl md:text-4xl font-extrabold text-gray-900 mb-4 leading-tight">
            <EditableElement element="span" field="verticalVideos.titleLine1" className="block">
              {sectionData.titleLine1}
            </EditableElement>
            <EditableElement element="span" field="verticalVideos.titleLine2" className="text-green-600 block">
              {sectionData.titleLine2}
            </EditableElement>
          </h2>
          
          <EditableElement element="p" field="verticalVideos.subtitle" className="text-gray-600">
            {sectionData.subtitle}
          </EditableElement>
        </div>

        {/* NÃºt Admin & Scroll controls */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex-1">
            {isAdmin && isVisualEditActive && (
              <button
                onClick={() => setVideoModalOpen(true)}
                className="bg-amber-400 hover:bg-amber-500 text-amber-900 text-sm font-semibold px-4 py-2 rounded-full shadow flex items-center transition-all"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Quáº£n LÃ½ Video (Firebase)
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => scroll('left')} className="p-2 rounded-full border border-gray-200 hover:bg-green-50 text-gray-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={() => scroll('right')} className="p-2 rounded-full border border-gray-200 hover:bg-green-50 text-gray-600 transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Khung Video Carousel */}
        <div 
          ref={carouselRef}
          className="flex overflow-x-auto gap-4 md:gap-6 pb-8 snap-x snap-mandatory hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading && videos.length === 0 ? (
            <div className="w-full text-center py-20 text-gray-400 font-medium">Äang táº£i video...</div>
          ) : videos.length === 0 ? (
            <div className="w-full text-center py-20 text-gray-400 font-medium">ChÆ°a cÃ³ video nÃ o. Vui lÃ²ng thÃªm trong Admin.</div>
          ) : (
            videos.map((item, index) => (
              <div 
                key={item.id || index}
                className="flex-none w-[280px] md:w-[320px] aspect-[9/16] relative rounded-3xl overflow-hidden snap-center cursor-pointer group shadow-lg bg-black"
                onClick={(e) => handleCardClick(item, e)}
              >
                {activePlayingVideoId === item.id ? (
                  <video 
                    src={item.videoUrl} 
                    autoPlay 
                    controls 
                    playsInline 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <>
                    <img 
                      src={item.thumbnailUrl || 'https://via.placeholder.com/320x568.png?text=No+Thumbnail'} 
                      alt={item.title} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                    
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 bg-white/30 backdrop-blur-md rounded-full flex items-center justify-center border border-white/50 shadow-[0_0_20px_rgba(255,255,255,0.3)] animate-pulse group-hover:scale-110 transition-transform">
                        <Play className="w-8 h-8 text-white ml-1 fill-white" />
                      </div>
                    </div>
                  </>
                )}

                {activePlayingVideoId !== item.id && (
                  <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
                    <div className="flex items-center gap-2 mb-2">
                      <img src={item.authorAvatar || 'https://via.placeholder.com/40'} alt={item.author} className="w-8 h-8 rounded-full border border-white/30 object-cover" />
                      <span className="font-semibold text-sm drop-shadow-md">@{item.author}</span>
                      <div className="flex items-center text-xs ml-auto gap-1 text-white/90 font-medium">
                        <Eye className="w-3 h-3" /> {item.viewsCount}
                      </div>
                    </div>
                    <h3 className="font-bold text-base leading-tight mb-3 line-clamp-2 drop-shadow-md">{item.title}</h3>
                    
                    <button 
                      onClick={(e) => toggleLike(e, item.id)}
                      className="absolute top-4 right-4 w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center hover:bg-black/60 transition-colors z-10"
                    >
                      <Heart className={w-5 h-5 } />
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {isAdmin && isVisualEditActive && videoModalOpen && (
        <VerticalVideoEditorModal
          isOpen={videoModalOpen}
          onClose={() => setVideoModalOpen(false)}
          videos={videos}
          onSave={() => setVideoModalOpen(false)}
        />
      )}
    </section>
  );
};