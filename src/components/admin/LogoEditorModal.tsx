import React, { useState, useEffect } from 'react';
import { X, Upload, Image as ImageIcon, Sparkles, Check, Trash2, Eye } from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { LogoConfig } from '../../types';

interface LogoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoEditorModal: React.FC<LogoEditorModalProps> = ({ isOpen, onClose }) => {
  const { config, updateLogo, openImagePicker } = useVisualEditor();
  const currentLogo = config.logo || {
    type: 'badge',
    imageUrl: '',
    text: 'TINGO',
    tagline: 'Dinh Dưỡng Từ Thiên Nhiên',
    height: 44,
  };

  const [logoType, setLogoType] = useState<'badge' | 'image'>(currentLogo.type || 'badge');
  const [imageUrl, setImageUrl] = useState<string>(currentLogo.imageUrl || '');
  const [logoText, setLogoText] = useState<string>(currentLogo.text || 'TINGO');
  const [tagline, setTagline] = useState<string>(currentLogo.tagline || 'Dinh Dưỡng Từ Thiên Nhiên');
  const [height, setHeight] = useState<number>(currentLogo.height || 44);

  useEffect(() => {
    if (isOpen) {
      setLogoType(currentLogo.type || 'badge');
      setImageUrl(currentLogo.imageUrl || '');
      setLogoText(currentLogo.text || 'TINGO');
      setTagline(currentLogo.tagline || 'Dinh Dưỡng Từ Thiên Nhiên');
      setHeight(currentLogo.height || 44);
    }
  }, [isOpen, currentLogo]);

  if (!isOpen) return null;

  const handleSave = () => {
    updateLogo({
      type: logoType,
      imageUrl: imageUrl.trim(),
      text: logoText.trim() || 'TINGO',
      tagline: tagline.trim(),
      height: Number(height) || 44,
    });
    onClose();
  };

  const handlePickImage = () => {
    openImagePicker(
      'Chọn hoặc Tải Lên Ảnh Logo TINGO',
      (url) => {
        setImageUrl(url);
        setLogoType('image');
      },
      imageUrl
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#008874] text-white flex items-center justify-center font-black shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base font-display">
                Chỉnh Sửa & Tải Lên Logo TINGO
              </h3>
              <p className="text-xs text-slate-500">
                Đồng bộ tự động lên thanh điều hướng Header và chân trang Footer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-full hover:bg-white/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Option: Logo Type */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2.5">
              Định Dạng Logo Hiển Thị
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLogoType('badge')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  logoType === 'badge'
                    ? 'border-[#008874] bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-9 h-9 rounded-full bg-[#008874] text-white flex items-center justify-center font-extrabold text-lg shrink-0 shadow-xs">
                  T
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Biểu Tượng T Chữ</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Biểu tượng tròn xanh thương hiệu TINGO</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setLogoType('image')}
                className={`p-3.5 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                  logoType === 'image'
                    ? 'border-[#008874] bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="w-9 h-9 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">Tải Ảnh Logo Lên</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">Dùng file ảnh PNG/SVG trong suốt</div>
                </div>
              </button>
            </div>
          </div>

          {/* If Image Logo selected */}
          {logoType === 'image' && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Ảnh Logo Đã Chọn
                </label>
                <button
                  type="button"
                  onClick={handlePickImage}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải ảnh mới / Đổi ảnh</span>
                </button>
              </div>

              {imageUrl ? (
                <div className="flex items-center gap-4 p-3 bg-white rounded-xl border border-slate-200">
                  <div className="w-24 h-14 bg-slate-100/80 rounded-lg p-1.5 flex items-center justify-center border border-dashed border-slate-300">
                    <img
                      src={imageUrl}
                      alt="Logo preview"
                      className="max-h-full max-w-full object-contain"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-mono text-slate-600 truncate">{imageUrl}</div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Ảnh logo hợp lệ
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setImageUrl('')}
                    className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                    title="Gỡ ảnh"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onClick={handlePickImage}
                  className="p-6 border-2 border-dashed border-slate-300 hover:border-[#008874] rounded-2xl bg-white text-center cursor-pointer transition-colors group"
                >
                  <Upload className="w-8 h-8 text-slate-400 group-hover:text-[#008874] mx-auto mb-2 transition-colors" />
                  <div className="text-xs font-bold text-slate-700 group-hover:text-[#008874]">
                    Nhấp để tải ảnh Logo lên từ máy tính hoặc dán URL
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Khuyên dùng định dạng PNG trong suốt (kích thước chuẩn 180x50px hoặc 200x60px)
                  </div>
                </div>
              )}

              {/* Direct URL input */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Hoặc dán trực tiếp đường link ảnh logo (URL):
                </label>
                <input
                  type="text"
                  placeholder="https://..."
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
              </div>
            </div>
          )}

          {/* Logo Text & Tagline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Tên Thương Hiệu (Logo Text)
              </label>
              <input
                type="text"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                placeholder="TINGO"
                className="w-full px-3.5 py-2.5 text-sm font-bold text-slate-900 rounded-xl bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Chiều cao hiển thị (px): {height}px
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="28"
                  max="64"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                  className="flex-1 accent-[#008874]"
                />
                <span className="text-xs font-mono font-bold text-slate-700 w-10 text-right">
                  {height}px
                </span>
              </div>
            </div>
          </div>

          {/* Live Preview Box */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
              <Eye className="w-3.5 h-3.5" /> Xem trước hiển thị (Live Preview)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Light background (Header) */}
              <div className="p-4 rounded-2xl bg-[#f4faf6] border border-emerald-100 flex flex-col justify-center items-center min-h-[90px]">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Hiển thị trên Header (Nền sáng)
                </div>
                <div className="flex items-center gap-2.5">
                  {logoType === 'image' && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={logoText}
                      style={{ height: `${height}px` }}
                      className="object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <>
                      <div
                        style={{ width: `${height}px`, height: `${height}px` }}
                        className="rounded-full bg-[#008874] flex items-center justify-center text-white font-black text-xl shadow-md"
                      >
                        T
                      </div>
                      <span className="text-2xl font-black tracking-tight text-[#008874] font-display">
                        {logoText}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Dark background (Footer) */}
              <div className="p-4 rounded-2xl bg-[#052319] border border-emerald-950 flex flex-col justify-center items-center min-h-[90px]">
                <div className="text-[10px] font-bold text-emerald-400/60 uppercase tracking-widest mb-2">
                  Hiển thị trên Footer (Nền tối)
                </div>
                <div className="flex items-center gap-2.5">
                  {logoType === 'image' && imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={logoText}
                      style={{ height: `${height}px` }}
                      className="object-contain brightness-110"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <>
                      <div
                        style={{ width: `${height}px`, height: `${height}px` }}
                        className="rounded-full bg-[#008874] flex items-center justify-center text-white font-black text-xl shadow-md"
                      >
                        T
                      </div>
                      <span className="text-2xl font-black tracking-tight text-white font-display">
                        {logoText}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Hủy Bỏ
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#008874] hover:bg-[#007052] rounded-xl shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
          >
            Lưu Logo & Cập Nhật Toàn Trang
          </button>
        </div>

      </div>
    </div>
  );
};
