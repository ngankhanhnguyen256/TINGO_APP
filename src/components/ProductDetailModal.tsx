import React, { useState } from 'react';
import { X, ShoppingBag, ArrowRight, Star, ShieldCheck, CheckCircle2, Sparkles, Heart } from 'lucide-react';
import { Product } from '../types';
import { ProductVisual } from './ProductVisual';
import { useProductSold } from '../utils/productStatsTracker';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, qty: number) => void;
  onBuyNow: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onAddToCart,
  onBuyNow,
}) => {
  const [qty, setQty] = useState(1);
  const [activeTab, setActiveTab] = useState<'desc' | 'ingredients' | 'usage'>('desc');
  const { formattedSold } = useProductSold(product?.id || '', product?.soldCount || 100);

  if (!product) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-emerald-100 relative p-6 sm:p-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors z-20"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          
          {/* Left Visual Column */}
          <div className="md:col-span-5 space-y-4">
            <div className="rounded-2xl overflow-hidden border border-emerald-100 shadow-md">
              <ProductVisual imageKey={product.image} size="lg" />
            </div>

            <div className="bg-emerald-50/70 p-3.5 rounded-2xl border border-emerald-100 text-xs space-y-1.5 text-emerald-900">
              <div className="font-bold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Cam kết chuẩn Organic 100%
              </div>
              <p className="text-slate-600 text-[11px]">
                Đóng gói quy chuẩn HACCP, vô trùng tuyệt đối, an toàn cho cả gia đình.
              </p>
            </div>
          </div>

          {/* Right Product Details Column */}
          <div className="md:col-span-7 space-y-5">
            <div>
              <span className="text-[11px] font-bold text-[#0284c7] uppercase tracking-wider block mb-1">
                {product.categoryLabel}
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display leading-tight">
                {product.name}
              </h2>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                <div className="flex items-center text-amber-400">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                  <span className="font-bold text-slate-800 ml-1.5 text-xs">
                    {product.rating}
                  </span>
                </div>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-500 font-medium">
                  {product.reviewsCount} Đánh giá
                </span>
                <span className="text-xs text-slate-400">|</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Đã bán {formattedSold}
                </span>
              </div>
            </div>

            {/* Price Box */}
            <div className="flex items-baseline gap-3 p-3.5 rounded-2xl bg-[#f8faf8] border border-emerald-100">
              <span className="text-2xl sm:text-3xl font-black text-[#008764] font-display">
                {product.price.toLocaleString('vi-VN')}đ
              </span>
              {product.originalPrice && (
                <span className="text-sm text-slate-400 line-through font-mono">
                  {product.originalPrice.toLocaleString('vi-VN')}đ
                </span>
              )}
              {product.discountPercent && (
                <span className="text-xs font-bold text-[#008764] bg-emerald-100 px-2 py-0.5 rounded-full">
                  -{product.discountPercent}%
                </span>
              )}
            </div>

            {/* Tabs for Details */}
            <div>
              <div className="flex border-b border-slate-200 text-xs font-bold gap-4">
                <button
                  onClick={() => setActiveTab('desc')}
                  className={`pb-2 transition-colors cursor-pointer ${
                    activeTab === 'desc'
                      ? 'border-b-2 border-[#008764] text-[#008764]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Công dụng & Tổng quan
                </button>
                <button
                  onClick={() => setActiveTab('ingredients')}
                  className={`pb-2 transition-colors cursor-pointer ${
                    activeTab === 'ingredients'
                      ? 'border-b-2 border-[#008764] text-[#008764]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Thành phần tự nhiên
                </button>
                <button
                  onClick={() => setActiveTab('usage')}
                  className={`pb-2 transition-colors cursor-pointer ${
                    activeTab === 'usage'
                      ? 'border-b-2 border-[#008764] text-[#008764]'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Hướng dẫn sử dụng
                </button>
              </div>

              {/* Tab Content */}
              <div className="pt-3 text-xs sm:text-sm text-slate-600 leading-relaxed min-h-[110px]">
                {activeTab === 'desc' && (
                  <div className="space-y-2.5">
                    <p>{product.description}</p>
                    <div className="space-y-1.5 pt-1">
                      {(product.benefits || []).map((b, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-[#008764] shrink-0 mt-0.5" />
                          <span className="text-slate-700 font-medium">{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeTab === 'ingredients' && (
                  <ul className="space-y-2">
                    {(product.ingredients || []).map((ing, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#008764] mt-2 shrink-0" />
                        <span className="text-slate-700">{ing}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {activeTab === 'usage' && (
                  <div className="space-y-2">
                    {(product.usageInstructions || []).map((step, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <span className="w-5 h-5 rounded-full bg-emerald-100 text-[#008764] font-bold text-[10px] flex items-center justify-center shrink-0">
                          {i + 1}
                        </span>
                        <span className="text-slate-700 font-medium">{step}</span>
                      </div>
                    ))}
                    <div className="text-[11px] text-slate-500 pt-2 italic">
                      Quy cách đóng gói: {product.volumeOrWeight}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quantity Selector & Action Buttons */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-slate-500">Số lượng:</span>
                <div className="flex items-center border border-slate-200 rounded-full bg-slate-50">
                  <button
                    onClick={() => setQty(Math.max(1, qty - 1))}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    -
                  </button>
                  <span className="w-9 text-center font-bold text-sm text-slate-800">
                    {qty}
                  </span>
                  <button
                    onClick={() => setQty(qty + 1)}
                    className="w-8 h-8 flex items-center justify-center text-slate-600 hover:bg-slate-200 font-bold"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    onAddToCart(product, qty);
                    onClose();
                  }}
                  className="flex-1 min-w-[150px] py-3 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Thêm Vào Giỏ</span>
                </button>

                <button
                  onClick={() => {
                    onBuyNow(product);
                    onClose();
                  }}
                  className="flex-1 min-w-[130px] py-3 rounded-full bg-white hover:bg-emerald-50 text-[#008764] font-bold text-sm border-2 border-[#008764] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Mua Ngay</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
};
