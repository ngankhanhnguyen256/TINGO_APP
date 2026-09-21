import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  Quote,
  Plus,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Heart,
  Sparkles,
  Award,
  Users,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';
import { Testimonial } from '../types';

export const TestimonialsSection: React.FC = () => {
  const {
    config,
    updateTestimonial,
    removeTestimonial,
    addTestimonial,
    openTextEditor,
    openImagePicker,
    isVisualEditActive,
  } = useVisualEditor();

  const testimonials = config.testimonials || [];
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeTestimonial = testimonials[currentIndex] || testimonials[0];

  const handleNext = () => {
    if (testimonials.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    if (testimonials.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const handleEditTestimonial = (t: Testimonial) => {
    openTextEditor(
      `Sửa đánh giá của ${t.name}`,
      `${t.name} | ${t.role} | ${t.comment}`,
      (val) => {
        const [name, role, comment] = val.split('|');
        updateTestimonial(t.id, {
          name: name?.trim() || t.name,
          role: role?.trim() || t.role,
          comment: comment?.trim() || t.comment,
        });
      },
      true
    );
  };

  return (
    <section id="testimonials" className="py-12 sm:py-16 bg-[#f4faf6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Container */}
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#062c21] via-[#006e5e] to-[#044c41] text-white p-6 sm:p-10 md:p-14 shadow-2xl border border-emerald-500/30">
          
          {/* Subtle Ambient Light Orbs */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-teal-300/10 rounded-full blur-3xl pointer-events-none" />

          {/* Banner Header Row */}
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/15">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-emerald-200 text-xs font-extrabold uppercase tracking-wider mb-2.5 border border-white/15">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>TRẢI NGHIỆM THỰC TẾ TỪ KHÁCH HÀNG</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black font-display text-white tracking-tight">
                Câu Chuyện Dinh Dưỡng Thực Tế
              </h2>
              <p className="text-emerald-100/80 text-xs sm:text-sm mt-1 max-w-xl">
                Cảm nhận chân thật từ hàng ngàn khách hàng đã nâng tầm sức khỏe mỗi ngày cùng TINGO
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="flex items-center gap-4 sm:gap-6 bg-white/10 backdrop-blur-md px-4 sm:px-6 py-2.5 rounded-2xl border border-white/15">
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-black text-amber-300 font-display">4.9★</div>
                <div className="text-[10px] text-emerald-100/70 uppercase font-semibold">Đánh giá</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-black text-white font-display">12.000+</div>
                <div className="text-[10px] text-emerald-100/70 uppercase font-semibold">Tin dùng</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-black text-emerald-200 font-display">99.4%</div>
                <div className="text-[10px] text-emerald-100/70 uppercase font-semibold">Hài lòng</div>
              </div>
            </div>
          </div>

          {/* Active Featured Testimonial Banner View */}
          {activeTestimonial && (
            <div className="relative z-10 pt-8 sm:pt-10">
              <EditableElement
                label={`Đánh giá: ${activeTestimonial.name}`}
                onEdit={() => handleEditTestimonial(activeTestimonial)}
                onEditImage={() => {
                  openImagePicker(
                    `Đổi Avatar: ${activeTestimonial.name}`,
                    (url) => updateTestimonial(activeTestimonial.id, { avatar: url }),
                    activeTestimonial.avatar
                  );
                }}
                onDelete={() => removeTestimonial(activeTestimonial.id)}
              >
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                  
                  {/* Left: Customer Profile & Rating */}
                  <div className="lg:col-span-4 flex items-center lg:flex-col lg:items-start gap-4">
                    <div className="relative">
                      <img
                        src={activeTestimonial.avatar}
                        alt={activeTestimonial.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-emerald-300/80 shadow-lg shadow-black/20"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute -bottom-1.5 -right-1.5 bg-emerald-500 text-white rounded-full p-1 shadow-md">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-amber-300">
                        {[...Array(activeTestimonial.rating || 5)].map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-amber-300" />
                        ))}
                      </div>
                      <div className="text-base sm:text-lg font-bold text-white font-display">
                        {activeTestimonial.name}
                      </div>
                      <div className="text-xs text-emerald-200/80">
                        {activeTestimonial.role}
                      </div>
                      <div className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-200 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span>Đã xác thực đơn hàng TINGO</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Quote Content */}
                  <div className="lg:col-span-8 bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-8 border border-white/15 relative">
                    <Quote className="w-8 h-8 text-emerald-300/30 mb-2" />
                    <p className="text-base sm:text-lg md:text-xl text-white font-medium leading-relaxed italic">
                      "{activeTestimonial.comment}"
                    </p>
                  </div>

                </div>
              </EditableElement>

              {/* Navigation Carousel Dots & Arrows */}
              <div className="flex items-center justify-between pt-8 mt-6 border-t border-white/10">
                <div className="flex items-center gap-2">
                  {testimonials.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        idx === currentIndex ? 'w-8 bg-amber-300' : 'w-2 bg-white/30 hover:bg-white/60'
                      }`}
                      aria-label={`Chuyển đến đánh giá ${idx + 1}`}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrev}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/15"
                    aria-label="Đánh giá trước"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleNext}
                    className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer border border-white/15"
                    aria-label="Đánh giá kế tiếp"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* Admin Add Testimonial */}
          {isVisualEditActive && (
            <div className="mt-6 pt-4 border-t border-white/10 text-center">
              <button
                onClick={() => {
                  const newRev = {
                    id: `rev-${Date.now()}`,
                    name: 'Khách hàng mới',
                    role: 'TP. Hồ Chí Minh',
                    avatar:
                      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                    rating: 5,
                    comment: 'Sản phẩm ngon và cung cấp năng lượng rất tốt!',
                    productName: 'Vhealth',
                    verified: true,
                  };
                  addTestimonial(newRev);
                }}
                className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-bold transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm Đánh Giá Banner Mới</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </section>
  );
};
