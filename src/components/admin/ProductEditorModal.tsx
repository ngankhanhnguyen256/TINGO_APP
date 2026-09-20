import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Package,
  Image as ImageIcon,
  DollarSign,
  Tag,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';
import { Product } from '../../types';
import { CATEGORIES } from '../../data/mockData';
import { ProductVisual } from '../ProductVisual';

export const ProductEditorModal: React.FC = () => {
  const { productEditor, closeProductEditor, openImagePicker } = useVisualEditor();

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    category: 'bot-dinh-duong',
    categoryLabel: 'BỘT DINH DƯỠNG',
    price: 500000,
    originalPrice: 600000,
    discountPercent: 15,
    badge: 'Mới Ra Mắt',
    image: 'vhealth-matcha',
    rating: 5.0,
    reviewsCount: 20,
    shortDesc: '',
    description: '',
    volumeOrWeight: 'Hộp 20 gói x 25g',
    ingredients: ['100% Nguyên liệu hữu cơ thiên nhiên', 'Đạm thực vật tinh khiết'],
    benefits: ['Bổ sung năng lượng sạch', 'Tăng cường sức đề kháng'],
    usageInstructions: ['Pha 1 gói với 150ml nước ấm 50°C'],
    inStock: true,
    featured: false,
  });

  const [newIngredient, setNewIngredient] = useState('');
  const [newBenefit, setNewBenefit] = useState('');

  useEffect(() => {
    if (productEditor.isOpen) {
      if (productEditor.product) {
        setFormData(productEditor.product);
      } else {
        setFormData({
          id: `product-${Date.now()}`,
          slug: `san-pham-moi-${Date.now()}`,
          name: 'Sản Phẩm Dinh Dưỡng Mới',
          category: 'bot-dinh-duong',
          categoryLabel: 'BỘT DINH DƯỠNG',
          price: 650000,
          originalPrice: 790000,
          discountPercent: 18,
          badge: 'Sản Phẩm Mới',
          image: 'vhealth-matcha',
          rating: 5.0,
          reviewsCount: 15,
          shortDesc: 'Sản phẩm bổ sung năng lượng thuần thực vật cao cấp từ TINGO.',
          description: 'Nguồn dinh dưỡng tự nhiên được chọn lọc kỹ lưỡng mang lại trải nghiệm sống khỏe mỗi ngày.',
          volumeOrWeight: 'Hộp 20 gói x 25g (500g)',
          ingredients: ['Đạm đậu Hà Lan nguyên chất', 'Ngũ cốc nguyên cám', 'Vitamin & Khoáng chất'],
          benefits: ['Hấp thụ nhanh trong 3 phút', 'Không gây nóng trong'],
          usageInstructions: ['Pha 1 gói với 150ml - 200ml nước ấm'],
          inStock: true,
          featured: false,
        });
      }
    }
  }, [productEditor.isOpen, productEditor.product]);

  if (!productEditor.isOpen) return null;

  const handleCategoryChange = (catId: string) => {
    const cat = CATEGORIES.find((c) => c.id === catId);
    setFormData((prev) => ({
      ...prev,
      category: catId,
      categoryLabel: cat ? cat.name.toUpperCase() : 'KHÁC',
    }));
  };

  // Smart Price & Discount Synchronized Handlers
  const handlePriceChange = (newPrice: number) => {
    const priceVal = Math.max(0, newPrice);
    setFormData((prev) => {
      let discount = prev.discountPercent || 0;
      let origPrice = prev.originalPrice;

      if (origPrice && origPrice > priceVal) {
        discount = Math.max(0, Math.min(99, Math.round(((origPrice - priceVal) / origPrice) * 100)));
      } else if (!origPrice && discount > 0) {
        origPrice = Math.round((priceVal / (1 - discount / 100)) / 1000) * 1000;
      } else if (origPrice && origPrice <= priceVal) {
        discount = 0;
      }

      return {
        ...prev,
        price: priceVal,
        originalPrice: origPrice,
        discountPercent: discount,
      };
    });
  };

  const handleOriginalPriceChange = (newOrigPrice: number) => {
    const origVal = Math.max(0, newOrigPrice);
    setFormData((prev) => {
      let priceVal = prev.price || 0;
      let discount = prev.discountPercent || 0;

      if (discount > 0 && origVal > 0) {
        priceVal = Math.round((origVal * (1 - discount / 100)) / 1000) * 1000;
      } else if (origVal > priceVal && priceVal > 0) {
        discount = Math.max(0, Math.min(99, Math.round(((origVal - priceVal) / origVal) * 100)));
      } else if (origVal <= priceVal) {
        discount = 0;
      }

      return {
        ...prev,
        originalPrice: origVal,
        price: priceVal,
        discountPercent: discount,
      };
    });
  };

  const handleDiscountPercentChange = (percent: number) => {
    const discountVal = Math.max(0, Math.min(99, percent));
    setFormData((prev) => {
      let priceVal = prev.price || 0;
      let origPrice = prev.originalPrice;

      if (origPrice && origPrice > 0) {
        priceVal = Math.round((origPrice * (1 - discountVal / 100)) / 1000) * 1000;
      } else if (priceVal > 0) {
        origPrice = discountVal > 0 ? Math.round((priceVal / (1 - discountVal / 100)) / 1000) * 1000 : priceVal;
      }

      return {
        ...prev,
        discountPercent: discountVal,
        price: priceVal,
        originalPrice: origPrice,
      };
    });
  };

  const handleAddIngredient = () => {
    if (newIngredient.trim()) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [...(prev.ingredients || []), newIngredient.trim()],
      }));
      setNewIngredient('');
    }
  };

  const handleRemoveIngredient = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients?.filter((_, i) => i !== index),
    }));
  };

  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...(prev.benefits || []), newBenefit.trim()],
      }));
      setNewBenefit('');
    }
  };

  const handleRemoveBenefit = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits?.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name?.trim()) {
      alert('Vui lòng nhập tên sản phẩm.');
      return;
    }

    const fullProduct: Product = {
      id: formData.id || `prod-${Date.now()}`,
      name: formData.name || 'Sản phẩm mới',
      slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
      category: formData.category || 'bot-dinh-duong',
      categoryLabel: formData.categoryLabel || 'BỘT DINH DƯỠNG',
      price: Number(formData.price) || 0,
      originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
      discountPercent: formData.discountPercent ? Number(formData.discountPercent) : undefined,
      badge: formData.badge,
      image: formData.image || 'vhealth-matcha',
      rating: Number(formData.rating) || 5.0,
      reviewsCount: Number(formData.reviewsCount) || 1,
      shortDesc: formData.shortDesc || '',
      description: formData.description || '',
      volumeOrWeight: formData.volumeOrWeight || '',
      ingredients: formData.ingredients || [],
      benefits: formData.benefits || [],
      usageInstructions: formData.usageInstructions || [],
      inStock: formData.inStock ?? true,
      featured: formData.featured ?? false,
    };

    productEditor.onSave(fullProduct);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div
        className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] my-auto animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-[#008874] flex items-center justify-center">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                {productEditor.product ? 'Chỉnh Sửa Sản Phẩm' : 'Thêm Sản Phẩm Mới'}
              </h3>
              <p className="text-xs text-slate-500">
                Nhập thông tin sản phẩm, cập nhật ảnh từ thiết bị/URL và giá bán
              </p>
            </div>
          </div>

          <button
            onClick={closeProductEditor}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Row: Image Picker & Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-start">
            {/* Image Preview & Picker */}
            <div className="sm:col-span-4 space-y-3">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Hình Ảnh Sản Phẩm
              </label>
              <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center relative group">
                <ProductVisual imageKey={formData.image || 'vhealth-matcha'} size="sm" />
                <button
                  type="button"
                  onClick={() =>
                    openImagePicker(
                      'Đổi ảnh sản phẩm',
                      (imgUrl) => setFormData((prev) => ({ ...prev, image: imgUrl })),
                      formData.image
                    )
                  }
                  className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-xs font-bold gap-1 cursor-pointer"
                >
                  <ImageIcon className="w-6 h-6 text-emerald-300" />
                  <span>Tải ảnh từ máy / Link URL</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() =>
                  openImagePicker(
                    'Đổi ảnh sản phẩm',
                    (imgUrl) => setFormData((prev) => ({ ...prev, image: imgUrl })),
                    formData.image
                  )
                }
                className="w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#008874] text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
                <span>Đổi Ảnh Sản Phẩm</span>
              </button>
            </div>

            {/* Basic Info */}
            <div className="sm:col-span-8 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tên sản phẩm *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: BỘT DINH DƯỠNG VHEALTH 2 VỊ"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Danh mục
                  </label>
                  <select
                    value={formData.category || 'bot-dinh-duong'}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs font-medium"
                  >
                    {CATEGORIES.filter((c) => c.id !== 'all').map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Huy hiệu (Badge)
                  </label>
                  <input
                    type="text"
                    value={formData.badge || ''}
                    onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                    placeholder="Bán Chạy #1, Mới, v.v."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs"
                  />
                </div>
              </div>

              {/* Price & Discount */}
              <div className="space-y-2.5 p-3.5 bg-emerald-50/40 rounded-2xl border border-emerald-200/60">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Giá bán (VNĐ) *
                    </label>
                    <input
                      type="number"
                      required
                      step="1000"
                      value={formData.price || 0}
                      onChange={(e) => handlePriceChange(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm font-mono font-bold text-[#008764] bg-white shadow-xs"
                    />
                    <span className="text-[11px] text-[#008874] font-medium block mt-1">
                      = {(formData.price || 0).toLocaleString('vi-VN')} đ
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Giá gốc niêm yết (VNĐ)
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={formData.originalPrice || 0}
                      onChange={(e) => handleOriginalPriceChange(Number(e.target.value))}
                      placeholder="Không bắt buộc"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm font-mono text-slate-600 bg-white shadow-xs"
                    />
                    <span className="text-[11px] text-slate-500 font-medium block mt-1">
                      {formData.originalPrice ? `= ${(formData.originalPrice).toLocaleString('vi-VN')} đ` : 'Chưa nhập giá gốc'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      % Giảm giá (Tự tính)
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="99"
                        value={formData.discountPercent || 0}
                        onChange={(e) => handleDiscountPercentChange(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-sm font-mono font-bold text-rose-600 bg-white shadow-xs"
                      />
                      <span className="text-sm font-bold text-rose-600">%</span>
                    </div>
                    <span className="text-[11px] text-rose-600 font-medium block mt-1">
                      {formData.discountPercent ? `Đang giảm -${formData.discountPercent}%` : 'Không giảm giá'}
                    </span>
                  </div>
                </div>

                {/* Quick Discount Presets */}
                <div className="pt-1 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-slate-500 font-bold mr-1">Giảm nhanh:</span>
                  {[0, 10, 15, 20, 25, 30, 40, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => handleDiscountPercentChange(pct)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        (formData.discountPercent || 0) === pct
                          ? 'bg-[#008764] text-white shadow-xs'
                          : 'bg-white text-slate-700 hover:bg-emerald-100 border border-slate-200'
                      }`}
                    >
                      {pct === 0 ? '0% Gốc' : `-${pct}%`}
                    </button>
                  ))}
                </div>

                {/* Real-time Calculation Summary Badge */}
                {formData.originalPrice && formData.price && formData.originalPrice > formData.price ? (
                  <div className="p-2.5 bg-white/90 rounded-xl border border-emerald-300/80 flex items-center justify-between text-xs text-slate-700">
                    <span className="flex items-center gap-1 font-bold text-[#008764]">
                      <Sparkles className="w-3.5 h-3.5" />
                      Khách hàng tiết kiệm: {(formData.originalPrice - formData.price).toLocaleString('vi-VN')}đ
                    </span>
                    <span className="bg-rose-500 text-white font-bold px-2 py-0.5 rounded-full text-[11px]">
                      Giảm {formData.discountPercent || Math.round(((formData.originalPrice - formData.price) / formData.originalPrice) * 100)}%
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {/* Descriptions */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mô tả ngắn (Hiển thị ngoài card)
              </label>
              <input
                type="text"
                value={formData.shortDesc || ''}
                onChange={(e) => setFormData({ ...formData, shortDesc: e.target.value })}
                placeholder="Mô tả tóm tắt lợi ích chính..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Mô tả chi tiết
              </label>
              <textarea
                rows={3}
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Mô tả nguồn gốc nguyên liệu, công dụng đầy đủ..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008874] text-xs"
              />
            </div>
          </div>

          {/* Ingredients & Benefits Lists */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Ingredients */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Thành Phần
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {formData.ingredients?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200">
                    <span className="line-clamp-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Thêm thành phần..."
                  value={newIngredient}
                  onChange={(e) => setNewIngredient(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddIngredient();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Thêm
                </button>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-2 p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Công Dụng Nổi Bật
              </label>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {formData.benefits?.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 text-xs bg-white p-2 rounded-lg border border-slate-200">
                    <span className="line-clamp-1">{item}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="text-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Thêm công dụng..."
                  value={newBenefit}
                  onChange={(e) => setNewBenefit(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddBenefit();
                    }
                  }}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-300 text-xs"
                />
                <button
                  type="button"
                  onClick={handleAddBenefit}
                  className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                >
                  Thêm
                </button>
              </div>
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={closeProductEditor}
              className="px-5 py-2.5 rounded-full text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-7 py-2.5 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-sm shadow-md shadow-emerald-900/15 cursor-pointer transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Lưu Sản Phẩm</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
