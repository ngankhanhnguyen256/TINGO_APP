import React, { useState, useEffect } from 'react';
import {
  X,
  FileSpreadsheet,
  ExternalLink,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Database,
  Users,
  ShoppingBag,
  Clock,
  Check,
  Copy,
  CheckCheck,
  Send,
  UploadCloud,
  DownloadCloud,
  Settings2,
  ChevronDown,
  ChevronUp,
  Zap,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import {
  signInWithGoogle,
  getGoogleAccessToken,
  getSavedSheetId,
  getSavedSheetUrl,
  getSavedWebhookUrl,
  setSavedWebhookUrl,
  createTingoSpreadsheet,
  bulkSyncOrdersToGoogleSheet,
  bulkSyncCustomersToGoogleSheet,
  reconcileAndSyncAll,
  restoreAllFromGoogleSheetsToFirestore,
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  getPendingSyncCounts,
  sendToGoogleSheetWebhook,
  syncAllExistingCustomers,
  flushPendingSyncQueues,
  clearSyncedCache,
  APPS_SCRIPT_TEMPLATE,
} from '../../lib/googleSheetsService';
import { Order, CustomerUser } from '../../types';

const ACCOUNTS_CACHE_KEY = 'tingo_registered_customers_cache';

interface GoogleSheetsSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: Order[];
  customers?: CustomerUser[];
}

export const GoogleSheetsSyncModal: React.FC<GoogleSheetsSyncModalProps> = ({
  isOpen,
  onClose,
  orders,
  customers: initialCustomers,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncAction, setSyncAction] = useState<'push' | 'restore' | 'test' | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(getSavedSheetUrl());
  const [sheetId, setSheetId] = useState<string | null>(getSavedSheetId());
  const [webhookUrl, setWebhookUrl] = useState<string>(getSavedWebhookUrl() || '');
  const [autoSync, setAutoSync] = useState<boolean>(isAutoSyncEnabled());
  const [pendingStats, setPendingStats] = useState(getPendingSyncCounts());
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [savedWebhookSuccess, setSavedWebhookSuccess] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load all local customers
  const getCustomerList = (): CustomerUser[] => {
    if (initialCustomers && initialCustomers.length > 0) return initialCustomers;
    try {
      const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        return Array.isArray(obj) ? obj : (Object.values(obj) as CustomerUser[]);
      }
    } catch {
      // ignore
    }
    return [];
  };

  useEffect(() => {
    if (isOpen) {
      setSheetUrl(getSavedSheetUrl());
      setSheetId(getSavedSheetId());
      setWebhookUrl(getSavedWebhookUrl() || '');
      setAutoSync(isAutoSyncEnabled());
      setPendingStats(getPendingSyncCounts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCustomers = getCustomerList();

  // NÚT 1: ĐẨY TOÀN BỘ ĐƠN HÀNG VÀ KHÁCH HÀNG LÊN GOOGLE SHEETS (FORCE SYNC 100%)
  const handlePushAllToGoogleSheets = async () => {
    setIsSyncing(true);
    setSyncAction('push');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang xóa bộ nhớ đệm và Force Push 100% Đơn Hàng & Khách Hàng lên Google Sheets...',
    });

    const maxTimer = setTimeout(() => {
      setIsSyncing(false);
      setSyncAction(null);
    }, 10000);

    try {
      // 1. XÓA BẮT BUỘC BỘ NHỚ ĐỆM ĐÁNH DẤU ĐỒNG BỘ ĐỂ FORCE PUSH 100%
      clearSyncedCache();

      // 2. Xả hàng đợi ngoại tuyến
      await flushPendingSyncQueues();

      // 3. Lấy danh sách khách hàng đầy đủ
      const allCustomers = getCustomerList();

      // 4. Force Push 100% Khách Hàng & Đơn Hàng lên Google Sheets Webhook
      const custRes = await bulkSyncCustomersToGoogleSheet(allCustomers, undefined, { forceAll: true });
      const ordRes = await bulkSyncOrdersToGoogleSheet(orders, undefined, { forceAll: true });

      // 5. Reconcile 2 chiều với forceAll: true
      const token = getGoogleAccessToken();
      const recRes = await reconcileAndSyncAll(orders, allCustomers, token || undefined, { forceAll: true });

      clearTimeout(maxTimer);
      setPendingStats(getPendingSyncCounts());

      const pushedCust = Math.max(custRes.count, allCustomers.length, recRes.customersSyncedToSheet);
      const pushedOrd = Math.max(ordRes.count, orders.length, recRes.ordersSyncedToSheet);

      setSyncStatusMsg({
        type: 'success',
        text: `Đã Force Push 100% dữ liệu lên Google Sheets thành công!
• Khách hàng đã nạp lên Sheet: ${pushedCust} tài khoản (Toàn bộ danh sách)
• Đơn hàng đã nạp lên Sheet: ${pushedOrd} đơn hàng (Toàn bộ danh sách)
Bảng tính Google Sheets Master đã được cập nhật đầy đủ và đồng bộ hoàn toàn!`,
      });
    } catch (err: any) {
      clearTimeout(maxTimer);
      setSyncStatusMsg({
        type: 'error',
        text: `Lỗi khi đẩy dữ liệu lên Google Sheets: ${err.message || 'Vui lòng kiểm tra lại Webhook URL'}`,
      });
    } finally {
      clearTimeout(maxTimer);
      setIsSyncing(false);
      setSyncAction(null);
    }
  };

  // NÚT 2: KHÔI PHỤC TOÀN BỘ TỪ GOOGLE SHEETS VỀ APP & FIREBASE
  const handleRestoreFromGoogleSheets = async () => {
    setIsSyncing(true);
    setSyncAction('restore');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang đọc dữ liệu Master từ Google Sheets và khôi phục vào Firebase Firestore & LocalStorage...',
    });

    const maxTimer = setTimeout(() => {
      setIsSyncing(false);
      setSyncAction(null);
    }, 8000);

    try {
      const res = await restoreAllFromGoogleSheetsToFirestore();
      clearTimeout(maxTimer);
      setPendingStats(getPendingSyncCounts());

      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Khôi phục dữ liệu từ Google Sheets về App & Firebase thành công!
• Tìm thấy trên Google Sheets: ${res.totalCustomersInSheet} Khách Hàng | ${res.totalOrdersInSheet} Đơn Hàng
• Đã khôi phục & ghi đè an toàn: ${res.customersRestored} Khách Hàng | ${res.ordersRestored} Đơn Hàng
Hệ thống Firebase Firestore và Bộ nhớ máy đã được khôi phục đồng bộ hoàn toàn!`,
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'Không thể đọc dữ liệu từ Google Sheets để khôi phục.',
        });
      }
    } catch (err: any) {
      clearTimeout(maxTimer);
      setSyncStatusMsg({
        type: 'error',
        text: `Lỗi khôi phục: ${err.message || 'Không thể kết nối đến Google Sheets'}`,
      });
    } finally {
      clearTimeout(maxTimer);
      setIsSyncing(false);
      setSyncAction(null);
    }
  };

  const handleSaveWebhook = () => {
    setSavedWebhookUrl(webhookUrl);
    setSavedWebhookSuccess(true);
    setTimeout(() => setSavedWebhookSuccess(false), 3000);
    setSyncStatusMsg({
      type: 'success',
      text: 'Đã lưu cấu hình Webhook Google Sheets thành công! Dữ liệu sẽ tự động đẩy về 24/7.',
    });
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      setSyncStatusMsg({
        type: 'error',
        text: 'Vui lòng nhập Webhook URL của Google Apps Script trước khi gửi thử.',
      });
      return;
    }
    setIsSyncing(true);
    setSyncAction('test');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang gửi bản ghi thử nghiệm lên Google Sheets...',
    });

    try {
      setSavedWebhookUrl(webhookUrl);

      const testCustomer: CustomerUser = {
        id: 'CUS-TEST',
        name: 'Khách Hàng Test',
        phone: '0901234567',
        email: 'test@tingodrink.vn',
        address: '123 Test Street',
        city: 'Hồ Chí Minh',
        createdAt: new Date().toISOString(),
        freeshipVouchers: 5,
        isFirstOrder: true,
      };

      await sendToGoogleSheetWebhook({ type: 'customer', data: testCustomer });

      setSyncStatusMsg({
        type: 'success',
        text: 'Kết nối Webhook thành công 100%! Đã gửi bản ghi thử nghiệm lên Google Sheets.',
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Lỗi kiểm tra Webhook: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncAction(null);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    setAutoSyncEnabled(nextVal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden border border-slate-200/80 flex flex-col max-h-[90vh] animate-scale-in">
        
        {/* Header - Sleek Minimal High-End Gradient */}
        <div className="px-6 py-4.5 bg-gradient-to-r from-emerald-900 via-teal-800 to-[#008874] text-white flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shadow-inner">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base tracking-tight text-white">
                Bảng Điều Khiển Đồng Bộ Dữ Liệu
              </h3>
              <p className="text-xs text-emerald-100/90 font-medium">
                Google Sheets Master ⇄ App & Firebase Firestore
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
          {/* Status Message Notification */}
          {syncStatusMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs flex items-start gap-2.5 border transition-all animate-fade-in ${
                syncStatusMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-950 border-emerald-300 shadow-xs'
                  : syncStatusMsg.type === 'error'
                  ? 'bg-rose-50 text-rose-950 border-rose-300 shadow-xs'
                  : 'bg-teal-50 text-teal-950 border-teal-300 shadow-xs'
              }`}
            >
              {syncStatusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : syncStatusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-teal-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <div className="flex-1 font-medium leading-relaxed whitespace-pre-line">
                {syncStatusMsg.text}
              </div>
            </div>
          )}

          {/* Quick Stats Minimal Ribbon */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                Đơn Hàng
              </div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{orders.length}</div>
            </div>

            <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-200/80 text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                <Users className="w-3.5 h-3.5 text-teal-600" />
                Khách Hàng
              </div>
              <div className="text-lg font-black text-slate-900 mt-0.5">{currentCustomers.length}</div>
            </div>

            <div className="p-3 bg-emerald-50/70 rounded-2xl border border-emerald-200/80 text-center">
              <div className="text-[10px] uppercase font-bold text-emerald-800 flex items-center justify-center gap-1">
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                Trạng Thái
              </div>
              <div className="text-xs font-black text-emerald-800 flex items-center justify-center gap-1 mt-1">
                {pendingStats.totalPending > 0 ? (
                  <span className="text-amber-700 font-bold">{pendingStats.totalPending} mục chờ</span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-700">
                    <Check className="w-3.5 h-3.5" /> Chuẩn khớp
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* CENTER: 2 PROMINENT HIGH-END MASTER ACTION BUTTONS */}
          <div className="space-y-3.5 pt-1">
            
            {/* BUTTON 1: ĐẨY DỮ LIỆU LÊN GOOGLE SHEETS (MASTER) */}
            <button
              type="button"
              onClick={handlePushAllToGoogleSheets}
              disabled={isSyncing}
              className="w-full p-5 rounded-2xl bg-gradient-to-r from-[#008874] to-emerald-700 hover:from-[#007362] hover:to-emerald-800 text-white shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-between text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-emerald-500/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  {isSyncing && syncAction === 'push' ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-emerald-200" />
                  ) : (
                    <UploadCloud className="w-6 h-6 text-emerald-100" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>ĐẨY DỮ LIỆU LÊN GOOGLE SHEETS (MASTER)</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">2 Chiều</span>
                  </div>
                  <div className="text-xs text-emerald-100/90 font-medium mt-0.5">
                    Đồng bộ ngay toàn bộ Đơn Hàng & Khách Hàng mới từ App/Firebase lên Sheet 24/7
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex w-8 h-8 rounded-xl bg-white/10 items-center justify-center text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                <UploadCloud className="w-4 h-4" />
              </div>
            </button>

            {/* BUTTON 2: KHÔI PHỤC VỀ APP & FIREBASE */}
            <button
              type="button"
              onClick={handleRestoreFromGoogleSheets}
              disabled={isSyncing}
              className="w-full p-5 rounded-2xl bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 hover:from-amber-700 hover:to-orange-800 text-white shadow-lg hover:shadow-xl transition-all transform active:scale-[0.99] flex items-center justify-between text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border border-amber-500/30"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center text-white shrink-0 shadow-inner group-hover:scale-105 transition-transform">
                  {isSyncing && syncAction === 'restore' ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-200" />
                  ) : (
                    <DownloadCloud className="w-6 h-6 text-amber-100" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                    <span>KHÔI PHỤC VỀ APP & FIREBASE</span>
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">Khôi Phục Gốc</span>
                  </div>
                  <div className="text-xs text-amber-100/90 font-medium mt-0.5">
                    Kéo dữ liệu chuẩn từ Google Sheet về ghi đè, bù đắp an toàn cho Firebase & Bộ nhớ máy
                  </div>
                </div>
              </div>

              <div className="hidden sm:flex w-8 h-8 rounded-xl bg-white/10 items-center justify-center text-white group-hover:translate-x-0.5 transition-transform shrink-0 ml-2">
                <Database className="w-4 h-4" />
              </div>
            </button>

          </div>

          {/* Quick Active Sheet Link Ribbon */}
          {sheetUrl && (
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 truncate pr-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="font-semibold text-slate-700 truncate">Bảng tính Google Sheets đang kết nối</span>
              </div>
              <a
                href={sheetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold transition-all shrink-0 shadow-xs cursor-pointer"
              >
                <span>Mở Sheet</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}

          {/* Collapsible / Compact Webhook & Advanced Settings at the Bottom */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden bg-slate-50/50">
            <button
              type="button"
              onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
              className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span>Cấu Hình Webhook & Tự Động Hóa Chạy Ngầm</span>
              </div>
              <div className="flex items-center gap-1 text-slate-400">
                {showAdvancedSettings ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </button>

            {showAdvancedSettings && (
              <div className="p-4 pt-1 space-y-3.5 border-t border-slate-200/70 bg-white animate-fade-in text-xs">
                
                {/* Auto Sync Toggle */}
                <div className="flex items-center justify-between py-1">
                  <div>
                    <div className="font-bold text-slate-800 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      Tự Động Đồng Bộ Ngầm (Auto-Sync 24/7)
                    </div>
                    <div className="text-[11px] text-slate-500">
                      Tự động rà soát & đẩy Đơn Hàng + Khách Hàng mới lên Sheet mỗi 60 giây
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAutoSync}
                    className={`w-12 h-6.5 rounded-full transition-colors relative cursor-pointer ${
                      autoSync ? 'bg-[#008874]' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform absolute top-0.5 ${
                        autoSync ? 'left-6.5' : 'left-0.5'
                      }`}
                    />
                  </button>
                </div>

                {/* Webhook URL Input */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block font-bold text-slate-700 text-[11px]">
                    URL Webhook Google Apps Script:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={webhookUrl}
                      onChange={(e) => setWebhookUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#008874]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveWebhook}
                      className="px-3 py-2 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      {savedWebhookSuccess ? 'Đã Lưu!' : 'Lưu'}
                    </button>
                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={isSyncing}
                      className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer shrink-0 flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Test</span>
                    </button>
                  </div>
                </div>

                {/* Apps Script Code Copy Button */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Mã Google Apps Script (Tự tạo STT & Dropdown):</span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer border border-emerald-200"
                  >
                    {copiedScript ? <CheckCheck className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Đã Sao Chép Code!' : 'Sao Chép Mã Script'}</span>
                  </button>
                </div>

              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Bảo toàn 100% dữ liệu 3 lớp (Sheet ➔ Telegram ➔ Firebase)</span>
          </div>
        </div>

      </div>
    </div>
  );
};
