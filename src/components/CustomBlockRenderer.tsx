import React, { useState } from 'react';
import {
  ChevronDown,
  Sparkles,
  ArrowRight,
  Megaphone,
  HelpCircle,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { CustomLandingBlock } from '../types';
import { useVisualEditor } from '../context/VisualEditorContext';
import { EditableElement } from './admin/EditableElement';

interface CustomBlockRendererProps {
  block: CustomLandingBlock;
  index: number;
  totalBlocks: number;
}

export const CustomBlockRenderer: React.FC<CustomBlockRendererProps> = ({
  block,
  index,
  totalBlocks,
}) => {
  const {
    removeCustomBlock,
    reorderCustomBlock,
    openTextEditor,
    openImagePicker,
    updateCustomBlock,
  } = useVisualEditor();

  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);

  const toggleFaq = (id: string) => {
    setExpandedFaq(expandedFaq === id ? null : id);
  };

  const renderContent = () => {
    switch (block.type) {
      case 'promo_banner':
        return (
          <div className="relative rounded-3xl p-6 sm:p-10 bg-gradient-to-r from-[#008764] via-[#007455] to-[#0a3829] text-white overflow-hidden shadow-xl">
            <div className="absolute -right-10 -bottom-10 w-60 h-60 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="space-y-2 text-center md:text-left">
                {block.badge && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/60 border border-emerald-400/40 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    {block.badge}
                  </span>
                )}
                <h3 className="text-2xl sm:text-3xl font-black font-display tracking-tight">
                  {block.title}
                </h3>
                {block.subtitle && (
                  <p className="text-emerald-100 text-sm sm:text-base max-w-2xl font-normal">
                    {block.subtitle}
                  </p>
                )}
              </div>

              {block.buttonText && (
                <a
                  href={block.buttonLink || '#products'}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white hover:bg-emerald-50 text-[#008764] font-bold text-sm shadow-md transition-all shrink-0 hover:scale-105"
                >
                  <span>{block.buttonText}</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        );

      case 'image_showcase':
      default:
        return (
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-emerald-100 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {block.image && (
              <div className="rounded-2xl overflow-hidden shadow-md">
                <img
                  src={block.image}
                  alt={block.title}
                  className="w-full h-64 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
            <div className="space-y-4">
              {block.badge && (
                <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase">
                  {block.badge}
                </span>
              )}
              <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-display">
                {block.title}
              </h3>
              {block.subtitle && (
                <p className="text-slate-600 text-sm leading-relaxed">{block.subtitle}</p>
              )}
            </div>
          </div>
        );
    }
  };

  return (
    <section className="py-8 bg-transparent">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <EditableElement
          label={`Khối: ${block.type}`}
          onEdit={() => {
            openTextEditor('Sửa tiêu đề khối', block.title, (newTitle) => {
              updateCustomBlock(block.id, { title: newTitle });
            });
          }}
          onEditImage={
            block.image !== undefined
              ? () => {
                  openImagePicker(
                    'Đổi ảnh khối',
                    (url) => updateCustomBlock(block.id, { image: url }),
                    block.image
                  );
                }
              : undefined
          }
          onDelete={() => removeCustomBlock(block.id)}
          onMoveUp={index > 0 ? () => reorderCustomBlock(block.id, 'up') : undefined}
          onMoveDown={
            index < totalBlocks - 1 ? () => reorderCustomBlock(block.id, 'down') : undefined
          }
        >
          {renderContent()}
        </EditableElement>
      </div>
    </section>
  );
};
