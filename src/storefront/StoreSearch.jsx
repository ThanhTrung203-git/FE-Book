import { useEffect, useId, useRef, useState } from 'react';
import { BookOpen, Clock3, Search, X } from 'lucide-react';
import { useLanguage } from '../shared/i18n.jsx';
import { api } from '../shared/api.js';
import { addSearchHistory, normalizeHistoryTerm, readSearchHistory } from './searchHistory.js';

function SuggestionCover({ url }) {
  const [failed, setFailed] = useState(false);
  if (url && !failed) return <img src={url} alt="" onError={() => setFailed(true)} />;
  return <span className="mp-search-product-placeholder"><BookOpen size={17} aria-hidden="true" /></span>;
}

export default function StoreSearch({
  value, onChange, onSearch, onClear, storageKey, submittedSearch,
  featured, onBook, onCategory,
}) {
  const { t, money, categoryLabel } = useLanguage();
  const [history, setHistory] = useState(() => {
    try { return readSearchHistory(localStorage, storageKey); } catch { return []; }
  });
  const [matches, setMatches] = useState(null);
  const [popular, setPopular] = useState(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(null);
  const root = useRef(null);
  const input = useRef(null);
  const previousSubmission = useRef(submittedSearch);
  const listId = useId();
  const query = value.trim();
  const normalizedQuery = normalizeHistoryTerm(query);

  useEffect(() => {
    if (previousSubmission.current === submittedSearch) return;
    previousSubmission.current = submittedSearch;
    if (!submittedSearch.trim()) return;
    setHistory((current) => {
      const next = addSearchHistory(current, submittedSearch);
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Keep an in-memory history. */ }
      return next;
    });
    setActive(null);
  }, [submittedSearch, storageKey]);

  useEffect(() => {
    const controller = new AbortController();
    api('/books/search-suggestions', { skipAuth: true, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setPopular(data);
      })
      .catch(() => {
        if (!controller.signal.aborted) setPopular({ books: [], categories: [] });
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (query.length < 2 || !open) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await api(`/books?search=${encodeURIComponent(query)}&limit=5`, {
          skipAuth: true, signal: controller.signal,
        });
        if (!controller.signal.aborted) setMatches({ query, books: result.data || [] });
      } catch {
        if (!controller.signal.aborted) setMatches({ query, books: [] });
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [open, query]);

  useEffect(() => {
    const outside = (event) => {
      if (!root.current?.contains(event.target)) { setOpen(false); setActive(null); }
    };
    const sync = (event) => {
      if (event.key !== storageKey && event.key !== null) return;
      try { setHistory(readSearchHistory(localStorage, storageKey)); } catch { setHistory([]); }
      setActive(null);
    };
    document.addEventListener('pointerdown', outside);
    window.addEventListener('storage', sync);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('storage', sync);
    };
  }, [storageKey]);

  function close() {
    setOpen(false);
    setActive(null);
  }

  function save(next) {
    setHistory(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Search works when storage is unavailable. */ }
    setActive(null);
  }

  function choose(term) {
    const text = term.trim();
    if (text) save(addSearchHistory(history, text));
    close();
    onSearch(text);
  }

  const recent = history.filter((term) => normalizeHistoryTerm(term).includes(normalizedQuery));
  const bestSellers = popular?.books || [];
  const categories = query ? [] : (popular?.categories || []);
  const products = query
    ? (matches?.query === query ? matches.books : []).filter((book) => !recent.includes(book.title))
    : (bestSellers.length ? bestSellers : featured);
  const bookHeading = t(query ? 'Gợi ý sách' : bestSellers.length ? 'Sách bán chạy' : 'Sách mới');

  const historyOptions = recent.map((term, index) => ({
    id: `${listId}-recent-${index}`, term, select: () => choose(term),
  }));
  const categoryOptions = categories.map((category) => ({
    id: `${listId}-category-${category.id}`,
    label: categoryLabel(category.name),
    select: () => { close(); onCategory(category.id); },
  }));
  const bookOptions = products.map((book) => ({
    id: `${listId}-book-${book.id}`, book,
    select: () => {
      if (query) { choose(book.title); return; }
      close();
      onBook(book);
    },
  }));
  const keyboardOptions = query
    ? [...historyOptions, ...bookOptions]
    : [...categoryOptions, ...bookOptions, ...historyOptions];
  const selectedIndex = keyboardOptions.findIndex((option) => option.id === active);
  const visible = open && keyboardOptions.length > 0;
  const loading = open && !query && popular === null && !visible;

  useEffect(() => {
    if (visible && selectedIndex >= 0) {
      document.getElementById(active)?.scrollIntoView({ block: 'nearest' });
    }
  }, [visible, active, selectedIndex]);

  const historyGroup = historyOptions.length > 0 && <div role="group" aria-labelledby={`${listId}-history-label`}>
    <div className="mp-history-heading">
      <b id={`${listId}-history-label`}>{t('Lịch sử tìm kiếm')}</b>
      <button type="button" onClick={() => {
        input.current.focus();
        save([]);
      }}>{t('Xóa lịch sử')}</button>
    </div>
    <ul role="presentation">
      {historyOptions.map(({ id, term, select }) => <li id={id} role="option" aria-selected={active === id} key={term}>
        <button type="button" className="mp-history-term" onClick={select}><Clock3 size={15} /><span>{term}</span></button>
        <button type="button" className="mp-history-remove" aria-label={t('Xóa từ khóa {term}', { term })} onClick={() => {
          input.current.focus();
          save(history.filter((item) => item !== term));
        }}><X size={14} /></button>
      </li>)}
    </ul>
  </div>;

  return <form ref={root} className="mp-search" role="search" onSubmit={(event) => {
    event.preventDefault();
    choose(value);
  }} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) close();
  }}>
    <Search size={20} aria-hidden="true" />
    <input ref={input} role="combobox" aria-label={t('Tìm sách')} aria-autocomplete="list"
      aria-expanded={visible} aria-controls={visible ? listId : undefined}
      aria-activedescendant={visible && selectedIndex >= 0 ? active : undefined}
      placeholder={t('Tìm cuốn sách bạn muốn đọc…')} maxLength={160} autoComplete="off" value={value}
      onFocus={() => setOpen(true)} onClick={() => setOpen(true)}
      onChange={(event) => { onChange(event.target.value); setOpen(true); setActive(null); }}
      onKeyDown={(event) => {
        if (event.nativeEvent.isComposing) return;
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Enter' && visible && selectedIndex >= 0) {
          event.preventDefault();
          keyboardOptions[selectedIndex].select();
        }
        if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && keyboardOptions.length) {
          event.preventDefault();
          setOpen(true);
          const count = keyboardOptions.length;
          const index = event.key === 'ArrowDown'
            ? (selectedIndex + 1) % count
            : (selectedIndex <= 0 ? count - 1 : selectedIndex - 1);
          setActive(keyboardOptions[index].id);
        }
      }} />
    {value && <button type="button" className="mp-search-clear" aria-label={t('Xóa tìm kiếm')} onClick={() => {
      onClear();
      setActive(null);
      input.current.focus();
      setOpen(true);
    }}><X size={16} /></button>}
    <button className="mp-search-submit" type="submit">{t('Tìm kiếm')}</button>
    {loading && <div className="mp-search-history mp-search-loading" role="status">{t('Đang tải gợi ý…')}</div>}
    {visible && <div id={listId} className="mp-search-history mp-search-dropdown" role="listbox" aria-label={t('Gợi ý tìm kiếm')}>
      {query && historyGroup}
      {categoryOptions.length > 0 && <div role="group" aria-labelledby={`${listId}-categories-label`}>
        <div className="mp-history-heading"><b id={`${listId}-categories-label`}>{t('Thể loại bán chạy')}</b></div>
        <ul className="mp-search-categories" role="presentation">
          {categoryOptions.map(({ id, label, select }) => <li id={id} role="option" aria-selected={active === id} key={id}>
            <button type="button" onClick={select}>{label}</button>
          </li>)}
        </ul>
      </div>}
      {bookOptions.length > 0 && <div role="group" aria-labelledby={`${listId}-books-label`}>
        <div className="mp-history-heading"><b id={`${listId}-books-label`}>{bookHeading}</b></div>
        <ul className="mp-search-products" role="presentation">
          {bookOptions.map(({ id, book, select }) => <li id={id} role="option" aria-selected={active === id} key={book.id}>
            <button type="button" className="mp-search-product" onClick={select}>
              <SuggestionCover key={book.cover_url} url={book.cover_url} />
              <span className="mp-search-product-copy">
                <b>{book.title}</b>
                <small>{book.authors || categoryLabel(book.category_name) || t('Đang cập nhật tác giả')}</small>
              </span>
              <strong>{money(book.unit_price ?? book.price)}</strong>
            </button>
          </li>)}
        </ul>
      </div>}
      {!query && historyGroup}
    </div>}
  </form>;
}
