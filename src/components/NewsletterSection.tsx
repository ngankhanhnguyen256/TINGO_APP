import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

interface NewsletterSectionProps {
  onSubscribe: (email: string) => void;
}

export const NewsletterSection: React.FC<NewsletterSectionProps> = ({ onSubscribe }) => {
  const { config, updateNewsletter, openTextEditor } = useVisualEditor();
  const newsletter = config.newsletter;

  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;
    onSubscribe(email);
    setSubmitted(true);
    setTimeout(() => {
      setEmail('');
      setSubmitted(false);
    }, 4000);
  };

  return (
    <section className="bg-white py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Emerald Banner (Screenshot 5) */}
        <EditableElement
          label="Banner Đăng Ký Bản Tin"
          onEdit={() =>
            openTextEditor(
              'Sửa nội dung bản tin (Tiêu đề | Mô tả | Mã giảm giá)',
              `${newsletter.title} | ${newsletter.desc} | ${newsletter.discountCode}`,
              (val) => {
                const [t, d, c] = val.split('|');
                updateNewsletter({
                  title: t?.trim() || newsletter.title,
                  desc: d?.trim() || newsletter.desc,
                  discountCode: c?.trim() || newsletter.discountCode,
                });
              }
            )
          }
        >
          <div className="bg-gradient-to-r from-[#008764] via-[#008f6b] to-[#047558] rounded-3xl p-8 sm:p-12 text-white shadow-xl relative overflow-hidden">
            
            {/* Subtle light accents */}
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center relative z-10">
              
              {/* Left Column (Screenshot 5) */}
              <div className="lg:col-span-7 space-y-2">
                <h3 className="text-2xl sm:text-3xl md:text-4xl font-black font-display tracking-tight leading-tight">
                  {newsletter.title}
                </h3>
                <p className="text-emerald-100 text-sm sm:text-base font-normal">
                  {newsletter.desc}
                </p>
              </div>

              {/* Right Column: Input & Submit (Screenshot 5) */}
              <div className="lg:col-span-5">
                {submitted ? (
                  <div className="bg-white/20 backdrop-blur-md rounded-full px-6 py-3.5 flex items-center justify-center gap-2 text-white font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>Mã ưu đãi {newsletter.discountCode} đã được lưu cho bạn!</span>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className="bg-white rounded-full p-1.5 sm:p-2 flex items-center shadow-lg border border-white/40"
                  >
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={newsletter.placeholder || 'Email của bạn...'}
                      className="flex-1 bg-transparent px-4 sm:px-5 py-2.5 text-sm sm:text-base text-slate-800 placeholder-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      id="newsletter-submit-btn"
                      className="inline-flex items-center justify-center gap-1.5 px-5 sm:px-7 py-2.5 sm:py-3 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-sm sm:text-base shadow-sm hover:shadow-md transition-all cursor-pointer whitespace-nowrap"
                    >
                      <span>{newsletter.btnText || 'Đăng Ký'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}
              </div>

            </div>

          </div>
        </EditableElement>

      </div>
    </section>
  );
};
