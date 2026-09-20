import React, { useState } from 'react';
import {
  X,
  Check,
  Zap,
  Sprout,
  Sun,
  Truck,
  Heart,
  Shield,
  Sparkles,
  Award,
  Palette,
} from 'lucide-react';
import { WhyChooseItem } from '../../types';

interface WhyChooseEditorModalProps {
  isOpen: boolean;
  item?: WhyChooseItem;
  onClose: () => void;
  onSave: (item: WhyChooseItem) => void;
}

const ICONS = [
  { type: 'zap', label: 'Tia Sét / Năng Lượng', icon: Zap },
  { type: 'sprout', label: 'Mầm Cây / Thuần Chay', icon: Sprout },
  { type: 'sun', label: 'Mặt Trời / Lượng Tử', icon: Sun },
  { type: 'truck', label: 'Giao Hàng / Phục Hồi', icon: Truck },
  { type: 'heart', label: 'Trái Tim / Sức Khỏe', icon: Heart },
  { type: 'shield', label: 'Khiên / Bảo Vệ', icon: Shield },
  { type: 'sparkles', label: 'Lấp Lánh / Độc Đáo', icon: Sparkles },
  { type: 'award', label: 'Huy Chương / Chứng Nhận', icon: Award },
];

const COLORS = [
  { id: 'emerald', label: 'Xanh Lá Tươi', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  { id: 'cyan', label: 'Xanh Lam Cyan', bg: 'bg-cyan-100', text: 'text-cyan-700' },
  { id: 'lime', label: 'Xanh Cốm Lime', bg: 'bg-lime-100', text: 'text-lime-700' },
  { id: 'sky', label: 'Xanh Dương Sky', bg: 'bg-sky-100', text: 'text-sky-700' },
  { id: 'amber', label: 'Vàng Cam Amber', bg: 'bg-amber-100', text: 'text-amber-700' },
  { id: 'rose', label: 'Hồng Đỏ Rose', bg: 'bg-rose-100', text: 'text-rose-700' },
];

export const WhyChooseEditorModal: React.FC<WhyChooseEditorModalProps> = ({
  isOpen,
  item,
  onClose,
  onSave,
}) => {
  const [formData, setFormData] = useState<WhyChooseItem>(() => ({
    id: item?.id || `why-${Date.now()}`,
    iconType: item?.iconType || 'zap',
    colorScheme: item?.colorScheme || 'emerald',
    title: item?.title || 'Lý Do Mới Từ Thiên Nhiên',
    description: item?.description || 'Mô tả chi tiết về lợi ích của sản phẩm TINGO đối với sức khỏe...',
    highlight: item?.highlight || '100% Thuần Thực Vật',
  }));

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#008874] flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display">
                {item ? 'Sửa Ô "Vì Sao Chọn TINGO"' : 'Thêm Ô "Vì Sao Chọn TINGO"'}
              </h3>
              <p className="text-[11px] text-slate-500">
                Tùy biến tiêu đề, mô tả, huy hiệu và biểu tượng màu sắc
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Tiêu đề ô *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Điểm nhấn nổi bật (Badge) *
            </label>
            <input
              type="text"
              required
              value={formData.highlight}
              onChange={(e) => setFormData({ ...formData, highlight: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs font-semibold"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Nội dung mô tả chi tiết *
            </label>
            <textarea
              rows={4}
              required
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs text-slate-700"
            />
          </div>

          {/* Icon Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Biểu tượng (Icon)
            </label>
            <div className="grid grid-cols-4 gap-2">
              {ICONS.map((ic) => {
                const IconComp = ic.icon;
                const isSelected = formData.iconType === ic.type;
                return (
                  <button
                    key={ic.type}
                    type="button"
                    onClick={() => setFormData({ ...formData, iconType: ic.type as any })}
                    className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-[#008874] bg-emerald-50 text-[#008874] shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <IconComp className="w-5 h-5" />
                    <span className="text-[10px] font-medium line-clamp-1">{ic.label.split('/')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Màu sắc chủ đạo
            </label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((col) => {
                const isSelected = formData.colorScheme === col.id;
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, colorScheme: col.id as any })}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className={`w-3 h-3 rounded-full ${col.bg} border border-slate-300`} />
                    <span>{col.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-full text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-xs shadow-md shadow-emerald-900/15 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Ô Này</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
