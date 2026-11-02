import { useCallback, useEffect, useState } from 'react';
import { LoaderCircle, RefreshCw, Save, TicketPercent, X } from 'lucide-react';
import { api } from './api.js';
import { useLanguage } from './i18n.jsx';
import './promotions.css';

const localInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};
const sqlDate = (value) => new Date(value).toISOString().slice(0, 19).replace('T', ' ');
const emptyProduct = () => ({ name: '', discount_type: 'percent', discount_value: '', scope_type: 'books', target_ids: [], quantity_limit: '', start_at: '', end_at: '', is_active: true });
const emptyCoupon = () => ({ name: '', code: '', discount_type: 'percent', discount_value: '', min_order_amount: 0, max_discount_amount: '', start_at: '', end_at: '', total_usage_limit: '', per_customer_limit: '', scope_type: 'all', target_ids: [], is_active: true });
const scopeLabels = { all: 'Toàn bộ sách', books: 'Một số sách', categories: 'Một số thể loại', authors: 'Tác giả', publishers: 'Nhà xuất bản' };

export default function PromotionManager({ token, onClose, notify }) {
  const { t, money, dateTime, categoryLabel } = useLanguage();
  const [tab, setTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [catalogs, setCatalogs] = useState({ books: [], categories: [], authors: [], publishers: [] });
  const [targetSearch, setTargetSearch] = useState('');
  const [product, setProduct] = useState(emptyProduct());
  const [coupon, setCoupon] = useState(emptyCoupon());
  const [editProduct, setEditProduct] = useState(null);
  const [editCoupon, setEditCoupon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [productResult, couponResult, bookResult, categoryResult, authorResult, publisherResult] = await Promise.all([
        api('/admin/promotions/products', { token }),
        api('/admin/promotions/coupons', { token }),
        api('/books?limit=100', { token }),
        api('/categories', { token }),
        api('/admin/authors?limit=100', { token }),
        api('/publishers?limit=100', { token }),
      ]);
      setProducts(productResult.data || []);
      setCoupons(couponResult.data || []);
      setCatalogs({ books: bookResult.data || [], categories: categoryResult.data || [], authors: authorResult.data || [], publishers: publisherResult.data || [] });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [token]);
  useEffect(() => { load(); }, [load]);

  async function saveProduct(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = { ...product, discount_value: Number(product.discount_value), target_ids: product.target_ids.map(Number), quantity_limit: product.quantity_limit ? Number(product.quantity_limit) : null, start_at: sqlDate(product.start_at), end_at: sqlDate(product.end_at) };
      await api(editProduct ? `/admin/promotions/products/${editProduct}` : '/admin/promotions/products', { method: editProduct ? 'PATCH' : 'POST', token, body: JSON.stringify(body) });
      setProduct(emptyProduct()); setEditProduct(null); await load(); notify(t('Đã lưu chương trình giảm trực tiếp.'));
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  async function saveCoupon(event) {
    event.preventDefault(); setSaving(true); setError('');
    try {
      const body = { ...coupon, discount_value: Number(coupon.discount_value), min_order_amount: Number(coupon.min_order_amount), max_discount_amount: coupon.max_discount_amount === '' ? null : Number(coupon.max_discount_amount), total_usage_limit: coupon.total_usage_limit === '' ? null : Number(coupon.total_usage_limit), per_customer_limit: coupon.per_customer_limit === '' ? null : Number(coupon.per_customer_limit), start_at: sqlDate(coupon.start_at), end_at: sqlDate(coupon.end_at), target_ids: coupon.target_ids.map(Number) };
      await api(editCoupon ? `/admin/promotions/coupons/${editCoupon}` : '/admin/promotions/coupons', { method: editCoupon ? 'PATCH' : 'POST', token, body: JSON.stringify(body) });
      setCoupon(emptyCoupon()); setEditCoupon(null); await load(); notify(t('Đã lưu mã giảm giá.'));
    } catch (requestError) { setError(requestError.message); }
    finally { setSaving(false); }
  }

  function editProductRow(row) {
    setTab('products'); setEditProduct(row.id);
    setProduct({ name: row.name, discount_type: row.discount_type, discount_value: row.discount_value, scope_type: row.scope_type || 'books', target_ids: row.target_ids?.length ? row.target_ids.map(String) : row.books.map((book) => String(book.book_id)), quantity_limit: row.books[0]?.quantity_limit ?? '', start_at: localInput(row.start_at), end_at: localInput(row.end_at), is_active: Boolean(row.is_active) });
  }
  function editCouponRow(row) {
    setTab('coupons'); setEditCoupon(row.id);
    const targets = { books: row.book_ids, categories: row.category_ids, authors: row.author_ids, publishers: row.publisher_ids }[row.scope_type] || [];
    setCoupon({ name: row.name, code: row.code, discount_type: row.discount_type, discount_value: row.discount_value, min_order_amount: row.min_order_amount, max_discount_amount: row.max_discount_amount ?? '', start_at: localInput(row.start_at), end_at: localInput(row.end_at), total_usage_limit: row.total_usage_limit ?? '', per_customer_limit: row.per_customer_limit ?? '', scope_type: row.scope_type, target_ids: targets.map(String), is_active: Boolean(row.is_active) });
  }

  const targetSelect = (state, setState) => {
    const options = catalogs[state.scope_type] || [];
    const selected = new Set(state.target_ids.map(String));
    const query = targetSearch.trim().toLocaleLowerCase();
    const filtered = options.filter((item) => (state.scope_type === 'categories' ? categoryLabel(item.name) : item.title || item.name || '').toLocaleLowerCase().includes(query));
    const label = state.scope_type === 'books' ? 'Sách áp dụng' : state.scope_type === 'categories' ? 'Thể loại áp dụng' : state.scope_type === 'authors' ? 'Tác giả áp dụng' : 'Nhà xuất bản áp dụng';
    const toggle = (id) => setState((current) => ({ ...current, target_ids: selected.has(String(id)) ? current.target_ids.filter((value) => String(value) !== String(id)) : [...current.target_ids, String(id)] }));
    return <div className="promotion-target-field">
      <div className="promotion-target-heading"><b>{t(label)}</b><span>{t('Đã chọn {count}', { count: selected.size })}</span></div>
      <div className="promotion-target-box">
        <div className="promotion-target-tools">
          <input type="search" value={targetSearch} onChange={(event) => setTargetSearch(event.target.value)} placeholder={t('Tìm {target}...', { target: t(label).toLocaleLowerCase() })} aria-label={t('Tìm {target}...', { target: t(label).toLocaleLowerCase()})} />
          <button type="button" className="secondary" onClick={() => setState((current) => ({ ...current, target_ids: [...new Set([...current.target_ids, ...filtered.map((item) => String(item.id))])] }))}>{t('Chọn kết quả')}</button>
          <button type="button" className="secondary" onClick={() => setState((current) => ({ ...current, target_ids: [] }))}>{t('Bỏ chọn')}</button>
        </div>
        <div className="promotion-target-options">
          {filtered.length ? filtered.map((item) => <label key={item.id} className="promotion-target-option">
            <input type="checkbox" checked={selected.has(String(item.id))} onChange={() => toggle(item.id)} />
            <span>{state.scope_type === 'categories' ? categoryLabel(item.name) : item.title || item.name}</span>
            {item.book_count !== undefined && <small>{t('{count} sách', { count: item.book_count })}</small>}
          </label>) : <p className="promotion-target-empty">{t('Không tìm thấy mục phù hợp.')}</p>}
        </div>
      </div>
      <small className="promotion-target-hint">{t('Có thể chọn nhiều mục.')} {selected.size ? t('{count} mục đã chọn.', { count: selected.size }) : t('Vui lòng chọn ít nhất một mục.')}</small>
    </div>;
  };

  const field = (state, setState, key, label, type = 'text', required = false) => (
    <label>{t(label)}<input type={type} required={required} value={state[key]} onChange={(event) => setState((current) => ({ ...current, [key]: event.target.value }))} /></label>
  );

  return <div className="order-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="admin-orders" role="dialog" aria-modal="true" aria-labelledby="promotion-manager-title">
      <header className="admin-orders-heading"><div><span className="store-kicker">{t('QUẢN LÝ ƯU ĐÃI')}</span><h2 id="promotion-manager-title">{t('Khuyến mãi')}</h2><p>{t('Tạo chương trình giảm trực tiếp và mã giảm giá đơn hàng.')}</p></div><button className="icon" onClick={onClose} aria-label={t('Đóng')}><X /></button></header>
      <div className="admin-order-toolbar"><div className="promotion-tabs"><button className={tab === 'products' ? 'primary' : 'secondary'} onClick={() => setTab('products')}>{t('Giảm trực tiếp')}</button><button className={tab === 'coupons' ? 'primary' : 'secondary'} onClick={() => setTab('coupons')}>{t('Mã giảm giá')}</button></div><button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15} /> {t('Làm mới')}</button></div>
      {error && <div className="order-message order-error">{t(error)}</div>}
      {loading ? <div className="store-state"><LoaderCircle className="spin" /> {t('Đang tải ưu đãi…')}</div> : tab === 'products' ? <>
        <form className="promotion-form" onSubmit={saveProduct}>
          {field(product, setProduct, 'name', 'Tên chương trình', 'text', true)}
          <label>{t('Loại giảm')}<select value={product.discount_type} onChange={(event) => setProduct((v) => ({ ...v, discount_type: event.target.value }))}><option value="percent">{t('Phần trăm')}</option><option value="fixed">{t('Số tiền')}</option></select></label>
          {field(product, setProduct, 'discount_value', 'Giá trị giảm', 'number', true)}
          <label>{t('Phạm vi áp dụng')}<select value={product.scope_type} onChange={(event) => { setTargetSearch(''); setProduct((v) => ({ ...v, scope_type: event.target.value, target_ids: [] })); }}><option value="books">{t('Sách')}</option><option value="categories">{t('Thể loại')}</option><option value="authors">{t('Tác giả')}</option><option value="publishers">{t('Nhà xuất bản')}</option></select></label>
          {targetSelect(product, setProduct)}
          {field(product, setProduct, 'quantity_limit', 'Giới hạn lượt sale (để trống nếu không giới hạn)', 'number')}
          {field(product, setProduct, 'start_at', 'Bắt đầu', 'datetime-local', true)}
          {field(product, setProduct, 'end_at', 'Kết thúc', 'datetime-local', true)}
          <label className="promotion-active"><input type="checkbox" checked={product.is_active} onChange={(event) => setProduct((v) => ({ ...v, is_active: event.target.checked }))} /> {t('Đang hoạt động')}</label>
          <div className="promotion-form-actions"><button className="primary" disabled={saving}><Save size={15} /> {t(editProduct ? 'Cập nhật' : 'Tạo chương trình')}</button>{editProduct && <button type="button" className="secondary" onClick={() => { setEditProduct(null); setProduct(emptyProduct()); }}>{t('Hủy sửa')}</button>}</div>
        </form>
        <div className="promotion-list">{products.map((row) => <article className="order-card" key={row.id}><div><b>{row.name}</b><span>{row.discount_type === 'percent' ? `${row.discount_value}%` : money(row.discount_value)} · {row.is_active ? t('Đang bật') : t('Đã tắt')}</span><small>{dateTime(row.start_at)} – {dateTime(row.end_at)}</small><small>{row.books.map((book) => `${book.title} (#${book.book_id})`).join(', ')}</small></div><button className="secondary" onClick={() => editProductRow(row)}>{t('Sửa')}</button></article>)}</div>
      </> : <>
        <form className="promotion-form" onSubmit={saveCoupon}>
          {field(coupon, setCoupon, 'name', 'Tên chương trình', 'text', true)}
          {field(coupon, setCoupon, 'code', 'Mã giảm giá', 'text', true)}
          <label>{t('Loại giảm')}<select value={coupon.discount_type} onChange={(event) => setCoupon((v) => ({ ...v, discount_type: event.target.value }))}><option value="percent">{t('Phần trăm')}</option><option value="fixed">{t('Số tiền')}</option></select></label>
          {field(coupon, setCoupon, 'discount_value', 'Giá trị giảm', 'number', true)}
          {field(coupon, setCoupon, 'max_discount_amount', 'Mức giảm tối đa (để trống nếu không giới hạn)', 'number')}
          {field(coupon, setCoupon, 'min_order_amount', 'Đơn tối thiểu', 'number', true)}
          {field(coupon, setCoupon, 'total_usage_limit', 'Tổng lượt dùng (để trống nếu không giới hạn)', 'number')}
          {field(coupon, setCoupon, 'per_customer_limit', 'Lượt mỗi khách (để trống nếu không giới hạn)', 'number')}
          <label>{t('Phạm vi áp dụng')}<select value={coupon.scope_type} onChange={(event) => { setTargetSearch(''); setCoupon((v) => ({ ...v, scope_type: event.target.value, target_ids: [] })); }}><option value="all">{t('Toàn bộ sách')}</option><option value="books">{t('Một số sách')}</option><option value="categories">{t('Một số thể loại')}</option><option value="authors">{t('Tác giả')}</option><option value="publishers">{t('Nhà xuất bản')}</option></select></label>
          {coupon.scope_type !== 'all' && targetSelect(coupon, setCoupon)}
          {field(coupon, setCoupon, 'start_at', 'Bắt đầu', 'datetime-local', true)}
          {field(coupon, setCoupon, 'end_at', 'Kết thúc', 'datetime-local', true)}
          <label className="promotion-active"><input type="checkbox" checked={coupon.is_active} onChange={(event) => setCoupon((v) => ({ ...v, is_active: event.target.checked }))} /> {t('Đang hoạt động')}</label>
          <div className="promotion-form-actions"><button className="primary" disabled={saving}><TicketPercent size={15} /> {t(editCoupon ? 'Cập nhật' : 'Tạo mã')}</button>{editCoupon && <button type="button" className="secondary" onClick={() => { setEditCoupon(null); setCoupon(emptyCoupon()); }}>{t('Hủy sửa')}</button>}</div>
        </form>
        <div className="promotion-list">{coupons.map((row) => <article className="order-card" key={row.id}><div><b>{row.code} · {row.name}</b><span>{row.discount_type === 'percent' ? `${row.discount_value}%` : money(row.discount_value)} · {t('Đã dùng {used}/{limit}', { used: row.usage_count, limit: row.total_usage_limit ?? '∞' })}</span><small>{t(scopeLabels[row.scope_type] || row.scope_type)} · {t('Đơn tối thiểu')} {money(row.min_order_amount)} · {dateTime(row.end_at)}</small></div><button className="secondary" onClick={() => editCouponRow(row)}>{t('Sửa')}</button></article>)}</div>
      </>}
    </section>
  </div>;
}
