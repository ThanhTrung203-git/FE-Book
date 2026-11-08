export const ORDER_STEPS = ['pending', 'confirmed', 'processing', 'shipped', 'delivered'];

export function getOrderStatusMessage(order) {
  if (order.payment_status === 'expired') return 'Đơn tự hết hạn thanh toán. Tồn kho và ưu đãi đã được hoàn lại.';
  if (order.status === 'cancelled') return 'Đơn hàng đã được hủy.';
  if (order.payment_status === 'refund_required' || order.payment_status === 'review_required') return 'Thanh toán cần cửa hàng đối soát. Vui lòng liên hệ cửa hàng.';
  if (order.status === 'pending') {
    if (order.payment_method === 'vnpay' && order.payment_status !== 'paid') return 'Đơn đang chờ bạn hoàn tất thanh toán VNPAY.';
    if (order.payment_status === 'paid') return 'Đã nhận thanh toán. Đơn đang chờ cửa hàng xác nhận.';
    return 'Đơn đang chờ cửa hàng xác nhận. Bạn thanh toán khi nhận hàng.';
  }
  return {
    confirmed: 'Cửa hàng đã xác nhận và sẽ chuẩn bị đơn hàng của bạn.',
    processing: 'Cửa hàng đang chuẩn bị và đóng gói sách.',
    shipped: 'Đơn hàng đang được vận chuyển đến bạn.',
    delivered: 'Đơn hàng đã được giao thành công.',
  }[order.status] || 'Trạng thái đơn hàng đang được cập nhật.';
}

export function getPaymentNotice(order) {
  const common = {
    order_code: order.order_code,
    amount: Number(order.total_amount || 0),
    order_status: order.status,
  };
  if (order.payment_status === 'paid') return {
    ...common, tone: 'success', title: 'Thanh toán thành công!',
    description: getOrderStatusMessage(order),
  };
  if (['refund_required', 'review_required'].includes(order.payment_status)) return {
    ...common, tone: 'warning', title: 'Thanh toán cần đối soát',
    description: 'Giao dịch cần cửa hàng đối soát. Vui lòng liên hệ cửa hàng.',
  };
  if (order.payment_status === 'failed') return {
    ...common, tone: 'warning', title: 'Thanh toán chưa thành công',
    description: 'Thanh toán chưa thành công. Bạn có thể thanh toán lại.',
  };
  if (order.payment_status === 'expired') return { ...common, tone:'warning', title:'Hết hạn thanh toán', description:'Đơn tự hết hạn thanh toán. Tồn kho và ưu đãi đã được hoàn lại.' };
  if (order.payment_status === 'cancelled') return {
    ...common, tone: 'info', title: 'Đã hủy thanh toán', description: 'Đơn hàng đã được hủy.',
  };
  return {
    ...common, tone: 'info', title: 'Đang chờ xác nhận thanh toán',
    description: 'VNPAY chưa xác nhận kết quả. Vui lòng kiểm tra lại sau.',
  };
}
