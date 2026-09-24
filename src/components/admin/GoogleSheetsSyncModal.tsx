import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Database,
  ArrowRight,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import {
  signInWithGoogle,
  getGoogleAccessToken,
  getSavedSheetId,
  getSavedSheetUrl,
  createTingoSpreadsheet,
  bulkSyncOrdersToGoogleSheet,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
} from '../../lib/googleSheetsService';
import { Order } from '../../types';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  orders,
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [sheetUrl, setSheetUrl] = useState<string | null>(getSavedSheetUrl());
  const [sheetId, setSheetId] = useState<string | null>(getSavedSheetId());
  const [hasToken, setHasToken] = useState<boolean>(!!getGoogleAccessToken());
  const [autoSync, setAutoSync] = useState<boolean>(isAutoSyncEnabled());
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedSheetUrl());
      setSheetId(getSavedSheetId());
      setHasToken(!!getGoogleAccessToken());
      setAutoSync(isAutoSyncEnabled());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleGoogleLoginAndCreate = async () => {
    setIsConnecting(true);
    setSyncStatusMsg(null);
    try {
      const authRes = await signInWithGoogle();
      setHasToken(true);
      
      setIsCreating(true);
      setSyncStatusMsg({
        type: 'info',
        text: `Đã kết nối với ${authRes.user.email}. Đang khởi tạo bảng tính TINGO trên Google Sheets...`,
      });

      const sheetRes = await createTingoSpreadsheet(authRes.accessToken);
      setSheetId(sheetRes.id);
      setSheetUrl(sheetRes.url);

      // Auto bulk sync current orders
      if (orders && orders.length > 0) {
        setSyncStatusMsg({
          type: 'info',
          text: `Đang sao lưu ${orders.length} đơn hàng hiện tại sang Google Sheets...`,
        });
        const bulkRes = await bulkSyncOrdersToGoogleSheet(orders, authRes.accessToken);
        if (bulkRes.success) {
          setSyncStatusMsg({
            type: 'success',
            text: `Thành công! Đã tạo file Google Sheets và sao lưu ${bulkRes.count} đơn hàng an toàn.`,
          });
        }
      } else {
        setSyncStatusMsg({
          type: 'success',
          text: 'Thành công! File Google Sheets đã sẵn sàng để tự động nhận đơn hàng mới.',
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: err.message || 'Không thể kết nối với Google. Vui lòng thử lại.',
      });
    } finally {
      setIsConnecting(false);
      setIsCreating(false);
    }
  };

  const handleSyncAllOrders = async () => {
    if (!hasToken) {
      handleGoogleLoginAndCreate();
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await bulkSyncOrdersToGoogleSheet(orders);
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Đã đồng bộ thành công ${res.count} đơn hàng vào Google Sheets!`,
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'Đồng bộ thất bại, hãy thử kết nối lại tài khoản.',
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: err.message || 'Lỗi khi đồng bộ đơn hàng',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    setAutoSyncEnabled(nextVal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-[#008874] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Đồng Bộ Đơn Hàng Sang Google Sheets
              </h3>
              <p className="text-xs text-emerald-100">
                Sao lưu tự động 100% về tài khoản Gmail của bạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Status Alert Banner */}
          {syncStatusMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border ${
                syncStatusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
                  : syncStatusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-900 border-rose-300'
                  : 'bg-blue-50 text-blue-900 border-blue-300'
              }`}
            >
              {syncStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : syncStatusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <span className="font-medium leading-relaxed">{syncStatusMsg.text}</span>
            </div>
          )}

          {/* Current Sheet Status */}
          {sheetUrl ? (
            <div className="p-4 rounded-2xl bg-emerald-50/60 border-2 border-emerald-400 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Đã Kết Nối File Google Sheets Của Bạn
                </span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-bold">
                  Hoạt động
                </span>
              </div>

              <p className="text-xs text-slate-600">
                File <strong>TINGO Drink - Danh Sách Đơn Hàng & Khách Hàng</strong> đã được tạo trên Google Drive. Mọi đơn hàng mới sẽ tự động được ghi nhận theo thời gian thực.
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <a
                  href={sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Mở File Trên Google Sheets</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>

                <button
                  type="button"
                  onClick={handleSyncAllOrders}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Đang đồng bộ...' : `Sao lưu lại ${orders?.length || 0} đơn`}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-300 text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  Chưa Tạo File Google Sheets Trên Gmail
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Bấm nút bên dưới để cấp quyền tạo file bảng tính tự động. Hệ thống sẽ tự tạo sẵn các cột Đơn Hàng, Khách Hàng, Doanh Thu.
                </p>
              </div>

              <button
                type="button"
                onClick={handleGoogleLoginAndCreate}
                disabled={isConnecting || isCreating}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isConnecting || isCreating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang tạo file Google Sheets...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>Kết Nối Gmail & Tạo File Google Sheets Ngay</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Options & Settings */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Tự Động Ghi Đơn Mới Vào Google Sheets
                </span>
                <span className="text-[11px] text-slate-500">
                  Mỗi khi khách đặt đơn, 1 dòng mới sẽ lập tức được thêm vào bảng tính
                </span>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoSync}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
                  autoSync ? 'bg-[#008874]' : 'bg-slate-300'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${
                    autoSync ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Why Google Sheets backup is best */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5 text-[11px] text-slate-600">
            <div className="font-bold text-slate-800 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Lợi Ích Khi Dùng Google Sheets Dự Phòng:
            </div>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Mở điện thoại xem danh sách đơn hàng & khách hàng mọi lúc qua ứng dụng Google Sheets.</li>
              <li>Hoàn toàn miễn phí, không giới hạn số dòng đơn hàng, không lo hết quota.</li>
              <li>Dễ dàng xuất file Excel để gửi cho đơn vị giao hàng (GHTK, GHN, Viettel Post).</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Dữ liệu luôn được sao lưu đa tầng (Local + Telegram + Google Sheets)
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
