export const HISTORY_LIMIT = 8;
export function normalizeHistoryTerm(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd').toLowerCase().trim().replace(/\s+/g, ' ');
}
export function cleanSearchHistory(values) {
  if (!Array.isArray(values)) return [];
  const seen = new Set();
  return values.filter((value) => {
    if (typeof value !== 'string' || !value.trim() || value.length > 160) return false;
    const key = normalizeHistoryTerm(value);
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, HISTORY_LIMIT).map((value) => value.trim());
}
export function addSearchHistory(history, term) {
  return cleanSearchHistory([term, ...history]);
}
export function readSearchHistory(storage, key) {
  try { return cleanSearchHistory(JSON.parse(storage.getItem(key) || '[]')); } catch { return []; }
}
