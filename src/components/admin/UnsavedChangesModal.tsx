import React from 'react';
import { AlertCircle, Save, RotateCcw, X, ShieldAlert } from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';

export const UnsavedChangesModal: React.FC = () => {
  const {
    unsavedConfirmModalOpen,
    setUnsavedConfirmModalOpen,
    confirmExitVisualEdit,
  } = useVisualEditor();

  if (!unsavedConfirmModalOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl border border-amber-200 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header with warning badge */}
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/60 border-b border-amber-100 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 font-display">
                Bạn có thay đổi chưa lưu!
              </h3>
              <p className="text-xs text-amber-800 font-medium mt-0.5">
                Chế độ Visual Edit đang chuẩn bị tắt
              </p>
            </div>
          </div>
          <button
            onClick={() => setUnsavedConfirmModalOpen(false)}
            className="w-8 h-8 rounded-full hover:bg-slate-200/80 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Bạn đã thực hiện một số chỉnh sửa nội dung hoặc sản phẩm trên trang. Bạn có muốn <strong>lưu lại vào bộ nhớ và đồng bộ đám mây</strong> trước khi thoát không?
          </p>

          <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200/80 flex items-center gap-2.5 text-xs text-amber-900">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Nếu không lưu, các thay đổi vừa chỉnh sửa sẽ bị hoàn tác về trạng thái trước đó.
            </span>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2.5">
            {/* Save & Exit */}
            <button
              onClick={() => confirmExitVisualEdit(true)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 hover:shadow-lg transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Lưu Thay Đổi & Tắt Visual</span>
            </button>

            {/* Discard & Exit */}
            <button
              onClick={() => confirmExitVisualEdit(false)}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 font-semibold text-xs border border-slate-200 hover:border-rose-200 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-rose-500" />
              <span>Hủy thay đổi & Tắt (Không lưu)</span>
            </button>

            {/* Cancel / Keep Editing */}
            <button
              onClick={() => setUnsavedConfirmModalOpen(false)}
              className="w-full py-2 text-center text-xs font-medium text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
            >
              Tiếp tục chỉnh sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
