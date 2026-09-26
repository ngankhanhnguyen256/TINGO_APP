import React, { useState } from 'react';
import { BookOpen, Clock, Calendar, ArrowRight, User, X, Plus } from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';
import { HealthArticle } from '../types';

export const HealthBlogSection: React.FC = () => {
  const {
    config,
    updateArticle,
    removeArticle,
    addArticle,
    openTextEditor,
    openImagePicker,
    isVisualEditActive,
  } = useVisualEditor();

  const articles = config.articles;
  const [selectedArticle, setSelectedArticle] = useState<HealthArticle | null>(null);

  const handleEditArticle = (art: HealthArticle) => {
    openTextEditor(
      `Sửa bài viết: ${art.title}`,
      `${art.title} | ${art.category} | ${art.summary}`,
      (val) => {
        const [title, cat, sum] = val.split('|');
        updateArticle(art.id, {
          title: title?.trim() || art.title,
          category: cat?.trim() || art.category,
          summary: sum?.trim() || art.summary,
        });
      },
      true
    );
  };

  return (
    <section id="health" className="py-16 sm:py-20 bg-[#f8faf8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#008874] block mb-2">
            KIẾN THỨC & DINH DƯỠNG
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-[#0a2f24] font-display tracking-tight">
            Góc Sống Khoẻ TINGO
          </h2>
          <p className="text-slate-600 text-sm sm:text-base mt-3">
            Những chia sẻ chuyên sâu từ bác sĩ và chuyên gia dinh dưỡng về lối sống lành mạnh tự nhiên.
          </p>
        </div>

        {/* Articles Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
          {(articles || []).map((art) => (
            <EditableElement
              key={art.id}
              label={`Bài viết: ${art.title.slice(0, 15)}...`}
              onEdit={() => handleEditArticle(art)}
              onEditImage={() => {
                openImagePicker(
                  `Đổi ảnh bài viết: ${art.title}`,
                  (url) => updateArticle(art.id, { image: url }),
                  art.image
                );
              }}
              onDelete={() => removeArticle(art.id)}
            >
              <div
                onClick={() => setSelectedArticle(art)}
                className="bg-white rounded-3xl overflow-hidden border border-emerald-100 hover:border-emerald-300 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between cursor-pointer group h-full"
              >
                {/* Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={art.image}
                    alt={art.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 left-3 bg-[#008764] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-md">
                    {art.category}
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {art.date}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {art.readTime}
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-[#008764] transition-colors leading-snug line-clamp-2 font-display">
                      {art.title}
                    </h3>

                    <p className="text-slate-600 text-xs sm:text-sm line-clamp-3 leading-relaxed">
                      {art.summary}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#008764]">
                    <span>Đọc tiếp</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </EditableElement>
          ))}
        </div>

        {isVisualEditActive && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                const newArt = {
                  id: `art-${Date.now()}`,
                  title: 'Bí quyết dinh dưỡng sống lành mạnh mới nhất',
                  category: 'Dinh Dưỡng Sạch',
                  readTime: '4 phút đọc',
                  date: 'Hôm nay',
                  author: 'Chuyên gia dinh dưỡng TINGO',
                  summary: 'Khám phá bí quyết bổ sung năng lượng sạch và thanh lọc cơ thể mỗi ngày cùng TINGO Organic.',
                  content: 'Bài viết đang được cập nhật nội dung chi tiết...',
                  image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=800&q=80',
                };
                addArticle(newArt);
              }}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-emerald-100 hover:bg-emerald-200 text-[#008874] text-xs font-bold transition-colors cursor-pointer border border-emerald-300"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Bài Viết Kiến Thức Mới</span>
            </button>
          </div>
        )}

      </div>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl border border-emerald-100 relative">
            <button
              onClick={() => setSelectedArticle(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-[#008764] uppercase tracking-wider block mb-2">
              {selectedArticle.category}
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 font-display mb-4 leading-tight">
              {selectedArticle.title}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-500 pb-4 border-b border-slate-100 mb-6">
              <span className="font-semibold text-slate-800">{selectedArticle.author}</span>
              <span>•</span>
              <span>{selectedArticle.date}</span>
              <span>•</span>
              <span>{selectedArticle.readTime}</span>
            </div>

            <img
              src={selectedArticle.image}
              alt={selectedArticle.title}
              className="w-full h-64 object-cover rounded-2xl mb-6 shadow-sm"
              referrerPolicy="no-referrer"
            />

            <div className="prose prose-emerald max-w-none text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line space-y-4">
              {selectedArticle.content}
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">© TINGO Health & Wellness</span>
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-6 py-2.5 rounded-full bg-[#008764] text-white font-bold text-xs hover:bg-[#007052] transition-colors cursor-pointer"
              >
                Đóng bài viết
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
