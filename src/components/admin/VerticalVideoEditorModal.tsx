import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { VerticalVideoItem } from '../../types';
import { saveVideoBlob, compressImage } from '../../lib/storageHelper';
import { uploadVideoToCloud } from '../../lib/videoCloudStorage';

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
    openImagePicker,
  } = useVisualEditor();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [isUploadingVideo, setIsUploadingVideo] = useState<boolean>(false);

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
      thumbnailUrl: 'https://images.unsplash.com/photo-1556911073-38141963c9e0?auto=format&fit=crop&w=600&q=80',
      viewsCount: '15.2K',
      likesCount: '1.2K',
      badge: 'Review Thực Tế',
      linkedProductId: config.products[0]?.id || '',
      linkedProductName: config.products[0]?.name || '',
      linkedProductPrice: config.products[0]?.price || 0,
    });
  };

  const handleCancelForm = () => {
    setEditingItemId(null);
    setIsAddingNew(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.videoUrl && !formData.title) return;

    if (isAddingNew) {
      const newItem: VerticalVideoItem = {
        id: formData.id || `vid-${Date.now()}`,
        title: formData.title || 'Trải nghiệm sản phẩm TINGO',
        author: formData.author || 'Khách hàng TINGO',
        authorAvatar: formData.authorAvatar || '',
        videoUrl: formData.videoUrl || '',
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
      updateVerticalVideoItem(editingItemId, formData);
    }

    setEditingItemId(null);
    setIsAddingNew(false);
  };

  // Video File Upload Handler from Device
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingVideo(true);

    const tempVideoUrl = URL.createObjectURL(file);

    // Auto-capture video thumbnail frame to prevent black boxes
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

    // Read video as Base64 Data URL for standalone playback and cloud upload
    const reader = new FileReader();
    reader.onload = async (event) => {
      const result = event.target?.result as string;
      if (result) {
        const itemId = editingItemId || `video-custom-${Date.now()}`;
        try {
          const cloudUrl = await uploadVideoToCloud(itemId, result, {
            title: formData.title || file.name.replace(/\.[^/.]+$/, ''),
            author: formData.author || 'Khách hàng TINGO',
          });
          setFormData((prev) => ({
            ...prev,
            videoUrl: cloudUrl || result,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
          }));
        } catch {
          await saveVideoBlob(itemId, result);
          setFormData((prev) => ({
            ...prev,
            videoUrl: result,
            title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
          }));
        }
      }
      setIsUploadingVideo(false);
    };
    reader.onerror = () => {
      setFormData((prev) => ({
        ...prev,
        videoUrl: tempVideoUrl,
        title: prev.title || file.name.replace(/\.[^/.]+$/, ''),
      }));
      setIsUploadingVideo(false);
    };

    reader.readAsDataURL(file);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-[#008874] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Quản Lý Banner Video Dọc 9:16 (Reels & Shorts)
              </h3>
              <p className="text-xs text-emerald-100">
                Tải video từ thiết bị hoặc dán URL (MP4, Shorts, TikTok) để tạo banner xoay vòng
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
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
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
            <form onSubmit={handleSaveForm} className="bg-emerald-50/50 p-5 rounded-2xl border-2 border-emerald-300 space-y-4">
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
                
                {/* 1. Tải Video từ Thiết Bị */}
                <div className="p-4 rounded-2xl bg-white border border-emerald-200 space-y-3">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Cách 1: Tải Video Dọc (9:16) Từ Điện Thoại / Máy Tính
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
                    className="w-full py-3 px-4 border-2 border-dashed border-emerald-400 hover:border-emerald-600 hover:bg-emerald-50/70 rounded-xl text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-1.5"
                  >
                    <Upload className="w-5 h-5 text-emerald-700" />
                    <span className="text-xs font-bold text-emerald-900">
                      {isUploadingVideo ? 'Đang đọc video từ thiết bị...' : 'Bấm vào đây để chọn video 9:16 từ máy'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      Hỗ trợ định dạng MP4, WebM, MOV tỉ lệ dọc 9:16
                    </span>
                  </button>
                </div>

                {/* 2. Dán Link Video URL */}
                <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <LinkIcon className="w-4 h-4 text-blue-600" />
                    Cách 2: Dán Đường Link URL Video (MP4 / WebM / CDN)
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com/video-review.mp4"
                    value={formData.videoUrl || ''}
                    onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                  <div className="text-[11px] text-slate-500">
                    Gợi ý: Link file .mp4 từ Cloudflare, AWS S3, Bunny, Imgur, Supabase hoặc CDN.
                  </div>
                </div>
              </div>

              {/* Video Preview If Available */}
              {formData.videoUrl && (
                <div className="p-3 bg-white rounded-2xl border border-emerald-200 flex items-center gap-4">
                  <div className="w-20 h-32 rounded-xl bg-slate-900 overflow-hidden relative shrink-0 shadow-sm">
                    <video
                      src={formData.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <Play className="w-5 h-5 text-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600" /> Đã nạp video 9:16 thành công!
                    </div>
                    <div className="text-[11px] text-slate-500 truncate mt-0.5">
                      {formData.videoUrl.startsWith('data:') ? 'Video tải lên từ thiết bị' : formData.videoUrl}
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
                    placeholder="3 Phút Pha Bữa Sáng Vhealth Trà Xanh..."
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
                    placeholder="KOC Review / Bác Sĩ / Runner..."
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
                    placeholder="Hồng Nhung (Fitness Coach)"
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
                  className="px-6 py-2 rounded-xl text-xs font-bold text-white bg-[#008874] hover:bg-[#007052] shadow-sm transition-all cursor-pointer"
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
                  <span>+ Thêm / Tải Video 9:16 Mới</span>
                </button>
              </div>

              {(!sectionData.items || sectionData.items.length === 0) ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
                  <Video className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-bold text-slate-700">Chưa có video dọc nào trong banner</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">
                    Nhấp vào nút bên dưới để tải video 9:16 từ thiết bị hoặc thêm link video URL
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
                  {sectionData.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200 hover:border-emerald-300 flex items-center gap-3 transition-all shadow-xs"
                    >
                      {/* 9:16 Mini Preview */}
                      <div className="w-16 h-24 rounded-xl bg-slate-900 overflow-hidden relative shrink-0">
                        {item.videoUrl ? (
                          <video
                            src={item.videoUrl}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                        <div className="absolute top-1 left-1 px-1 py-0.5 rounded bg-black/60 text-white text-[8px] font-bold">
                          9:16
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
                          {item.author} • {item.viewsCount || '10K'} views
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
                  ))}
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
