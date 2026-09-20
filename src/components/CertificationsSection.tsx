import React from 'react';
import { ShieldCheck, Award, Leaf, Truck, HeartHandshake, Sparkles, Heart } from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

export const CertificationsSection: React.FC = () => {
  const { config, updateCertification, removeCertification, openTextEditor } = useVisualEditor();
  const certs = config.certifications;

  const getIcon = (iconName: string, index: number) => {
    switch (iconName) {
      case 'award':
        return <Award className="w-6 h-6 text-emerald-600" />;
      case 'shield':
        return <ShieldCheck className="w-6 h-6 text-[#0284c7]" />;
      case 'sprout':
        return <Leaf className="w-6 h-6 text-emerald-600" />;
      case 'heart':
        return <Heart className="w-6 h-6 text-rose-600" />;
      default:
        return index % 2 === 0 ? (
          <Award className="w-6 h-6 text-emerald-600" />
        ) : (
          <ShieldCheck className="w-6 h-6 text-cyan-600" />
        );
    }
  };

  return (
    <section className="py-10 bg-[#f3f9f5] border-y border-emerald-100/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {certs.map((c, i) => (
            <EditableElement
              key={c.id || i}
              label={`Chứng nhận: ${c.title}`}
              onEdit={() => {
                openTextEditor(
                  'Sửa thông tin chứng nhận / cam kết',
                  `${c.title} | ${c.desc}`,
                  (val) => {
                    const [t, d] = val.split('|');
                    updateCertification(c.id, {
                      title: t?.trim() || c.title,
                      desc: d?.trim() || c.desc,
                    });
                  }
                );
              }}
              onDelete={() => removeCertification(c.id)}
            >
              <div className="flex items-center gap-4 bg-white/90 backdrop-blur-xs p-4 sm:p-5 rounded-2xl border border-emerald-100 shadow-xs hover:shadow-md transition-shadow h-full">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  {getIcon(c.icon, i)}
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug">
                    {c.title}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">{c.desc}</p>
                </div>
              </div>
            </EditableElement>
          ))}
        </div>
      </div>
    </section>
  );
};
