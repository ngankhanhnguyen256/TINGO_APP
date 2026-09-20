import React, { useState } from 'react';
import { X, Search, ShoppingBag, ArrowRight } from 'lucide-react';
import { PRODUCTS } from '../data/mockData';
import { Product } from '../types';
import { ProductVisual } from './ProductVisual';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectProduct,
  onAddToCart,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const results = searchTerm.trim()
    ? PRODUCTS.filter(
        (p) =>
          p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.categoryLabel.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.benefits.some((b) => b.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : PRODUCTS.slice(0, 4);

  const quickKeywords = ['Vhealth', 'Quantum', 'Trà Xanh', 'Socola', 'Vsportgel', 'Combo'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-20 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-emerald-100 relative p-5 sm:p-7">
        
        {/* Header with Search Input */}
        <div className="relative flex items-center mb-4">
          <Search className="w-5 h-5 text-slate-400 absolute left-4" />
          <input
            type="text"
            autoFocus
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên sản phẩm, công dụng (VD: Hydrogen, Đạm đậu, Vhealth)..."
            className="w-full bg-slate-50 border border-slate-200 rounded-full pl-11 pr-12 py-3 text-sm focus:bg-white focus:outline-none focus:border-[#008764]"
          />
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200 hover:bg-slate-300 text-slate-600 absolute right-2.5 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick keywords */}
        <div className="flex items-center gap-1.5 flex-wrap mb-6 text-xs">
          <span className="text-slate-400 font-medium">Gợi ý tìm kiếm:</span>
          {quickKeywords.map((kw) => (
            <button
              key={kw}
              onClick={() => setSearchTerm(kw)}
              className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-[#008764] transition-colors"
            >
              {kw}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {searchTerm.trim() ? `Kết quả tìm kiếm (${results.length})` : 'Sản phẩm nổi bật:'}
          </div>

          {results.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-sm">
              Không tìm thấy sản phẩm phù hợp với từ khóa "{searchTerm}".
            </div>
          ) : (
            results.map((product) => (
              <div
                key={product.id}
                onClick={() => {
                  onSelectProduct(product);
                  onClose();
                }}
                className="flex items-center gap-3.5 p-3 rounded-2xl bg-white hover:bg-emerald-50/60 border border-slate-100 hover:border-emerald-200 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-slate-100">
                  <ProductVisual imageKey={product.image} size="sm" />
                </div>

                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-[#0284c7] uppercase">
                    {product.categoryLabel}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900 group-hover:text-[#008764] transition-colors truncate">
                    {product.name}
                  </h4>
                  <span className="font-mono font-bold text-xs text-[#008764]">
                    {product.price.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToCart(product);
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-100 hover:bg-[#008764] text-emerald-800 hover:text-white flex items-center justify-center transition-colors shrink-0"
                  title="Thêm vào giỏ"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
};
