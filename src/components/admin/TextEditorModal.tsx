import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Sparkles,
  Sliders,
  Palette,
  Eye,
  Globe,
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';

const FONT_OPTIONS = [
  {
    id: 'vietnam' as const,
    name: 'Be Vietnam Pro',
    description: 'Chuẩn Tiếng Việt, thanh lịch & rõ nét',
    fontClass: 'font-vietnam',
    style: { fontFamily: "'Be Vietnam Pro', sans-serif" },
  },
  {
    id: 'jakarta' as const,
    name: 'Plus Jakarta Sans',
    description: 'Hiện đại, cân đối & dễ đọc',
    fontClass: 'font-jakarta',
    style: { fontFamily: "'Plus Jakarta Sans', sans-serif" },
  },
  {
    id: 'montserrat' as const,
    name: 'Montserrat',
    description: 'Sang trọng, đậm chất thương hiệu',
    fontClass: 'font-montserrat',
    style: { fontFamily: "'Montserrat', sans-serif" },
  },
  {
    id: 'lexend' as const,
    name: 'Lexend',
    description: 'Tối ưu thị giác, chống mỏi mắt',
    fontClass: 'font-lexend',
    style: { fontFamily: "'Lexend', sans-serif" },
  },
  {
    id: 'playfair' as const,
    name: 'Playfair Display',
    description: 'Quý tộc, cao cấp & ấn tượng',
    fontClass: 'font-playfair',
    style: { fontFamily: "'Playfair Display', serif" },
  },
];

const PRESET_SIZES = [
  { label: 'Nhỏ (14px)', value: 14 },
  { label: 'Chuẩn (16px)', value: 16 },
  { label: 'Vừa (18px)', value: 18 },
  { label: 'Lớn (22px)', value: 22 },
  { label: 'Tiêu đề (28px)', value: 28 },
  { label: 'Tiêu đề lớn (36px)', value: 36 },
  { label: 'Siêu lớn (48px)', value: 48 },
];

const PRESET_WEIGHTS = [
  { label: 'Thường (400)', value: '400' },
  { label: 'Vừa (500)', value: '500' },
  { label: 'Đậm vừa (600)', value: '600' },
  { label: 'Đậm (700)', value: '700' },
  { label: 'Siêu đậm (800)', value: '800' },
  { label: 'Đen (900)', value: '900' },
];

const PRESET_COLORS = [
  { label: 'Xanh Rừng TINGO', value: '#0a2f24' },
  { label: 'Xanh Bạc Hà', value: '#008874' },
  { label: 'Xanh Ngọc Sáng', value: '#10b981' },
  { label: 'Đen Than', value: '#0f172a' },
  { label: 'Xám Trầm', value: '#475569' },
  { label: 'Vàng Kim', value: '#f59e0b' },
  { label: 'Đỏ San Hô', value: '#ef4444' },
  { label: 'Trắng Tinh', value: '#ffffff' },
];

export const TextEditorModal: React.FC = () => {
  const { textEditor, closeTextEditor, config, updateTypography } = useVisualEditor();
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'text' | 'typography'>('text');

  // Font styling states for live preview & customization
  const currentGlobalFont = config.typography?.fontFamily || 'vietnam';
  const [selectedFont, setSelectedFont] = useState<'vietnam' | 'jakarta' | 'montserrat' | 'lexend' | 'playfair'>(currentGlobalFont);
  const [fontSize, setFontSize] = useState<number>(18);
  const [fontWeight, setFontWeight] = useState<string>('600');
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [textColor, setTextColor] = useState<string>('#0a2f24');
  const [previewDarkBg, setPreviewDarkBg] = useState<boolean>(false);
  const [applyGlobalFont, setApplyGlobalFont] = useState<boolean>(false);

  useEffect(() => {
    if (textEditor.isOpen) {
      setContent(textEditor.value || '');
      setSelectedFont(config.typography?.fontFamily || 'vietnam');
    }
  }, [textEditor.isOpen, textEditor.value, config.typography?.fontFamily]);

  if (!textEditor.isOpen) return null;

  const handleSave = () => {
    if (applyGlobalFont && selectedFont !== config.typography?.fontFamily) {
      updateTypography({ fontFamily: selectedFont });
    }
    textEditor.onSave(content);
  };

  const currentFontObj = FONT_OPTIONS.find((f) => f.id === selectedFont) || FONT_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-100 flex flex-col animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-100 text-[#008874] flex items-center justify-center shadow-xs">
              <Type className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 font-display flex items-center gap-2">
                <span>{textEditor.title}</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {currentFontObj.name}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500">
                Chỉnh sửa văn bản, đổi font chữ không lỗi dấu Tiếng Việt & tinh chỉnh kích thước
              </p>
            </div>
          </div>

          <button
            onClick={closeTextEditor}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/40 px-6 pt-2">
          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'text'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Type className="w-4 h-4" />
            <span>Nội Dung Văn Bản</span>
          </button>

          <button
            onClick={() => setActiveTab('typography')}
            className={`flex items-center gap-1.5 px-4 py-2.5 border-b-2 font-bold text-xs transition-colors cursor-pointer ${
              activeTab === 'typography'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Đổi Font & Kích Thước Chữ</span>
          </button>
        </div>

        {/* Scrollable Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 max-h-[calc(92vh-190px)]">
          {activeTab === 'text' ? (
            <div className="space-y-4">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Văn bản hiển thị:
              </label>

              {textEditor.multiline ? (
                <textarea
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập nội dung văn bản..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm text-slate-900 leading-relaxed shadow-xs"
                  style={{ fontFamily: currentFontObj.style.fontFamily }}
                  autoFocus
                />
              ) : (
                <input
                  type="text"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Nhập tiêu đề hoặc đoạn văn..."
                  className="w-full px-4 py-3.5 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm text-slate-900 shadow-xs"
                  style={{ fontFamily: currentFontObj.style.fontFamily }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
              )}

              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Hỗ trợ đầy đủ bộ gõ Tiếng Việt (Telex, VNI) không lỗi ký tự.</span>
                <span className="font-mono">{content.length} ký tự</span>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Font Family Selection */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Chọn Font Chữ (Chuẩn Tiếng Việt)</span>
                  </label>

                  <label className="flex items-center gap-1.5 text-xs text-emerald-800 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={applyGlobalFont}
                      onChange={(e) => setApplyGlobalFont(e.target.checked)}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Áp dụng font này cho toàn bộ Website</span>
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedFont(f.id)}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        selectedFont === f.id
                          ? 'border-emerald-500 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className="font-bold text-sm text-slate-900"
                          style={{ fontFamily: f.style.fontFamily }}
                        >
                          {f.name}
                        </span>
                        {selectedFont === f.id && (
                          <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">
                            ✓
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">{f.description}</p>
                      <p
                        className="text-xs font-medium text-emerald-950 mt-2 p-1.5 bg-slate-100/70 rounded-lg truncate"
                        style={{ fontFamily: f.style.fontFamily }}
                      >
                        Đồ uống & Dinh dưỡng TINGO
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size & Weight Adjustment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Font Size */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Cỡ chữ xem trước:
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      {fontSize}px
                    </span>
                  </div>

                  <input
                    type="range"
                    min={12}
                    max={56}
                    value={fontSize}
                    onChange={(e) => setFontSize(Number(e.target.value))}
                    className="w-full accent-[#008764] cursor-pointer"
                  />

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {PRESET_SIZES.map((sz) => (
                      <button
                        key={sz.value}
                        type="button"
                        onClick={() => setFontSize(sz.value)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer ${
                          fontSize === sz.value
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {sz.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Weight */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Độ đậm nét:
                  </label>

                  <select
                    value={fontWeight}
                    onChange={(e) => setFontWeight(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#008874] cursor-pointer"
                  >
                    {PRESET_WEIGHTS.map((w) => (
                      <option key={w.value} value={w.value}>
                        {w.label}
                      </option>
                    ))}
                  </select>

                  {/* Alignment */}
                  <div className="pt-2">
                    <label className="text-[11px] font-bold text-slate-600 uppercase block mb-1">
                      Canh lề:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setTextAlign('left')}
                        className={`p-2 rounded-lg flex-1 flex items-center justify-center cursor-pointer ${
                          textAlign === 'left'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Canh trái"
                      >
                        <AlignLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextAlign('center')}
                        className={`p-2 rounded-lg flex-1 flex items-center justify-center cursor-pointer ${
                          textAlign === 'center'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Canh giữa"
                      >
                        <AlignCenter className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTextAlign('right')}
                        className={`p-2 rounded-lg flex-1 flex items-center justify-center cursor-pointer ${
                          textAlign === 'right'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title="Canh phải"
                      >
                        <AlignRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Palette */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Màu sắc xem trước:</span>
                </label>

                <div className="flex flex-wrap items-center gap-2">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setTextColor(c.value)}
                      title={c.label}
                      className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                        textColor === c.value
                          ? 'border-emerald-500 scale-110 shadow-md ring-2 ring-emerald-300'
                          : 'border-slate-300 hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.value }}
                    />
                  ))}
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-7 h-7 rounded-full overflow-hidden cursor-pointer border border-slate-300 p-0"
                    title="Màu tùy chỉnh"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Interactive Live Preview Box */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-600" />
                <span>Xem Trước Trực Tiếp (Live Preview):</span>
              </span>

              <button
                type="button"
                onClick={() => setPreviewDarkBg(!previewDarkBg)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Nền: {previewDarkBg ? 'Tối' : 'Sáng'}
              </button>
            </div>

            <div
              className={`p-5 rounded-2xl border transition-all min-h-[90px] flex items-center overflow-x-hidden ${
                previewDarkBg
                  ? 'bg-slate-900 border-slate-800'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div
                className="w-full break-words leading-snug"
                style={{
                  fontFamily: currentFontObj.style.fontFamily,
                  fontSize: `${fontSize}px`,
                  fontWeight: fontWeight,
                  textAlign: textAlign,
                  color: previewDarkBg && textColor === '#0a2f24' ? '#ffffff' : textColor,
                }}
              >
                {content || 'Nhập nội dung để xem trước font chữ...'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={closeTextEditor}
            className="px-4 py-2 rounded-full text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Hủy Bỏ
          </button>

          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-xs shadow-md shadow-emerald-900/15 cursor-pointer transition-all active:scale-95"
          >
            <Check className="w-4 h-4" />
            <span>Lưu & Cập Nhật Ngay</span>
          </button>
        </div>
      </div>
    </div>
  );
};
