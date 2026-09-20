import React, { useState } from 'react';
import { X, Download, Upload, Copy, Check, AlertCircle, FileCode } from 'lucide-react';
import { useVisualEditor } from '../../context/VisualEditorContext';

interface JsonBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const JsonBackupModal: React.FC<JsonBackupModalProps> = ({ isOpen, onClose }) => {
  const { exportConfigJson, importConfigJson } = useVisualEditor();
  const [jsonText, setJsonText] = useState(() => exportConfigJson());
  const [copied, setCopied] = useState(false);
  const [importStatus, setImportStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonText], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tingo-landing-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportStatus(null);
    const success = importConfigJson(jsonText);
    if (success) {
      setImportStatus({
        type: 'success',
        message: 'Đã nhập dữ liệu cấu hình thành công! Trang sẽ cập nhật ngay lập tức.',
      });
      setTimeout(() => {
        onClose();
      }, 1500);
    } else {
      setImportStatus({
        type: 'error',
        message: 'Dữ liệu JSON không hợp lệ. Vui lòng kiểm tra lại cú pháp JSON.',
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div
        className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-cyan-100 text-cyan-800 flex items-center justify-center">
              <FileCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 font-display">
                Sao Lưu & Nhập Dữ Liệu JSON
              </h3>
              <p className="text-xs text-slate-500">
                Xuất file cấu hình để lưu trữ hoặc dán JSON vào để khôi phục
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Nội dung JSON Cấu Hình Landing
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Đã sao chép' : 'Sao chép'}</span>
              </button>

              <button
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-[#008874] text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải File .json</span>
              </button>
            </div>
          </div>

          <textarea
            rows={12}
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            className="w-full p-4 rounded-2xl border border-slate-300 font-mono text-xs text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#008874]"
          />

          {importStatus && (
            <div
              className={`p-3 rounded-xl flex items-center gap-2 text-xs ${
                importStatus.type === 'success'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-rose-50 border border-rose-200 text-rose-800'
              }`}
            >
              {importStatus.type === 'success' ? (
                <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              )}
              <span>{importStatus.message}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/80 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-full text-slate-600 hover:bg-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <button
            onClick={handleImport}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#008764] hover:bg-[#007052] text-white font-bold text-xs shadow-md shadow-emerald-900/15 cursor-pointer transition-all"
          >
            <Upload className="w-4 h-4" />
            <span>Áp Dụng & Nhập Dữ Liệu JSON</span>
          </button>
        </div>
      </div>
    </div>
  );
};
