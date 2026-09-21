import React, { useState } from 'react';
import {
  Search,
  ShoppingCart,
  Star,
  Eye,
  Plus,
  Edit3,
  Trash2,
  Image as ImageIcon,
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Trophy,
  MoveHorizontal,
  GripVertical,
  Flame,
  Check,
} from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import { Product } from '../types';
import { CATEGORIES } from '../data/mockData';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';
import { useProductSold, recordProductInteraction } from '../utils/productStatsTracker';

interface ProductCatalogSectionProps {
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

// Sub-component for individual product card to enable reactive sold counter subscriptions
const ProductCardItem: React.FC<{
  product: Product;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  onSelect: (p: Product) => void;
  onAdd: (p: Product) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragLeave: (e: React.DragEvent, id: string) => void;
  onDrop: (e: React.DragEvent, id: string) => void;
  isDragged: boolean;
  isDragOver: boolean;
}> = ({
  product: p,
  index: productIndex,
  isFirst,
  isLast,
  onSelect,
  onAdd,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  isDragged,
  isDragOver,
}) => {
  const {
    removeProduct,
    reorderProduct,
    openProductEditor,
    openImagePicker,
    updateProduct,
    isVisualEditActive,
  } = useVisualEditor();

  const { soldCount, formattedSold } = useProductSold(p.id, p.soldCount);

  const handleCardClick = () => {
    recordProductInteraction(p.id, p.soldCount);
    onSelect(p);
  };

  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    recordProductInteraction(p.id, p.soldCount);
    onAdd(p);
  };

  return (
    <div
      draggable={isVisualEditActive}
      onDragStart={(e) => onDragStart(e, p.id)}
      onDragOver={(e) => onDragOver(e, p.id)}
      onDragLeave={(e) => onDragLeave(e, p.id)}
      onDrop={(e) => onDrop(e, p.id)}
      className={`relative transition-all duration-200 ${
        isDragged ? 'opacity-40 scale-95 border-2 border-dashed border-emerald-400 rounded-3xl' : ''
      } ${isDragOver ? 'scale-105 -translate-y-1' : ''}`}
    >
      {/* Admin Visual Edit Quick Reorder Bar */}
      {isVisualEditActive && (
        <div className="mb-2 p-1.5 bg-slate-900/90 backdrop-blur-md rounded-2xl flex items-center justify-between shadow-lg text-xs z-30 border border-slate-700">
          <div className="flex items-center gap-1.5 text-white font-bold">
            <span
              title="Cầm giữ & kéo thả để đổi vị trí trực tiếp"
              className="cursor-grab active:cursor-grabbing p-1 rounded-md hover:bg-slate-800 text-slate-300 hover:text-emerald-300 flex items-center gap-1"
            >
              <GripVertical className="w-3.5 h-3.5" />
              <span className="text-[10px] hidden sm:inline">Kéo</span>
            </span>

            {isFirst ? (
              <span className="flex items-center gap-1 bg-amber-400 text-slate-950 px-2 py-0.5 rounded-full font-black text-[10px]">
                <Trophy className="w-3 h-3" />
                #1 BÁN CHẠY
              </span>
            ) : (
              <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono text-[10px]">
                #{productIndex + 1}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={isFirst}
              onClick={() => reorderProduct(p.id, 'prev')}
              className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-200 cursor-pointer transition-colors"
              title="Di chuyển sang trái"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>

            {!isFirst && (
              <button
                type="button"
                onClick={() => reorderProduct(p.id, 'first')}
                className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                title="Đưa lên vị trí #1"
              >
                Lên #1
              </button>
            )}

            <button
              type="button"
              disabled={isLast}
              onClick={() => reorderProduct(p.id, 'next')}
              className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-200 cursor-pointer transition-colors"
              title="Di chuyển sang phải"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <EditableElement
        label={`Sản phẩm: ${p.name.slice(0, 15)}...`}
        onEdit={() => openProductEditor(p)}
        onEditImage={() => {
          openImagePicker(
            `Đổi ảnh: ${p.name}`,
            (url) => updateProduct(p.id, { image: url }),
            p.image
          );
        }}
        onDelete={() => removeProduct(p.id)}
      >
        <div
          onClick={handleCardClick}
          className={`h-full bg-white rounded-2xl sm:rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300 flex flex-col group cursor-pointer ${
            isFirst
              ? 'border-emerald-400/80 ring-1 ring-emerald-400/40 shadow-sm'
              : 'border-slate-200/90 hover:border-emerald-400'
          }`}
        >
          {/* Product Image Stage */}
          <div className="relative p-2.5 sm:p-4 bg-[#fbfdfc] flex items-center justify-center min-h-[140px] sm:min-h-[200px] md:min-h-[220px] overflow-hidden">
            <ProductVisual imageKey={p.image} size="md" />

            {/* Top Left Badges */}
            <div className="absolute top-2 left-2 sm:top-3 sm:left-3 flex flex-col gap-1 z-10">
              {isFirst && (
                <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-2 sm:px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-xs">
                  <Trophy className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden sm:inline">BÁN CHẠY</span> #1
                </span>
              )}
              {p.badge && !isFirst && (
                <span className="text-[9px] sm:text-[10px] font-bold px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-[#008764] text-white shadow-xs">
                  {p.badge}
                </span>
              )}
            </div>

            {/* Top Right Sold Counter Pill (Auto Increments: 2 clicks = +1 sold) */}
            <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-10">
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-bold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full bg-slate-900/80 backdrop-blur-sm text-emerald-300 shadow-xs border border-emerald-500/30">
                <Flame className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span>Đã bán {formattedSold}</span>
              </span>
            </div>

            {/* Quick View Overlay (Desktop) */}
            <div className="hidden sm:flex absolute inset-0 bg-slate-900/25 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px]">
              <Eye className="w-4 h-4" />
              <span>Xem chi tiết</span>
            </div>
          </div>

          {/* Card Body */}
          <div className="p-3 sm:p-5 flex flex-col justify-between flex-1 space-y-2 sm:space-y-3">
            <div>
              {/* Category tag & Rating */}
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span className="text-[10px] sm:text-[11px] font-extrabold text-emerald-700 uppercase tracking-wider truncate max-w-[65%]">
                  {p.categoryLabel}
                </span>
                <span className="flex items-center gap-0.5 sm:gap-1 text-amber-500 font-semibold text-[11px] sm:text-xs">
                  <Star className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-amber-400 text-amber-400" />
                  <span>{p.rating || 5.0}</span>
                </span>
              </div>

              {/* Title */}
              <h3 className="text-xs sm:text-base font-bold text-slate-900 line-clamp-2 hover:text-[#008764] transition-colors font-display leading-snug">
                {p.name}
              </h3>

              {/* Short Desc (Hidden on small mobile for clean native app look) */}
              <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-2 mt-1 sm:mt-1.5 leading-relaxed hidden sm:block">
                {p.shortDesc}
              </p>
            </div>

            {/* Price & Add to Cart */}
            <div className="pt-2 sm:pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 sm:gap-2">
              <div className="min-w-0">
                <div className="text-sm sm:text-lg font-black text-[#008764] font-display truncate">
                  {(p.price || 0).toLocaleString('vi-VN')}đ
                </div>
                {p.originalPrice && (
                  <div className="text-[10px] sm:text-xs text-slate-400 line-through truncate">
                    {p.originalPrice.toLocaleString('vi-VN')}đ
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleAddToCartClick}
                className="inline-flex items-center justify-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2.5 rounded-xl sm:rounded-full bg-emerald-50 hover:bg-[#008764] text-[#008764] hover:text-white text-[11px] sm:text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 shrink-0"
                title="Thêm vào giỏ hàng"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="hidden xs:inline sm:inline">Thêm</span>
              </button>
            </div>
          </div>
        </div>
      </EditableElement>
    </div>
  );
};

export const ProductCatalogSection: React.FC<ProductCatalogSectionProps> = ({
  onSelectProduct,
  onAddToCart,
}) => {
  const { config, moveProductToIndex, openProductEditor, isVisualEditActive } =
    useVisualEditor();

  const products = config.products || [];

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [draggedProductId, setDraggedProductId] = useState<string | null>(null);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);

  const filteredProducts = products.filter((p) => {
    const matchCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.shortDesc.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedProductId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverProductId !== id) {
      setDragOverProductId(id);
    }
  };

  const handleDragLeave = (_e: React.DragEvent, id: string) => {
    if (dragOverProductId === id) {
      setDragOverProductId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggedProductId;
    if (!sourceId || sourceId === targetId) {
      setDraggedProductId(null);
      setDragOverProductId(null);
      return;
    }

    const fromIndex = products.findIndex((p) => p.id === sourceId);
    const toIndex = products.findIndex((p) => p.id === targetId);

    if (fromIndex >= 0 && toIndex >= 0) {
      moveProductToIndex(fromIndex, toIndex);
    }

    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  return (
    <section id="products" className="py-12 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 space-y-2">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#008874]">
            DANH MỤC DINH DƯỠNG THUẦN TỰ NHIÊN
          </span>
          <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 font-display tracking-tight">
            Khám Phá Sản Phẩm TINGO
          </h2>
          <p className="text-slate-500 text-xs sm:text-base max-w-xl mx-auto">
            100% nguyên liệu tự nhiên chọn lọc, hỗ trợ bổ sung năng lượng, vi khoáng và tăng cường đề kháng mỗi ngày.
          </p>
        </div>

        {/* Filter Bar & Search: Optimized for Mobile */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4 mb-8">
          
          {/* Category Pills (Horizontal Scroll on Mobile) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-3.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'bg-[#008874] text-white shadow-md shadow-emerald-900/15'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>

          {/* Search Box */}
          <div className="relative sm:w-64 shrink-0">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-full bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874] focus:bg-white transition-all"
            />
          </div>
        </div>

        {/* Product Grid: 2 columns on Mobile, 3 on Desktop (Phone UI optimized) */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3 sm:gap-6">
          {filteredProducts.map((p, idx) => (
            <ProductCardItem
              key={p.id}
              product={p}
              index={idx}
              isFirst={idx === 0}
              isLast={idx === filteredProducts.length - 1}
              onSelect={onSelectProduct}
              onAdd={onAddToCart}
              onDragStart={handleDragStart}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              isDragged={draggedProductId === p.id}
              isDragOver={dragOverProductId === p.id}
            />
          ))}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
            <p className="text-slate-500 text-sm">Không tìm thấy sản phẩm nào phù hợp.</p>
          </div>
        )}

        {/* Add Product Button in Visual Edit Mode */}
        {isVisualEditActive && (
          <div className="mt-10 text-center">
            <button
              onClick={() => openProductEditor()}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-xs shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Sản Phẩm Mới Vào Danh Mục</span>
            </button>
          </div>
        )}

      </div>
    </section>
  );
};
