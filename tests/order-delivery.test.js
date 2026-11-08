import test from 'node:test';
import assert from 'node:assert/strict';
import { getOrderDelivery } from '../src/orderDelivery.js';

const now = Date.parse('2026-11-08T04:00:00Z');
const active = { status: 'processing', ghn_status: 'ready_to_pick', ghn_expected_delivery_at: '2026-11-10T16:59:59Z' };

test('delivery dates are hidden until preparation starts and on terminal orders', () => {
  assert.equal(getOrderDelivery({ ...active, status: 'pending' }, now).state, 'pending');
  assert.equal(getOrderDelivery({ ...active, status: 'confirmed' }, now).state, 'confirmed');
  assert.equal(getOrderDelivery({ ...active, status: 'cancelled' }, now).state, 'cancelled');
  assert.equal(getOrderDelivery({ ...active, status: 'delivered' }, now).state, 'delivered');
  assert.equal(getOrderDelivery({ ...active, ghn_status: 'delivered' }, now).state, 'delivered');
  assert.equal(getOrderDelivery({ ...active, ghn_status: 'cancel' }, now).state, 'cancelled');
  for (const ghn_status of ['returned', 'lost', 'damage']) {
    assert.equal(getOrderDelivery({ ...active, ghn_status }, now).state, 'unavailable');
  }
});

test('missing and malformed dates have no fabricated estimate', () => {
  assert.equal(getOrderDelivery({ ...active, ghn_expected_delivery_at: null }, now).state, 'waiting');
  assert.equal(getOrderDelivery({ ...active, ghn_expected_delivery_at: 'invalid' }, now).state, 'waiting');
  assert.equal(getOrderDelivery(active, now).state, 'estimated');
  assert.equal(getOrderDelivery({ ...active, status: 'shipped' }, now).state, 'estimated');
});

test('overdue compares Vietnam calendar days rather than the browser timezone', () => {
  const order = { ...active, ghn_expected_delivery_at: '2026-11-08T02:00:00Z' };
  assert.equal(getOrderDelivery(order, Date.parse('2026-11-08T15:00:00Z')).state, 'estimated');
  assert.equal(getOrderDelivery(order, Date.parse('2026-11-08T17:00:00Z')).state, 'overdue');
});
