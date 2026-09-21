import { useState, useEffect } from 'react';

/**
 * Product Stats & Sold Counter Manager (Lượt bán sản phẩm)
 * Logic quy định:
 * - 10 lượt nhấp (views / clicks / interactions) = 1 lượt bán tăng thêm (+1 Đã bán)
 * - Cập nhật gom theo ngày (Batch update daily), không nhảy số đột ngột sau mỗi lượt nhấp đơn lẻ.
 */

const STATS_STORAGE_KEY = 'tingo_product_clicks_stats_v2';

interface ProductStatsRecord {
  totalClicks: number;       // Tổng số lượt nhấp tích lũy
  todayClicks: number;       // Lượt nhấp tích lũy trong ngày hiện tại
  lastSettledDate: string;   // Ngày chốt lượt bán gần nhất (YYYY-MM-DD)
  baseSold: number;          // Lượt bán cơ sở
  settledSoldBonus: number;  // Số lượt bán đã chốt từ các ngày trước đó
}

// Lượt bán cơ sở ban đầu tạo độ uy tín cho từng sản phẩm
const DEFAULT_BASE_SOLD: Record<string, number> = {
  'tingo-vhealth-duo': 1240,
  'tingo-quantum-water': 890,
  'tingo-vsportgel': 670,
  'tingo-vhealth-tra-xanh': 540,
  'tingo-caphe-link': 480,
  'tingo-vhealth-socola': 620,
};

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function getStoredStats(): Record<string, ProductStatsRecord> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredStats(stats: Record<string, ProductStatsRecord>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {
    // ignore
  }
}

/**
 * Settle daily clicks into sold count:
 * Converts accumulated clicks (10 clicks = 1 sold) when day rolls over or on daily sync.
 */
function settleRecordIfNeeded(record: ProductStatsRecord, today: string): ProductStatsRecord {
  if (!record.lastSettledDate) {
    record.lastSettledDate = today;
    return record;
  }

  // If a new day has arrived since last settlement
  if (record.lastSettledDate !== today) {
    // Every 10 clicks in the past period adds 1 to settled sold bonus
    const additionalSold = Math.floor(record.todayClicks / 10);
    record.settledSoldBonus = (record.settledSoldBonus || 0) + additionalSold;
    // Remainder clicks roll over
    record.todayClicks = record.todayClicks % 10;
    record.lastSettledDate = today;
  }

  return record;
}

/**
 * Ghi nhận lượt nhấp/tương tác vào sản phẩm.
 * Tăng bộ đếm lượt nhấp nhưng bảo toàn lượt bán theo chu kỳ ngày (10 nhấp = 1 bán).
 */
export function recordProductInteraction(productId: string, initialBaseSold?: number): number {
  if (!productId) return 0;
  const stats = getStoredStats();
  const today = getTodayString();
  const base =
    initialBaseSold !== undefined
      ? initialBaseSold
      : DEFAULT_BASE_SOLD[productId] || 250;

  let currentRecord = stats[productId] || {
    totalClicks: 0,
    todayClicks: 0,
    lastSettledDate: today,
    baseSold: base,
    settledSoldBonus: 0,
  };

  currentRecord = settleRecordIfNeeded(currentRecord, today);

  // Increment clicks
  currentRecord.totalClicks = (currentRecord.totalClicks || 0) + 1;
  currentRecord.todayClicks = (currentRecord.todayClicks || 0) + 1;
  currentRecord.baseSold = currentRecord.baseSold || base;

  stats[productId] = currentRecord;
  saveStoredStats(stats);

  const totalSold = calculateTotalSold(productId, currentRecord.baseSold);

  // Dispatch custom event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tingo-product-stats-updated', {
        detail: {
          productId,
          totalClicks: currentRecord.totalClicks,
          todayClicks: currentRecord.todayClicks,
          soldCount: totalSold,
        },
      })
    );
  }

  return totalSold;
}

/**
 * Tính toán lượt bán hiển thị cho sản phẩm:
 * = baseSold + settledSoldBonus (đã chốt theo chu kỳ ngày với tỷ lệ 10 nhấp = 1 bán)
 */
export function calculateTotalSold(productId: string, fallbackBase?: number): number {
  const stats = getStoredStats();
  const today = getTodayString();
  let record = stats[productId];

  const base =
    fallbackBase !== undefined
      ? fallbackBase
      : record?.baseSold || DEFAULT_BASE_SOLD[productId] || 250;

  if (!record) {
    return base;
  }

  record = settleRecordIfNeeded(record, today);
  const settledBonus = record.settledSoldBonus || 0;

  return base + settledBonus;
}

/**
 * Lấy tổng số lượt nhấp của sản phẩm
 */
export function getProductClicks(productId: string): number {
  const stats = getStoredStats();
  return stats[productId]?.totalClicks || 0;
}

/**
 * Định dạng số lượng đã bán gọn gàng (VD: 1.2k hoặc 890)
 */
export function formatSoldCount(sold: number): string {
  if (sold >= 1000) {
    const kVal = (sold / 1000).toFixed(1).replace('.0', '');
    return `${kVal}k`;
  }
  return sold.toLocaleString('vi-VN');
}

/**
 * React hook lấy số lượng đã bán ổn định theo ngày cho sản phẩm
 */
export function useProductSold(productId: string, initialBase?: number) {
  const [sold, setSold] = useState<number>(() => calculateTotalSold(productId, initialBase));
  const [clicks, setClicks] = useState<number>(() => getProductClicks(productId));

  useEffect(() => {
    setSold(calculateTotalSold(productId, initialBase));
    setClicks(getProductClicks(productId));

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId: string; totalClicks: number; soldCount: number }>;
      if (customEvent.detail && customEvent.detail.productId === productId) {
        setSold(customEvent.detail.soldCount);
        setClicks(customEvent.detail.totalClicks);
      }
    };

    window.addEventListener('tingo-product-stats-updated', handleUpdate);
    return () => window.removeEventListener('tingo-product-stats-updated', handleUpdate);
  }, [productId, initialBase]);

  return { soldCount: sold, clicks, formattedSold: formatSoldCount(sold) };
}
