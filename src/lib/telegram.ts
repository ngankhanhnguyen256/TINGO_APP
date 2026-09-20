import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { CustomerUser, Order } from '../types';
import { formatVietnameseDateTime } from '../utils/dateFormatter';

export interface TelegramConfig {
  botToken: string;
  chatId: string;
  enabledNewCustomer: boolean;
  enabledNewOrder: boolean;
  notifyOnAdminLogin?: boolean;
}

const STORAGE_KEY = 'tingo_telegram_config';

const DEFAULT_CONFIG: TelegramConfig = {
  botToken: '',
  chatId: '',
  enabledNewCustomer: true,
  enabledNewOrder: true,
  notifyOnAdminLogin: false,
};

/**
 * Load Telegram settings from localStorage and/or Firestore
 */
export const getTelegramConfig = async (): Promise<TelegramConfig> => {
  // 1. Try Firestore first
  try {
    const docSnap = await getDoc(doc(db, 'system_settings', 'telegram'));
    if (docSnap.exists()) {
      const data = docSnap.data() as Partial<TelegramConfig>;
      const config: TelegramConfig = {
        ...DEFAULT_CONFIG,
        ...data,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      return config;
    }
  } catch (err) {
    console.warn('Firestore telegram config fetch note:', err);
  }

  // 2. Fallback to LocalStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    }
  } catch {
    // ignore
  }

  return DEFAULT_CONFIG;
};

/**
 * Save Telegram settings to both Firestore and LocalStorage
 */
export const saveTelegramConfig = async (config: TelegramConfig): Promise<boolean> => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    await setDoc(doc(db, 'system_settings', 'telegram'), config, { merge: true });
    return true;
  } catch (err) {
    console.warn('Save telegram config note:', err);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  }
};

/**
 * Send raw HTML-formatted text via Telegram Bot API
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
    const response = await fetch(url, {
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

    const data = await response.json();
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
      console.log('Telegram registration notification skipped (Bot token or Chat ID not configured yet in Admin).');
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID' };
    }

    const timeStr = formatVietnameseDateTime(user.createdAt || new Date().toISOString(), true);

    const message = `
🎉 <b>KHÁCH HÀNG MỚI ĐĂNG KÝ TÀI KHOẢN TINGO!</b>
━━━━━━━━━━━━━━━━━━━━
👤 <b>Họ và tên:</b> ${user.name}
📱 <b>Số điện thoại:</b> <code>${user.phone}</code>
📧 <b>Email:</b> ${user.email || 'Chưa cung cấp'}
🏠 <b>Khu vực:</b> ${user.district ? `${user.district}, ` : ''}${user.city || 'Hồ Chí Minh'}
${user.address ? `📍 <b>Địa chỉ:</b> ${user.address}\n` : ''}🎁 <b>Ưu đãi tặng:</b> ${user.freeshipVouchers || 5} Mã Freeship + Voucher 20K Chào Bạn Mới
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
      console.log('Telegram order notification not sent (Bot token or Chat ID not configured yet in Admin).');
      return { success: false, error: 'Chưa cấu hình Telegram Bot Token hoặc Chat ID' };
    }

    const itemsSummary = order.items
      .map(
        (it, idx) =>
          `  ${idx + 1}. <b>${it.product.name}</b> x${it.quantity} (${(
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

    const message = `
🛍️ <b>ĐƠN HÀNG MỚI PHÁT SINH!</b>
━━━━━━━━━━━━━━━━━━━━
📦 <b>Mã đơn hàng:</b> <code>#${order.id}</code>
👤 <b>Khách hàng:</b> ${order.customerName}
📞 <b>Số điện thoại:</b> <code>${order.customerPhone}</code>
📍 <b>Địa chỉ:</b> ${order.shippingAddress}
${order.customerEmail ? `📧 <b>Email:</b> ${order.customerEmail}\n` : ''}
🛒 <b>Danh sách sản phẩm (${order.items.reduce((s, i) => s + i.quantity, 0)} món):</b>
${itemsSummary}

💰 <b>Tạm tính:</b> ${(order.subtotal || 0).toLocaleString('vi-VN')}đ
${
  order.discountAmount
    ? `🎁 <b>Giảm giá (${order.couponCode || 'Voucher'}):</b> -${order.discountAmount.toLocaleString(
        'vi-VN'
      )}đ\n`
    : ''
}🚚 <b>Phí vận chuyển:</b> ${(order.shippingFee || 0).toLocaleString('vi-VN')}đ
🔥 <b>TỔNG THANH TOÁN:</b> <b>${order.total.toLocaleString('vi-VN')}đ</b>
💳 <b>Phương thức:</b> ${paymentLabel}
${order.notes ? `📝 <b>Ghi chú của khách:</b> <i>${order.notes}</i>\n` : ''}
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
