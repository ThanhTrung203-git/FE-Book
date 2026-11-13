import test from 'node:test';
import assert from 'node:assert/strict';
import { addSearchHistory, cleanSearchHistory, readSearchHistory } from '../src/searchHistory.js';

test('recent searches deduplicate accents/case and move reused terms to the front', () => {
  assert.deepEqual(addSearchHistory(['Đắc nhân tâm', 'Nhà giả kim'], 'dac nhan tam'), ['dac nhan tam', 'Nhà giả kim']);
  assert.equal(addSearchHistory(Array.from({length: 10}, (_, i) => 'Book ' + i), 'Latest').length, 8);
});

test('empty/malformed history and denied storage do not break searching', () => {
  assert.deepEqual(cleanSearchHistory([null, 12, '', '   ', 'a'.repeat(161), 'Book']), ['Book']);
  assert.deepEqual(readSearchHistory({ getItem() { throw Error('denied'); } }, 'key'), []);
  assert.deepEqual(readSearchHistory({ getItem() { return '{}'; } }, 'key'), []);
  assert.deepEqual(readSearchHistory({ getItem() { return '{broken'; } }, 'key'), []);
});

test('account history keys remain separate', () => {
  const storage = { getItem(key) { return key === 'book-search-history-1' ? '["Book A"]' : '["Book B"]'; } };
  assert.deepEqual(readSearchHistory(storage, 'book-search-history-1'), ['Book A']);
  assert.deepEqual(readSearchHistory(storage, 'book-search-history-2'), ['Book B']);
});
