/**
 * Utility for formatting timestamps and dates cleanly in Vietnamese format
 */

export const formatVietnameseDateTime = (
  dateVal?: string | number | Date | null,
  includeSeconds = true
): string => {
  if (!dateVal) return 'Chưa có thông tin';

  try {
    // If it's already a custom formatted string like "20/09/2026 - 14:30"
    if (typeof dateVal === 'string' && /^\d{2}\/\d{2}\/\d{4}/.test(dateVal)) {
      return dateVal;
    }

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) {
      return String(dateVal);
    }

    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const seconds = d.getSeconds().toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    if (includeSeconds) {
      return `${hours}:${minutes}:${seconds} ngày ${day}/${month}/${year}`;
    }
    return `${hours}:${minutes} - ${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
};

/**
 * Check if a date/timestamp was created on the current calendar day in Vietnam (UTC+7)
 */
export const isCreatedTodayVN = (dateVal?: string | number | Date | null): boolean => {
  if (!dateVal) return false;
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return false;
    const itemDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(d);
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date());
    return itemDay === today;
  } catch {
    return false;
  }
};

export const getTodayVNFormatted = (): string => {
  const d = new Date();
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};

export const formatShortDate = (dateVal?: string | number | Date | null): string => {
  if (!dateVal) return '';
  try {
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return String(dateVal);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateVal);
  }
};
