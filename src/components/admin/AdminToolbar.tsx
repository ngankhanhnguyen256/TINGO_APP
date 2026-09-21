import React, { useState } from 'react';
import {
  Sliders,
  Eye,
  EyeOff,
  Plus,
  Save,
  RotateCcw,
  Undo2,
  Redo2,
  Download,
  Upload,
  LogOut,
  Sparkles,
  PackagePlus,
  Layers,
  MessageSquareQuote,
  BookOpen,
  Award,
  Megaphone,
  Video,
  Check,
  Type,
  Database,
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';

const FONT_LIST = [
  { id: 'vietnam' as const, name: 'Be Vietnam Pro', label: 'Be Vietnam' },
  { id: 'jakarta' as const, name: 'Plus Jakarta Sans', label: 'Jakarta' },
  { id: 'montserrat' as const, name: 'Montserrat', label: 'Montserrat' },
  { id: 'lexend' as const, name: 'Lexend', label: 'Lexend' },
  { id: 'playfair' as const, name: 'Playfair Display', label: 'Playfair' },
];

interface AdminToolbarProps {
  onOpenJsonBackup: () => void;
  onOpenOrdersModal?: () => void;
}

export const AdminToolbar: React.FC<AdminToolbarProps> = ({ onOpenJsonBackup, onOpenOrdersModal }) => {
  const {
    isAdmin,
    isVisualEditActive,
    toggleVisualEdit,
    logoutAdmin,
    resetToDefault,
    saveToStorage,
    hasUnsavedChanges,
    isAutoSaving,
    openProductEditor,
    config,
    updateTypography,
    canUndo,
    canRedo,
    undo,
    redo,
    addWhyChooseItem,
    addTestimonial,
    addArticle,
    addCertification,
    addCustomBlock,
    addVerticalVideoItem,
  } = useVisualEditor();

  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [fontMenuOpen, setFontMenuOpen] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isConfirmingReset, setIsConfirmingReset] = useState(false);

  if (!isAdmin) return null;

  const currentFontId = config.typography?.fontFamily || 'vietnam';
  const currentFontObj = FONT_LIST.find((f) => f.id === currentFontId) || FONT_LIST[0];

  const handleSave = () => {
    saveToStorage();
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleAddWhyChoose = () => {
    const newItem = {
      id: `why-${Date.now()}`,
      iconType: 'sparkles' as const,
      colorScheme: 'emerald' as const,
      title: 'Lý Do Mới Từ Thiên Nhiên',
      description: 'Nhấn nút Sửa để thay đổi thông tin chi tiết về lợi ích sức khỏe này cho khách hàng.',
      highlight: '100% Tự Nhiên Sạch',
    };
    addWhyChooseItem(newItem);
    setAddMenuOpen(false);
    const el = document.getElementById('why-tingo');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddTestimonial = () => {
    const newRev = {
      id: `rev-${Date.now()}`,
      name: 'Khách hàng mới',
      role: 'Người dùng TINGO',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      rating: 5,
      comment: 'Sản phẩm rất tốt và thanh lọc cơ thể hiệu quả. Tôi sẽ tiếp tục ủng hộ!',
      productName: 'Nước Uống & Bột Dinh Dưỡng TINGO',
      verified: true,
    };
    addTestimonial(newRev);
    setAddMenuOpen(false);
    const el = document.getElementById('testimonials');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddArticle = () => {
    const newArt = {
      id: `art-${Date.now()}`,
      title: 'Bí quyết dinh dưỡng sống lành mạnh mới nhất',
      category: 'Sức Khỏe',
      readTime: '3 phút đọc',
      date: 'Hôm nay',
      author: 'Chuyên gia dinh dưỡng TINGO',
      summary: 'Khám phá phương pháp cân bằng năng lượng từ thiên nhiên với nguồn thực phẩm thuần khiết.',
      content: 'Nội dung bài viết chi tiết được cập nhật từ chuyên gia TINGO.',
      image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
    };
    addArticle(newArt);
    setAddMenuOpen(false);
    const el = document.getElementById('health');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAddPromoBanner = () => {
    const newBanner = {
      id: `block-${Date.now()}`,
      type: 'promo_banner' as const,
      title: 'CHƯƠNG TRÌNH KHUYẾN MÃI ĐẶC BIỆT MÙA HÈ',
      subtitle: 'Tặng ngay 1 Bình Nước Lượng Tử & Miễn Phí Vận Chuyển Toàn Quốc cho đơn từ 500k',
      badge: 'Ưu Đãi Giới Hạn',
      buttonText: 'Xem Ưu Đãi Ngay',
      buttonLink: '#products',
    };
    addCustomBlock(newBanner);
    setAddMenuOpen(false);
  };

  const handleAddVideoReel = () => {
    addVerticalVideoItem({
      id: `vid-${Date.now()}`,
      title: 'Trải nghiệm pha chế bột dinh dưỡng Vhealth & Nước Quantum',
      videoUrl: 'https://assets.mixkit.co/videos/preview/mixkit-woman-pouring-milk-into-a-glass-42845-large.mp4',
      thumbnailUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=800&auto=format&fit=crop&q=80',
      author: 'tingo_nutrition',
      authorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&auto=format&fit=crop&q=80',
      badge: 'Video Mới',
      viewsCount: '1.2k',
    });
    setAddMenuOpen(false);
  };

  return (
    <aside
      aria-label="Thanh quản trị Visual Editor"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-5xl bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 rounded-3xl p-2.5 sm:p-3 shadow-2xl text-white animate-slide-up select-none"
    >
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Left: Admin Status & Visual Edit Switch */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Admin TINGO</span>
          </div>

          {/* Toggle Switch */}
          <button
            onClick={() => toggleVisualEdit()}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-sm ${
              isVisualEditActive
                ? 'bg-emerald-500 text-white shadow-emerald-500/30 ring-2 ring-emerald-300'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isVisualEditActive ? (
              <>
                <Eye className="w-3.5 h-3.5 text-white" />
                <span>Visual Edit: ĐANG BẬT</span>
              </>
            ) : (
              <>
                <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                <span>Visual Edit: TẮT (Chế độ xem)</span>
              </>
            )}
          </button>
        </div>

        {/* Center: Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Add Dropdown */}
          <div className="relative">
            <button
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm Ô / Khối Mới</span>
            </button>

            {addMenuOpen && (
              <div
                className="absolute bottom-full mb-2 left-0 sm:left-auto sm:right-0 w-64 bg-slate-800/98 backdrop-blur-md border border-slate-700 rounded-2xl p-2 shadow-2xl space-y-1 text-xs z-50 animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-700 mb-1">
                  Chọn loại ô / khối muốn thêm
                </div>

                <button
                  onClick={() => {
                    openProductEditor();
                    setAddMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <PackagePlus className="w-4 h-4 text-emerald-400" />
                  <span>Thêm Sản Phẩm Mới</span>
                </button>

                <button
                  onClick={handleAddWhyChoose}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Thêm Ô Lý Do Chọn TINGO</span>
                </button>

                <button
                  onClick={handleAddTestimonial}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <MessageSquareQuote className="w-4 h-4 text-amber-400" />
                  <span>Thêm Khách Hàng Đánh Giá</span>
                </button>

                <button
                  onClick={handleAddArticle}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <BookOpen className="w-4 h-4 text-lime-400" />
                  <span>Thêm Bài Viết Dinh Dưỡng</span>
                </button>

                <button
                  onClick={handleAddPromoBanner}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Megaphone className="w-4 h-4 text-rose-400" />
                  <span>Thêm Banner Khuyến Mãi</span>
                </button>

                <button
                  onClick={handleAddVideoReel}
                  className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left hover:bg-emerald-600 text-slate-200 hover:text-white transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4 text-sky-400" />
                  <span>Thêm Video Dọc 9:16 (Reels)</span>
                </button>
              </div>
            )}
          </div>

          {/* Font Selector Menu */}
          <div className="relative">
            <button
              onClick={() => {
                setFontMenuOpen(!fontMenuOpen);
                setAddMenuOpen(false);
              }}
              title="Đổi Font Chữ Toàn Bộ Landing Page"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-purple-300 text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
            >
              <Type className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Font: {currentFontObj.label}</span>
            </button>

            {fontMenuOpen && (
              <div
                className="absolute left-0 bottom-full mb-2 w-52 bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl p-1.5 z-50 text-xs animate-scale-in"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800">
                  Chọn Font Toàn Trang
                </div>
                {FONT_LIST.map((font) => (
                  <button
                    key={font.id}
                    onClick={() => {
                      updateTypography({ fontFamily: font.id });
                      setFontMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      currentFontId === font.id
                        ? 'bg-purple-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{font.name}</span>
                    {currentFontId === font.id && <span>✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Undo Button */}
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Hoàn tác (Undo - Ctrl+Z)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              canUndo
                ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 cursor-pointer shadow-xs active:scale-95'
                : 'bg-slate-800/40 text-slate-500 border-slate-800/60 cursor-not-allowed'
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Hoàn tác</span>
          </button>

          {/* Redo Button */}
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Làm lại (Redo - Ctrl+Y)"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              canRedo
                ? 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700 cursor-pointer shadow-xs active:scale-95'
                : 'bg-slate-800/40 text-slate-500 border-slate-800/60 cursor-not-allowed'
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Làm lại</span>
          </button>

          {/* Save Button with Unsaved State & 5s Auto-Save */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={hasUnsavedChanges ? handleSave : undefined}
              disabled={!hasUnsavedChanges && !saveSuccess}
              title={
                hasUnsavedChanges
                  ? 'Bấm để lưu ngay các thay đổi (Hệ thống cũng tự động lưu sau 5s)'
                  : 'Không có thay đổi nào cần lưu'
              }
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${
                saveSuccess
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                  : isAutoSaving
                  ? 'bg-emerald-700/80 text-emerald-200 border-emerald-500 animate-pulse'
                  : hasUnsavedChanges
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold shadow-lg shadow-emerald-500/40 ring-2 ring-emerald-300 ring-offset-1 ring-offset-slate-900 border-emerald-300 cursor-pointer active:scale-95 animate-pulse'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800/80 cursor-default opacity-60'
              }`}
            >
              {saveSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Đã lưu thành công!</span>
                </>
              ) : isAutoSaving ? (
                <>
                  <Save className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang tự lưu...</span>
                </>
              ) : hasUnsavedChanges ? (
                <>
                  <span className="relative flex h-2 w-2 mr-0.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                  <Save className="w-3.5 h-3.5 text-slate-950" />
                  <span>LƯU THAY ĐỔI</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5 text-slate-600" />
                  <span className="text-slate-400">Đã lưu</span>
                </>
              )}
            </button>

            {/* 5s auto-save reminder indicator */}
            {hasUnsavedChanges && (
              <span className="hidden xl:inline-block text-[10px] text-amber-300 bg-amber-950/80 border border-amber-600/60 px-2 py-0.5 rounded-full font-medium animate-fade-in">
                Tự lưu sau 5s
              </span>
            )}
          </div>

          {/* Backup / Export JSON */}
          <button
            onClick={onOpenJsonBackup}
            title="Sao lưu & Nhập cấu hình JSON"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          {/* Firestore Orders & Customers Manager Button */}
          {onOpenOrdersModal && (
            <button
              onClick={onOpenOrdersModal}
              title="Xem và quản lý Đơn hàng & Tài khoản Khách hàng Firebase Firestore"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors cursor-pointer border border-emerald-500/80 shadow-xs"
            >
              <Database className="w-3.5 h-3.5 text-emerald-200" />
              <span>Firebase: Đơn & Khách Hàng</span>
            </button>
          )}

          {/* Reset button with double click confirm */}
          <div className="relative">
            {isConfirmingReset ? (
              <div className="flex items-center gap-1 bg-rose-950/90 border border-rose-600 rounded-full px-2 py-1">
                <span className="text-[10px] text-rose-200 font-bold">Khôi phục gốc?</span>
                <button
                  onClick={() => {
                    resetToDefault();
                    setIsConfirmingReset(false);
                  }}
                  className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold hover:bg-rose-500 cursor-pointer"
                >
                  Xác nhận
                </button>
                <button
                  onClick={() => setIsConfirmingReset(false)}
                  className="text-slate-400 hover:text-white px-1 text-[10px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsConfirmingReset(true)}
                title="Khôi phục toàn bộ về gốc"
                className="p-1.5 rounded-full bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer border border-slate-700"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Logout */}
        <div className="flex items-center gap-2">
          <button
            onClick={logoutAdmin}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-900/60 hover:bg-rose-800 text-rose-200 text-xs font-bold transition-colors cursor-pointer border border-rose-700/60"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Đăng xuất</span>
          </button>
        </div>
      </div>
    </aside>
  );
};
