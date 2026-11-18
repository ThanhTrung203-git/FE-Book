// subtotal already includes direct product discounts.
export function getOrderTotal(order) {
  const booksAfterDiscount = Math.max(0, Number(order.subtotal || 0) - Number(order.discount_amount || 0));
  return booksAfterDiscount + Number(order.shipping_fee || 0);
}
