import { useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import GhnAddressFields from "./GhnAddressFields.jsx";


function promotionErrorText(error) {
  if (!error) return '';
  if (error.code === 'MINIMUM_NOT_MET') return `Đơn hàng chưa đạt mức tối thiểu, cần thêm ${Number(error.missing_amount || 0).toLocaleString('vi-VN')}₫.`;
  const labels = {
    EXPIRED: 'Mã khuyến mãi đã hết hạn.',
    NOT_STARTED: 'Mã khuyến mãi chưa đến thời gian sử dụng.',
    INACTIVE: 'Mã khuyến mãi đã bị tắt.',
    USAGE_LIMIT_REACHED: 'Mã khuyến mãi đã hết lượt.',
    CUSTOMER_LIMIT_REACHED: 'Bạn đã dùng hết lượt cho mã này.',
    NO_APPLICABLE_ITEMS: 'Sách trong giỏ không thuộc phạm vi mã này.',
    PROMOTION_NOT_FOUND: 'Không tìm thấy mã khuyến mãi.',
    FLASH_SALE_SOLD_OUT: 'Ưu đãi có giới hạn vừa hết lượt. Hãy tính lại giỏ hàng.',
    BOOK_UNAVAILABLE: 'Một cuốn sách trong giỏ không còn được bán.',
    ORDER_TOTAL_TOO_LARGE: 'Tổng tiền đơn hàng vượt giới hạn xử lý.',
  };
  if (error.code?.startsWith('BOOK_STOCK_INSUFFICIENT')) return 'Một cuốn sách không còn đủ tồn kho. Hãy kiểm tra lại giỏ hàng.';
  return labels[error.code] || error.code || 'Mã khuyến mãi không hợp lệ.';
}

function promotionReasonText(promotion, money) {
  if (promotion.reason === 'MINIMUM_NOT_MET') {
    return `Mua thêm ${money(promotion.missing_amount)} để áp dụng.`;
  }
  return promotionErrorText({ code: promotion.reason }) || 'Mã hiện chưa áp dụng được.';
}

export function CartPanel({ cart, setCart, onClose, onCheckout }) {
  const { t, money } = useLanguage();
  const [availability, setAvailability] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const total = cart.reduce((sum, item) => sum + Number(item.unit_price ?? item.price) * item.quantity, 0);
  const change = (id, amount) => setCart((current) => current
    .map((item) => item.id === id ? { ...item, quantity: Math.max(1, item.quantity + amount) } : item));
  useEffect(() => {
    let active = true;
    if (!cart.length) {
      setAvailability({});
      setCheckingAvailability(false);
      return () => { active = false; };
    }
    setCheckingAvailability(true);
    Promise.all(cart.map(async (item) => {
      try {
        const result = await api(`/books/${item.id}`);
        const current = result.data;
        const stock = Number(current?.stock_quantity || 0);
        if (!current || !current.is_active) return [item.id, t("Sách đã được ẩn khỏi cửa hàng.")];
        if (stock < 1) return [item.id, t("Sách hiện đã hết hàng.")];
        if (stock < item.quantity) return [item.id, t("Chỉ còn {quantity} cuốn; hãy giảm số lượng trong giỏ.", { quantity: stock })];
        return [item.id, ""];
      } catch (error) {
        return [item.id, error.status === 404 ? t("Sách đã được ẩn khỏi cửa hàng.") : t("Không kiểm tra được tình trạng sách. Hãy thử lại.")];
      }
    })).then((entries) => { if (active) setAvailability(Object.fromEntries(entries)); })
      .finally(() => { if (active) setCheckingAvailability(false); });
    return () => { active = false; };
  }, [cart, t]);
  const unavailable = cart.some((item) => Boolean(availability[item.id]));
  return <div className="order-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
      <header><div><span className="store-kicker">{t("TỦ SÁCH NHÀ MỘC")}</span><h2 id="cart-title">{t("Giỏ hàng")}</h2></div><button className="icon" onClick={onClose} aria-label={t("Đóng")}><X /></button></header>
      {cart.length === 0 ? <div className="order-empty"><ShoppingBag /><b>{t("Giỏ hàng đang trống")}</b><span>{t("Chọn một cuốn sách bạn yêu thích nhé.")}</span></div>
        : <><div className="cart-items">{cart.map((item) => <article className="cart-item" key={item.id}>
          {item.cover_url ? <img src={item.cover_url} alt="" /> : <div className="cart-no-cover"><ShoppingBag /></div>}
          <div className="cart-item-copy"><b>{item.title}</b><small>{Number(item.original_unit_price ?? item.price) > Number(item.unit_price ?? item.price) ? <><del>{money(item.original_unit_price ?? item.price)}</del> <strong>{money(item.unit_price)}</strong></> : money(item.unit_price ?? item.price)}</small>{checkingAvailability ? <small className="cart-checking">{t("Đang kiểm tra số lượng…")}</small> : availability[item.id] ? <small className="cart-unavailable">{availability[item.id]}</small> : null}<div className="cart-quantity"><button onClick={() => change(item.id, -1)} aria-label={t("Giảm số lượng")}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => change(item.id, 1)} aria-label={t("Tăng số lượng")}><Plus size={13} /></button><button className="cart-remove" onClick={() => setCart((current) => current.filter((book) => book.id !== item.id))} aria-label={t("Xóa sách")}><Trash2 size={14} /></button></div></div>
        </article>)}</div>{unavailable && <p className="order-message order-error">{t("Một số sách đã bị ẩn hoặc không đủ số lượng. Hãy xóa sách đó khỏi giỏ trước khi đặt hàng.")}</p>}<footer className="cart-total"><span>{t("Tạm tính")}</span><b>{money(total)}</b><button className="primary wide" disabled={checkingAvailability || unavailable} onClick={onCheckout}>{checkingAvailability ? t("Đang kiểm tra sách…") : unavailable ? t("Cập nhật giỏ hàng để tiếp tục") : t("Tiếp tục đặt hàng　→")}</button></footer></>}
    </section>
  </div>;
}

export function CheckoutModal({ cart, token, user, onClose, onComplete }) {
  const { t, money } = useLanguage();
  const [form, setForm] = useState({
    recipient_name: user?.full_name || "", recipient_phone: "", address_line: "",
    to_province_id: null, to_province_name: "", to_ward_code: "", to_ward_name: "",
    to_district_name: "", is_new_to_address: true, payment_method: "cod",
  });
  const addressTouched = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [orderCode, setOrderCode] = useState("");
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState("");
  const set = (key, value) => {
    if (["address_line", "to_province_id", "to_province_name", "to_ward_code", "to_ward_name", "to_district_name", "is_new_to_address"].includes(key)) {
      addressTouched.current = true;
    }
    setForm((current) => ({ ...current, [key]: value }));
  };
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);
  const itemKey = useMemo(() => JSON.stringify(cart.map((item) => ({ book_id: item.id, quantity: item.quantity }))), [cart]);

  useEffect(() => {
    let active = true;
    api("/auth/me/profile", { token })
      .then((result) => {
        if (!active || !result.data?.profile) return;
        const profile = result.data.profile;
        setForm((current) => ({
          ...current,
          recipient_name: current.recipient_name === (user?.full_name || "")
            ? profile.full_name || current.recipient_name : current.recipient_name,
          recipient_phone: current.recipient_phone || profile.phone || "",
          ...(addressTouched.current ? {} : {
            address_line: profile.shipping_address || "",
            to_province_id: profile.shipping_province_id ?? null,
            to_province_name: profile.shipping_province_name || "",
            to_ward_code: profile.shipping_ward_code || "",
            to_ward_name: profile.shipping_ward_name || "",
            to_district_name: profile.shipping_district_name || "",
            is_new_to_address: profile.shipping_is_new_to_address == null
              ? true : Boolean(profile.shipping_is_new_to_address),
          }),
        }));
      })
      .catch(() => {});
    return () => { active = false; };
  }, [token, user?.full_name]);

  useEffect(() => {
    let active = true;
    if (!cart.length) { setQuote(null); return () => { active = false; }; }
    setQuoteLoading(true);
    api('/orders/quote', { method: 'POST', token, body: JSON.stringify({ items: JSON.parse(itemKey), order_promotion_code: orderCode.trim() || null }) })
      .then((result) => {
        if (!active) return;
        setQuote(result.data);
        setQuoteError(result.data?.promotion_error ? promotionErrorText(result.data.promotion_error) : '');
      })
      .catch((requestError) => { if (active) { setQuote(null); setQuoteError(requestError.message); } })
      .finally(() => { if (active) setQuoteLoading(false); });
    return () => { active = false; };
  }, [itemKey, orderCode, token, cart.length]);

  async function submit(event) {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    const addressParts = [form.address_line.trim(), form.to_ward_name, !form.is_new_to_address && form.to_district_name, form.to_province_name].filter(Boolean);
    try {
      const result = await api("/orders", {
        method: "POST", token,
        body: JSON.stringify({
          recipient_name: form.recipient_name.trim(), recipient_phone: form.recipient_phone.trim(),
          shipping_address: addressParts.join(", "), to_ward_name: form.to_ward_name,
          to_province_name: form.to_province_name,
          ...(form.is_new_to_address ? {} : { to_district_name: form.to_district_name.trim() }),
          is_new_to_address: form.is_new_to_address,
          payment_method: form.payment_method,
          items: cart.map((item) => ({ book_id: item.id, quantity: item.quantity })),
          order_promotion_code: orderCode.trim() || null,
        }),
      });
      if (form.payment_method === "vnpay") {
        onComplete(result.data);
        if (result.payment?.url) window.location.assign(result.payment.url);
        return;
      }
      setSuccess(result.data?.shipping_error
        ? `${t("Đã tạo đơn")}${result.data.order_code}; ${t("chưa tạo được vận đơn:")} ${t(result.data.shipping_error)}`
        : `${t("Đặt hàng thành công, đang chờ cửa hàng xác nhận. Mã đơn: ")}${result.data?.order_code || ""}`);
      onComplete(result.data);
    } catch (requestError) { setError(t(promotionErrorText({ code: requestError.message }) || requestError.message)); }
    finally { setBusy(false); }
  }

  return <div className="order-overlay checkout-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <header><div><span className="store-kicker">{t("GIAO HÀNG TẬN NƠI")}</span><h2 id="checkout-title">{t("Thông tin đặt hàng")}</h2></div><button className="icon" onClick={onClose} aria-label={t("Đóng")}><X /></button></header>
      <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
        <label>{t("Người nhận")}<input required maxLength="255" value={form.recipient_name} onChange={(event) => set("recipient_name", event.target.value)} /></label>
        <label>{t("Số điện thoại")}<input required type="tel" maxLength="20" placeholder="09xx xxx xxx" value={form.recipient_phone} onChange={(event) => set("recipient_phone", event.target.value)} /></label>
        <label className="checkout-full">{t("Địa chỉ cụ thể")}<input required maxLength="1024" placeholder={t("Số nhà, tên đường")} value={form.address_line} onChange={(event) => set("address_line", event.target.value)} /></label>
        <GhnAddressFields
          value={form}
          setValue={setForm}
          token={token}
          onEdit={() => { addressTouched.current = true; }}
        />
        <fieldset className="checkout-payment checkout-full" disabled={busy}>
          <legend>{t("Phương thức thanh toán")}</legend>
          <label className={form.payment_method === "cod" ? "payment-option is-selected" : "payment-option"}>
            <input type="radio" name="payment_method" value="cod" checked={form.payment_method === "cod"} onChange={() => set("payment_method", "cod")} />
            <span><b>{t("Thanh toán khi nhận hàng (COD)")}</b><small>{t("Thanh toán tiền sách sau giảm giá và phí giao hàng khi nhận hàng.")}</small></span>
          </label>
          <label className={form.payment_method === "vnpay" ? "payment-option is-selected" : "payment-option"}>
            <input type="radio" name="payment_method" value="vnpay" checked={form.payment_method === "vnpay"} onChange={() => set("payment_method", "vnpay")} />
            <span><b>VNPAY</b><small>{t("Thanh toán trực tuyến cả tiền sách và phí giao hàng qua VNPAY.")}</small></span>
          </label>
        </fieldset>
        <section className="checkout-promotions checkout-full">
          <b>{t('Mã giảm giá đơn hàng')}</b>
          <div className="checkout-promo-input"><input aria-label={t('Nhập mã giảm giá')} value={orderCode} onChange={(event) => setOrderCode(event.target.value.toUpperCase())} placeholder={t('Nhập mã hoặc chọn gợi ý')} /><button type="button" className="secondary" onClick={() => setOrderCode('')} disabled={!orderCode}>{t('Bỏ mã')}</button></div>
          {quoteError && <p className="order-message order-error">{t(quoteError)}</p>}
          {quoteLoading && <small>{t('Đang tính lại ưu đãi…')}</small>}
          {quote?.order_promotions?.length > 0 && <div className="checkout-promo-list">{quote.order_promotions.map((promotion) => <article key={promotion.id} className={!promotion.eligible ? 'is-ineligible' : ''}><div><b>{promotion.name} · {promotion.code}</b><small>{promotion.discount_type === 'percent' ? `${promotion.discount_value}%` : money(promotion.discount_value)} · {t('Đơn tối thiểu')} {money(promotion.min_order_amount)}</small><small>{promotion.eligible ? t('Hạn dùng {date}', { date: promotion.end_at }) : promotionReasonText(promotion, money)}</small></div><button type="button" className="secondary" disabled={!promotion.eligible || orderCode.toUpperCase() === promotion.code || quoteLoading} onClick={() => setOrderCode(promotion.code)}>{t(orderCode.toUpperCase() === promotion.code ? 'Đang áp dụng' : 'Áp dụng')}</button></article>)}</div>}
        </section>
        {error && <p className="order-message order-error checkout-full">{t(error)}</p>}
        {success && <p className="order-message checkout-success checkout-full">{success}</p>}
        <button className="primary checkout-full" disabled={busy || quoteLoading || !cart.length || !quote || Boolean(quote.promotion_error)}>{busy ? <><LoaderCircle className="spin" size={16} /> {t("Đang tạo đơn…")}</> : (form.payment_method === "vnpay" ? t("Tiếp tục đến VNPAY") : `${t("Xác nhận đặt hàng")} · ${money(quote?.total_amount ?? total)}`)}</button>
      </form><aside className="checkout-summary"><b>{t("Đơn hàng của bạn")}</b>{(quote?.items || cart).map((item) => <div key={item.book_id || item.id}><span>{item.book_title || item.title} {t("×")} {item.quantity}</span><b>{money(item.line_subtotal ?? item.unit_price * item.quantity ?? item.price * item.quantity)}</b></div>)}<hr /><div><span>{t('Giảm trực tiếp')}</span><b>-{money(quote?.direct_discount_amount || 0)}</b></div><div><span>{t('Mã đơn hàng')}</span><b>-{money(quote?.order_discount_amount || 0)}</b></div><div className="checkout-total"><span>{t("Tổng tiền sách")}</span><b>{money(quote?.total_amount ?? total)}</b></div><small>{t(form.payment_method === "vnpay" ? "Phí giao hàng sẽ được xác định trước khi chuyển đến VNPAY. Tổng thanh toán bao gồm phí giao hàng." : "Bạn sẽ thanh toán khi nhận hàng (COD). Phí giao hàng được cập nhật khi tạo vận đơn GHN.")}</small><small>{t("Giá, tồn kho và ưu đãi sẽ được backend xác nhận. Đơn hàng chờ cửa hàng xác nhận thủ công.")}</small></aside></div>
    </section>
  </div>;
}
