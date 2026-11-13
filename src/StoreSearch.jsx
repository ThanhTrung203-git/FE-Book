import { useEffect, useRef, useState } from 'react';
import { Clock3, Search, X } from 'lucide-react';
import { useLanguage } from './i18n.jsx';
import { addSearchHistory, normalizeHistoryTerm, readSearchHistory } from './searchHistory.js';

export default function StoreSearch({ value, onChange, onSearch, onClear, storageKey, submittedSearch }) {
  const { t } = useLanguage();
  const [history, setHistory] = useState(() => { try { return readSearchHistory(localStorage, storageKey); } catch { return []; } });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const root = useRef(null);
  const previousSubmission = useRef(submittedSearch);
  useEffect(() => {
    if (previousSubmission.current === submittedSearch) return;
    previousSubmission.current = submittedSearch;
    if (!submittedSearch.trim()) return;
    setHistory((current) => {
      const next = addSearchHistory(current, submittedSearch);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep an in-memory history. */ }
      return next;
    });
    setActive(-1);
  }, [submittedSearch, storageKey]);
  const options = history.filter((term) => normalizeHistoryTerm(term).includes(normalizeHistoryTerm(value)));
  const visible = open && options.length > 0;
  function save(next) {
    setHistory(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Search works when storage is unavailable. */ }
    setActive(-1);
  }
  function choose(term) {
    const query = term.trim();
    if (query) save(addSearchHistory(history, query));
    setOpen(false); setActive(-1); onSearch(query);
  }
  useEffect(() => {
    const outside = (event) => { if (!root.current?.contains(event.target)) { setOpen(false); setActive(-1); } };
    const sync = (event) => { if (event.key === storageKey || event.key === null) { try { setHistory(readSearchHistory(localStorage, storageKey)); } catch { setHistory([]); } setActive(-1); } };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('storage', sync);
    return () => { document.removeEventListener('pointerdown', outside); window.removeEventListener('storage', sync); };
  }, [storageKey]);
  return <form ref={root} className="mp-search" role="search" onSubmit={(event) => { event.preventDefault(); choose(visible && active >= 0 && options[active] ? options[active] : value); }} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) { setOpen(false); setActive(-1); } }}>
    <Search size={20} />
    <input role="combobox" aria-label={t('Tìm sách')} aria-autocomplete="list" aria-expanded={visible} aria-controls={visible ? 'store-search-history' : undefined} aria-activedescendant={visible && active >= 0 ? 'search-history-' + active : undefined}
      placeholder={t('Tìm cuốn sách bạn muốn đọc…')} maxLength={160} autoComplete="off" value={value}
      onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(-1); }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); setOpen(false); setActive(-1); }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && options.length) {
          event.preventDefault(); setOpen(true);
          setActive((index) => event.key === 'ArrowDown' ? (index + 1) % options.length : (index <= 0 ? options.length - 1 : index - 1));
        }
      }} />
    {value && <button type="button" className="mp-search-clear" aria-label={t('Xóa tìm kiếm')} onClick={() => { onClear(); setActive(-1); }}><X size={16} /></button>}
    <button className="mp-search-submit" type="submit">{t('Tìm kiếm')}</button>
    {visible && <div className="mp-search-history">
      <div className="mp-history-heading"><b>{t('Lịch sử tìm kiếm')}</b><button type="button" onClick={() => save([])}>{t('Xóa lịch sử')}</button></div>
      <ul id="store-search-history" role="listbox" aria-label={t('Lịch sử tìm kiếm')}>
        {options.map((term, index) => <li id={'search-history-' + index} role="option" aria-selected={active === index} key={term}>
          <button type="button" className="mp-history-term" onClick={() => choose(term)}><Clock3 size={15} /><span>{term}</span></button>
          <button type="button" className="mp-history-remove" aria-label={t('Xóa từ khóa {term}', { term })} onClick={() => save(history.filter((item) => item !== term))}><X size={14} /></button>
        </li>)}
      </ul>
    </div>}
  </form>;
}
