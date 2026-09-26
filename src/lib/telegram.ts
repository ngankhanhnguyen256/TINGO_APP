import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CustomerUser, Order } from '../types';
import { formatVietnameseDateTime } from '../utils/dateFormatter';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabledNewCustomer: boolean;
  enabledNewOrder: boolean;
  enabledCancelOrder?: boolean;
  notifyOnAdminLogin?: boolean;
}

const STORAGE_KEY = 'tingo_telegram_config';

const DEFAULT_CONFIG: TelegramConfig = {
  botToken: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_BOT_TOKEN) || '',
  chatId: (typeof import.meta !== 'undefined' && import.meta.env?.VITE_TELEGRAM_CHAT_ID) || '',
  enabledNewCustomer: true,
  enabledNewOrder: true,
  enabledCancelOrder: true,
  notifyOnAdminLogin: false,
};

// In-memory runtime cache for instantaneous access
let cachedConfig: TelegramConfig | null = null;

/**
 * Escape HTML special characters for safe Telegram parse_mode: 'HTML'
 */
export const escapeTelegramHtml = (str?: string | number | null): string => {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Load Telegram settings from memory, Environment Variables, LocalStorage, and/or Firestore
 * Prioritizes Env Vars and LocalStorage first to ensure zero downtime when Firebase hits Quota limits.
 */
export const getTelegramConfig = async (): Promise<TelegramConfig> => {
  // 1. Try in-memory cached config first if valid
  if (cachedConfig && cachedConfig.botToken && cachedConfig.chatId) {
    return cachedConfig;
  }

  // 2. Check Environment Variables (VITE_TELEGRAM_BOT_TOKEN & VITE_TELEGRAM_CHAT_ID)
  const envToken = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TELEGRAM_BOT_TOKEN : '';
  const envChatId = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TELEGRAM_CHAT_ID : '';
  if (envToken && envChatId) {
    const config: TelegramConfig = {
      ...DEFAULT_CONFIG,
      botToken: envToken.trim(),
      chatId: envChatId.trim(),
    };
    cachedConfig = config;
    return config;
  }

  // 3. Try LocalStorage (instant, zero network latency)
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && (parsed.botToken || parsed.chatId)) {
        const config: TelegramConfig = {
          ...DEFAULT_CONFIG,
          ...parsed,
          botToken: (parsed.botToken || envToken || '').trim(),
          chatId: (parsed.chatId || envChatId || '').trim(),
        };
        cachedConfig = config;
        return config;
      }
    }
  } catch {
    // ignore
  }

  // 4. Fallback to Firestore with safety timeout (doesn't block if Firebase quota exceeded)
  try {
    const fetchDocPromise = getDoc(doc(db, 'system_settings', 'telegram'));
    const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 1200));
    const docSnap: any = await Promise.race([fetchDocPromise, timeoutPromise]);
    
    if (docSnap && docSnap.exists && docSnap.exists()) {
      const data = docSnap.data() as Partial<TelegramConfig>;
      const config: TelegramConfig = {
        ...DEFAULT_CONFIG,
        ...data,
        botToken: (data.botToken || envToken || '').trim(),
        chatId: (data.chatId || envChatId || '').trim(),
      };
      if (config.botToken && config.chatId) {
        cachedConfig = config;
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch {
          // ignore
        }
        return config;
      }
    }
  } catch (err) {
    console.warn('Firestore telegram config fetch note (using fallback):', err);
  }

  return {
    ...DEFAULT_CONFIG,
    botToken: envToken || DEFAULT_CONFIG.botToken,
    chatId: envChatId || DEFAULT_CONFIG.chatId,
  };
};

/**
 * Save Telegram settings to memory, Firestore and LocalStorage
 */
export const saveTelegramConfig = async (config: TelegramConfig): Promise<boolean> => {
  const cleanConfig: TelegramConfig = {
    botToken: (config.botToken || '').trim(),
    chatId: (config.chatId || '').trim(),
    enabledNewCustomer: config.enabledNewCustomer !== false,
    enabledNewOrder: config.enabledNewOrder !== false,
    notifyOnAdminLogin: !!config.notifyOnAdminLogin,
  };

  cachedConfig = cleanConfig;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanConfig));
    await setDoc(doc(db, 'system_settings', 'telegram'), cleanConfig, { merge: true });
    return true;
  } catch (err) {
    console.warn('Save telegram config note:', err);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanConfig));
    return true;
  }
};

/**
 * Send text via Telegram Bot API with HTML parse_mode and auto-fallback to Plain Text
 */
export const sendTelegramMessage = async (
  text: string,
  customConfig?: { botToken?: string; chatId?: string }
): Promise<{ success: boolean; error?: string }> => {
  try {
    let token = customConfig?.botToken;
    let chatId = customConfig?.chatId;

    if (!token || !chatId) {
      const config = await getTelegramConfig();
      token = token || config.botToken;
      chatId = chatId || config.chatId;
    }

    if (!token || !chatId) {
      return { success: false, error: 'Chưa cấu hình Bot Token hoặc Chat ID Telegram' };
    }

    const cleanToken = token.trim();
    const cleanChatId = chatId.trim();

    const url = `https://api.telegram.org/bot${cleanToken}/sendMessage`;

    // Attempt 1: Send with HTML parse mode
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    let data = await response.json();

    // If HTML mode failed (e.g., parse error), fallback to plain text stripping HTML tags
    if (!data.ok) {
      console.warn('Telegram HTML parse warning, attempting plain text fallback:', data.description);
      const plainText = text
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]*>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');

      response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: plainText,
          disable_web_page_preview: true,
        }),
      });
      data = await response.json();
    }

    if (!data.ok) {
      return { success: false, error: data.description || 'Lỗi từ Telegram API' };
    }

    return { success: true };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Không thể kết nối tới máy chủ Telegram',
    };
  }
};

/**
 * Notify when a new customer registers on the web application
 */
export const notifyNewRegistration = async (
  user: CustomerUser
): Promise<{ success: boolean; error?: string }> => {
  try {
    const config = await getTelegramConfig();
    const isEnabled = config.enabledNewCustomer !== false;

    if (!isEnabled || !config.botToken || !config.chatId) {
      console.log('Telegram registration notification skipped (Bot token or Chat ID not configured yet).');
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID' };
    }

    const timeStr = formatVietnameseDateTime(user.createdAt || new Date().toISOString(), true);
    const safeName = escapeTelegramHtml(user.name);
    const safePhone = escapeTelegramHtml(user.phone);
    const safeEmail = escapeTelegramHtml(user.email || 'Chưa cung cấp');
    const safeCity = escapeTelegramHtml(user.city || 'Hồ Chí Minh');
    const safeDistrict = escapeTelegramHtml(user.district || '');
    const safeAddress = escapeTelegramHtml(user.address || '');

    const message = `
🎉 <b>KHÁCH HÀNG MỚI ĐĂNG KÝ TÀI KHOẢN TINGO!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Họ và tên:</b> ${safeName}
📱 <b>Số điện thoại:</b> <code>${safePhone}</code>
📧 <b>Email:</b> ${safeEmail}
🏠 <b>Khu vực:</b> ${safeDistrict ? `${safeDistrict}, ` : ''}${safeCity}
${safeAddress ? `📍 <b>Địa chỉ:</b> ${safeAddress}\n` : ''}🎁 <b>Ưu đãi tặng:</b> ${user.freeshipVouchers || 5} Mã Freeship + Voucher 20K Chào Bạn Mới
⏰ <b>Thời gian:</b> ${timeStr}
━━━━━━━━━━━━━━━━━━━━
🌐 <i>Hệ Thống Bán Hàng TINGO Store Real-time</i>
`.trim();

    const res = await sendTelegramMessage(message, config);
    return res;
  } catch (err: any) {
    console.warn('Telegram registration notification error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Notify when a new order is placed
 */
export const notifyNewOrder = async (order: Order): Promise<{ success: boolean; error?: string }> => {
  try {
    const config = await getTelegramConfig();
    if (!config.enabledNewOrder || !config.botToken || !config.chatId) {
      console.log('Telegram order notification not sent (Bot token or Chat ID not configured yet).');
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID' };
    }

    const itemsSummary = order.items
      .map(
        (it, idx) =>
          `  ${idx + 1}. <b>${escapeTelegramHtml(it.product.name)}</b> x${it.quantity} (${(
            it.quantity * it.product.price
          ).toLocaleString('vi-VN')}đ)`
      )
      .join('\n');

    const paymentLabel =
      order.paymentMethod === 'vietqr'
        ? '💳 Chuyển khoản VietQR'
        : order.paymentMethod === 'momo'
        ? '📱 Ví MoMo'
        : '💵 Tiền mặt khi nhận hàng (COD)';

    const formattedTime = formatVietnameseDateTime(order.createdAt, true);
    const safeId = escapeTelegramHtml(order.id);
    const safeCustomerName = escapeTelegramHtml(order.customerName);
    const safePhone = escapeTelegramHtml(order.customerPhone);
    const safeShippingAddress = escapeTelegramHtml(order.shippingAddress);
    const safeCustomerEmail = escapeTelegramHtml(order.customerEmail || '');
    const safeCoupon = escapeTelegramHtml(order.couponCode || 'Voucher');
    const safeNotes = escapeTelegramHtml(order.notes || '');

    const message = `
🛍️ <b>ĐƠN HÀNG MỚI PHÁT SINH!</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>Mã đơn hàng:</b> <code>#${safeId}</code>
👤 <b>Khách hàng:</b> ${safeCustomerName}
📞 <b>Số điện thoại:</b> <code>${safePhone}</code>
📍 <b>Địa chỉ:</b> ${safeShippingAddress}
${safeCustomerEmail ? `📧 <b>Email:</b> ${safeCustomerEmail}\n` : ''}
🛒 <b>Danh sách sản phẩm (${order.items.reduce((s, i) => s + i.quantity, 0)} món):</b>
${itemsSummary}

💰 <b>Tạm tính:</b> ${(order.subtotal || 0).toLocaleString('vi-VN')}đ
${
  order.discountAmount
    ? `🎁 <b>Giảm giá (${safeCoupon}):</b> -${order.discountAmount.toLocaleString(
        'vi-VN'
      )}đ\n`
    : ''
}🚚 <b>Phí vận chuyển:</b> ${(order.shippingFee || 0).toLocaleString('vi-VN')}đ
🔥 <b>TỔNG THANH TOÁN:</b> <b>${order.total.toLocaleString('vi-VN')}đ</b>
💳 <b>Phương thức:</b> ${paymentLabel}
${safeNotes ? `📝 <b>Ghi chú của khách:</b> <i>${safeNotes}</i>\n` : ''}
⏰ <b>Thời gian đặt:</b> ${formattedTime}
━━━━━━━━━━━━━━━━━━━━
⚡️ <i>Vui lòng vào trang Quản Trị TINGO để chuẩn bị & xác nhận đơn hàng!</i>
`.trim();

    const res = await sendTelegramMessage(message, config);
    return res;
  } catch (err: any) {
    console.warn('Telegram order notification error:', err);
    return { success: false, error: err.message };
  }
};

/**
 * Notify when an order is cancelled by the customer or admin
 */
export const notifyCancelOrder = async (
  order: Order,
  reason: string,
  cancelledBy: 'customer' | 'admin' = 'customer'
): Promise<{ success: boolean; error?: string }> => {
  try {
    const config = await getTelegramConfig();
    if (config.enabledCancelOrder === false || !config.botToken || !config.chatId) {
      console.log('Telegram cancel order notification not sent (disabled or bot not configured).');
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID' };
    }

    const itemsSummary = order.items
      .map(
        (it, idx) =>
          `  ${idx + 1}. <b>${escapeTelegramHtml(it.product.name)}</b> x${it.quantity} (${(
            it.quantity * it.product.price
          ).toLocaleString('vi-VN')}đ)`
      )
      .join('\n');

    const formattedTime = formatVietnameseDateTime(new Date().toISOString(), true);
    const safeId = escapeTelegramHtml(order.id);
    const safeCustomerName = escapeTelegramHtml(order.customerName);
    const safePhone = escapeTelegramHtml(order.customerPhone);
    const safeShippingAddress = escapeTelegramHtml(order.shippingAddress);
    const safeReason = escapeTelegramHtml(reason || 'Khách hàng đổi ý');
    const cancelledByLabel =
      cancelledBy === 'customer'
        ? '👤 <b>Khách hàng chủ động hủy qua trang Theo Dõi Đơn Hàng</b>'
        : '🛡️ <b>Quản trị viên (Admin TINGO) đã hủy</b>';

    const message = `
🚨 <b>THÔNG BÁO: ĐƠN HÀNG ĐÃ BỊ HỦY!</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>Mã đơn hàng:</b> <code>#${safeId}</code>
👤 <b>Khách hàng:</b> ${safeCustomerName}
📞 <b>Số điện thoại:</b> <code>${safePhone}</code>
📍 <b>Địa chỉ:</b> ${safeShippingAddress}
🚫 <b>Người thực hiện hủy:</b> ${cancelledByLabel}
📝 <b>Lý do hủy:</b> <i>${safeReason}</i>

🛒 <b>Sản phẩm đã hủy (${order.items.reduce((s, i) => s + i.quantity, 0)} món):</b>
${itemsSummary}

💰 <b>Tổng giá trị đơn hủy:</b> <b>${order.total.toLocaleString('vi-VN')}đ</b>
⏰ <b>Thời gian hủy:</b> ${formattedTime}
━━━━━━━━━━━━━━━━━━━━
⚡️ <i>Hệ thống đã tự động cập nhật trạng thái đơn hàng và tồn kho trên Trang Quản Trị TINGO.</i>
`.trim();

    const res = await sendTelegramMessage(message, config);
    return res;
  } catch (err: any) {
    console.warn('Telegram cancel order notification error:', err);
    return { success: false, error: err.message };
  }
};


