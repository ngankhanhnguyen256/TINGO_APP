import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Upload,
  Link,
  Grid,
  Check,
  Image as ImageIcon,
  AlertCircle,
  FileImage,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Move,
  Maximize2,
  Minimize2,
  Sparkles,
  Sliders,
  Eye,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Layers,
  Palette,
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { ProductVisual } from '../ProductVisual';
import { compressImage } from '../../lib/storageHelper';

const PRESET_ILLUSTRATIONS = [
  { key: 'quantum-hydrogen', name: 'Nước Hydrogen Quantum' },
  { key: 'vhealth-duo', name: 'Vhealth 2 Vị Bộ Đôi' },
  { key: 'vhealth-matcha', name: 'Vhealth Trà Xanh Matcha' },
  { key: 'vhealth-scl', name: 'Vhealth Sô-cô-la Cacao' },
  { key: 'vsportgel', name: 'Vsportgel Năng Lượng' },
  { key: 'topapro', name: 'Topapro Tăng Đề Kháng' },
  { key: 'caphe-link', name: 'Caphe Link Nấm Linh Chi' },
  { key: 'green-quantum', name: 'Xịt Khoáng Green Quantum' },
];

const PRESET_PHOTOS = [
  {
    url: 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=800&q=80',
    name: 'Bình lắc & Nước khoáng kiềm',
  },
  {
    url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
    name: 'Salad ngũ cốc organic',
  },
  {
    url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?auto=format&fit=crop&w=800&q=80',
    name: 'Giọt nước tinh khiết',
  },
  {
    url: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    name: 'Bữa sáng healthy dinh dưỡng',
  },
  {
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    name: 'Avatar Nữ thanh lịch',
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
    name: 'Avatar Nam thể thao',
  },
  {
    url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80',
    name: 'Avatar Khách hàng lớn tuổi',
  },
];

type AspectRatio = '1:1' | '4:3' | '3:4' | '16:9' | 'free';
type BackgroundFill = 'tingo-mint' | 'white' | 'dark-emerald' | 'slate' | 'transparent';
type PreviewContext = 'card' | 'showcase' | 'clean';

export const ImagePickerModal: React.FC = () => {
  const { imagePicker, closeImagePicker } = useVisualEditor();
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [selectedImageSrc, setSelectedImageSrc] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Studio Adjustment Parameters - Default to 4:3 Ngang, Tràn viền (Cover), Không background
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');
  const [fitMode, setFitMode] = useState<'contain' | 'cover'>('cover');
  const [zoom, setZoom] = useState<number>(100);
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  const [bgFill, setBgFill] = useState<BackgroundFill>('transparent');
  const [previewContext, setPreviewContext] = useState<PreviewContext>('card');

  // When modal opens, populate initial image if available
  useEffect(() => {
    if (imagePicker.isOpen) {
      if (imagePicker.currentImage) {
        // If current image is not an illustration key, load it
        if (
          imagePicker.currentImage.startsWith('http') ||
          imagePicker.currentImage.startsWith('data:')
        ) {
          setSelectedImageSrc(imagePicker.currentImage);
          setUrlInput(imagePicker.currentImage);
        }
      }
      resetAdjustments();
    }
  }, [imagePicker.isOpen, imagePicker.currentImage]);

  if (!imagePicker.isOpen) return null;

  const resetAdjustments = () => {
    setZoom(100);
    setPosX(0);
    setPosY(0);
    setRotation(0);
    setFitMode('cover');
    setAspectRatio('4:3');
    setBgFill('transparent');
    setPreviewContext('card');
  };

  // Process selected file to Base64 data URL with automatic high-efficiency compression
  const handleFileChange = async (file: File) => {
    setUploadError(null);
    if (!file.type.startsWith('image/')) {
      setUploadError('Vui lòng chọn tệp hình ảnh hợp lệ (PNG, JPG, WebP, SVG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setUploadError('Kích thước ảnh tối đa là 15MB. Vui lòng chọn ảnh nhỏ hơn.');
      return;
    }

    try {
      setIsProcessing(true);
      const compressed = await compressImage(file, 800, 800, 0.82);
      setSelectedImageSrc(compressed);
      resetAdjustments();
    } catch {
      setUploadError('Không thể xử lý và nén tệp hình ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  // Generate processed canvas image with compact WebP/JPEG compression
  const generateProcessedImage = async (): Promise<string> => {
    if (!selectedImageSrc) return '';

    // If no adjustments were made, ensure it is compressed
    if (
      zoom === 100 &&
      posX === 0 &&
      posY === 0 &&
      rotation === 0 &&
      fitMode === 'contain' &&
      aspectRatio === '1:1' &&
      bgFill === 'transparent'
    ) {
      if (selectedImageSrc.startsWith('data:image/') && selectedImageSrc.length > 80000) {
        return await compressImage(selectedImageSrc, 800, 800, 0.82);
      }
      return selectedImageSrc;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = 800;
        let height = 800;

        if (aspectRatio === '4:3') {
          width = 800;
          height = 600;
        } else if (aspectRatio === '3:4') {
          width = 600;
          height = 800;
        } else if (aspectRatio === '16:9') {
          width = 960;
          height = 540;
        } else if (aspectRatio === 'free') {
          width = Math.min(img.naturalWidth || 800, 800);
          height = Math.min(img.naturalHeight || 800, 800);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(selectedImageSrc);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 1. Draw Background Fill
        if (bgFill === 'white') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, width, height);
        } else if (bgFill === 'tingo-mint') {
          const grad = ctx.createLinearGradient(0, 0, 0, height);
          grad.addColorStop(0, '#f2f8f4');
          grad.addColorStop(1, '#ffffff');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        } else if (bgFill === 'dark-emerald') {
          const grad = ctx.createLinearGradient(0, 0, width, height);
          grad.addColorStop(0, '#052319');
          grad.addColorStop(0.5, '#093526');
          grad.addColorStop(1, '#014d3a');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, width, height);
        } else if (bgFill === 'slate') {
          ctx.fillStyle = '#f8fafc';
          ctx.fillRect(0, 0, width, height);
        }

        // 2. Transform & Render Image
        ctx.save();
        ctx.translate(width / 2 + (posX * width) / 200, height / 2 + (posY * height) / 200);
        ctx.rotate((rotation * Math.PI) / 180);

        const scale = zoom / 100;
        let drawW = width;
        let drawH = height;

        const imgRatio = img.naturalWidth / img.naturalHeight;
        const canvasRatio = width / height;

        if (fitMode === 'contain') {
          if (imgRatio > canvasRatio) {
            drawW = width * 0.85 * scale;
            drawH = (width * 0.85 * scale) / imgRatio;
          } else {
            drawH = height * 0.85 * scale;
            drawW = height * 0.85 * scale * imgRatio;
          }
        } else {
          // cover
          if (imgRatio > canvasRatio) {
            drawH = height * scale;
            drawW = height * scale * imgRatio;
          } else {
            drawW = width * scale;
            drawH = (width * scale) / imgRatio;
          }
        }

        ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
        ctx.restore();

        try {
          // Use WebP with quality 0.82 for super compact footprint (~40KB)
          let dataUrl = canvas.toDataURL('image/webp', 0.82);
          if (!dataUrl.startsWith('data:image/webp')) {
            dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          }
          resolve(dataUrl);
        } catch {
          resolve(selectedImageSrc);
        }
      };
      img.onerror = () => {
        resolve(selectedImageSrc);
      };
      img.src = selectedImageSrc;
    });
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      if (selectedImageSrc) {
        const finalUrl = await generateProcessedImage();
        imagePicker.onSelect(finalUrl || selectedImageSrc);
      } else if (urlInput.trim()) {
        imagePicker.onSelect(urlInput.trim());
      }
    } catch {
      if (selectedImageSrc) imagePicker.onSelect(selectedImageSrc);
    } finally {
      setIsProcessing(false);
    }
  };

  const getAspectRatioClasses = () => {
    switch (aspectRatio) {
      case '1:1':
        return 'aspect-square max-w-[280px] sm:max-w-[320px]';
      case '4:3':
        return 'aspect-[4/3] max-w-[320px] sm:max-w-[360px]';
      case '3:4':
        return 'aspect-[3/4] max-w-[240px] sm:max-w-[280px]';
      case '16:9':
        return 'aspect-video max-w-[360px] sm:max-w-[420px]';
      case 'free':
        return 'h-72 max-w-[360px]';
      default:
        return 'aspect-square max-w-[320px]';
    }
  };

  const getBackgroundFillClass = () => {
    switch (bgFill) {
      case 'tingo-mint':
        return 'bg-gradient-to-b from-[#f2f8f4] to-white';
      case 'white':
        return 'bg-white';
      case 'dark-emerald':
        return 'bg-gradient-to-br from-[#052319] via-[#093526] to-[#014d3a]';
      case 'slate':
        return 'bg-slate-50';
      case 'transparent':
        return 'bg-[repeating-conic-gradient(#e2e8f0_0_25%,#f8fafc_0_50%)] bg-[length:16px_16px]';
      default:
        return 'bg-gradient-to-b from-[#f2f8f4] to-white';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[94vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-[#008874] flex items-center justify-center shadow-xs">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {imagePicker.title}
              </h3>
              <p className="text-xs text-slate-500">
                Tự động canh chỉnh tỉ lệ, thu phóng, dịch chuyển và xem trước trực tiếp
              </p>
            </div>
          </div>

          <button
            onClick={closeImagePicker}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'border-[#008874] text-[#008874] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Tải lên từ thiết bị</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'url'
                ? 'border-[#008874] text-[#008874] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Link className="w-4 h-4" />
            <span>Dán Link URL</span>
          </button>

          <button
            onClick={() => setActiveTab('presets')}
            className={`flex items-center gap-2 py-3 px-4 text-xs sm:text-sm font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === 'presets'
                ? 'border-[#008874] text-[#008874] bg-white rounded-t-lg shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Grid className="w-4 h-4" />
            <span>Thư viện mẫu TINGO</span>
          </button>
        </div>

        {/* Modal Main Content Container */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB 1: UPLOAD */}
          {activeTab === 'upload' && !selectedImageSrc && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-[#008874] bg-emerald-50 scale-[1.01]'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/60 hover:bg-emerald-50/30'
                }`}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />

                <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-[#008874] flex items-center justify-center shadow-md">
                  <FileImage className="w-8 h-8" />
                </div>

                <div>
                  <p className="text-base font-bold text-slate-800">
                    Kéo thả ảnh vào đây, hoặc <span className="text-[#008874] underline">chọn từ thiết bị của bạn</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1.5">
                    Hỗ trợ PNG, JPG, WebP, SVG (tối đa 8MB). Sau khi tải lên sẽ có studio tự động canh chỉnh tỉ lệ.
                  </p>
                </div>
              </div>

              {uploadError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{uploadError}</span>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: URL */}
          {activeTab === 'url' && !selectedImageSrc && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Đường dẫn liên kết ảnh trực tiếp (HTTP / HTTPS)
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="https://images.unsplash.com/... hoặc link ảnh bất kỳ"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    className="flex-1 px-4 py-3 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs sm:text-sm shadow-xs"
                  />
                  <button
                    onClick={() => {
                      if (urlInput.trim()) {
                        setSelectedImageSrc(urlInput.trim());
                        resetAdjustments();
                      }
                    }}
                    disabled={!urlInput.trim()}
                    className="px-6 py-3 rounded-2xl bg-[#008764] hover:bg-[#007052] disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    Tải ảnh vào Studio
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PRESETS */}
          {activeTab === 'presets' && !selectedImageSrc && (
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Sản phẩm & Đồ uống 3D TINGO
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PRESET_ILLUSTRATIONS.map((item) => (
                    <button
                      key={item.key}
                      onClick={() => {
                        imagePicker.onSelect(item.key);
                      }}
                      className="group p-2.5 rounded-2xl border border-slate-200 hover:border-[#008874] hover:shadow-lg transition-all text-left bg-white cursor-pointer"
                    >
                      <div className="h-28 rounded-xl overflow-hidden mb-2 flex items-center justify-center bg-slate-50">
                        <ProductVisual imageKey={item.key} size="sm" className="scale-90" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#008874]">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-600" />
                  Ảnh Chụp Organic & Lifestyle
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {PRESET_PHOTOS.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setSelectedImageSrc(item.url);
                        resetAdjustments();
                      }}
                      className="group p-2.5 rounded-2xl border border-slate-200 hover:border-[#008874] hover:shadow-lg transition-all text-left bg-white cursor-pointer"
                    >
                      <img
                        src={item.url}
                        alt={item.name}
                        className="w-full h-28 object-cover rounded-xl mb-2 group-hover:scale-105 transition-transform"
                      />
                      <span className="text-xs font-bold text-slate-800 line-clamp-1 group-hover:text-[#008874]">
                        {item.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STUDIO CANH CHỈNH TỈ LỆ & XEM TRƯỚC TRỰC QUAN KHI ĐÃ CÓ ẢNH */}
          {/* ========================================================================= */}
          {selectedImageSrc && (
            <div className="space-y-6">
              
              {/* Top Bar of Studio */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Studio Canh Chỉnh & Tự Động Khớp Khung Hình</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={resetAdjustments}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold border border-slate-200 transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Đặt lại mặc định</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedImageSrc(null);
                      setUrlInput('');
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Đổi ảnh khác</span>
                  </button>
                </div>
              </div>

              {/* Grid: Preview Stage (Left) & Controls Panel (Right) */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT: INTERACTIVE LIVE PREVIEW STAGE (6 Cols) */}
                <div className="lg:col-span-6 flex flex-col items-center justify-center space-y-3">
                  
                  {/* Context Simulator Selector */}
                  <div className="w-full flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Mô phỏng hiển thị:
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-xl">
                      <button
                        onClick={() => setPreviewContext('card')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          previewContext === 'card'
                            ? 'bg-white text-[#008874] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Thẻ Card
                      </button>
                      <button
                        onClick={() => setPreviewContext('showcase')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          previewContext === 'showcase'
                            ? 'bg-white text-[#008874] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Showcase Nổi Bật
                      </button>
                      <button
                        onClick={() => setPreviewContext('clean')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                          previewContext === 'clean'
                            ? 'bg-white text-[#008874] shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Khung Thuần
                      </button>
                    </div>
                  </div>

                  {/* Simulator Wrapper */}
                  <div
                    className={`w-full p-4 sm:p-6 rounded-3xl flex flex-col items-center justify-center transition-all ${
                      previewContext === 'showcase'
                        ? 'bg-gradient-to-br from-[#052319] via-[#093526] to-[#014d3a] text-white shadow-xl'
                        : previewContext === 'card'
                        ? 'bg-slate-100/90 border border-slate-200/80 shadow-md'
                        : 'bg-slate-50 border border-slate-200'
                    }`}
                  >
                    {/* Simulated Card Outer */}
                    <div
                      className={`w-full ${getAspectRatioClasses()} rounded-2xl overflow-hidden border border-slate-200/80 shadow-sm relative transition-all flex items-center justify-center ${getBackgroundFillClass()}`}
                    >
                      {/* Interactive Transformed Image */}
                      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
                        <img
                          src={selectedImageSrc}
                          alt="Preview"
                          referrerPolicy="no-referrer"
                          style={{
                            transform: `translate(${posX}%, ${posY}%) scale(${zoom / 100}) rotate(${rotation}deg)`,
                            objectFit: fitMode,
                            transition: 'transform 0.08s ease-out',
                          }}
                          className={`w-full h-full max-w-full max-h-full pointer-events-none drop-shadow-md select-none`}
                        />
                      </div>

                      {/* Alignment Target Crosshair helper */}
                      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
                        <div className="w-full h-[1px] bg-slate-400/40" />
                        <div className="h-full w-[1px] bg-slate-400/40 absolute" />
                      </div>
                    </div>

                    {/* Simulated Context Captions */}
                    {previewContext === 'card' && (
                      <div className="w-full mt-3 p-3 bg-white rounded-xl border border-slate-200/60 shadow-xs flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-800 block">Sản phẩm dinh dưỡng TINGO</span>
                          <span className="text-[11px] text-emerald-700 font-bold">790.000đ</span>
                        </div>
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                          ✓ Khớp thẻ card
                        </span>
                      </div>
                    )}

                    {previewContext === 'showcase' && (
                      <div className="w-full mt-3 text-center text-xs text-emerald-200">
                        <span className="font-bold block text-white">✨ Hiển thị trong Showcase Bán Chạy #1</span>
                        <span className="text-[11px] text-emerald-300">Tự động hòa hợp với phông nền xanh rừng</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] text-slate-400 text-center">
                    Mẹo: Kéo thanh trượt hoặc dùng phím điều hướng bên phải để căn chỉnh sản phẩm chính xác từng milimet.
                  </span>
                </div>

                {/* RIGHT: ADJUSTMENT CONTROLS (6 Cols) */}
                <div className="lg:col-span-6 space-y-4 bg-slate-50/70 p-4 sm:p-5 rounded-3xl border border-slate-200/80">
                  
                  {/* 1. Tỉ lệ khung hình (Aspect Ratio) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Maximize2 className="w-3.5 h-3.5 text-[#008874]" />
                      Tỉ lệ khung hình (Aspect Ratio)
                    </label>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                      {(['1:1', '4:3', '3:4', '16:9', 'free'] as AspectRatio[]).map((ratio) => (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
                            aspectRatio === ratio
                              ? 'bg-[#008764] text-white border-[#008764] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                          }`}
                        >
                          {ratio === '1:1'
                            ? '1:1 (Chuẩn)'
                            : ratio === '4:3'
                            ? '4:3 (Ngang)'
                            : ratio === '3:4'
                            ? '3:4 (Dọc)'
                            : ratio === '16:9'
                            ? '16:9'
                            : 'Tự do'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Chế độ hiển thị (Fit Mode) */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#008874]" />
                      Chế độ vừa vặn (Fit Mode)
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFitMode('contain')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          fitMode === 'contain'
                            ? 'bg-[#008764] text-white border-[#008764] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <span>Chứa trọn vẹn (Contain)</span>
                        <span className={`text-[10px] ${fitMode === 'contain' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Không bị cắt viền sản phẩm
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setFitMode('cover')}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-1 ${
                          fitMode === 'cover'
                            ? 'bg-[#008764] text-white border-[#008764] shadow-xs'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-emerald-50'
                        }`}
                      >
                        <span>Tràn viền (Cover)</span>
                        <span className={`text-[10px] ${fitMode === 'cover' ? 'text-emerald-100' : 'text-slate-400'}`}>
                          Phù hợp ảnh chụp lifestyle
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* 3. Thu phóng (Zoom) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <ZoomIn className="w-3.5 h-3.5 text-[#008874]" />
                        Thu phóng (Zoom): <span className="font-mono text-[#008764]">{zoom}%</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setZoom(100)}
                        className="text-[11px] text-emerald-700 hover:underline font-bold"
                      >
                        100% Chuẩn
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.max(30, z - 5))}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs"
                      >
                        <ZoomOut className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="range"
                        min="30"
                        max="250"
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="flex-1 accent-[#008764] cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => setZoom((z) => Math.min(250, z + 5))}
                        className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs"
                      >
                        <ZoomIn className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 4. Dịch chuyển vị trí X & Y (Pan & D-Pad) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Position sliders */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                          <span>Ngang (X):</span>
                          <span className="font-mono">{posX}%</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={posX}
                          onChange={(e) => setPosX(Number(e.target.value))}
                          className="w-full accent-[#008764] cursor-pointer"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-0.5">
                          <span>Dọc (Y):</span>
                          <span className="font-mono">{posY}%</span>
                        </div>
                        <input
                          type="range"
                          min="-50"
                          max="50"
                          value={posY}
                          onChange={(e) => setPosY(Number(e.target.value))}
                          className="w-full accent-[#008764] cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* D-Pad controls */}
                    <div className="flex flex-col items-center justify-center p-2 bg-white rounded-2xl border border-slate-200 shadow-xs">
                      <button
                        type="button"
                        onClick={() => setPosY((y) => Math.max(-50, y - 5))}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                        title="Dịch lên"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setPosX((x) => Math.max(-50, x - 5))}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                          title="Dịch trái"
                        >
                          <ArrowLeft className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPosX(0);
                            setPosY(0);
                          }}
                          className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 font-mono text-[10px] font-bold hover:bg-emerald-100 cursor-pointer"
                          title="Căn chính giữa"
                        >
                          Tâm
                        </button>
                        <button
                          type="button"
                          onClick={() => setPosX((x) => Math.min(50, x + 5))}
                          className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                          title="Dịch phải"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setPosY((y) => Math.min(50, y + 5))}
                        className="p-1 rounded-lg hover:bg-slate-100 text-slate-700 cursor-pointer"
                        title="Dịch xuống"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 5. Xoay & Màu Nền Đệm */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    {/* Rotate */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-[#008874]" />
                        Xoay: <span className="font-mono text-[#008764]">{rotation}°</span>
                      </label>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setRotation((r) => (r + 90) % 360)}
                          className="flex-1 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold flex items-center justify-center gap-1 shadow-xs cursor-pointer"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          <span>+90°</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setRotation(0)}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-bold shadow-xs cursor-pointer"
                        >
                          0°
                        </button>
                      </div>
                    </div>

                    {/* Background Fill */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5 text-[#008874]" />
                        Nền viền đệm
                      </label>
                      <div className="flex items-center gap-1">
                        {[
                          { id: 'tingo-mint', label: 'Bạc hà', color: 'bg-emerald-50' },
                          { id: 'white', label: 'Trắng', color: 'bg-white border border-slate-200' },
                          { id: 'dark-emerald', label: 'Xanh rừng', color: 'bg-[#052319]' },
                          { id: 'transparent', label: 'Trong suốt', color: 'bg-slate-200' },
                        ].map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBgFill(b.id as BackgroundFill)}
                            className={`flex-1 py-1.5 px-1 rounded-xl text-[10px] font-bold border transition-all cursor-pointer ${
                              bgFill === b.id
                                ? 'border-[#008764] ring-2 ring-[#008764]/20 bg-white text-[#008874]'
                                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            {b.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Bottom Actions */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={closeImagePicker}
            className="px-5 py-2.5 rounded-full text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>

          <div className="flex items-center gap-2">
            {selectedImageSrc && (
              <button
                type="button"
                onClick={() => {
                  if (selectedImageSrc) imagePicker.onSelect(selectedImageSrc);
                }}
                className="px-4 py-2.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Giữ ảnh gốc
              </button>
            )}

            <button
              onClick={handleApply}
              disabled={isProcessing || (!selectedImageSrc && !urlInput)}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#008764] hover:bg-[#007052] disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-900/20 cursor-pointer transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Đang xuất ảnh...' : 'Áp dụng & Lưu ảnh'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
