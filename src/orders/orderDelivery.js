export function getOrderDelivery(order, now = Date.now()) {
  if (order.status === 'cancelled' || order.ghn_status === 'cancel') return { state: 'cancelled' };
  if (order.status === 'delivered' || order.ghn_status === 'delivered') return { state: 'delivered' };
  if (['returned', 'lost', 'damage'].includes(order.ghn_status)) return { state: 'unavailable' };
  if (order.status === 'pending') return { state: 'pending' };
  if (order.status === 'confirmed') return { state: 'confirmed' };
  if (!['processing', 'shipped'].includes(order.status)) return { state: 'unavailable' };
  if (!order.ghn_expected_delivery_at) return { state: 'waiting' };
  const expected = new Date(order.ghn_expected_delivery_at);
  if (!Number.isFinite(expected.getTime())) return { state: 'waiting' };
  // GHN often estimates the end of a delivery day; compare dates in Vietnam,
  // so the UI does not report a delay while that delivery day is still ongoing.
  const vietnamDay = (date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
  return {
    state: vietnamDay(expected) < vietnamDay(new Date(now)) ? 'overdue' : 'estimated',
    expected,
  };
}
