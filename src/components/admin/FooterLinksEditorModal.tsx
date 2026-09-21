import React, { useState, useEffect } from 'react';
import { X, Link as LinkIcon, Facebook, Instagram, Youtube, Phone, Mail, MapPin, HelpCircle, Sparkles, Check, Globe } from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { FooterData } from '../../types';

interface FooterLinksEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FooterLinksEditorModal: React.FC<FooterLinksEditorModalProps> = ({ isOpen, onClose }) => {
  const { config, updateFooter } = useVisualEditor();
  const currentFooter = config.footer;

  const [formData, setFormData] = useState<FooterData>({ ...currentFooter });

  useEffect(() => {
    if (isOpen) {
      setFormData({ ...currentFooter });
    }
  }, [isOpen, currentFooter]);

  if (!isOpen) return null;

  const handleChange = (field: keyof FooterData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    updateFooter(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-emerald-100 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-emerald-50 to-teal-50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#008874] text-white flex items-center justify-center font-black shadow-xs">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-base font-display">
                Cài Đặt Liên Kết Chuyển Hướng Footer & Mạng Xã Hội
              </h3>
              <p className="text-xs text-slate-500">
                Nhập link Facebook, Instagram, YouTube, Google Maps, Hotline, Email và Banner FAQ
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

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* 1. Contact Cards & Fanpage Links */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#008874] flex items-center gap-1.5">
              <Phone className="w-4 h-4" /> 1. Thông Tin Liên Hệ Trực Tiếp (Contact Cards)
            </h4>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              {/* Fanpage (Replaces Dia chi tru so) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <Facebook className="w-3.5 h-3.5 text-blue-600" /> Tên Fanpage hiển thị:
                  </label>
                  <input
                    type="text"
                    placeholder="Fanpage TINGO - Dinh Dưỡng Thuần Tự Nhiên"
                    value={formData.fanpageName || ''}
                    onChange={(e) => handleChange('fanpageName', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <LinkIcon className="w-3.5 h-3.5 text-blue-600" /> Link URL Fanpage chuyển hướng:
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.facebook.com/tingodrink"
                    value={formData.fanpageUrl || formData.facebookUrl || ''}
                    onChange={(e) => {
                      handleChange('fanpageUrl', e.target.value);
                      handleChange('facebookUrl', e.target.value);
                    }}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              {/* Hotline */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <Phone className="w-3.5 h-3.5 text-cyan-600" /> Số Hotline hiển thị:
                  </label>
                  <input
                    type="text"
                    placeholder="0866.129.255"
                    value={formData.hotline}
                    onChange={(e) => handleChange('hotline', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-500" /> Link gọi điện / Zalo:
                  </label>
                  <input
                    type="text"
                    placeholder="tel:0866129255 hoặc https://zalo.me/..."
                    value={formData.hotlineLink || ''}
                    onChange={(e) => handleChange('hotlineLink', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <Mail className="w-3.5 h-3.5 text-emerald-600" /> Email hiển thị:
                  </label>
                  <input
                    type="email"
                    placeholder="tingodrink@gmail.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mb-1">
                    <LinkIcon className="w-3.5 h-3.5 text-slate-500" /> Link mở email (mailto:):
                  </label>
                  <input
                    type="text"
                    placeholder="mailto:tingodrink@gmail.com"
                    value={formData.emailLink || ''}
                    onChange={(e) => handleChange('emailLink', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 3. FAQ Banner Link */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#008874] flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4" /> 3. Banner Câu Hỏi Thường Gặp (FAQ Banner Link)
            </h4>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tiêu đề Banner FAQ:
                  </label>
                  <input
                    type="text"
                    placeholder="CÂU HỎI THƯỜNG GẶP (FAQ)"
                    value={formData.faqBannerTitle || ''}
                    onChange={(e) => handleChange('faqBannerTitle', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Đường dẫn Link URL khi nhấp vào:
                  </label>
                  <input
                    type="text"
                    placeholder="#faq hoặc https://tingo.vn/faq"
                    value={formData.faqBannerUrl || ''}
                    onChange={(e) => handleChange('faqBannerUrl', e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mô tả phụ trên Banner FAQ:
                </label>
                <input
                  type="text"
                  placeholder="Giải đáp nhanh 100% thắc mắc về sản phẩm, giao hàng và dinh dưỡng TINGO"
                  value={formData.faqBannerSubtitle || ''}
                  onChange={(e) => handleChange('faqBannerSubtitle', e.target.value)}
                  className="w-full px-3.5 py-2 text-xs rounded-xl bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874]"
                />
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
            className="px-6 py-2.5 text-xs font-bold text-white bg-[#008874] hover:bg-[#007052] rounded-xl shadow-md shadow-emerald-900/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>Lưu & Cập Nhật Tất Cả Link Chuyển Hướng</span>
          </button>
        </div>

      </div>
    </div>
  );
};
