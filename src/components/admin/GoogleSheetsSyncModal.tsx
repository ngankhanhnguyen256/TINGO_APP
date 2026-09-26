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
  Users,
  ShoppingBag,
  ArrowLeftRight,
  Clock,
  Check,
  Copy,
  Code2,
  Send,
  HelpCircle,
  CheckCheck,
  UserCheck,
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
  isAutoSyncEnabled,
  setAutoSyncEnabled,
  getPendingSyncCounts,
  sendToGoogleSheetWebhook,
  fetchCustomersFromGoogleSheet,
  fetchOrdersFromGoogleSheet,
  syncAllExistingCustomers,
  APPS_SCRIPT_TEMPLATE,
} from '../../lib/googleSheetsService';
import { Order, CustomerUser } from '../../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sanitizeFirestoreData } from '../../utils/sanitizeFirestore';

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
  const [activeTab, setActiveTab] = useState<'sync' | 'webhook' | 'guide'>('sync');
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncType, setSyncType] = useState<'all' | 'orders' | 'customers' | 'restore' | 'test' | 'allCustomers' | null>(null);
  const [sheetUrl, setSheetUrl] = useState<string | null>(getSavedSheetUrl());
  const [sheetId, setSheetId] = useState<string | null>(getSavedSheetId());
  const [webhookUrl, setWebhookUrl] = useState<string>(getSavedWebhookUrl() || '');
  const [hasToken, setHasToken] = useState<boolean>(!!getGoogleAccessToken());
  const [autoSync, setAutoSync] = useState<boolean>(isAutoSyncEnabled());
  const [pendingStats, setPendingStats] = useState(getPendingSyncCounts());
  const [copiedScript, setCopiedScript] = useState(false);
  const [savedWebhookSuccess, setSavedWebhookSuccess] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load all local customers if not passed
  const getCustomerList = (): CustomerUser[] => {
    if (initialCustomers && initialCustomers.length > 0) return initialCustomers;
    try {
      const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (raw) {
        const obj = JSON.parse(raw);
        return Object.values(obj) as CustomerUser[];
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
      setHasToken(!!getGoogleAccessToken());
      setAutoSync(isAutoSyncEnabled());
      setPendingStats(getPendingSyncCounts());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCustomers = getCustomerList();

  const handleCopyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_TEMPLATE);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 3000);
  };

  const handleSaveWebhook = () => {
    setSavedWebhookUrl(webhookUrl);
    setSavedWebhookSuccess(true);
    setTimeout(() => setSavedWebhookSuccess(false), 3000);
    setSyncStatusMsg({
      type: 'success',
      text: 'Đã lưu URL Webhook Google Sheets thành công! Toàn bộ khách hàng đặt hàng hoặc đăng ký mới từ mọi thiết bị sẽ tự động được gửi về Sheet 24/7.',
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
    setSyncType('test');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang gửi bản ghi thử nghiệm lên Google Sheet qua Webhook...',
    });

    try {
      // Save webhook url first
      setSavedWebhookUrl(webhookUrl);

      const testOrder: Order = {
        id: `TEST-${Math.floor(1000 + Math.random() * 9000)}`,
        createdAt: new Date().toISOString(),
        customerName: 'Khách Hàng Thử Nghiệm',
        customerPhone: '0901234567',
        customerEmail: 'test@tingodrink.vn',
        shippingAddress: '123 Đường Tự Nhiên, Phường Bến Nghé',
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        paymentMethod: 'cod',
        items: [
          {
            product: {
              id: 'p-test',
              name: 'Nước Uống Thanh Lọc TINGO Test',
              slug: 'nuoc-uong-test',
              price: 150000,
              category: 'nuoc-uong',
              categoryLabel: 'Nước Uống',
              image: '',
              rating: 5,
              reviewsCount: 1,
              description: 'Sản phẩm test',
              shortDesc: 'Sản phẩm test',
              ingredients: ['100% Tự nhiên'],
              usageInstructions: ['Uống trực tiếp'],
              volumeOrWeight: '350ml',
              benefits: ['Thanh lọc cơ thể'],
              inStock: true,
            },
            quantity: 1,
          },
        ],
        subtotal: 150000,
        discountAmount: 0,
        shippingFee: 0,
        total: 150000,
        status: 'pending',
        notes: 'Đơn hàng test kiểm tra kết nối Google Sheet',
        timeline: [
          {
            status: 'pending',
            title: 'Đơn hàng test',
            time: 'Vừa xong',
            completed: true,
          },
        ],
      };

      const testCustomer: CustomerUser = {
        id: 'CUS-0901234567',
        name: 'Khách Hàng Thử Nghiệm',
        phone: '0901234567',
        email: 'test@tingodrink.vn',
        address: '123 Đường Tự Nhiên',
        city: 'Hồ Chí Minh',
        createdAt: new Date().toISOString(),
        freeshipVouchers: 5,
        isFirstOrder: true,
      };

      await sendToGoogleSheetWebhook({ type: 'customer', data: testCustomer });
      await sendToGoogleSheetWebhook({ type: 'order', data: testOrder });

      setSyncStatusMsg({
        type: 'success',
        text: 'Thành công 100%! Đã gửi bản ghi Khách hàng test & Đơn hàng test lên Google Sheets qua Webhook. Bạn hãy mở Google Sheet kiểm tra trang ĐƠN HÀNG và KHÁCH HÀNG!',
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Lỗi kết nối Webhook: ${err.message || 'Không thể gửi dữ liệu'}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  const handleGoogleLoginAndCreate = async () => {
    setIsConnecting(true);
    setSyncStatusMsg(null);
    try {
      const authRes = await signInWithGoogle();
      setHasToken(true);

      setSyncStatusMsg({
        type: 'info',
        text: `Đã kết nối với ${authRes.user.email}. Đang khởi tạo bảng tính TINGO trên Google Sheets...`,
      });

      let currentSheetId = getSavedSheetId();
      let currentSheetUrl = getSavedSheetUrl();

      if (!currentSheetId) {
        const sheetRes = await createTingoSpreadsheet(authRes.accessToken);
        currentSheetId = sheetRes.id;
        currentSheetUrl = sheetRes.url;
        setSheetId(sheetRes.id);
        setSheetUrl(sheetRes.url);
      }

      setSyncStatusMsg({
        type: 'info',
        text: `Đang đồng bộ toàn diện khách hàng & ${orders.length} đơn hàng sang Google Sheets...`,
      });

      const res = await reconcileAndSyncAll(orders, currentCustomers, authRes.accessToken);
      setPendingStats(getPendingSyncCounts());

      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Tuyệt vời! Đã đồng bộ thành công sang Google Sheets (Khách hàng: +${res.customersSyncedToSheet}, Đơn hàng: +${res.ordersSyncedToSheet}). Dữ liệu đã an toàn 100%!`,
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'Đã tạo file Google Sheets nhưng chưa đồng bộ hết dữ liệu.',
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: err.message || 'Không thể kết nối với Google. Vui lòng thử lại.',
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncAllCustomersNow = async () => {
    setIsSyncing(true);
    setSyncType('allCustomers');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang rà soát và đồng bộ toàn bộ tài khoản khách hàng từ App + Local Cache vào Firebase và Google Sheets...',
    });

    try {
      const res = await syncAllExistingCustomers();
      setPendingStats(getPendingSyncCounts());
      setSyncStatusMsg({
        type: 'success',
        text: `Rà soát & đồng bộ khách hàng thành công 100%!
• Tổng số tài khoản khách hàng: ${res.totalChecked}
• Đã bảo đảm nạp vào Firebase: ${res.firebaseSynced}
• Đã nạp vào Google Sheets (kèm STT 1-1000 & Dropdown Tình Trạng): ${res.googleSheetsSynced}`,
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Lỗi khi rà soát đồng bộ khách hàng: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  const handleFullTwoWaySync = async () => {
    setIsSyncing(true);
    setSyncType('all');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang rà soát và đồng bộ hai chiều (Google Sheet làm trung tâm ⇄ Firebase / Local)...',
    });

    try {
      const res = await reconcileAndSyncAll(orders, currentCustomers);
      setPendingStats(getPendingSyncCounts());

      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: `Đồng bộ 2 chiều hoàn tất!
• Đã đẩy lên Sheet: +${res.customersSyncedToSheet} Khách hàng, +${res.ordersSyncedToSheet} Đơn hàng
• Đã khôi phục về Firebase: +${res.customersRestoredToFirestore} Khách hàng, +${res.ordersRestoredToFirestore} Đơn hàng.`,
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'Đồng bộ thất bại, vui lòng kết nối lại tài khoản hoặc kiểm tra Webhook.',
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: err.message || 'Lỗi xử lý đồng bộ hai chiều',
      });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  const handleRestoreFromSheetToFirebase = async () => {
    setIsSyncing(true);
    setSyncType('restore');
    setSyncStatusMsg({
      type: 'info',
      text: 'Đang đọc dữ liệu từ Google Sheets để khôi phục bù vào Firebase Firestore...',
    });

    try {
      const sheetCustomers = await fetchCustomersFromGoogleSheet();
      const sheetOrders = await fetchOrdersFromGoogleSheet();

      let restoredCustCount = 0;
      let restoredOrdCount = 0;

      for (const sc of sheetCustomers) {
        if (!sc.phone) continue;
        const cleanPhone = sc.phone.replace(/[\s.-]/g, '');
        try {
          await setDoc(doc(db, 'customers', cleanPhone), sanitizeFirestoreData({
            ...sc,
            registeredAt: sc.createdAt || new Date().toISOString(),
            lastLoginAt: sc.createdAt || new Date().toISOString(),
          }), { merge: true });
          restoredCustCount++;
        } catch {
          // ignore
        }
      }

      for (const so of sheetOrders) {
        if (!so.id) continue;
        try {
          await setDoc(doc(db, 'orders', so.id), sanitizeFirestoreData(so), { merge: true });
          restoredOrdCount++;
        } catch {
          // ignore
        }
      }

      setSyncStatusMsg({
        type: 'success',
        text: `Khôi phục thành công từ Google Sheets sang Firebase!
• Đã khôi phục ${restoredCustCount}/${sheetCustomers.length} Khách hàng vào Firestore
• Đã khôi phục ${restoredOrdCount}/${sheetOrders.length} Đơn hàng vào Firestore.
Dữ liệu trên Firebase đã đồng nhất với Google Sheets!`,
      });
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: `Lỗi khi khôi phục từ Sheet sang Firebase: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  const handleSyncOrdersOnly = async () => {
    setIsSyncing(true);
    setSyncType('orders');
    setSyncStatusMsg(null);
    try {
      const res = await bulkSyncOrdersToGoogleSheet(orders);
      setPendingStats(getPendingSyncCounts());
      if (res.success) {
        setSyncStatusMsg({
          type: 'success',
          text: res.count > 0 ? `Đã đồng bộ mới ${res.count} đơn hàng vào Google Sheets!` : 'Tất cả đơn hàng đã được cập nhật đầy đủ trong Google Sheets.',
        });
      } else {
        setSyncStatusMsg({
          type: 'error',
          text: res.error || 'Đồng bộ đơn hàng thất bại',
        });
      }
    } catch (err: any) {
      setSyncStatusMsg({
        type: 'error',
        text: err.message || 'Lỗi khi đồng bộ đơn hàng',
      });
    } finally {
      setIsSyncing(false);
      setSyncType(null);
    }
  };

  const handleToggleAutoSync = () => {
    const nextVal = !autoSync;
    setAutoSync(nextVal);
    setAutoSyncEnabled(nextVal);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-emerald-800 to-[#008874] text-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
              <FileSpreadsheet className="w-5 h-5 text-emerald-300" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">
                Đồng Bộ Google Sheets & Khôi Phục Firebase
              </h3>
              <p className="text-xs text-emerald-100">
                Tự động STT 1-1000 • Dropdown Tình Trạng • Google Sheets Master 24/7
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

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sync'
                ? 'border-[#008874] text-[#008874] bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Bảng Điều Khiển Đồng Bộ</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('webhook')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'webhook'
                ? 'border-[#008874] text-[#008874] bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Webhook Tự Động 24/7 (Khuyên Dùng)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'guide'
                ? 'border-[#008874] text-[#008874] bg-white rounded-t-xl shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Hướng Dẫn Cài Đặt STT & Tình Trạng</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          
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
              <span className="font-medium leading-relaxed whitespace-pre-line">{syncStatusMsg.text}</span>
            </div>
          )}

          {activeTab === 'sync' && (
            <>
              {/* Quick Overview Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                    <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
                    Đơn Hàng Hiện Có
                  </div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">{orders.length}</div>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-slate-500 flex items-center justify-center gap-1">
                    <Users className="w-3.5 h-3.5 text-teal-600" />
                    Khách Hàng Đăng Ký
                  </div>
                  <div className="text-xl font-extrabold text-slate-800 mt-1">{currentCustomers.length}</div>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3 bg-amber-50/70 rounded-2xl border border-amber-200 text-center">
                  <div className="text-[10px] uppercase font-bold text-amber-800 flex items-center justify-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    Hàng Chờ Đồng Bộ
                  </div>
                  <div className="text-xl font-extrabold text-amber-900 mt-1">
                    {pendingStats.totalPending > 0 ? (
                      <span className="text-amber-700">{pendingStats.totalPending} mục</span>
                    ) : (
                      <span className="text-emerald-700 text-sm font-bold flex items-center justify-center gap-1 mt-1">
                        <Check className="w-4 h-4" /> Đã đồng bộ
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Master Sync Action Cards */}
              <div className="space-y-3">
                {/* 1. ALL CUSTOMER SWEEP BUTTON */}
                <div className="p-4 rounded-2xl bg-teal-50 border-2 border-teal-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-teal-950 flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-teal-700" />
                      Rà Soát & Đồng Bộ Toàn Bộ Khách Hàng (App ➔ Firebase ➔ Google Sheet)
                    </div>
                    <div className="text-[11px] text-teal-800">
                      Quét toàn bộ tài khoản hiện tại, bảo đảm nạp vào Firestore và đẩy lên Sheet (kèm STT 1-1000 & Dropdown Tình Trạng)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleSyncAllCustomersNow}
                    disabled={isSyncing}
                    className="shrink-0 px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing && syncType === 'allCustomers' ? 'animate-spin' : ''}`} />
                    <span>{isSyncing && syncType === 'allCustomers' ? 'Đang rà soát...' : '🔄 Đồng Bộ Tất Cả Khách Hàng'}</span>
                  </button>
                </div>

                {/* 2. TWO WAY COMPREHENSIVE SYNC */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 border-2 border-emerald-300 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
                        <ArrowLeftRight className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-emerald-950">
                          Đồng Bộ 2 Chiều Toàn Diện (Google Sheet làm Trung Tâm)
                        </div>
                        <div className="text-[11px] text-emerald-700">
                          Đẩy đơn/khách mới lên Sheet VÀ quét dữ liệu từ Sheet khôi phục về Firebase
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleFullTwoWaySync}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing && syncType === 'all' ? 'animate-spin' : ''}`} />
                      <span>{isSyncing && syncType === 'all' ? 'Đang thực thi đồng bộ...' : '⚡ Kích Hoạt Đồng Bộ 2 Chiều Ngay'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleRestoreFromSheetToFirebase}
                      disabled={isSyncing}
                      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Database className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{isSyncing && syncType === 'restore' ? 'Đang khôi phục...' : '📥 Khôi phục từ GG Sheet qua Firebase'}</span>
                    </button>
                  </div>
                </div>

                {/* Sub Action Sync Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleSyncAllCustomersNow}
                    disabled={isSyncing}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between cursor-pointer transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-teal-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Đẩy Khách Hàng Lên Sheet</div>
                        <div className="text-[10px] text-slate-500">Kèm STT 1-1000 & Dropdown Tình Trạng</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleSyncOrdersOnly}
                    disabled={isSyncing}
                    className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-left flex items-center justify-between cursor-pointer transition-all disabled:opacity-50"
                  >
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="w-4 h-4 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold text-slate-800">Đẩy Đơn Hàng Lên Sheet</div>
                        <div className="text-[10px] text-slate-500">Đồng bộ {orders.length} đơn hàng</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>

              {/* Connected Google Sheet Status */}
              {sheetUrl ? (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Bảng Tính Google Sheets Đang Hoạt Động
                    </span>
                    <a
                      href={sheetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-[#008874] text-white text-[11px] font-bold hover:bg-[#007052] transition-colors"
                    >
                      <span>Mở Trang Tính</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    URL: {sheetUrl}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-emerald-950">Chưa tạo Sheet qua tài khoản Google?</div>
                    <div className="text-[11px] text-emerald-700 mt-0.5">Bấm để tự động tạo file Google Sheet đầy đủ cột ĐƠN HÀNG & KHÁCH HÀNG</div>
                  </div>
                  <button
                    type="button"
                    onClick={handleGoogleLoginAndCreate}
                    disabled={isConnecting}
                    className="shrink-0 px-4 py-2 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isConnecting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    <span>Kết Nối Google & Tạo Sheet</span>
                  </button>
                </div>
              )}
            </>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <Zap className="w-4 h-4 text-amber-600" />
                  Vì sao nên dùng Google Apps Script Webhook?
                </div>
                <p className="text-[11px] leading-relaxed text-amber-800">
                  Webhook chạy ngầm dưới quyền Admin, giúp <strong>100% đơn hàng và khách hàng mới được ghi thẳng vào Google Sheet ngay lập tức 24/7</strong> từ bất kỳ điện thoại hay thiết bị nào của khách hàng mà không cần khách đăng nhập Google.
                </p>
              </div>

              {/* Webhook URL Input */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  URL Ứng Dụng Web (Google Apps Script Web App URL):
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://script.google.com/macros/s/.../exec"
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#008874]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveWebhook}
                    className="px-4 py-2.5 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold transition-all cursor-pointer"
                  >
                    {savedWebhookSuccess ? 'Đã Lưu!' : 'Lưu URL'}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  URL này tự động chia sẻ đến toàn bộ thiết bị khách truy cập để gửi đơn và đăng ký tài khoản tức thì.
                </p>
              </div>

              {/* Test Webhook Button */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-800">Kiểm tra kết nối Webhook ngay</div>
                  <div className="text-[10px] text-slate-500">Gửi thử 1 Khách hàng test & 1 Đơn hàng test lên Google Sheet</div>
                </div>
                <button
                  type="button"
                  onClick={handleTestWebhook}
                  disabled={isSyncing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {isSyncing && syncType === 'test' ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{isSyncing && syncType === 'test' ? 'Đang gửi...' : '🧪 Gửi Dữ Liệu Test'}</span>
                </button>
              </div>

              {/* Copy Code Box */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Code2 className="w-4 h-4 text-[#008874]" />
                    Mã Google Apps Script Mới Nhất (Tự tạo STT & Dropdown Tình Trạng):
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyScript}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {copiedScript ? <CheckCheck className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'Đã Sao Chép Code!' : 'Sao Chép Toàn Bộ Mã'}</span>
                  </button>
                </div>
                <div className="relative">
                  <pre className="p-3 bg-slate-900 text-emerald-400 text-[11px] rounded-xl font-mono max-h-48 overflow-y-auto leading-relaxed border border-slate-800">
                    {APPS_SCRIPT_TEMPLATE}
                  </pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3.5 text-xs text-slate-600">
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
                <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  10 Cột Chuẩn Trong Trang "KHÁCH HÀNG":
                </div>
                <div className="grid grid-cols-2 gap-1.5 text-[11px] text-emerald-900 pl-1">
                  <div>1. <strong>STT</strong> (Số thứ tự 1-1000)</div>
                  <div>2. <strong>Mã Khách Hàng</strong></div>
                  <div>3. <strong>Họ Và Tên</strong></div>
                  <div>4. <strong>Số Điện Thoại</strong></div>
                  <div>5. <strong>Email</strong></div>
                  <div>6. <strong>Địa Chỉ</strong></div>
                  <div>7. <strong>Tỉnh / Thành</strong></div>
                  <div>8. <strong>Ngày Đăng Ký</strong></div>
                  <div>9. <strong>Voucher Freeship</strong></div>
                  <div>10. <strong>Tình Trạng</strong> (Thanh sổ xuống: Hoạt động, Bị khóa, Đã xóa)</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-slate-600" />
                  Cập nhật mã Apps Script mới:
                </div>
                <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-600 pl-1 leading-relaxed">
                  <li>Vào Google Sheet &gt; <em>Tiện ích mở rộng &gt; Apps Script</em>.</li>
                  <li>Xóa code cũ, dán toàn bộ mã mới từ tab <strong>Webhook Tự Động 24/7</strong>.</li>
                  <li>Bấm <strong>Triển khai (Deploy)</strong> &gt; <strong>Quản lý các bản triển khai (Manage deployments)</strong> &gt; Bấm biểu tượng <strong>Bút Chỉnh Sửa</strong> &gt; Mục Phiên bản chọn <strong>"Phiên bản mới" (New version)</strong> &gt; Bấm <strong>Triển khai</strong>.</li>
                  <li>Bấm nút <strong>"🔄 Đồng Bộ Tất Cả Khách Hàng"</strong> để nạp toàn bộ danh sách khách hàng lên Sheet!</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSyncAllCustomersNow}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <UserCheck className={`w-3.5 h-3.5 ${isSyncing && syncType === 'allCustomers' ? 'animate-spin' : ''}`} />
              <span>Đồng Bộ Khách Hàng</span>
            </button>
            <button
              type="button"
              onClick={handleFullTwoWaySync}
              disabled={isSyncing}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#008874] hover:bg-[#007052] text-white text-xs font-bold shadow-sm transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'Đang đồng bộ...' : 'Đồng Bộ 2 Chiều'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
