import React from 'react';
import { Star, CheckCircle2, Quote, Plus } from 'lucide-react';
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

  const testimonials = config.testimonials;

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
    <section id="testimonials" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#008874] block mb-2">
            TRẢI NGHIỆM THỰC TẾ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a2f24] font-display tracking-tight">
            Khách hàng nói gì về TINGO?
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-2">
            Hơn 12.000+ người tiêu dùng Việt đã tin chọn TINGO cho sức khoẻ gia đình mỗi ngày.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          {testimonials.map((t) => (
            <EditableElement
              key={t.id}
              label={`Review: ${t.name}`}
              onEdit={() => handleEditTestimonial(t)}
              onEditImage={() => {
                openImagePicker(
                  `Đổi Avatar: ${t.name}`,
                  (url) => updateTestimonial(t.id, { avatar: url }),
                  t.avatar
                );
              }}
              onDelete={() => removeTestimonial(t.id)}
            >
              <div
                className="bg-[#f9fbf9] p-6 sm:p-7 rounded-3xl border border-emerald-100/70 hover:border-emerald-300 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col justify-between h-full"
              >
                <div className="space-y-4">
                  {/* Rating stars */}
                  <div className="flex items-center gap-1 text-amber-400">
                    {[...Array(t.rating || 5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>

                  {/* Comment */}
                  <p className="text-slate-700 text-sm leading-relaxed italic">
                    "{t.comment}"
                  </p>
                </div>

                {/* User Profile */}
                <div className="pt-5 mt-5 border-t border-emerald-100/70 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.avatar}
                      alt={t.name}
                      className="w-10 h-10 rounded-full object-cover border border-emerald-200"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-1">
                        {t.name}
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <div className="text-[11px] text-slate-500">{t.role}</div>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold bg-emerald-100/70 text-emerald-800 px-2 py-0.5 rounded">
                    Đã mua
                  </span>
                </div>
              </div>
            </EditableElement>
          ))}
        </div>

        {isVisualEditActive && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                const newRev = {
                  id: `rev-${Date.now()}`,
                  name: 'Khách hàng mới',
                  role: 'TP. Hồ Chí Minh',
                  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
                  rating: 5,
                  comment: 'Sản phẩm ngon và cung cấp năng lượng rất tốt!',
                  productName: 'Vhealth',
                  verified: true,
                };
                addTestimonial(newRev);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-[#008874] text-xs font-bold transition-colors cursor-pointer border border-emerald-300"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Đánh Giá Mới</span>
            </button>
          </div>
        )}
      </div>
    </section>
  );
};
