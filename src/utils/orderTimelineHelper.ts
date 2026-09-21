import { Order, OrderStatus } from '../types';
import { formatVietnameseDateTime } from './dateFormatter';

export interface TimelineStepItem {
  id: string;
  status: OrderStatus;
  title: string;
  description: string;
  time?: string;
  completed: boolean;
  isCurrent: boolean;
  isCancelled: boolean;
  badge?: string;
}

/**
 * Returns a robust, fully synchronized timeline array for an order based on its current status and timeline events.
 */
export function getSynchronizedTimeline(order: Order): TimelineStepItem[] {
  const currentStatus = order.status;
  const createdAtFormatted = formatVietnameseDateTime(order.createdAt, true);
  const updatedAtFormatted = order.updatedAt ? formatVietnameseDateTime(order.updatedAt, true) : undefined;
  const cancelledAtFormatted = order.cancelledAt ? formatVietnameseDateTime(order.cancelledAt, true) : undefined;

  // Check existing custom timeline entries if present
  const existingMap = new Map<string, { time?: string; completed?: boolean; title?: string }>();
  if (Array.isArray(order.timeline)) {
    order.timeline.forEach((item) => {
      if (item && item.status) {
        existingMap.set(item.status, {
          time: item.time,
          completed: item.completed,
          title: item.title,
        });
      }
    });
  }

  // Define the 4 standard progression steps
  const steps: TimelineStepItem[] = [
    {
      id: 'step_pending',
      status: 'pending',
      title: 'Đơn hàng đã được đặt thành công',
      description: 'Hệ thống TINGO đã tiếp nhận thông tin và chuyển dữ liệu tới bộ phận đóng gói.',
      time: existingMap.get('pending')?.time || createdAtFormatted,
      completed: true, // Step 1 is always completed when order exists
      isCurrent: currentStatus === 'pending',
      isCancelled: false,
      badge: currentStatus === 'pending' ? 'Chờ xác nhận' : undefined,
    },
    {
      id: 'step_processing',
      status: 'processing',
      title:
        currentStatus === 'pending'
          ? 'TINGO đang chuẩn bị & đóng gói sản phẩm sạch'
          : 'Đã hoàn tất đóng gói & dán tem kiểm định chất lượng',
      description: 'Kiểm tra độ nguyên vẹn bao bì ngũ cốc dinh dưỡng, đóng gói tiêu chuẩn & sẵn sàng xuất kho.',
      time:
        currentStatus === 'pending'
          ? 'Dự kiến trong 2 giờ tới'
          : existingMap.get('processing')?.time ||
            (currentStatus === 'processing' ? updatedAtFormatted || 'Đang chuẩn bị hàng' : 'Đã chuẩn bị xong'),
      completed: currentStatus === 'processing' || currentStatus === 'shipping' || currentStatus === 'delivered',
      isCurrent: currentStatus === 'processing',
      isCancelled: false,
      badge: currentStatus === 'processing' ? 'Đang chuẩn bị hàng' : undefined,
    },
    {
      id: 'step_shipping',
      status: 'shipping',
      title:
        currentStatus === 'shipping'
          ? 'Bàn giao cho bưu tá - Đang trên đường vận chuyển hỏa tốc'
          : currentStatus === 'delivered'
          ? 'Đã vận chuyển thành công tới địa chỉ nhận'
          : 'Bàn giao đơn vị vận chuyển hỏa tốc',
      description:
        currentStatus === 'shipping'
          ? 'Đơn hàng đang được shipper giao hỏa tốc tận nhà. Quý khách vui lòng để ý điện thoại.'
          : 'Chuyển giao cho đối tác vận chuyển hỏa tốc.',
      time:
        currentStatus === 'pending' || currentStatus === 'processing'
          ? 'Dự kiến trong ngày'
          : existingMap.get('shipping')?.time ||
            (currentStatus === 'shipping' ? updatedAtFormatted || 'Đang vận chuyển' : 'Đã xuất kho'),
      completed: currentStatus === 'shipping' || currentStatus === 'delivered',
      isCurrent: currentStatus === 'shipping',
      isCancelled: false,
      badge: currentStatus === 'shipping' ? 'Đang giao hàng hỏa tốc' : undefined,
    },
    {
      id: 'step_delivered',
      status: 'delivered',
      title: 'Giao hàng tận tay người nhận',
      description: 'Khách hàng nhận kiện hàng, kiểm tra sản phẩm và hoàn tất đơn hàng.',
      time:
        currentStatus === 'delivered'
          ? existingMap.get('delivered')?.time || updatedAtFormatted || 'Đã nhận hàng thành công'
          : '1-2 ngày tới',
      completed: currentStatus === 'delivered',
      isCurrent: currentStatus === 'delivered',
      isCancelled: false,
      badge: currentStatus === 'delivered' ? 'Giao thành công' : undefined,
    },
  ];

  // If order is cancelled, append the cancellation terminal step
  if (currentStatus === 'cancelled') {
    const cancelReason = order.cancelReason || 'Khách hàng yêu cầu hủy đơn';
    const cancelledBy = order.cancelledBy === 'customer' ? 'Khách hàng chủ động hủy' : 'Quản trị viên TINGO hủy';

    // In case of cancellation, only keep steps that were already passed before cancellation
    steps.forEach((s) => {
      // If step wasn't reached, mark not completed
      if (s.status !== 'pending') {
        s.completed = false;
        s.isCurrent = false;
      }
    });

    steps.push({
      id: 'step_cancelled',
      status: 'cancelled',
      title: `Đơn hàng đã được hủy (${cancelledBy})`,
      description: `Lý do: "${cancelReason}". Toàn bộ quyền lợi ưu đãi/voucher (nếu có) đã được tự động hoàn lại.`,
      time: cancelledAtFormatted || updatedAtFormatted || 'Đã hủy',
      completed: true,
      isCurrent: true,
      isCancelled: true,
      badge: 'Đã hủy',
    });
  }

  return steps;
}

/**
 * Construct updated Firestore timeline array when status is changed by Admin or Customer
 */
export function buildUpdatedFirestoreTimeline(order: Order, newStatus: OrderStatus, customReason?: string) {
  const now = new Date().toISOString();
  const timeStr = formatVietnameseDateTime(now, true);

  const baseTimeline = Array.isArray(order.timeline) ? [...order.timeline] : [];

  const existingStepIndex = baseTimeline.findIndex((item) => item.status === newStatus);

  let stepTitle = '';
  switch (newStatus) {
    case 'pending':
      stepTitle = 'Đơn hàng đã được đặt thành công';
      break;
    case 'processing':
      stepTitle = 'TINGO đã tiếp nhận, kiểm định và đang đóng gói sản phẩm sạch';
      break;
    case 'shipping':
      stepTitle = 'Đã bàn giao đơn vị vận chuyển hỏa tốc - Đang trên đường giao';
      break;
    case 'delivered':
      stepTitle = 'Giao hàng tận tay người nhận thành công';
      break;
    case 'cancelled':
      stepTitle = `Đơn hàng đã được hủy${customReason ? ` (Lý do: ${customReason})` : ''}`;
      break;
  }

  const updatedEntry = {
    status: newStatus,
    title: stepTitle,
    time: timeStr,
    completed: true,
  };

  if (existingStepIndex >= 0) {
    baseTimeline[existingStepIndex] = updatedEntry;
  } else {
    baseTimeline.push(updatedEntry);
  }

  // Also mark preceding steps as completed
  const statusHierarchy: OrderStatus[] = ['pending', 'processing', 'shipping', 'delivered'];
  const targetRank = statusHierarchy.indexOf(newStatus);
  if (targetRank >= 0) {
    baseTimeline.forEach((item) => {
      const itemRank = statusHierarchy.indexOf(item.status as OrderStatus);
      if (itemRank >= 0 && itemRank <= targetRank) {
        item.completed = true;
      }
    });
  }

  return baseTimeline;
}
