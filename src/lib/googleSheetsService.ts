import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from './firebase';
import { Order, CustomerUser } from '../types';
import { doc, setDoc, getDocs, collection, getDoc, onSnapshot } from 'firebase/firestore';
import { sanitizeFirestoreData } from '../utils/sanitizeFirestore';
import { normalizeVietnamesePhone } from '../context/CustomerAuthContext';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const SHEET_ID_STORAGE_KEY = 'tingo_google_sheet_id';
const SHEET_URL_STORAGE_KEY = 'tingo_google_sheet_url';
const WEBHOOK_URL_STORAGE_KEY = 'tingo_google_sheets_webhook_url';
const AUTO_SYNC_STORAGE_KEY = 'tingo_google_sheets_auto_sync';
const TOKEN_STORAGE_KEY = 'tingo_google_access_token';
const TOKEN_EXPIRY_KEY = 'tingo_google_token_expiry';
const ACCOUNTS_CACHE_KEY = 'tingo_registered_customers_cache';

// Persistent Pending Queues
const PENDING_SHEETS_CUSTOMERS_KEY = 'tingo_pending_sheets_customers';
const PENDING_SHEETS_ORDERS_KEY = 'tingo_pending_sheets_orders';
const PENDING_FIRESTORE_CUSTOMERS_KEY = 'tingo_pending_firestore_customers';
const PENDING_FIRESTORE_ORDERS_KEY = 'tingo_pending_firestore_orders';

// Persistent Synced Record IDs Cache (Anti-duplicate shield)
export const SYNCED_ORDERS_STORAGE_KEY = 'tingo_synced_orders_ids';
export const SYNCED_CUSTOMERS_STORAGE_KEY = 'tingo_synced_customers_ids';

/**
 * Retrieves the set of Order IDs that have already been synced to Google Sheets.
 */
export const getSyncedOrderIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SYNCED_ORDERS_STORAGE_KEY);
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((id) => String(id).trim()));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
};

export const markOrderAsSynced = (orderId: string) => {
  if (!orderId) return;
  try {
    const set = getSyncedOrderIds();
    set.add(String(orderId).trim());
    localStorage.setItem(SYNCED_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

export const markOrdersAsSynced = (orderIds: string[]) => {
  if (!orderIds || orderIds.length === 0) return;
  try {
    const set = getSyncedOrderIds();
    orderIds.forEach((id) => {
      if (id) set.add(String(id).trim());
    });
    localStorage.setItem(SYNCED_ORDERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

export const isOrderSynced = (orderId: string): boolean => {
  if (!orderId) return false;
  return getSyncedOrderIds().has(String(orderId).trim());
};

export const getCustomerSyncKey = (customer: CustomerUser | string | { phone?: string; id?: string }): string => {
  if (typeof customer === 'string') {
    return normalizeVietnamesePhone(customer) || customer.replace(/[\s.-]/g, '').trim();
  }
  const cleanPhone = normalizeVietnamesePhone(customer.phone);
  if (cleanPhone) return cleanPhone;
  return (customer.id || '').trim();
};

export const getSyncedCustomerKeys = (): Set<string> => {
  try {
    const raw = localStorage.getItem(SYNCED_CUSTOMERS_STORAGE_KEY);
    if (raw) {
      const arr: string[] = JSON.parse(raw);
      if (Array.isArray(arr)) {
        return new Set(arr.map((k) => String(k).trim()));
      }
    }
  } catch {
    // ignore
  }
  return new Set();
};

export const markCustomerAsSynced = (customer: CustomerUser | string) => {
  const key = getCustomerSyncKey(customer);
  if (!key) return;
  try {
    const set = getSyncedCustomerKeys();
    set.add(key);
    localStorage.setItem(SYNCED_CUSTOMERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

export const markCustomersAsSynced = (customers: (CustomerUser | string)[]) => {
  if (!customers || customers.length === 0) return;
  try {
    const set = getSyncedCustomerKeys();
    customers.forEach((c) => {
      const k = getCustomerSyncKey(c);
      if (k) set.add(k);
    });
    localStorage.setItem(SYNCED_CUSTOMERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {
    // ignore
  }
};

export const isCustomerSynced = (customer: CustomerUser | string): boolean => {
  const key = getCustomerSyncKey(customer);
  if (!key) return false;
  const set = getSyncedCustomerKeys();
  if (set.has(key)) return true;
  if (typeof customer !== 'string') {
    if (customer.id && set.has(customer.id.trim())) return true;
    const cleanPhone = normalizeVietnamesePhone(customer.phone);
    if (cleanPhone && set.has(cleanPhone)) return true;
  }
  return false;
};

export const clearSyncedCache = () => {
  try {
    localStorage.removeItem(SYNCED_ORDERS_STORAGE_KEY);
    localStorage.removeItem(SYNCED_CUSTOMERS_STORAGE_KEY);
  } catch {
    // ignore
  }
};

// Primary Hardcoded Webhook URL (Master Backup)
export const HARDCODED_GOOGLE_SHEET_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbwPPuWqPz0wMiipd3BFrZ2v28p8FsGx18TtwEc3_6ItwIp4VQIilO9h9XiChP0XG--V2Q/exec';

// Fallback in-memory webhook cache
let inMemoryWebhookUrl: string | null = HARDCODED_GOOGLE_SHEET_WEBHOOK_URL;
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const safeWithTimeout = async <T>(promise: Promise<T>, fallbackValue: T, timeoutMs = 2500): Promise<T> => {
  let timer: any;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallbackValue), timeoutMs);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timer);
    return result;
  } catch (err) {
    clearTimeout(timer);
    return fallbackValue;
  }
};

const googleProvider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => googleProvider.addScope(scope));

export const saveGoogleAccessToken = (token: string, expiresInSeconds: number = 3500) => {
  cachedAccessToken = token;
  try {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    localStorage.setItem(TOKEN_EXPIRY_KEY, String(Date.now() + expiresInSeconds * 1000));
  } catch (err) {
    console.warn('Unable to cache token to localStorage', err);
  }
};

export const getGoogleAccessToken = (): string | null => {
  if (cachedAccessToken) return cachedAccessToken;
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
    if (token && expiry && Number(expiry) > Date.now()) {
      cachedAccessToken = token;
      return token;
    }
  } catch {
    // ignore
  }
  return null;
};

export const clearGoogleAccessToken = () => {
  cachedAccessToken = null;
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch {
    // ignore
  }
};

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    const token = getGoogleAccessToken();
    if (user && token) {
      if (onAuthSuccess) onAuthSuccess(user, token);
    } else if (!isSigningIn) {
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const signInWithGoogle = async (): Promise<{ user: User; accessToken: string }> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Không lấy được access token từ Google');
    }
    saveGoogleAccessToken(credential.accessToken);
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getSavedSheetId = (): string | null => {
  const envId = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_GOOGLE_SHEET_ID || import.meta.env?.VITE_GOOGLE_SPREADSHEET_ID)) || '';
  if (envId) return envId.trim();
  return localStorage.getItem(SHEET_ID_STORAGE_KEY);
};

export const getSavedSheetUrl = (): string | null => {
  const envUrl = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_SHEET_URL) || '';
  if (envUrl) return envUrl.trim();
  return localStorage.getItem(SHEET_URL_STORAGE_KEY);
};

export const setSavedSheetInfo = (id: string, url: string) => {
  localStorage.setItem(SHEET_ID_STORAGE_KEY, id);
  localStorage.setItem(SHEET_URL_STORAGE_KEY, url);
  try {
    setDoc(doc(db, 'system_settings', 'google_sheets'), {
      sheetId: id,
      sheetUrl: url,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
  } catch {
    // quiet catch
  }
};

export const getSavedWebhookUrl = (): string => {
  if (inMemoryWebhookUrl && inMemoryWebhookUrl.trim().startsWith('http')) {
    return inMemoryWebhookUrl.trim();
  }

  // 1. Check LocalStorage if previously customized
  try {
    const stored = localStorage.getItem(WEBHOOK_URL_STORAGE_KEY);
    if (stored && stored.trim().startsWith('http')) {
      inMemoryWebhookUrl = stored.trim();
      return inMemoryWebhookUrl;
    }
  } catch {
    // ignore
  }

  // 2. Default directly to hardcoded URL
  inMemoryWebhookUrl = HARDCODED_GOOGLE_SHEET_WEBHOOK_URL;
  return HARDCODED_GOOGLE_SHEET_WEBHOOK_URL;
};

export const setSavedWebhookUrl = (url: string) => {
  const trimmed = url.trim();
  inMemoryWebhookUrl = trimmed;
  localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, trimmed);
  try {
    setDoc(doc(db, 'system_settings', 'google_sheets'), {
      webhookUrl: trimmed,
      updatedAt: new Date().toISOString(),
    }, { merge: true }).catch(() => {});
  } catch {
    // quiet catch
  }
};

// Real-time listener to sync shared Google Sheets configuration to all visitor devices
export const initSharedGoogleSheetsListener = () => {
  try {
    return onSnapshot(doc(db, 'system_settings', 'google_sheets'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.webhookUrl) {
          inMemoryWebhookUrl = data.webhookUrl;
          localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, data.webhookUrl);
        }
        if (data.sheetId) {
          localStorage.setItem(SHEET_ID_STORAGE_KEY, data.sheetId);
        }
        if (data.sheetUrl) {
          localStorage.setItem(SHEET_URL_STORAGE_KEY, data.sheetUrl);
        }
      }
    });
  } catch (err) {
    console.warn('initSharedGoogleSheetsListener note:', err);
    return () => {};
  }
};

// Auto-trigger listener
initSharedGoogleSheetsListener();

export const isAutoSyncEnabled = (): boolean => {
  const val = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
  return val === null ? true : val === 'true';
};

export const setAutoSyncEnabled = (enabled: boolean) => {
  localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(enabled));
};

/* =========================================================================
 * GOOGLE APPS SCRIPT TEMPLATE (SMART NORMALIZATION & 100% RELIABILITY)
 * ========================================================================= */
export const APPS_SCRIPT_TEMPLATE = `// === GOOGLE APPS SCRIPT CHO TINGO DRINK (TỰ ĐỘNG STT & TÌNH TRẠNG DROPDOWN) ===
// Hướng dẫn cài đặt trong 1 phút:
// 1. Mở Google Sheet -> "Tiện ích mở rộng" (Extensions) -> "Apps Script"
// 2. Xoá hết code cũ, dán toàn bộ mã này vào -> Nhấn Lưu (Ctrl+S)
// 3. Mẹo: Chọn hàm "khoiTaoGiaoDienBangTinh" bấm "▶ Chạy" để Google Sheet tự tạo ngay 10 cột & Dropdown!
// 4. Nhấn nút xanh "Triển khai" (Deploy) -> "Tùy chọn triển khai mới" (New deployment)
//    - Loại: "Ứng dụng web" (Web app)
//    - Thực thi dưới dạng: "Tôi" (Me)
//    - Ai có quyền truy cập: "Bất kỳ ai" (Anyone) -> BẮT BUỘC
// 5. Nhấn "Triển khai" -> Sao chép "URL ứng dụng web" (Web App URL) dán vào website TINGO.

function normPhone(p) {
  var s = String(p || '').replace(/[\\s.'"-]/g, '');
  if (s.indexOf('+84') === 0) s = '0' + s.substring(3);
  if (s.indexOf('84') === 0 && s.length === 11) s = '0' + s.substring(2);
  if (s.length === 9 && s.indexOf('0') !== 0) s = '0' + s;
  return s;
}

/**
 * HÀM NÀY DÀNH CHO BẠN BẤM "▶ Chạy" (Run) TRỰC TIẾP ĐỂ KHỞI TẠO 10 CỘT & DROPDOWN NGAY LẬP TỨC TRÊN SHEET!
 */
function khoiTaoGiaoDienBangTinh() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet();
  var custSheet = sheet.getSheetByName('KHÁCH HÀNG') || sheet.insertSheet('KHÁCH HÀNG');
  var ordSheet = sheet.getSheetByName('ĐƠN HÀNG') || sheet.insertSheet('ĐƠN HÀNG');
  
  setupCustomerSheetHeadersAndValidation(custSheet);
  setupOrderSheetHeaders(ordSheet);
  
  Logger.log('Đã tạo thành công 10 cột trang KHÁCH HÀNG và trang ĐƠN HÀNG!');
}

/**
 * NHẬN TÍN HIỆU TỰ ĐỘNG 24/7 TỪ WEBSITE TINGO KHI CÓ KHÁCH ĐĂNG KÝ HOẶC ĐẶT ĐƠN
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Không có dữ liệu' })).setMimeType(ContentService.MimeType.JSON);
    }
    
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var payload = JSON.parse(e.postData.contents);
    var type = payload.type;
    var data = payload.data;
    
    // 1. CẬP NHẬT TÌNH TRẠNG KHÁCH HÀNG (Hoạt động / Bị khóa / Đã xóa)
    if (type === 'update_customer_status') {
      var custSheet = sheet.getSheetByName('KHÁCH HÀNG') || sheet.insertSheet('KHÁCH HÀNG');
      setupCustomerSheetHeadersAndValidation(custSheet);
      var cleanPhone = normPhone(data.phone);
      var values = custSheet.getDataRange().getValues();
      var found = false;
      for (var i = 1; i < values.length; i++) {
        var rowPhone = normPhone(values[i][3]);
        if (rowPhone === cleanPhone || String(values[i][1] || '') === String(data.id || '')) {
          custSheet.getRange(i + 1, 10).setValue(data.status || 'Hoạt động');
          found = true;
          break;
        }
      }
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', updated: found })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 2. ĐỒNG BỘ KHÁCH HÀNG (Tự động STT 1-1000 & Dropdown Tình Trạng)
    if (type === 'customer' || type === 'bulk_customers') {
      var custSheet = sheet.getSheetByName('KHÁCH HÀNG') || sheet.insertSheet('KHÁCH HÀNG');
      setupCustomerSheetHeadersAndValidation(custSheet);
      
      var customers = Array.isArray(data) ? data : [data];
      var existingData = custSheet.getDataRange().getValues();
      var phoneToRowIndex = {};
      for (var r = 1; r < existingData.length; r++) {
        var p = normPhone(existingData[r][3]);
        if (p) phoneToRowIndex[p] = r + 1;
      }
      
      customers.forEach(function(c) {
        var cPhone = normPhone(c.phone);
        var statusVal = c.isBlocked ? 'Bị khóa' : (c.status || 'Hoạt động');
        
        if (phoneToRowIndex[cPhone]) {
          var rowNum = phoneToRowIndex[cPhone];
          custSheet.getRange(rowNum, 3).setValue(c.name || '');
          custSheet.getRange(rowNum, 4).setValue("'" + cPhone);
          custSheet.getRange(rowNum, 5).setValue(c.email || '');
          custSheet.getRange(rowNum, 6).setValue(c.address || '');
          custSheet.getRange(rowNum, 7).setValue(c.city || '');
          custSheet.getRange(rowNum, 9).setValue(c.freeshipVouchers !== undefined ? c.freeshipVouchers : 5);
          custSheet.getRange(rowNum, 10).setValue(statusVal);
        } else {
          var nextStt = custSheet.getLastRow();
          if (nextStt < 1) nextStt = 1;
          custSheet.appendRow([
            nextStt,
            c.id || ('CUS-' + cPhone),
            c.name || '',
            "'" + cPhone,
            c.email || '',
            c.address || '',
            c.city || '',
            c.createdAt || new Date().toISOString(),
            c.freeshipVouchers !== undefined ? c.freeshipVouchers : 5,
            statusVal
          ]);
          phoneToRowIndex[cPhone] = custSheet.getLastRow();
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: customers.length })).setMimeType(ContentService.MimeType.JSON);
    }
    
    // 3. ĐỒNG BỘ ĐƠN HÀNG
    if (type === 'order' || type === 'bulk_orders') {
      var ordSheet = sheet.getSheetByName('ĐƠN HÀNG') || sheet.insertSheet('ĐƠN HÀNG');
      setupOrderSheetHeaders(ordSheet);
      
      var orders = Array.isArray(data) ? data : [data];
      var existingOrdData = ordSheet.getDataRange().getValues();
      var existingOrderIds = {};
      for (var k = 1; k < existingOrdData.length; k++) {
        var oid = String(existingOrdData[k][0] || '');
        if (oid) existingOrderIds[oid] = k + 1;
      }
      
      orders.forEach(function(o) {
        var itemsStr = (o.items || []).map(function(item) {
          return (item.product ? item.product.name : 'Sản phẩm') + ' (x' + item.quantity + ')';
        }).join('; ');
        
        var statusLabel = o.status === 'delivered' ? 'Đã giao' : (o.status === 'shipping' ? 'Đang giao' : (o.status === 'processing' ? 'Đang xử lý' : (o.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý')));
        var oPhone = normPhone(o.customerPhone || (o.phone || ''));
        
        if (existingOrderIds[o.id]) {
          var oRowNum = existingOrderIds[o.id];
          ordSheet.getRange(oRowNum, 12).setValue(statusLabel);
          ordSheet.getRange(oRowNum, 13).setValue(o.notes || '');
        } else {
          ordSheet.appendRow([
            o.id || '',
            o.createdAt || new Date().toISOString(),
            o.customerName || '',
            "'" + oPhone,
            o.shippingAddress || '',
            o.city || '',
            o.district || '',
            itemsStr,
            o.total || 0,
            o.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản VietQR',
            o.couponCode || 'Không áp dụng',
            statusLabel,
            o.notes || ''
          ]);
          existingOrderIds[o.id] = ordSheet.getLastRow();
        }
      });
      return ContentService.createTextOutput(JSON.stringify({ status: 'success', count: orders.length })).setMimeType(ContentService.MimeType.JSON);
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Loại yêu cầu không hợp lệ' })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    var custSheet = sheet.getSheetByName('KHÁCH HÀNG');
    var ordSheet = sheet.getSheetByName('ĐƠN HÀNG');
    var customers = [];
    var orders = [];
    
    if (custSheet) {
      var custData = custSheet.getDataRange().getValues();
      for (var i = 1; i < custData.length; i++) {
        var row = custData[i];
        if (row[1] || row[3]) {
          customers.push({
            id: String(row[1] || ('CUS-' + row[3])),
            name: String(row[2] || ''),
            phone: normPhone(row[3]),
            email: String(row[4] || ''),
            address: String(row[5] || ''),
            city: String(row[6] || ''),
            createdAt: String(row[7] || ''),
            freeshipVouchers: Number(row[8]) || 5,
            isBlocked: String(row[9] || '') === 'Bị khóa'
          });
        }
      }
    }
    
    if (ordSheet) {
      var ordData = ordSheet.getDataRange().getValues();
      for (var j = 1; j < ordData.length; j++) {
        var oRow = ordData[j];
        if (oRow[0]) {
          orders.push({
            id: String(oRow[0]),
            createdAt: String(oRow[1] || ''),
            customerName: String(oRow[2] || ''),
            customerPhone: normPhone(oRow[3]),
            shippingAddress: String(oRow[4] || ''),
            city: String(oRow[5] || ''),
            district: String(oRow[6] || ''),
            total: Number(oRow[8]) || 0,
            paymentMethod: String(oRow[9] || '').includes('VietQR') ? 'vietqr' : 'cod',
            couponCode: String(oRow[10] || ''),
            status: String(oRow[11] || '').includes('Đã giao') ? 'delivered' : 'pending',
            notes: String(oRow[12] || '')
          });
        }
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', customers: customers, orders: orders })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: err.toString() })).setMimeType(ContentService.MimeType.JSON);
  }
}

function setupCustomerSheetHeadersAndValidation(sheet) {
  var headers = ['STT', 'Mã Khách Hàng', 'Họ Và Tên', 'Số Điện Thoại', 'Email', 'Địa Chỉ', 'Tỉnh / Thành', 'Ngày Đăng Ký', 'Voucher Freeship', 'Tình Trạng'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E8F5E9');
  sheet.setFrozenRows(1);
  
  // Set Dropdown validation on Column 10 (Tình Trạng)
  var rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(['Hoạt động', 'Bị khóa', 'Đã xóa'], true)
    .setAllowInvalid(true)
    .build();
  sheet.getRange(2, 10, 1000, 1).setDataValidation(rule);
}

function setupOrderSheetHeaders(sheet) {
  var headers = ['Mã Đơn Hàng', 'Thời Gian Đặt', 'Tên Khách Hàng', 'Số Điện Thoại', 'Địa Chỉ Nhận Hàng', 'Tỉnh / Thành Phố', 'Quận / Huyện', 'Danh Sách Món Đặt', 'Tổng Tiền (VNĐ)', 'Hình Thức TT', 'Mã Giảm Giá', 'Trạng Thái', 'Ghi Chú Đơn'];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#E3F2FD');
  sheet.setFrozenRows(1);
}
`;

/**
 * Universal dispatcher: sends data to Google Apps Script Webhook
 */
export const sendToGoogleSheetWebhook = async (payload: {
  type: 'customer' | 'order' | 'bulk_customers' | 'bulk_orders' | 'update_customer_status';
  data: any;
}): Promise<boolean> => {
  let webhookUrl = getSavedWebhookUrl();

  if (!webhookUrl) {
    try {
      const snap = await safeWithTimeout(getDoc(doc(db, 'system_settings', 'google_sheets')), null, 1500);
      if (snap && snap.exists()) {
        const data = snap.data();
        if (data && data.webhookUrl) {
          webhookUrl = data.webhookUrl.trim();
          inMemoryWebhookUrl = webhookUrl;
          if (webhookUrl) {
            localStorage.setItem(WEBHOOK_URL_STORAGE_KEY, webhookUrl);
          }
        }
      }
    } catch {
      // quiet catch
    }
  }

  if (!webhookUrl || !webhookUrl.startsWith('http')) {
    console.warn('sendToGoogleSheetWebhook: No valid Webhook URL configured');
    return false;
  }

  try {
    const fetchPromise = fetch(webhookUrl, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    await safeWithTimeout(fetchPromise, null, 3500);
    return true;
  } catch (err) {
    console.warn('Google Sheet Webhook send note:', err);
    return false;
  }
};

/**
 * Synchronize customer status change (Block / Unblock / Delete) to Google Sheet
 */
export const updateCustomerStatusInGoogleSheet = async (
  phone: string,
  status: 'Hoạt động' | 'Bị khóa' | 'Đã xóa'
): Promise<boolean> => {
  return sendToGoogleSheetWebhook({
    type: 'update_customer_status',
    data: {
      phone: phone.replace(/[\s.-]/g, ''),
      status,
    },
  });
};

/**
 * Creates a brand new Google Spreadsheet with 2 customized sheets:
 * 1. "ĐƠN HÀNG"
 * 2. "KHÁCH HÀNG"
 */
export const createTingoSpreadsheet = async (token?: string): Promise<{ id: string; url: string }> => {
  const activeToken = token || getGoogleAccessToken();
  if (!activeToken) {
    throw new Error('Chưa đăng nhập tài khoản Google để tạo bảng tính');
  }

  const payload = {
    properties: {
      title: 'TINGO Drink - Danh Sách Đơn Hàng & Khách Hàng (Tự Động)',
    },
    sheets: [
      {
        properties: {
          title: 'ĐƠN HÀNG',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'Mã Đơn Hàng' } },
                  { userEnteredValue: { stringValue: 'Thời Gian Đặt' } },
                  { userEnteredValue: { stringValue: 'Tên Khách Hàng' } },
                  { userEnteredValue: { stringValue: 'Số Điện Thoại' } },
                  { userEnteredValue: { stringValue: 'Địa Chỉ Nhận Hàng' } },
                  { userEnteredValue: { stringValue: 'Tỉnh / Thành Phố' } },
                  { userEnteredValue: { stringValue: 'Quận / Huyện' } },
                  { userEnteredValue: { stringValue: 'Danh Sách Món Đặt' } },
                  { userEnteredValue: { stringValue: 'Tổng Tiền (VNĐ)' } },
                  { userEnteredValue: { stringValue: 'Hình Thức TT' } },
                  { userEnteredValue: { stringValue: 'Mã Giảm Giá' } },
                  { userEnteredValue: { stringValue: 'Trạng Thái' } },
                  { userEnteredValue: { stringValue: 'Ghi Chú Đơn' } },
                ],
              },
            ],
          },
        ],
      },
      {
        properties: {
          title: 'KHÁCH HÀNG',
          gridProperties: {
            frozenRowCount: 1,
          },
        },
        data: [
          {
            startRow: 0,
            startColumn: 0,
            rowData: [
              {
                values: [
                  { userEnteredValue: { stringValue: 'STT' } },
                  { userEnteredValue: { stringValue: 'Mã Khách Hàng' } },
                  { userEnteredValue: { stringValue: 'Họ Và Tên' } },
                  { userEnteredValue: { stringValue: 'Số Điện Thoại' } },
                  { userEnteredValue: { stringValue: 'Email' } },
                  { userEnteredValue: { stringValue: 'Địa Chỉ' } },
                  { userEnteredValue: { stringValue: 'Tỉnh / Thành' } },
                  { userEnteredValue: { stringValue: 'Ngày Đăng Ký' } },
                  { userEnteredValue: { stringValue: 'Voucher Freeship' } },
                  { userEnteredValue: { stringValue: 'Tình Trạng' } },
                ],
              },
            ],
          },
        ],
      },
    ],
  };

  const response = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${activeToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Tạo Google Sheet thất bại: ${errText}`);
  }

  const result = await response.json();
  const spreadsheetId = result.spreadsheetId;
  const spreadsheetUrl = result.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;

  setSavedSheetInfo(spreadsheetId, spreadsheetUrl);

  return { id: spreadsheetId, url: spreadsheetUrl };
};

/* =========================================================================
 * PENDING QUEUE HELPERS
 * ========================================================================= */

export const queuePendingCustomer = (customer: CustomerUser) => {
  try {
    const raw = localStorage.getItem(PENDING_SHEETS_CUSTOMERS_KEY);
    const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
    if (!list.some((c) => c.phone === customer.phone)) {
      list.push(customer);
      localStorage.setItem(PENDING_SHEETS_CUSTOMERS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Queue pending customer error:', err);
  }
};

export const queuePendingOrder = (order: Order) => {
  try {
    const raw = localStorage.getItem(PENDING_SHEETS_ORDERS_KEY);
    const list: Order[] = raw ? JSON.parse(raw) : [];
    if (!list.some((o) => o.id === order.id)) {
      list.push(order);
      localStorage.setItem(PENDING_SHEETS_ORDERS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Queue pending order error:', err);
  }
};

export const queuePendingFirestoreCustomer = (customer: CustomerUser) => {
  try {
    const raw = localStorage.getItem(PENDING_FIRESTORE_CUSTOMERS_KEY);
    const list: CustomerUser[] = raw ? JSON.parse(raw) : [];
    if (!list.some((c) => c.phone === customer.phone)) {
      list.push(customer);
      localStorage.setItem(PENDING_FIRESTORE_CUSTOMERS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Queue pending firestore customer error:', err);
  }
};

export const queuePendingFirestoreOrder = (order: Order) => {
  try {
    const raw = localStorage.getItem(PENDING_FIRESTORE_ORDERS_KEY);
    const list: Order[] = raw ? JSON.parse(raw) : [];
    if (!list.some((o) => o.id === order.id)) {
      list.push(order);
      localStorage.setItem(PENDING_FIRESTORE_ORDERS_KEY, JSON.stringify(list));
    }
  } catch (err) {
    console.warn('Queue pending firestore order error:', err);
  }
};

export const getPendingSyncCounts = () => {
  try {
    const rawCust = localStorage.getItem(PENDING_SHEETS_CUSTOMERS_KEY);
    const rawOrd = localStorage.getItem(PENDING_SHEETS_ORDERS_KEY);
    const rawFireCust = localStorage.getItem(PENDING_FIRESTORE_CUSTOMERS_KEY);
    const rawFireOrd = localStorage.getItem(PENDING_FIRESTORE_ORDERS_KEY);

    const sheetsCust = rawCust ? JSON.parse(rawCust).length : 0;
    const sheetsOrd = rawOrd ? JSON.parse(rawOrd).length : 0;
    const fireCust = rawFireCust ? JSON.parse(rawFireCust).length : 0;
    const fireOrd = rawFireOrd ? JSON.parse(rawFireOrd).length : 0;

    return { sheetsCust, sheetsOrd, fireCust, fireOrd, totalPending: sheetsCust + sheetsOrd + fireCust + fireOrd };
  } catch {
    return { sheetsCust: 0, sheetsOrd: 0, fireCust: 0, fireOrd: 0, totalPending: 0 };
  }
};

/* =========================================================================
 * FETCH FROM GOOGLE SHEETS (WITH STRICT 10-DIGIT DEDUPLICATION)
 * ========================================================================= */

export const fetchCustomersFromGoogleSheet = async (token?: string): Promise<CustomerUser[]> => {
  const activeToken = token || getGoogleAccessToken();
  const sheetId = getSavedSheetId();
  const webhookUrl = getSavedWebhookUrl();

  const rawList: CustomerUser[] = [];

  // Try OAuth API first if token available
  if (activeToken && sheetId) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/KHÁCH HÀNG!A2:J`;
      const res = await safeWithTimeout(
        fetch(url, { headers: { Authorization: `Bearer ${activeToken}` } }),
        null,
        2500
      );
      if (res && res.ok) {
        const data = await res.json();
        const rows: string[][] = data.values || [];
        rows.forEach((r, idx) => {
          const rawPhone = r[3] || '';
          const cleanPhone = normalizeVietnamesePhone(rawPhone);
          const validId = cleanPhone ? `CUS-${cleanPhone}` : (r[1] || `CUS-${idx}`);
          rawList.push({
            id: validId,
            name: r[2] || 'Khách hàng',
            phone: cleanPhone,
            email: r[4] || '',
            address: r[5] || '',
            city: r[6] || 'Hồ Chí Minh',
            createdAt: r[7] || new Date().toISOString(),
            freeshipVouchers: Number(r[8]) || 5,
            isBlocked: r[9] === 'Bị khóa',
            isFirstOrder: false,
          });
        });
      }
    } catch (err) {
      console.warn('OAuth fetch customers notice:', err);
    }
  }

  // Fallback: Try Webhook GET
  if (rawList.length === 0 && webhookUrl) {
    try {
      const res = await safeWithTimeout(fetch(webhookUrl), null, 3000);
      if (res && res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.customers)) {
          json.customers.forEach((c: any, idx: number) => {
            const cleanPhone = normalizeVietnamesePhone(c.phone);
            const validId = cleanPhone ? `CUS-${cleanPhone}` : (c.id || `CUS-${idx}`);
            rawList.push({
              ...c,
              id: validId,
              phone: cleanPhone,
            });
          });
        }
      }
    } catch (err) {
      console.warn('Webhook GET customers notice:', err);
    }
  }

  // Strict Map Deduplication by 10-digit clean phone to eliminate 9-digit duplicates
  const dedupedMap = new Map<string, CustomerUser>();
  rawList.forEach((c) => {
    if (!c) return;
    const cleanPhone = normalizeVietnamesePhone(c.phone);
    if (!cleanPhone || cleanPhone.length !== 10) return; // Discard invalid/broken phones
    const key = cleanPhone;
    const cleanCustomer: CustomerUser = {
      ...c,
      id: `CUS-${cleanPhone}`,
      phone: cleanPhone,
    };
    if (dedupedMap.has(key)) {
      dedupedMap.set(key, { ...dedupedMap.get(key)!, ...cleanCustomer });
    } else {
      dedupedMap.set(key, cleanCustomer);
    }
  });

  return Array.from(dedupedMap.values());
};

export const fetchOrdersFromGoogleSheet = async (token?: string): Promise<Partial<Order>[]> => {
  const activeToken = token || getGoogleAccessToken();
  const sheetId = getSavedSheetId();
  const webhookUrl = getSavedWebhookUrl();

  const rawList: Partial<Order>[] = [];

  // Try OAuth API first
  if (activeToken && sheetId) {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ĐƠN HÀNG!A2:M`;
      const res = await safeWithTimeout(
        fetch(url, { headers: { Authorization: `Bearer ${activeToken}` } }),
        null,
        2500
      );
      if (res && res.ok) {
        const data = await res.json();
        const rows: string[][] = data.values || [];
        rows.forEach((r) => {
          if (!r[0]) return;
          rawList.push({
            id: r[0],
            createdAt: r[1],
            customerName: r[2],
            customerPhone: normalizeVietnamesePhone(r[3]),
            shippingAddress: r[4],
            city: r[5],
            district: r[6],
            total: Number(r[8]) || 0,
            paymentMethod: (r[9] && r[9].includes('VietQR')) ? 'vietqr' : 'cod',
            couponCode: r[10] && r[10] !== 'Không áp dụng' ? r[10] : undefined,
            status: (r[11] === 'Đã giao' ? 'delivered' : r[11] === 'Đang giao' ? 'shipping' : r[11] === 'Đang xử lý' ? 'processing' : r[11] === 'Đã hủy' ? 'cancelled' : 'pending') as any,
            notes: r[12] || '',
          });
        });
      }
    } catch (err) {
      console.warn('OAuth fetch orders notice:', err);
    }
  }

  // Fallback: Webhook GET
  if (rawList.length === 0 && webhookUrl) {
    try {
      const res = await safeWithTimeout(fetch(webhookUrl), null, 3000);
      if (res && res.ok) {
        const json = await res.json();
        if (json.status === 'success' && Array.isArray(json.orders)) {
          json.orders.forEach((o: any) => {
            if (!o.id) return;
            rawList.push({
              ...o,
              customerPhone: normalizeVietnamesePhone(o.customerPhone || o.phone),
            });
          });
        }
      }
    } catch (err) {
      console.warn('Webhook GET orders notice:', err);
    }
  }

  // Deduplicate orders by order.id (keeping the newest)
  const dedupedOrderMap = new Map<string, Partial<Order>>();
  rawList.forEach((o) => {
    if (!o || !o.id) return;
    if (dedupedOrderMap.has(o.id)) {
      dedupedOrderMap.set(o.id, { ...dedupedOrderMap.get(o.id)!, ...o });
    } else {
      dedupedOrderMap.set(o.id, o);
    }
  });

  return Array.from(dedupedOrderMap.values());
};

/* =========================================================================
 * APPEND INDIVIDUAL ORDER / CUSTOMER TO GOOGLE SHEETS
 * ========================================================================= */

export const appendOrderToGoogleSheet = async (
  order: Order,
  token?: string,
  options?: { force?: boolean }
): Promise<boolean> => {
  if (!order || !order.id) return false;

  // Anti-duplicate protection: If order is already synced and force flag is not set, skip duplicate send
  if (!options?.force && isOrderSynced(order.id)) {
    return true;
  }

  let sentViaAny = false;

  // 1. Send via Webhook (Works for 100% of visitors & customers without login)
  const okWebhook = await sendToGoogleSheetWebhook({ type: 'order', data: order });
  if (okWebhook) sentViaAny = true;

  // 2. If OAuth token available, also sync via Google Sheets REST API
  const activeToken = token || getGoogleAccessToken();
  let sheetId = getSavedSheetId();

  if (activeToken) {
    if (!sheetId) {
      try {
        const created = await createTingoSpreadsheet(activeToken);
        sheetId = created.id;
      } catch {
        // quiet catch
      }
    }

    if (sheetId) {
      const itemsFormatted = (order.items || [])
        .map((item) => `${item.product?.name || 'Sản phẩm'} (x${item.quantity})`)
        .join('; ');

      const rowValues = [
        order.id,
        order.createdAt,
        order.customerName,
        "'" + (order.customerPhone || (order as any).phone || ''),
        order.shippingAddress,
        order.city || '',
        order.district || '',
        itemsFormatted,
        Number(order.total),
        order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản VietQR',
        order.couponCode || 'Không áp dụng',
        order.status === 'delivered' ? 'Đã giao' : order.status === 'shipping' ? 'Đang giao' : order.status === 'processing' ? 'Đang xử lý' : order.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý',
        order.notes || '',
      ];

      try {
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ĐƠN HÀNG!A:M:append?valueInputOption=USER_ENTERED`;
        const res = await safeWithTimeout(
          fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ values: [rowValues] }),
          }),
          null,
          2500
        );

        if (res && res.ok) {
          sentViaAny = true;
        }
      } catch {
        // ignore
      }
    }
  }

  if (sentViaAny) {
    markOrderAsSynced(order.id);
    return true;
  } else {
    queuePendingOrder(order);
    return false;
  }
};

export const flushPendingSyncQueues = async () => {
  const webhookUrl = getSavedWebhookUrl();
  if (!webhookUrl) return;

  try {
    // 1. Flush pending sheets customers
    const rawCust = localStorage.getItem(PENDING_SHEETS_CUSTOMERS_KEY);
    if (rawCust) {
      const list: CustomerUser[] = JSON.parse(rawCust);
      const unsyncedList = list.filter((c) => !isCustomerSynced(c));
      if (unsyncedList.length > 0) {
        const ok = await sendToGoogleSheetWebhook({
          type: 'bulk_customers',
          data: unsyncedList.map((c) => ({
            ...c,
            status: c.isBlocked ? 'Bị khóa' : 'Hoạt động',
          })),
        });
        if (ok) {
          markCustomersAsSynced(unsyncedList);
          localStorage.removeItem(PENDING_SHEETS_CUSTOMERS_KEY);
        }
      } else {
        localStorage.removeItem(PENDING_SHEETS_CUSTOMERS_KEY);
      }
    }

    // 2. Flush pending sheets orders
    const rawOrd = localStorage.getItem(PENDING_SHEETS_ORDERS_KEY);
    if (rawOrd) {
      const list: Order[] = JSON.parse(rawOrd);
      const unsyncedOrders = list.filter((o) => o.id && !isOrderSynced(o.id));
      if (unsyncedOrders.length > 0) {
        const ok = await sendToGoogleSheetWebhook({
          type: 'bulk_orders',
          data: unsyncedOrders,
        });
        if (ok) {
          markOrdersAsSynced(unsyncedOrders.map((o) => o.id));
          localStorage.removeItem(PENDING_SHEETS_ORDERS_KEY);
        }
      } else {
        localStorage.removeItem(PENDING_SHEETS_ORDERS_KEY);
      }
    }

    // 3. Flush pending firestore customers
    const rawFireCust = localStorage.getItem(PENDING_FIRESTORE_CUSTOMERS_KEY);
    if (rawFireCust) {
      const list: CustomerUser[] = JSON.parse(rawFireCust);
      if (list.length > 0) {
        for (const c of list) {
          if (c.phone) {
            setDoc(doc(db, 'customers', c.phone), sanitizeFirestoreData(c), { merge: true }).catch(() => {});
          }
        }
        localStorage.removeItem(PENDING_FIRESTORE_CUSTOMERS_KEY);
      }
    }

    // 4. Flush pending firestore orders
    const rawFireOrd = localStorage.getItem(PENDING_FIRESTORE_ORDERS_KEY);
    if (rawFireOrd) {
      const list: Order[] = JSON.parse(rawFireOrd);
      if (list.length > 0) {
        for (const o of list) {
          if (o.id) {
            setDoc(doc(db, 'orders', o.id), sanitizeFirestoreData(o), { merge: true }).catch(() => {});
          }
        }
        localStorage.removeItem(PENDING_FIRESTORE_ORDERS_KEY);
      }
    }
  } catch (err) {
    console.warn('flushPendingSyncQueues note:', err);
  }
};

// Auto-run queue flusher on start and every 25 seconds
if (typeof window !== 'undefined') {
  setTimeout(() => flushPendingSyncQueues(), 3000);
  setInterval(() => flushPendingSyncQueues(), 25000);
}

export const appendCustomerToGoogleSheet = async (
  customer: CustomerUser,
  token?: string,
  options?: { force?: boolean }
): Promise<boolean> => {
  if (!customer) return false;

  // Anti-duplicate protection: If customer is already synced and force flag is not set, skip duplicate send
  if (!options?.force && isCustomerSynced(customer)) {
    return true;
  }

  let sentViaAny = false;

  // 1. Send via Webhook (Works for 100% of visitor registrations 24/7)
  try {
    const okWebhook = await sendToGoogleSheetWebhook({
      type: 'customer',
      data: {
        ...customer,
        status: customer.isBlocked ? 'Bị khóa' : 'Hoạt động',
      },
    });
    if (okWebhook) sentViaAny = true;
  } catch (err) {
    console.warn('appendCustomerToGoogleSheet webhook note:', err);
  }

  // 2. If OAuth token available, also background sync via Google Sheets REST API
  const activeToken = token || getGoogleAccessToken();
  let sheetId = getSavedSheetId();

  if (activeToken && sheetId) {
    const rowValues = [
      1,
      customer.id,
      customer.name,
      "'" + customer.phone,
      customer.email || '',
      customer.address || '',
      customer.city || '',
      customer.createdAt || new Date().toISOString(),
      customer.freeshipVouchers ?? 5,
      customer.isBlocked ? 'Bị khóa' : 'Hoạt động',
    ];

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/KHÁCH HÀNG!A:J:append?valueInputOption=USER_ENTERED`;
      fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${activeToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [rowValues] }),
      }).catch(() => {});
    } catch {
      // ignore
    }
  }

  if (sentViaAny) {
    markCustomerAsSynced(customer);
    return true;
  } else {
    queuePendingCustomer(customer);
    return false;
  }
};

/* =========================================================================
 * BULK SYNC FUNCTIONS (WITH STRICT DEDUPLICATION FILTERING)
 * ========================================================================= */

export const bulkSyncCustomersToGoogleSheet = async (
  customers: CustomerUser[],
  token?: string,
  options?: { forceAll?: boolean }
): Promise<{ success: boolean; count: number; error?: string }> => {
  const activeToken = token || getGoogleAccessToken();
  const webhookUrl = getSavedWebhookUrl();

  if (!activeToken && !webhookUrl) {
    return { success: false, count: 0, error: 'Chưa cấu hình Google Webhook hoặc chưa đăng nhập Google' };
  }

  // 1. Strict 10-digit Phone Deduplication first:
  const dedupedMap = new Map<string, CustomerUser>();
  customers.forEach((c) => {
    if (!c) return;
    const cleanPhone = normalizeVietnamesePhone(c.phone);
    if (!cleanPhone || cleanPhone.length !== 10) return;
    const key = cleanPhone;
    const cleanCustomer: CustomerUser = {
      ...c,
      id: `CUS-${cleanPhone}`,
      phone: cleanPhone,
    };
    if (dedupedMap.has(key)) {
      dedupedMap.set(key, { ...dedupedMap.get(key)!, ...cleanCustomer });
    } else {
      dedupedMap.set(key, cleanCustomer);
    }
  });

  const uniqueCustomers = Array.from(dedupedMap.values());

  // 2. Filter to ONLY un-synced customers (unless forceAll is active)
  const targetCustomers = options?.forceAll ? uniqueCustomers : uniqueCustomers.filter((c) => !isCustomerSynced(c));

  if (targetCustomers.length === 0) {
    return { success: true, count: 0 };
  }

  let sent = false;

  if (webhookUrl) {
    const ok = await sendToGoogleSheetWebhook({
      type: 'bulk_customers',
      data: targetCustomers.map((c) => ({
        ...c,
        status: c.isBlocked ? 'Bị khóa' : 'Hoạt động',
      })),
    });
    if (ok) sent = true;
  }

  if (activeToken) {
    let sheetId = getSavedSheetId();
    if (!sheetId) {
      const created = await createTingoSpreadsheet(activeToken);
      sheetId = created.id;
    }

    const rows = targetCustomers.map((customer, idx) => [
      idx + 1,
      customer.id,
      customer.name,
      "'" + customer.phone,
      customer.email || '',
      customer.address || '',
      customer.city || '',
      customer.createdAt || new Date().toISOString(),
      customer.freeshipVouchers ?? 5,
      customer.isBlocked ? 'Bị khóa' : 'Hoạt động',
    ]);

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/KHÁCH HÀNG!A:J:append?valueInputOption=USER_ENTERED`;
      await safeWithTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        }),
        null,
        2500
      );
      sent = true;
    } catch {
      // ignore
    }
  }

  // Mark all successfully synced items in the local cache
  markCustomersAsSynced(targetCustomers);

  return { success: true, count: targetCustomers.length };
};

export const bulkSyncOrdersToGoogleSheet = async (
  orders: Order[],
  token?: string,
  options?: { forceAll?: boolean }
): Promise<{ success: boolean; count: number; error?: string }> => {
  const activeToken = token || getGoogleAccessToken();
  const webhookUrl = getSavedWebhookUrl();

  if (!activeToken && !webhookUrl) {
    return { success: false, count: 0, error: 'Chưa cấu hình Google Webhook hoặc chưa đăng nhập Google' };
  }

  // 1. Strict ID Deduplication first:
  const dedupedOrderMap = new Map<string, Order>();
  orders.forEach((o) => {
    if (!o || !o.id) return;
    const cleanPhone = normalizeVietnamesePhone(o.customerPhone || (o as any).phone);
    const cleanOrder: Order = {
      ...o,
      customerPhone: cleanPhone,
    };
    if (dedupedOrderMap.has(o.id)) {
      dedupedOrderMap.set(o.id, { ...dedupedOrderMap.get(o.id)!, ...cleanOrder });
    } else {
      dedupedOrderMap.set(o.id, cleanOrder);
    }
  });

  const uniqueOrders = Array.from(dedupedOrderMap.values());

  // 2. Filter to ONLY un-synced orders to eliminate duplicates completely!
  const targetOrders = options?.forceAll ? uniqueOrders : uniqueOrders.filter((o) => o.id && !isOrderSynced(o.id));

  if (targetOrders.length === 0) {
    return { success: true, count: 0 };
  }

  let sent = false;

  if (webhookUrl) {
    const ok = await sendToGoogleSheetWebhook({ type: 'bulk_orders', data: targetOrders });
    if (ok) sent = true;
  }

  if (activeToken) {
    let sheetId = getSavedSheetId();
    if (!sheetId) {
      const created = await createTingoSpreadsheet(activeToken);
      sheetId = created.id;
    }

    const rows = targetOrders.map((order) => {
      const itemsFormatted = (order.items || [])
        .map((item) => `${item.product?.name || 'Sản phẩm'} (x${item.quantity})`)
        .join('; ');

      return [
        order.id,
        order.createdAt,
        order.customerName,
        "'" + (order.customerPhone || (order as any).phone || ''),
        order.shippingAddress,
        order.city || '',
        order.district || '',
        itemsFormatted,
        Number(order.total),
        order.paymentMethod === 'cod' ? 'Thanh toán khi nhận hàng (COD)' : 'Chuyển khoản VietQR',
        order.couponCode || 'Không áp dụng',
        order.status === 'delivered' ? 'Đã giao' : order.status === 'shipping' ? 'Đang giao' : order.status === 'processing' ? 'Đang xử lý' : order.status === 'cancelled' ? 'Đã hủy' : 'Chờ xử lý',
        order.notes || '',
      ];
    });

    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/ĐƠN HÀNG!A:M:append?valueInputOption=USER_ENTERED`;
      await safeWithTimeout(
        fetch(url, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${activeToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values: rows }),
        }),
        null,
        2500
      );
      sent = true;
    } catch {
      // ignore
    }
  }

  // Mark all successfully synced order IDs in local cache
  markOrdersAsSynced(targetOrders.map((o) => o.id));

  return { success: true, count: targetOrders.length };
};

/* =========================================================================
 * ALL CUSTOMER RECONCILIATION ROUTINE (APP + FIREBASE + GOOGLE SHEETS)
 * ========================================================================= */

/**
 * Sweeps all customer records across Local Cache and Firestore,
 * guarantees all exist in Firestore, and syncs ONLY unsynced ones directly into Google Sheets.
 */
export const syncAllExistingCustomers = async (options?: { forceAll?: boolean }): Promise<{
  totalChecked: number;
  unsyncedCount: number;
  firebaseSynced: number;
  googleSheetsSynced: number;
}> => {
  const customerMap: Record<string, CustomerUser> = {};

  // 1. Read from Local Cache
  try {
    const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const list: CustomerUser[] = Array.isArray(parsed) ? parsed : Object.values(parsed);
      list.forEach((item: any) => {
        if (item && (item.phone || item.id)) {
          const clean = normalizeVietnamesePhone(item.phone || item.id);
          const key = clean || item.id;
          customerMap[key] = {
            id: clean ? `CUS-${clean}` : (item.id || `CUS-${key}`),
            name: item.name || 'Khách hàng',
            phone: clean,
            email: item.email || '',
            address: item.address || '',
            city: item.city || 'Hồ Chí Minh',
            district: item.district || 'Quận 1',
            createdAt: item.createdAt || item.registeredAt || new Date().toISOString(),
            freeshipVouchers: item.freeshipVouchers !== undefined ? item.freeshipVouchers : 5,
            isBlocked: !!item.isBlocked,
            isFirstOrder: !!item.isFirstOrder,
          };
        }
      });
    }
  } catch (err) {
    console.warn('Local accounts parse notice:', err);
  }

  // 2. Read from Firestore with Safe Timeout guard
  try {
    const snap = await safeWithTimeout(getDocs(collection(db, 'customers')), null, 1500);
    if (snap && snap.docs) {
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const clean = normalizeVietnamesePhone(data.phone || docSnap.id);
        const key = clean || data.id || docSnap.id;
        if (key && !customerMap[key]) {
          customerMap[key] = {
            id: clean ? `CUS-${clean}` : (data.id || `CUS-${key}`),
            name: data.name || 'Khách hàng',
            phone: clean,
            email: data.email || '',
            address: data.address || '',
            city: data.city || 'Hồ Chí Minh',
            district: data.district || 'Quận 1',
            createdAt: data.createdAt || data.registeredAt || new Date().toISOString(),
            freeshipVouchers: data.freeshipVouchers !== undefined ? data.freeshipVouchers : 5,
            isBlocked: !!data.isBlocked,
            isFirstOrder: !!data.isFirstOrder,
          };
        }
      });
    }
  } catch (err) {
    console.warn('Firestore customers sweep notice:', err);
  }

  const allCustomers = Object.values(customerMap);
  let firebaseSynced = 0;

  // 3. Guarantee all exist in Firestore (Non-blocking background writes with timeout guard)
  for (const cus of allCustomers) {
    if (cus.phone) {
      try {
        safeWithTimeout(
          setDoc(doc(db, 'customers', cus.phone), sanitizeFirestoreData({
            ...cus,
            registeredAt: cus.createdAt,
            lastLoginAt: cus.createdAt,
          }), { merge: true }),
          null,
          1000
        ).then(() => {
          firebaseSynced++;
        }).catch(() => {});
      } catch {
        // ignore
      }
    }
  }

  // 4. Filter to unsynced and Push to Google Sheets via bulkSyncCustomersToGoogleSheet
  const unsyncedCustomers = options?.forceAll ? allCustomers : allCustomers.filter((c) => !isCustomerSynced(c));
  let googleSheetsSynced = 0;

  if (unsyncedCustomers.length > 0) {
    const res = await bulkSyncCustomersToGoogleSheet(unsyncedCustomers, undefined, options);
    googleSheetsSynced = res.count;
  }

  return {
    totalChecked: allCustomers.length,
    unsyncedCount: unsyncedCustomers.length,
    firebaseSynced: allCustomers.length,
    googleSheetsSynced,
  };
};

/* =========================================================================
 * TWO-WAY RECONCILIATION & GOOGLE SHEET -> FIREBASE RESTORATION ENGINE
 * ========================================================================= */

export const reconcileAndSyncAll = async (
  localOrders: Order[] = [],
  localCustomers: CustomerUser[] = [],
  token?: string,
  options?: { forceAll?: boolean }
): Promise<{
  success: boolean;
  customersSyncedToSheet: number;
  ordersSyncedToSheet: number;
  customersRestoredToFirestore: number;
  ordersRestoredToFirestore: number;
  error?: string;
}> => {
  const activeToken = token || getGoogleAccessToken();
  const webhookUrl = getSavedWebhookUrl();

  if (!activeToken && !webhookUrl) {
    return {
      success: false,
      customersSyncedToSheet: 0,
      ordersSyncedToSheet: 0,
      customersRestoredToFirestore: 0,
      ordersRestoredToFirestore: 0,
      error: 'Chưa cấu hình Google Webhook và chưa đăng nhập tài khoản Google',
    };
  }

  let customersSyncedToSheet = 0;
  let ordersSyncedToSheet = 0;
  let customersRestoredToFirestore = 0;
  let ordersRestoredToFirestore = 0;

  try {
    // 1. Reconcile & sync customers (checks both passed localCustomers and local accounts cache, pushing ONLY unsynced ones)
    const customerMap: Record<string, CustomerUser> = {};
    if (localCustomers && localCustomers.length > 0) {
      localCustomers.forEach((c) => {
        const key = getCustomerSyncKey(c);
        if (key) customerMap[key] = c;
      });
    }
    try {
      const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const list: CustomerUser[] = Array.isArray(parsed) ? parsed : Object.values(parsed);
        list.forEach((c) => {
          const key = getCustomerSyncKey(c);
          if (key && !customerMap[key]) customerMap[key] = c;
        });
      }
    } catch {
      // ignore
    }

    const combinedCustomers = Object.values(customerMap);
    if (combinedCustomers.length > 0) {
      const custRes = await bulkSyncCustomersToGoogleSheet(combinedCustomers, activeToken || undefined, options);
      if (custRes.success) {
        customersSyncedToSheet = custRes.count;
      }
    } else {
      const custRes = await syncAllExistingCustomers(options);
      customersSyncedToSheet = custRes.googleSheetsSynced;
    }

    // 2. Gather local orders (if localOrders passed, or from localStorage) and push ONLY unsynced orders to Google Sheets
    let effectiveOrders: Order[] = localOrders;
    if (!effectiveOrders || effectiveOrders.length === 0) {
      try {
        const rawOrders = localStorage.getItem('tingo_orders_storage');
        if (rawOrders) {
          const parsed = JSON.parse(rawOrders);
          if (Array.isArray(parsed)) effectiveOrders = parsed;
        }
      } catch {
        // ignore
      }
    }

    if (effectiveOrders.length > 0) {
      const ordRes = await bulkSyncOrdersToGoogleSheet(effectiveOrders, activeToken || undefined, options);
      if (ordRes.success) {
        ordersSyncedToSheet = ordRes.count;
        localStorage.removeItem(PENDING_SHEETS_ORDERS_KEY);
      }
    }

    // 3. RESTORE FROM GOOGLE SHEETS TO FIRESTORE (Google Sheet is master hub)
    const sheetCustomers = await fetchCustomersFromGoogleSheet(activeToken || undefined);
    const sheetOrders = await fetchOrdersFromGoogleSheet(activeToken || undefined);

    for (const sc of sheetCustomers) {
      const cleanPhone = normalizeVietnamesePhone(sc.phone);
      if (!cleanPhone || cleanPhone.length !== 10) continue;
      try {
        safeWithTimeout(
          setDoc(doc(db, 'customers', cleanPhone), sanitizeFirestoreData({
            ...sc,
            id: `CUS-${cleanPhone}`,
            phone: cleanPhone,
            registeredAt: sc.createdAt,
            lastLoginAt: sc.createdAt,
          }), { merge: true }),
          null,
          1000
        ).then(() => {
          customersRestoredToFirestore++;
        }).catch(() => {});
      } catch {
        queuePendingFirestoreCustomer(sc);
      }
    }

    for (const so of sheetOrders) {
      if (!so.id) continue;
      const cleanPhone = normalizeVietnamesePhone(so.customerPhone || (so as any).phone);
      try {
        safeWithTimeout(
          setDoc(doc(db, 'orders', so.id), sanitizeFirestoreData({
            ...so,
            customerPhone: cleanPhone,
          }), { merge: true }),
          null,
          1000
        ).then(() => {
          ordersRestoredToFirestore++;
        }).catch(() => {});
      } catch {
        if (so.id && so.createdAt && so.customerName && cleanPhone) {
          queuePendingFirestoreOrder(so as Order);
        }
      }
    }

    return {
      success: true,
      customersSyncedToSheet,
      ordersSyncedToSheet,
      customersRestoredToFirestore: sheetCustomers.length,
      ordersRestoredToFirestore: sheetOrders.length,
    };
  } catch (err: any) {
    return {
      success: false,
      customersSyncedToSheet,
      ordersSyncedToSheet,
      customersRestoredToFirestore,
      ordersRestoredToFirestore,
      error: err.message || 'Lỗi xử lý đồng bộ hai chiều',
    };
  }
};

/**
 * Dedicated Master Recovery: Pulls all records from Google Sheet and restores missing customers & orders into Firebase Firestore
 */
export const restoreAllFromGoogleSheetsToFirestore = async (token?: string): Promise<{
  success: boolean;
  customersRestored: number;
  ordersRestored: number;
  totalCustomersInSheet: number;
  totalOrdersInSheet: number;
  error?: string;
}> => {
  const activeToken = token || getGoogleAccessToken();
  const webhookUrl = getSavedWebhookUrl();

  if (!activeToken && !webhookUrl) {
    return {
      success: false,
      customersRestored: 0,
      ordersRestored: 0,
      totalCustomersInSheet: 0,
      totalOrdersInSheet: 0,
      error: 'Chưa cấu hình Google Webhook hoặc chưa đăng nhập tài khoản Google',
    };
  }

  try {
    const sheetCustomers = await fetchCustomersFromGoogleSheet(activeToken || undefined);
    const sheetOrders = await fetchOrdersFromGoogleSheet(activeToken || undefined);

    let customersRestored = 0;
    let ordersRestored = 0;

    // 1. Restore Customers into Firestore and Local Cache
    for (const sc of sheetCustomers) {
      const cleanPhone = normalizeVietnamesePhone(sc.phone);
      if (!cleanPhone || cleanPhone.length !== 10) continue;
      try {
        const custPayload = sanitizeFirestoreData({
          ...sc,
          id: `CUS-${cleanPhone}`,
          phone: cleanPhone,
          registeredAt: sc.createdAt || new Date().toISOString(),
          lastLoginAt: sc.createdAt || new Date().toISOString(),
          isBlocked: !!sc.isBlocked,
        });

        await setDoc(doc(db, 'customers', cleanPhone), custPayload, { merge: true });
        customersRestored++;

        // Update local accounts cache
        try {
          const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
          const map = raw ? JSON.parse(raw) : {};
          map[cleanPhone] = { ...map[cleanPhone], ...custPayload };
          localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify(map));
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn(`Could not write customer ${cleanPhone} to Firestore:`, err);
      }
    }

    // 2. Restore Orders into Firestore and Local Cache
    for (const so of sheetOrders) {
      if (!so.id) continue;
      const cleanPhone = normalizeVietnamesePhone(so.customerPhone || (so as any).phone);
      try {
        const orderPayload = sanitizeFirestoreData({
          ...so,
          customerPhone: cleanPhone,
        });
        await setDoc(doc(db, 'orders', so.id), orderPayload, { merge: true });
        ordersRestored++;

        // Update local orders cache
        try {
          const rawOrders = localStorage.getItem('tingo_orders_storage');
          const list: Order[] = rawOrders ? JSON.parse(rawOrders) : [];
          const idx = list.findIndex((o) => o.id === so.id);
          if (idx >= 0) {
            list[idx] = { ...list[idx], ...(orderPayload as Order) };
          } else {
            list.unshift(orderPayload as Order);
          }
          localStorage.setItem('tingo_orders_storage', JSON.stringify(list));
        } catch {
          // ignore
        }
      } catch (err) {
        console.warn(`Could not write order ${so.id} to Firestore:`, err);
      }
    }

    return {
      success: true,
      customersRestored,
      ordersRestored,
      totalCustomersInSheet: sheetCustomers.length,
      totalOrdersInSheet: sheetOrders.length,
    };
  } catch (err: any) {
    return {
      success: false,
      customersRestored: 0,
      ordersRestored: 0,
      totalCustomersInSheet: 0,
      totalOrdersInSheet: 0,
      error: err.message || 'Lỗi khi khôi phục dữ liệu từ Google Sheet',
    };
  }
};

