import React from 'react';
import { CheckCircle2, ShieldCheck, Sparkles, ArrowRight, ShoppingCart, Flame } from 'lucide-react';
import { ProductVisual } from './ProductVisual';
import { Product } from '../types';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';
import { useProductSold, recordProductInteraction } from '../utils/productStatsTracker';

interface FeaturedProductSectionProps {
  onAddToCart: (product: Product) => void;
  onSelectProduct: (product: Product) => void;
}

export const FeaturedProductSection: React.FC<FeaturedProductSectionProps> = ({
  onAddToCart,
  onSelectProduct,
}) => {
  const { config, updateFeaturedShowcase, updateProduct, openTextEditor, openImagePicker } = useVisualEditor();
  const showcase = config.featuredShowcase;
  const products = config.products;

  // Always strictly synchronize with the #1 first product in the catalog list
  const product = products[0] || {
    id: 'tingo-vhealth-duo',
    name: 'BỘT DINH DƯỠNG VHEALTH 2 VỊ',
    categoryLabel: 'BỘT DINH DƯỠNG',
    price: 790000,
    originalPrice: 890000,
    discountPercent: 11,
    image: 'vhealth-duo',
    rating: 4.9,
    reviewsCount: 248,
    shortDesc: 'Hộp 20 gói tiện lợi với 2 hương vị: Trà Xanh Matcha thanh mát & Cacao Bỉ thượng hạng.',
    volumeOrWeight: 'Hộp 20 gói x 25g',
    inStock: true,
  };

  const { soldCount, formattedSold } = useProductSold(product.id, product.soldCount);

  const handleSelect = () => {
    recordProductInteraction(product.id, product.soldCount);
    onSelectProduct(product as Product);
  };

  const handleAdd = () => {
    recordProductInteraction(product.id, product.soldCount);
    onAddToCart(product as Product);
  };

  return (
    <section id="featured" className="py-14 sm:py-20 bg-gradient-to-b from-[#f8faf7] to-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="rounded-3xl bg-gradient-to-br from-[#052319] via-[#093526] to-[#014d3a] text-white p-6 sm:p-10 lg:p-14 shadow-2xl relative overflow-hidden">
          
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center relative z-10">
            
            {/* Left: Product Visual Card (Screenshot 3 left side) */}
            <div className="lg:col-span-6 flex flex-col items-center justify-center">
              <EditableElement
                label="Ảnh Showcase Nổi Bật"
                onEditImage={() => {
                  openImagePicker(
                    'Đổi ảnh sản phẩm nổi bật',
                    (url) => updateProduct(product.id, { image: url }),
                    product.image
                  );
                }}
              >
                <div 
                  onClick={handleSelect}
                  className="w-full max-w-md bg-white/10 backdrop-blur-md p-4 sm:p-6 rounded-3xl border border-white/20 shadow-xl cursor-pointer group hover:bg-white/15 transition-all relative"
                >
                  <ProductVisual imageKey={product.image} size="lg" />

                  {/* Rating & Sold count & In stock badge */}
                  <div className="mt-4 flex items-center justify-between text-xs text-emerald-200">
                    <span className="flex items-center gap-1">
                      <span className="text-amber-300 font-bold">★ {product.rating || 5.0}</span>
                      <span>({product.reviewsCount || 200}+ đánh giá)</span>
                    </span>
                    <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 font-black px-2.5 py-0.5 rounded-full shadow-xs">
                      <Flame className="w-3 h-3 text-slate-950 fill-slate-950" />
                      <span>Đã bán {formattedSold}</span>
                    </span>
                  </div>
                </div>
              </EditableElement>
            </div>

            {/* Right: Product Details & Usage Steps (Screenshot 3 right side) */}
            <div className="lg:col-span-6 space-y-6">
              
              {/* Badge */}
              <EditableElement
                label="Huy hiệu Nổi Bật"
                onEdit={() =>
                  openTextEditor('Sửa huy hiệu', product.categoryLabel || showcase.badge, (val) =>
                    updateProduct(product.id, { categoryLabel: val })
                  )
                }
              >
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{product.categoryLabel || showcase.badge || 'BÁN CHẠY #1'}</span>
                </div>
              </EditableElement>

              {/* Title - Fully synchronized with product.name */}
              <EditableElement
                label="Tên sản phẩm nổi bật"
                onEdit={() =>
                  openTextEditor(
                    'Sửa tên sản phẩm #1',
                    product.name,
                    (val) => {
                      updateProduct(product.id, { name: val });
                    }
                  )
                }
              >
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-black font-display tracking-tight leading-tight uppercase">
                  {product.name}
                </h2>
              </EditableElement>

              {/* Price Row */}
              <div className="flex items-baseline gap-3">
                <span className="text-3xl sm:text-4xl font-black text-emerald-400 font-display">
                  {(product.price || 0).toLocaleString('vi-VN')}đ
                </span>
                {product.originalPrice && (
                  <span className="text-lg text-slate-400 line-through">
                    {product.originalPrice.toLocaleString('vi-VN')}đ
                  </span>
                )}
                {product.discountPercent && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/80 text-white">
                    -{product.discountPercent}%
                  </span>
                )}
              </div>

              {/* Usage / Key Benefits Points - Synchronized with Product #1 */}
              <EditableElement
                label="Hướng dẫn sử dụng #1"
                onEdit={() => {
                  const currentSteps =
                    product.usageInstructions && product.usageInstructions.length > 0
                      ? product.usageInstructions
                      : showcase.points;
                  openTextEditor(
                    `Sửa hướng dẫn sử dụng: ${product.name} (cách nhau bởi dấu gạch đứng |)`,
                    currentSteps.join(' | '),
                    (val) => {
                      const pts = val.split('|').map((p) => p.trim()).filter(Boolean);
                      if (pts.length > 0) {
                        updateProduct(product.id, { usageInstructions: pts });
                        updateFeaturedShowcase({ points: pts });
                      }
                    }
                  );
                }}
              >
                <div className="space-y-2.5">
                  <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider block">
                    Hướng dẫn sử dụng nhanh:
                  </span>
                  {(product.usageInstructions && product.usageInstructions.length > 0
                    ? product.usageInstructions
                    : showcase.points
                  ).map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm text-slate-200">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </EditableElement>

              {/* Guarantees */}
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-emerald-200/90">
                {showcase.guarantees.map((g, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>{g}</span>
                  </div>
                ))}
              </div>

              {/* Action Buttons */}
              <div className="pt-4 flex flex-wrap gap-3">
                <button
                  onClick={handleAdd}
                  className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-lg shadow-emerald-950/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                >
                  <ShoppingCart className="w-5 h-5" />
                  <span>Mua Ngay Combo Này</span>
                </button>

                <button
                  onClick={handleSelect}
                  className="px-6 py-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold text-sm border border-white/20 transition-all cursor-pointer"
                >
                  <span>Chi Tiết</span>
                </button>
              </div>

            </div>

          </div>
        </div>

      </div>
    </section>
  );
};
