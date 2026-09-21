import { useState, useEffect } from 'react';

/**
 * Real-time Product Stats & Auto-Increment Sold Counter Manager
 * Rule: 2 clicks or views on a product = +1 to the sold count ("Đã bán")
 */

const STATS_STORAGE_KEY = 'tingo_product_clicks_stats_v1';

interface ProductStatsRecord {
  clicks: number;
  baseSold: number;
}

// Default base sold count for known products to give realistic authentic storefront volume
const DEFAULT_BASE_SOLD: Record<string, number> = {
  'tingo-vhealth-duo': 1240,
  'tingo-quantum-water': 890,
  'tingo-vsportgel': 670,
  'tingo-vhealth-tra-xanh': 540,
  'tingo-caphe-link': 480,
  'tingo-vhealth-socola': 620,
};

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
 * Record a user view or click on a specific product.
 * Automatically adds 1 click and if clicks reach a multiple of 2, sold count increases by 1.
 */
export function recordProductInteraction(productId: string, initialBaseSold?: number): number {
  if (!productId) return 0;
  const stats = getStoredStats();
  const base =
    initialBaseSold !== undefined
      ? initialBaseSold
      : DEFAULT_BASE_SOLD[productId] || 250;

  const currentRecord = stats[productId] || { clicks: 0, baseSold: base };
  const newClicks = currentRecord.clicks + 1;

  stats[productId] = {
    clicks: newClicks,
    baseSold: currentRecord.baseSold || base,
  };

  saveStoredStats(stats);

  // Dispatch custom event for real-time reactive UI update
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('tingo-product-stats-updated', {
        detail: {
          productId,
          clicks: newClicks,
          soldCount: calculateTotalSold(productId, stats[productId].baseSold),
        },
      })
    );
  }

  return calculateTotalSold(productId, stats[productId].baseSold);
}

/**
 * Calculates current total sold count = baseSold + Math.floor(clicks / 2)
 */
export function calculateTotalSold(productId: string, fallbackBase?: number): number {
  const stats = getStoredStats();
  const base =
    fallbackBase !== undefined
      ? fallbackBase
      : stats[productId]?.baseSold || DEFAULT_BASE_SOLD[productId] || 250;

  const clicks = stats[productId]?.clicks || 0;
  const addedFromInteractions = Math.floor(clicks / 2);

  return base + addedFromInteractions;
}

/**
 * Get total clicks/views for a product
 */
export function getProductClicks(productId: string): number {
  const stats = getStoredStats();
  return stats[productId]?.clicks || 0;
}

/**
 * Format sold count nicely (e.g., 1.2k or 358)
 */
export function formatSoldCount(sold: number): string {
  if (sold >= 1000) {
    const kVal = (sold / 1000).toFixed(1).replace('.0', '');
    return `${kVal}k`;
  }
  return sold.toLocaleString('vi-VN');
}

/**
 * React hook to get real-time sold count that dynamically increases with 2 clicks = +1 sold
 */
export function useProductSold(productId: string, initialBase?: number) {
  const [sold, setSold] = useState<number>(() => calculateTotalSold(productId, initialBase));
  const [clicks, setClicks] = useState<number>(() => getProductClicks(productId));

  useEffect(() => {
    setSold(calculateTotalSold(productId, initialBase));
    setClicks(getProductClicks(productId));

    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ productId: string; clicks: number; soldCount: number }>;
      if (customEvent.detail && customEvent.detail.productId === productId) {
        setSold(customEvent.detail.soldCount);
        setClicks(customEvent.detail.clicks);
      }
    };

    window.addEventListener('tingo-product-stats-updated', handleUpdate);
    return () => window.removeEventListener('tingo-product-stats-updated', handleUpdate);
  }, [productId, initialBase]);

  return { soldCount: sold, clicks, formattedSold: formatSoldCount(sold) };
}
