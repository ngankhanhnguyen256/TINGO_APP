import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  Video,
  Upload,
  Link as LinkIcon,
  ShoppingBag,
  User,
  Eye,
  Heart,
  Sparkles,
  ArrowUp,
  ArrowDown,
  Play,
  Smartphone,
  Check,
  Image as ImageIcon,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { VerticalVideoItem } from '../../types';
import { saveVideoBlob } from '../../lib/storageHelper';
import { uploadVideoToCloud } from '../../lib/videoCloudStorage';
import { parseVideoUrl, fetchTikTokMetadata } from '../../utils/videoUrlHelper';

interface VerticalVideoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VerticalVideoEditorModal: React.FC<VerticalVideoEditorModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    config,
    updateVerticalVideos,
    addVerticalVideoItem,
    updateVerticalVideoItem,
    removeVerticalVideoItem,
    reorderVerticalVideoItem,
  } = useVisualEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isFetchingMetadata, setIsFetchingMetadata] = useState<boolean>(false);

  // Form State
  const [formData, setFormData] = useState<Partial<VerticalVideoItem>>({
    title: '',
    author: '',
    authorAvatar: '',
    videoUrl: '',
    thumbnailUrl: '',
    viewsCount: '12.5K',
    likesCount: '1.8K',
    badge: 'KOC Review',
    linkedProductId: '',
    linkedProductName: '',
    linkedProductPrice: 0,
  });

  if (!isOpen) return null;

  const sectionData = config.verticalVideos || {
    badge: 'VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)',
    titleLine1: 'Khách Hàng & Chuyên Gia',
    titleLine2: 'Nói Gì Về TINGO?',
    subtitle: 'Xem video review thực tế 9:16 từ cộng đồng người dùng TINGO.',
    items: [],
  };

  const parsedVideo = parseVideoUrl(formData.videoUrl);

  const handleStartEdit = (item: VerticalVideoItem) => {
    setEditingItemId(item.id);
    setIsAddingNew(false);
    setFormData({ ...item });
  };

  const handleStartAddNew = () => {
    setEditingItemId(null);
    setIsAddingNew(true);
    setFormData({
      id: `vid-${Date.now()}`,
      title: '',
      author: 'Khách hàng TINGO',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      videoUrl: '',
      thumbnailUrl: '',
      viewsCount: '15.2K',
      likesCount: '1.2K',
      badge: 'Review TikTok',
      linkedProductId: config.products[0]?.id || '',
      linkedProductName: config.products[0]?.name || '',
      linkedProductPrice: config.products[0]?.price || 0,
    });
  };

  const handleCancelForm = () => {
    setEditingItemId(null);
    setIsAddingNew(false);
  };

  // Auto-detect and fetch TikTok/YouTube information when URL changes
  const handleVideoUrlChange = async (newUrl: string) => {
    setFormData((prev) => ({ ...prev, videoUrl: newUrl }));
    const clean = newUrl.trim();
    if (!clean) return;

    const info = parseVideoUrl(clean);
    
    // 1. If YouTube: auto set thumbnail
    if (info.type === 'youtube' && info.suggestedThumbnailUrl) {
      setFormData((prev) => ({
        ...prev,
        thumbnailUrl: prev.thumbnailUrl || info.suggestedThumbnailUrl,
        badge: prev.badge || 'YouTube Shorts',
      }));
    }

    // 2. If TikTok: auto fetch metadata
    if (info.type === 'tiktok') {
      setIsFetchingMetadata(true);
      try {
        const meta = await fetchTikTokMetadata(clean);
        if (meta) {
          setFormData((prev) => ({
            ...prev,
            title: prev.title || meta.title || 'Video trải nghiệm TINGO',
            author: prev.author === 'Khách hàng TINGO' || !prev.author ? (meta.author || 'tingo.drink') : prev.author,
            thumbnailUrl: meta.thumbnailUrl || prev.thumbnailUrl,
            badge: prev.badge || 'TikTok Reel',
          }));
        }
      } catch {
        // continue gracefully
      } finally {
        setIsFetchingMetadata(false);
      }
    }
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoUrl && !formData.title) return;

    const itemId = formData.id || editingItemId || `vid-${Date.now()}`;
    const cleanVideoUrl = formData.videoUrl?.startsWith('blob:')
      ? `indexeddb://${itemId}`
      : formData.videoUrl || `indexeddb://${itemId}`;

    if (isAddingNew) {
      const newItem: VerticalVideoItem = {
        id: itemId,
        title: formData.title || 'Trải nghiệm sản phẩm TINGO',
        author: formData.author || 'Khách hàng TINGO',
        authorAvatar: formData.authorAvatar || '',
        videoUrl: cleanVideoUrl,
        thumbnailUrl: formData.thumbnailUrl || '',
        viewsCount: formData.viewsCount || '10.5K',
        likesCount: formData.likesCount || '1.1K',
        badge: formData.badge || 'Trải Nghiệm',
        linkedProductId: formData.linkedProductId,
        linkedProductName: formData.linkedProductName,
        linkedProductPrice: formData.linkedProductPrice,
      };
      addVerticalVideoItem(newItem);
    } else if (editingItemId) {
      updateVerticalVideoItem(editingItemId, {
        ...formData,
        id: itemId,
        videoUrl: cleanVideoUrl,
      });
    }

    setEditingItemId(null);
    setIsAddingNew(false);
  };

  // Video File Upload Handler from Device
  const handleVideoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);
    setUploadProgress(10);

    const tempVideoUrl = URL.createObjectURL(file);
    const itemId = editingItemId || formData.id || `vid-${Date.now()}`;

    // 1. Immediately bind form state and display preview in 0ms
    setFormData((prev) => ({
      ...prev,
      id: itemId,
      videoUrl: tempVideoUrl,
      title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
    }));

    // 2. Persist raw video binary directly in IndexedDB for 0ms local playback
    saveVideoBlob(itemId, file).catch((err) => {
      console.warn('IndexedDB video blob store warning:', err);
    });

    // 3. Auto-capture video thumbnail frame to prevent black boxes
    const video = document.createElement('video');
    video.src = tempVideoUrl;
    video.crossOrigin = 'anonymous';
    video.currentTime = 0.5;
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = 0.5;
    };

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 480;
        canvas.height = video.videoHeight || 854;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const thumb = canvas.toDataURL('image/jpeg', 0.82);
          setFormData((prev) => ({
            ...prev,
            thumbnailUrl: prev.thumbnailUrl || thumb,
          }));
        }
      } catch (err) {
        console.warn('Auto thumbnail capture notice:', err);
      }
    };

    // 4. Background lightweight sync
    try {
      setUploadProgress(50);
      const cloudResultUrl = await uploadVideoToCloud(itemId, file, {
        title: formData.title || file.name,
        author: formData.author || 'TINGO Admin',
        onProgress: (pct) => {
          setUploadProgress(pct);
        },
      });

      setFormData((prev) => ({
        ...prev,
        videoUrl: cloudResultUrl,
      }));
    } catch (err) {
      console.warn('Video upload notice:', err);
    } finally {
      setIsUploadingVideo(false);
      setUploadProgress(null);
    }
  };

  const handleProductSelect = (productId: string) => {
    const prod = config.products.find((p) => p.id === productId);
    if (prod) {
      setFormData((prev) => ({
        ...prev,
        linkedProductId: prod.id,
        linkedProductName: prod.name,
        linkedProductPrice: prod.price,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        linkedProductId: '',
        linkedProductName: '',
        linkedProductPrice: 0,
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-[#008874] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Quản Lý Banner Video Dọc 9:16 (TikTok, Shorts & MP4)
              </h3>
              <p className="text-xs text-emerald-100">
                Hỗ trợ dán link TikTok, YouTube Shorts hoặc tải file trực tiếp từ máy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          
          {/* Section Heading Settings */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Tiêu Đề Khu Vực Video Dọc
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Badge nhỏ:</label>
                <input
                  type="text"
                  value={sectionData.badge || ''}
                  onChange={(e) => updateVerticalVideos({ badge: e.target.value })}
                  placeholder="VIDEO TRẢI NGHIỆM THỰC TẾ (9:16)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tiêu đề dòng 1:</label>
                <input
                  type="text"
                  value={sectionData.titleLine1 || ''}
                  onChange={(e) => updateVerticalVideos({ titleLine1: e.target.value })}
                  placeholder="Khách Hàng & Chuyên Gia"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Tiêu đề dòng 2:</label>
                <input
                  type="text"
                  value={sectionData.titleLine2 || ''}
                  onChange={(e) => updateVerticalVideos({ titleLine2: e.target.value })}
                  placeholder="Nói Gì Về TINGO?"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>
            </div>
          </div>

          {/* If Editing or Adding a Video */}
          {(isAddingNew || editingItemId) ? (
            <form onSubmit={handleSaveForm} className="bg-emerald-50/50 p-4 sm:p-5 rounded-2xl border-2 border-emerald-300 space-y-4">
              <div className="flex items-center justify-between border-b border-emerald-200 pb-3">
                <h4 className="font-bold text-sm text-emerald-900 flex items-center gap-2">
                  <Video className="w-4 h-4 text-emerald-700" />
                  {isAddingNew ? 'Thêm Video Dọc 9:16 Mới' : 'Chỉnh Sửa Video Dọc 9:16'}
                </h4>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer"
                >
                  Hủy thao tác
                </button>
              </div>

              {/* Upload from Device OR Enter URL */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 1. Dán Link TikTok / YouTube Shorts / URL */}
                <div className="p-4 rounded-2xl bg-white border-2 border-emerald-400 shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <LinkIcon className="w-4 h-4 text-[#008874]" />
                      Cách 1: Dán Link TikTok / YouTube Shorts (Khuyên Dùng)
                    </label>
                    {isFetchingMetadata && (
                      <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Đang lấy thông tin video...
                      </span>
                    )}
                  </div>
                  
                  <input
                    type="url"
                    placeholder="https://www.tiktok.com/@tingo.drink/video/76468088493021... hoặc YouTube Shorts"
                    value={formData.videoUrl || ''}
                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-emerald-300 bg-emerald-50/20 focus:outline-none focus:ring-2 focus:ring-[#008874] font-mono"
                  />
                  
                  <div className="text-[11px] text-slate-600 space-y-1">
                    <p className="flex items-center gap-1 text-emerald-800 font-semibold">
                      <Check className="w-3.5 h-3.5 text-emerald-600" /> Hỗ trợ tự động nhận diện TikTok Video ID & YouTube Shorts.
                    </p>
                    <p className="text-slate-500 text-[10px]">
                      Hệ thống tự động nhúng Player chuẩn HD, không tốn dung lượng máy chủ và phát mượt trên mọi thiết bị.
                    </p>
                  </div>
                </div>

                {/* 2. Tải Video từ Thiết Bị */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Cách 2: Tải Video Dọc (9:16) Từ Điện Thoại / Máy Tính
                  </label>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="video/mp4,video/webm,video/quicktime,video/*"
                    onChange={handleVideoFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingVideo}
                    className="w-full py-3 px-4 border-2 border-dashed border-emerald-400 hover:border-emerald-600 hover:bg-emerald-50/70 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5 relative overflow-hidden"
                  >
                    <Upload className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      {isUploadingVideo
                        ? `Đang lưu & tối ưu video (${uploadProgress || 50}%)...`
                        : 'Bấm vào đây để chọn video 9:16 từ máy'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {isUploadingVideo
                        ? 'Video đang được lưu an toàn vào bộ nhớ đệm chuẩn tốc độ cao'
                        : 'Hỗ trợ định dạng MP4, WebM, MOV tỉ lệ dọc 9:16 (Tốc độ phát 0ms)'}
                    </span>
                    {uploadProgress !== null && (
                      <div className="w-full bg-emerald-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    )}
                  </button>
                </div>

              </div>

              {/* Video & Thumbnail Live Preview */}
              {(formData.videoUrl || formData.thumbnailUrl) && (
                <div className="p-4 bg-white rounded-2xl border border-emerald-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left: Interactive Video Player Live Preview */}
                  <div className="p-3 rounded-xl bg-slate-900 text-white flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
                      <span className="flex items-center gap-1.5">
                        <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                        Bản Xem Trước Video ({parsedVideo.type.toUpperCase()})
                      </span>
                      {parsedVideo.embedUrl && (
                        <a
                          href={formData.videoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[10px] text-slate-400 hover:text-white flex items-center gap-0.5"
                        >
                          Mở link gốc <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>

                    <div className="w-full h-72 sm:h-80 bg-black rounded-xl overflow-hidden relative flex items-center justify-center border border-white/10">
                      {parsedVideo.type === 'tiktok' && parsedVideo.embedUrl ? (
                        <iframe
                          src={parsedVideo.embedUrl}
                          title="TikTok Video Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      ) : parsedVideo.type === 'youtube' && parsedVideo.embedUrl ? (
                        <iframe
                          src={parsedVideo.embedUrl}
                          title="YouTube Video Preview"
                          className="w-full h-full border-0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : formData.videoUrl ? (
                        <video
                          src={formData.videoUrl}
                          poster={formData.thumbnailUrl}
                          controls
                          playsInline
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="text-center p-4 text-slate-500">
                          <Video className="w-8 h-8 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">Chưa có video để xem trước</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: Cover Thumbnail Preview & Info */}
                  <div className="space-y-3 flex flex-col justify-between">
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-20 h-28 rounded-lg bg-slate-800 overflow-hidden relative shrink-0 shadow-xs border border-emerald-300">
                          {formData.thumbnailUrl ? (
                            <img
                              src={formData.thumbnailUrl}
                              alt="Ảnh bìa"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-1 text-center">
                              <ImageIcon className="w-5 h-5 mb-0.5 text-slate-400" />
                              <span className="text-[8px] leading-tight">Chưa có ảnh bìa</span>
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="text-xs font-bold text-emerald-900 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-emerald-600" /> Ảnh Bìa Thẻ Xoay Vòng
                          </div>
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {formData.title || 'Tiêu đề video trải nghiệm'}
                          </p>
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                            @{formData.author || 'tingo.drink'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Thumbnail URL Input */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <label className="text-[11px] font-bold text-slate-700 flex items-center justify-between">
                        <span>URL Ảnh Bìa (Thumbnail):</span>
                        {formData.thumbnailUrl && (
                          <button
                            type="button"
                            onClick={() => setFormData({ ...formData, thumbnailUrl: '' })}
                            className="text-[10px] text-rose-600 font-semibold cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </label>
                      <input
                        type="url"
                        placeholder="https://... ảnh bìa hiển thị trước khi bấm xem"
                        value={formData.thumbnailUrl || ''}
                        onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                        className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Video Details: Title, Author, Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tiêu đề hiển thị trên video:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Review 3 phút pha trà sữa dinh dưỡng Vhealth..."
                    value={formData.title || ''}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Badge thẻ gắn:
                  </label>
                  <input
                    type="text"
                    placeholder="TikTok Reel / Review KOC..."
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Tên người chia sẻ / tác giả:
                  </label>
                  <input
                    type="text"
                    placeholder="tingo.drink / Hồng Nhung"
                    value={formData.author || ''}
                    onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lượt xem mô phỏng:
                  </label>
                  <input
                    type="text"
                    placeholder="48.5K"
                    value={formData.viewsCount || ''}
                    onChange={(e) => setFormData({ ...formData, viewsCount: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">
                    Lượt thích (Likes):
                  </label>
                  <input
                    type="text"
                    placeholder="3.2K"
                    value={formData.likesCount || ''}
                    onChange={(e) => setFormData({ ...formData, likesCount: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              {/* Linked Product Tag */}
              <div className="p-3.5 bg-white rounded-2xl border border-slate-200 space-y-2">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                  Gắn Sản Phẩm TINGO vào góc video (để khách bấm Mua Ngay):
                </label>
                <select
                  value={formData.linkedProductId || ''}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                >
                  <option value="">-- Không gắn sản phẩm --</option>
                  {config.products.map((prod) => (
                    <option key={prod.id} value={prod.id}>
                      {prod.name} - {prod.price.toLocaleString('vi-VN')}đ
                    </option>
                  ))}
                </select>
              </div>

              {/* Save or Cancel */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-[#008874] hover:bg-[#007052] shadow-sm transition-all cursor-pointer"
                >
                  {isAddingNew ? 'Lưu Video Vào Banner' : 'Cập Nhật Video'}
                </button>
              </div>
            </form>
          ) : (
            /* Videos List */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Danh Sách Video 9:16 Đang Hiển Thị ({sectionData.items?.length || 0} video)
                </h4>
                <button
                  type="button"
                  onClick={handleStartAddNew}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-sm transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Thêm / Dán Link TikTok Video 9:16</span>
                </button>
              </div>

              {(!sectionData.items || sectionData.items.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                  <Video className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Chưa có video dọc nào trong banner</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Nhấp vào nút bên dưới để dán link video TikTok hoặc tải video từ thiết bị
                  </p>
                  <button
                    type="button"
                    onClick={handleStartAddNew}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008874] text-white text-xs font-bold"
                  >
                    <Plus className="w-4 h-4" /> Thêm Video Đầu Tiên
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {sectionData.items.map((item, idx) => {
                    const itemParsed = parseVideoUrl(item.videoUrl);
                    return (
                      <div
                        key={item.id}
                        className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 flex items-center gap-3 transition-all shadow-xs"
                      >
                        {/* 9:16 Mini Preview */}
                        <div className="w-16 h-24 rounded-xl bg-slate-900 overflow-hidden relative shrink-0">
                          {item.thumbnailUrl ? (
                            <img
                              src={item.thumbnailUrl}
                              alt=""
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                            />
                          ) : item.videoUrl?.startsWith('http') && !itemParsed.isEmbeddable ? (
                            <video
                              src={item.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              playsInline
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-slate-800 text-white">
                              <Video className="w-5 h-5 text-emerald-400" />
                            </div>
                          )}
                          <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/70 text-white text-[8px] font-bold">
                            {itemParsed.type === 'tiktok' ? 'TikTok' : itemParsed.type === 'youtube' ? 'Shorts' : '9:16'}
                          </div>
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          {item.badge && (
                            <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                          <h5 className="font-bold text-xs text-slate-900 line-clamp-1 mt-0.5">
                            {item.title}
                          </h5>
                          <p className="text-[11px] text-slate-500 truncate">
                            @{item.author} • {item.viewsCount || '10K'} views
                          </p>
                          {item.linkedProductName && (
                            <div className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1 mt-0.5">
                              <ShoppingBag className="w-3 h-3" />
                              <span className="truncate">{item.linkedProductName}</span>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col gap-1 items-end shrink-0">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => reorderVerticalVideoItem(item.id, 'prev')}
                              disabled={idx === 0}
                              title="Di chuyển lên trước"
                              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => reorderVerticalVideoItem(item.id, 'next')}
                              disabled={idx === (sectionData.items?.length || 0) - 1}
                              title="Di chuyển xuống sau"
                              className="p-1 rounded-lg hover:bg-slate-100 disabled:opacity-30 text-slate-600 cursor-pointer"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(item)}
                              title="Sửa video này"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeVerticalVideoItem(item.id)}
                              title="Xóa video này"
                              className="p-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-700 hover:text-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Tất cả video tự động tương thích giao diện di động & máy tính chuẩn 9:16
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#008874] hover:bg-[#007052] shadow-sm transition-all cursor-pointer"
          >
            Đóng & Lưu Thay Đổi
          </button>
        </div>

      </div>
    </div>
  );
};
