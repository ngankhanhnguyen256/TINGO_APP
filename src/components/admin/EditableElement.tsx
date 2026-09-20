import React from 'react';
import { Edit3, Trash2, Image, Plus, ArrowUp, ArrowDown } from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';

interface EditableElementProps {
  children: React.ReactNode;
  label?: string;
  onEdit?: () => void;
  onEditImage?: () => void;
  onDelete?: () => void;
  onAdd?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  className?: string;
  badgePosition?: 'top-left' | 'top-right' | 'bottom-right';
}

export const EditableElement: React.FC<EditableElementProps> = ({
  children,
  label = 'Chỉnh sửa',
  onEdit,
  onEditImage,
  onDelete,
  onAdd,
  onMoveUp,
  onMoveDown,
  className = '',
  badgePosition = 'top-right',
}) => {
  const { isVisualEditActive } = useVisualEditor();

  if (!isVisualEditActive) {
    return <>{children}</>;
  }

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
  }[badgePosition];

  return (
    <div
      className={`relative group/editable border-2 border-dashed border-emerald-400/70 hover:border-emerald-500 rounded-2xl p-1 transition-all duration-200 bg-emerald-50/15 hover:bg-emerald-50/30 ${className}`}
    >
      {/* Floating Action Controls on Hover */}
      <div
        className={`absolute ${positionClasses} z-30 flex items-center gap-1.5 opacity-90 group-hover/editable:opacity-100 bg-slate-900/90 backdrop-blur-md px-2 py-1 rounded-xl shadow-xl text-white text-xs font-semibold select-none transition-all scale-95 group-hover/editable:scale-100`}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-[10px] text-emerald-300 font-mono hidden sm:inline-block">
          {label}
        </span>

        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            title="Chỉnh sửa nội dung"
            className="p-1.5 hover:bg-emerald-600 rounded-md transition-colors text-white cursor-pointer flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span className="text-[10px]">Sửa</span>
          </button>
        )}

        {onEditImage && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEditImage();
            }}
            title="Thay đổi ảnh (Tải lên từ thiết bị hoặc dán URL)"
            className="p-1.5 hover:bg-cyan-600 rounded-md transition-colors text-cyan-200 cursor-pointer flex items-center gap-1"
          >
            <Image className="w-3.5 h-3.5" />
            <span className="text-[10px]">Ảnh</span>
          </button>
        )}

        {onMoveUp && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveUp();
            }}
            title="Di chuyển lên"
            className="p-1.5 hover:bg-slate-700 rounded-md transition-colors text-slate-300 cursor-pointer"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        )}

        {onMoveDown && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMoveDown();
            }}
            title="Di chuyển xuống"
            className="p-1.5 hover:bg-slate-700 rounded-md transition-colors text-slate-300 cursor-pointer"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        )}

        {onAdd && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAdd();
            }}
            title="Thêm mục mới"
            className="p-1.5 hover:bg-emerald-600 rounded-md transition-colors text-emerald-300 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            title="Xóa mục này khỏi giao diện (Có thể Hoàn tác bằng Ctrl+Z)"
            className="p-1.5 hover:bg-rose-600 rounded-md transition-colors text-rose-300 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {children}
    </div>
  );
};
