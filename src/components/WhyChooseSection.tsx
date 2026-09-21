import React, { useState } from 'react';
import {
  Zap,
  Sprout,
  Sun,
  Truck,
  Heart,
  Shield,
  Sparkles,
  Award,
  ArrowRight,
  Plus,
} from 'lucide-react';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';
import { WhyChooseEditorModal } from './admin/WhyChooseEditorModal';
import { WhyChooseItem } from '../types';

interface WhyChooseSectionProps {
  onLearnMore?: (topicId: string) => void;
}

export const WhyChooseSection: React.FC<WhyChooseSectionProps> = ({ onLearnMore }) => {
  const {
    config,
    updateWhyChoose,
    updateWhyChooseItem,
    removeWhyChooseItem,
    addWhyChooseItem,
    openTextEditor,
    isVisualEditActive,
  } = useVisualEditor();

  const whyChoose = config.whyChoose;

  const [editingItem, setEditingItem] = useState<WhyChooseItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Map icon types to Lucide components
  const renderIcon = (type: string) => {
    switch (type) {
      case 'zap':
        return <Zap className="w-6 h-6 text-emerald-600" />;
      case 'sprout':
        return <Sprout className="w-6 h-6 text-cyan-600" />;
      case 'sun':
        return <Sun className="w-6 h-6 text-lime-600" />;
      case 'truck':
        return <Truck className="w-6 h-6 text-sky-600" />;
      case 'heart':
        return <Heart className="w-6 h-6 text-rose-600" />;
      case 'shield':
        return <Shield className="w-6 h-6 text-indigo-600" />;
      case 'award':
        return <Award className="w-6 h-6 text-amber-600" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-6 h-6 text-emerald-600" />;
    }
  };

  const getSchemeClasses = (scheme: string) => {
    switch (scheme) {
      case 'emerald':
        return {
          iconBg: 'bg-emerald-100 text-emerald-700',
          badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          hoverBorder: 'hover:border-emerald-400',
        };
      case 'cyan':
        return {
          iconBg: 'bg-cyan-100 text-cyan-700',
          badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          hoverBorder: 'hover:border-cyan-400',
        };
      case 'lime':
        return {
          iconBg: 'bg-lime-100 text-lime-700',
          badgeBg: 'bg-lime-50 text-lime-800 border-lime-200',
          hoverBorder: 'hover:border-lime-400',
        };
      case 'sky':
        return {
          iconBg: 'bg-sky-100 text-sky-700',
          badgeBg: 'bg-sky-50 text-sky-800 border-sky-200',
          hoverBorder: 'hover:border-sky-400',
        };
      case 'rose':
        return {
          iconBg: 'bg-rose-100 text-rose-700',
          badgeBg: 'bg-rose-50 text-rose-800 border-rose-200',
          hoverBorder: 'hover:border-rose-400',
        };
      case 'amber':
      default:
        return {
          iconBg: 'bg-amber-100 text-amber-700',
          badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
          hoverBorder: 'hover:border-amber-400',
        };
    }
  };

  const handleEditCard = (item: WhyChooseItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleSaveCard = (savedItem: WhyChooseItem) => {
    if (editingItem) {
      updateWhyChooseItem(savedItem.id, savedItem);
    } else {
      addWhyChooseItem(savedItem);
    }
    setEditingItem(null);
  };

  return (
    <section id="why-tingo" className="py-14 sm:py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-14 space-y-2">
          <EditableElement
            label="Tiêu đề Vì Sao Chọn TINGO"
            onEdit={() =>
              openTextEditor(
                'Sửa tiêu đề phần Vì sao chọn TINGO',
                `${whyChoose.subtitle} | ${whyChoose.titleLine1} | ${whyChoose.titleLine2}`,
                (val) => {
                  const [sub, l1, l2] = val.split('|');
                  updateWhyChoose({
                    subtitle: sub?.trim() || whyChoose.subtitle,
                    titleLine1: l1?.trim() || whyChoose.titleLine1,
                    titleLine2: l2?.trim() || whyChoose.titleLine2,
                  });
                }
              )
            }
          >
            <div>
              <span className="text-xs sm:text-sm font-bold uppercase tracking-widest text-[#008874]">
                {whyChoose.subtitle}
              </span>
              <h2 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 font-display tracking-tight mt-1">
                {whyChoose.titleLine1}{' '}
                <span className="text-[#008874]">{whyChoose.titleLine2}</span>
              </h2>
            </div>
          </EditableElement>
        </div>

        {/* 4 Feature Cards (Screenshot 2 exact layout & phone optimized) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-6 lg:gap-8">
          {whyChoose.items.map((item) => {
            const scheme = getSchemeClasses(item.colorScheme);

            return (
              <EditableElement
                key={item.id}
                label={`Ô: ${item.title}`}
                onEdit={() => handleEditCard(item)}
                onDelete={() => removeWhyChooseItem(item.id)}
              >
                <div
                  className={`h-full rounded-2xl sm:rounded-3xl p-5 sm:p-7 md:p-8 bg-[#fbfdfc] border border-slate-200/90 ${scheme.hoverBorder} hover:shadow-xl hover:shadow-emerald-950/5 transition-all duration-300 flex flex-col justify-between group`}
                >
                  <div className="space-y-3 sm:space-y-4">
                    {/* Top Row: Icon and Highlight Badge */}
                    <div className="flex items-center justify-between gap-3">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl ${scheme.iconBg} flex items-center justify-center shrink-0 shadow-xs transition-transform group-hover:scale-110`}>
                        {renderIcon(item.iconType)}
                      </div>

                      {item.highlight && (
                        <span className={`text-[10px] sm:text-[11px] font-bold px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full border ${scheme.badgeBg}`}>
                          {item.highlight}
                        </span>
                      )}
                    </div>

                    {/* Card Title */}
                    <h3 className="text-base sm:text-2xl font-bold text-slate-900 font-display group-hover:text-[#008764] transition-colors leading-snug">
                      {item.title}
                    </h3>

                    {/* Description */}
                    <p className="text-slate-600 text-xs sm:text-base leading-relaxed font-normal">
                      {item.description}
                    </p>
                  </div>

                  {/* Read More Trigger */}
                  <div className="pt-3 sm:pt-4 mt-3 sm:mt-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-[#008764]">
                    <span className="flex items-center gap-1 group-hover:gap-2 transition-all">
                      <span>Tìm hiểu thêm</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </EditableElement>
            );
          })}
        </div>

        {/* Add Card Quick Button in Visual Edit Mode */}
        {isVisualEditActive && (
          <div className="mt-8 text-center">
            <button
              onClick={() => {
                setEditingItem(null);
                setIsModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-emerald-100 hover:bg-emerald-200 text-[#008874] font-bold text-xs transition-colors cursor-pointer border border-emerald-300"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Ô "Vì Sao Chọn TINGO" Mới</span>
            </button>
          </div>
        )}

      </div>

      {/* Modal for editing Why Choose Item */}
      <WhyChooseEditorModal
        isOpen={isModalOpen}
        item={editingItem || undefined}
        onClose={() => {
          setIsModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveCard}
      />
    </section>
  );
};
