import { GoogleAuthProvider, signInWithPopup, User, onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Order, CustomerUser } from '../types';

export const GOOGLE_SHEETS_SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive.file',
];

const SHEET_ID_STORAGE_KEY = 'tingo_google_sheet_id';
const SHEET_URL_STORAGE_KEY = 'tingo_google_sheet_url';
const AUTO_SYNC_STORAGE_KEY = 'tingo_google_sheets_auto_sync';

// In-memory token cache (never stored in localStorage for security)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

const googleProvider = new GoogleAuthProvider();
GOOGLE_SHEETS_SCOPES.forEach((scope) => googleProvider.addScope(scope));

export const initGoogleAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user && cachedAccessToken) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
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
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Google Sign In Error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getGoogleAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const getSavedSheetId = (): string | null => {
  return localStorage.getItem(SHEET_ID_STORAGE_KEY);
};

export const getSavedSheetUrl = (): string | null => {
  return localStorage.getItem(SHEET_URL_STORAGE_KEY);
};

export const isAutoSyncEnabled = (): boolean => {
  const val = localStorage.getItem(AUTO_SYNC_STORAGE_KEY);
  return val === null ? true : val === 'true';
};

export const setAutoSyncEnabled = (enabled: boolean) => {
  localStorage.setItem(AUTO_SYNC_STORAGE_KEY, String(enabled));
};

/**
 * Creates a brand new Google Spreadsheet with 2 customized sheets:
 * 1. "DANH SÁCH ĐƠN HÀNG"
 * 2. "DANH SÁCH KHÁCH HÀNG"
 */
export const createTingoSpreadsheet = async (token?: string): Promise<{ id: string; url: string }> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    throw new Error('Chưa đăng nhập tài khoản Google');
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
                  { userEnteredValue: { stringValue: 'Mã Khách Hàng' } },
                  { userEnteredValue: { stringValue: 'Họ Và Tên' } },
                  { userEnteredValue: { stringValue: 'Số Điện Thoại' } },
                  { userEnteredValue: { stringValue: 'Email' } },
                  { userEnteredValue: { stringValue: 'Địa Chỉ' } },
                  { userEnteredValue: { stringValue: 'Tỉnh / Thành' } },
                  { userEnteredValue: { stringValue: 'Ngày Đăng Ký' } },
                  { userEnteredValue: { stringValue: 'Voucher Freeship' } },
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

  localStorage.setItem(SHEET_ID_STORAGE_KEY, spreadsheetId);
  localStorage.setItem(SHEET_URL_STORAGE_KEY, spreadsheetUrl);

  return { id: spreadsheetId, url: spreadsheetUrl };
};

/**
 * Appends a new Order row into Google Sheets
 */
export const appendOrderToGoogleSheet = async (
  order: Order,
  token?: string
): Promise<boolean> => {
  const activeToken = token || cachedAccessToken;
  let sheetId = getSavedSheetId();

  if (!activeToken) {
    console.warn('Google Sheets token not available for auto-sync');
    return false;
  }

  if (!sheetId) {
    try {
      const created = await createTingoSpreadsheet(activeToken);
      sheetId = created.id;
    } catch (err) {
      console.warn('Error creating new spreadsheet during append:', err);
      return false;
    }
  }

  const itemsFormatted = order.items
    .map((item) => `${item.product.name} (x${item.quantity})`)
    .join('; ');

  const rowValues = [
    order.id,
    order.createdAt,
    order.customerName,
    order.customerPhone || (order as any).phone || '',
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
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.warn('Google Sheets append order error:', errorText);
      return false;
    }

    return true;
  } catch (err) {
    console.warn('Google Sheets network warning:', err);
    return false;
  }
};

/**
 * Appends a new Customer row into Google Sheets
 */
export const appendCustomerToGoogleSheet = async (
  customer: CustomerUser,
  token?: string
): Promise<boolean> => {
  const activeToken = token || cachedAccessToken;
  let sheetId = getSavedSheetId();

  if (!activeToken) return false;

  if (!sheetId) {
    try {
      const created = await createTingoSpreadsheet(activeToken);
      sheetId = created.id;
    } catch (err) {
      return false;
    }
  }

  const rowValues = [
    customer.id,
    customer.name,
    customer.phone,
    customer.email || '',
    customer.address || '',
    customer.city || '',
    customer.createdAt || new Date().toISOString(),
    customer.freeshipVouchers ?? 5,
  ];

  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/KHÁCH HÀNG!A:H:append?valueInputOption=USER_ENTERED`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowValues],
      }),
    });

    return res.ok;
  } catch (err) {
    console.warn('Google Sheets append customer notice:', err);
    return false;
  }
};

/**
 * Syncs all orders in list to Google Sheets in bulk
 */
export const bulkSyncOrdersToGoogleSheet = async (
  orders: Order[],
  token?: string
): Promise<{ success: boolean; count: number; error?: string }> => {
  const activeToken = token || cachedAccessToken;
  if (!activeToken) {
    return { success: false, count: 0, error: 'Chưa đăng nhập tài khoản Google' };
  }

  let sheetId = getSavedSheetId();
  if (!sheetId) {
    const created = await createTingoSpreadsheet(activeToken);
    sheetId = created.id;
  }

  const rows = orders.map((order) => {
    const itemsFormatted = order.items
      .map((item) => `${item.product.name} (x${item.quantity})`)
      .join('; ');

    return [
      order.id,
      order.createdAt,
      order.customerName,
      order.customerPhone || (order as any).phone || '',
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
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${activeToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: rows,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { success: false, count: 0, error: err };
    }

    return { success: true, count: rows.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message || 'Lỗi mạng khi đồng bộ' };
  }
};
