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
} from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import { Product } from '../types';
import { CATEGORIES } from '../data/mockData';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

interface ProductCatalogSectionProps {
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCatalogSection: React.FC<ProductCatalogSectionProps> = ({
  onSelectProduct,
  onAddToCart,
}) => {
  const {
    config,
    removeProduct,
    reorderProduct,
    moveProductToIndex,
    openProductEditor,
    openImagePicker,
    updateProduct,
    isVisualEditActive,
  } = useVisualEditor();

  const products = config.products;

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
    if (sourceId && sourceId !== targetId) {
      const fromIdx = products.findIndex((x) => x.id === sourceId);
      const toIdx = products.findIndex((x) => x.id === targetId);
      if (fromIdx >= 0 && toIdx >= 0) {
        moveProductToIndex(fromIdx, toIdx);
      }
    }
    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  const handleDragEnd = () => {
    setDraggedProductId(null);
    setDragOverProductId(null);
  };

  return (
    <section id="products" className="py-14 sm:py-20 bg-[#fbfdfc]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 sm:mb-12">
          <div className="space-y-2">
            <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#008874]">
              DANH MỤC SẢN PHẨM ORGANIC
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 font-display tracking-tight">
              Dinh dưỡng trọn vẹn <span className="text-[#008874]">cho cơ thể</span>
            </h2>
            <p className="text-sm text-slate-500 max-w-xl">
              Tất cả sản phẩm đều được chiết xuất từ thảo mộc thiên nhiên, thuần chay và sản xuất theo tiêu chuẩn quốc tế ISO/HACCP.
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs sm:text-sm shadow-xs"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {CATEGORIES.map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#008764] text-white shadow-md shadow-emerald-900/15'
                    : 'bg-white text-slate-600 hover:bg-emerald-50/60 border border-slate-200'
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredProducts.map((p) => {
            const productIndex = products.findIndex((item) => item.id === p.id);
            const isFirst = productIndex === 0;
            const isLast = productIndex === products.length - 1;
            const isBeingDragged = draggedProductId === p.id;
            const isDropTarget = dragOverProductId === p.id && !isBeingDragged;

            return (
              <div
                key={p.id}
                draggable={isVisualEditActive}
                onDragStart={(e) => handleDragStart(e, p.id)}
                onDragOver={(e) => handleDragOver(e, p.id)}
                onDragLeave={(e) => handleDragLeave(e, p.id)}
                onDrop={(e) => handleDrop(e, p.id)}
                onDragEnd={handleDragEnd}
                className={`flex flex-col transition-all duration-200 ${
                  isBeingDragged ? 'opacity-40 scale-95' : ''
                } ${
                  isDropTarget
                    ? 'ring-2 ring-emerald-500 ring-offset-2 rounded-3xl scale-[1.02] shadow-xl'
                    : ''
                }`}
              >
                {/* Reorder Toolbar when Visual Edit is Active */}
                {isVisualEditActive && (
                  <div className="mb-2 flex items-center justify-between px-3 py-1.5 bg-slate-900/95 text-white rounded-2xl text-xs font-semibold shadow-md">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-300">
                      {/* Drag Handle */}
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
                          #1 BÁN CHẠY NHẤT
                        </span>
                      ) : (
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono text-[10px]">
                          Vị trí #{productIndex + 1}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => reorderProduct(p.id, 'prev')}
                        className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-200 cursor-pointer transition-colors"
                        title="Di chuyển sang trái / Vị trí trước"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </button>

                      {!isFirst && (
                        <button
                          type="button"
                          onClick={() => reorderProduct(p.id, 'first')}
                          className="px-2 py-0.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold cursor-pointer transition-colors"
                          title="Đưa sản phẩm này lên vị trí #1 (Đồng bộ Showcase)"
                        >
                          Lên #1
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => reorderProduct(p.id, 'next')}
                        className="p-1 rounded-lg hover:bg-slate-800 disabled:opacity-30 text-slate-200 cursor-pointer transition-colors"
                        title="Di chuyển sang phải / Vị trí sau"
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
                    className={`h-full bg-white rounded-3xl border overflow-hidden shadow-xs hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300 flex flex-col group ${
                      isFirst
                        ? 'border-emerald-400 ring-1 ring-emerald-400/50 shadow-md shadow-emerald-900/5'
                        : 'border-slate-200/90 hover:border-emerald-300'
                    }`}
                  >
                    {/* Product Image Stage - Pure Clean background without artificial tints */}
                    <div
                      className="relative p-4 bg-transparent cursor-pointer overflow-hidden flex items-center justify-center min-h-[220px]"
                      onClick={() => onSelectProduct(p)}
                    >
                      <ProductVisual imageKey={p.image} size="md" />

                      {/* Top Badges */}
                      <div className="absolute top-3 left-3 flex flex-col gap-1 z-20">
                        {isFirst && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-black px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-xs">
                            <Trophy className="w-3 h-3" />
                            BÁN CHẠY #1
                          </span>
                        )}
                        {p.badge && !isFirst && (
                          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-[#008764] text-white shadow-xs">
                            {p.badge}
                          </span>
                        )}
                      </div>

                      {/* Quick View Overlay Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectProduct(p);
                        }}
                        className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 text-white text-xs font-bold backdrop-blur-[2px] cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Xem chi tiết</span>
                      </button>
                    </div>

                    {/* Card Body */}
                    <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                      <div>
                        {/* Category tag & Rating */}
                        <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                          <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">
                            {p.categoryLabel}
                          </span>
                          <span className="flex items-center gap-1 text-amber-500 font-semibold">
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <span>{p.rating || 5.0}</span>
                          </span>
                        </div>

                        {/* Title */}
                        <h3
                          onClick={() => onSelectProduct(p)}
                          className="text-base sm:text-lg font-bold text-slate-900 line-clamp-2 hover:text-[#008764] transition-colors cursor-pointer font-display leading-snug"
                        >
                          {p.name}
                        </h3>

                        {/* Short Desc */}
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1.5 leading-relaxed">
                          {p.shortDesc}
                        </p>
                      </div>

                      {/* Price & Add to Cart */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                        <div>
                          <div className="text-lg font-black text-[#008764] font-display">
                            {(p.price || 0).toLocaleString('vi-VN')}đ
                          </div>
                          {p.originalPrice && (
                            <div className="text-xs text-slate-400 line-through">
                              {p.originalPrice.toLocaleString('vi-VN')}đ
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => onAddToCart(p)}
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-emerald-50 hover:bg-[#008764] text-[#008764] hover:text-white text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Thêm</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </EditableElement>
              </div>
            );
          })}
        </div>

        {/* Empty State */}
        {filteredProducts.length === 0 && (
          <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200">
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
