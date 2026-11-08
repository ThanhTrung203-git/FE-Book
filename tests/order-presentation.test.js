import test from 'node:test';
import assert from 'node:assert/strict';
import { getPaymentNotice, getOrderStatusMessage, ORDER_STEPS } from '../src/orderPresentation.js';

test('successful payment reports the confirmed amount without advancing order status', () => {
  const order = { order_code: 'ORD-37', total_amount: '95500', status: 'pending', payment_method: 'vnpay', payment_status: 'paid' };
  const notice = getPaymentNotice(order);
  assert.equal(notice.tone, 'success');
  assert.equal(notice.title, 'Thanh toán thành công!');
  assert.equal(notice.amount, 95500);
  assert.equal(notice.order_status, 'pending');
  assert.equal(order.status, 'pending');
  assert.ok(notice.description.includes('chờ cửa hàng xác nhận'));
});

test('pending, failed, cancelled and review payments never show a success notification', () => {
  for (const status of ['unpaid', 'failed', 'cancelled', 'refund_required', 'review_required', undefined]) {
    assert.notEqual(getPaymentNotice({ payment_status: status, status: 'pending' }).tone, 'success');
  }
});

test('order messages distinguish unpaid VNPAY, paid pending confirmation and COD', () => {
  assert.ok(getOrderStatusMessage({ status: 'pending', payment_method: 'vnpay', payment_status: 'unpaid' }).includes('hoàn tất thanh toán'));
  assert.ok(getOrderStatusMessage({ status: 'pending', payment_method: 'cod', payment_status: 'unpaid' }).includes('thanh toán khi nhận hàng'));
  assert.ok(getOrderStatusMessage({ status: 'pending', payment_method: 'vnpay', payment_status: 'paid' }).includes('Đã nhận thanh toán'));
  assert.ok(getOrderStatusMessage({ status: 'processing' }).includes('đóng gói'));
  assert.ok(getOrderStatusMessage({ status: 'shipped' }).includes('vận chuyển'));
  assert.ok(getOrderStatusMessage({ status: 'delivered' }).includes('giao thành công'));
  assert.ok(getOrderStatusMessage({ status: 'cancelled', payment_status: 'paid' }).includes('đã được hủy'));
  assert.deepEqual(ORDER_STEPS, ['pending', 'confirmed', 'processing', 'shipped', 'delivered']);
});
