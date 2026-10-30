import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Minus, Plus, ShoppingBag, Trash2, Truck, X } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";


function field(record, names) {
  for (const name of names) if (record?.[name] !== undefined) return record[name];
  return "";
}

export function CartPanel({ cart, setCart, onClose, onCheckout }) {
  const { t, money } = useLanguage();
  const [availability, setAvailability] = useState({});
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const total = cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0);
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
          <div className="cart-item-copy"><b>{item.title}</b><small>{money(item.price)}</small>{checkingAvailability ? <small className="cart-checking">{t("Đang kiểm tra số lượng…")}</small> : availability[item.id] ? <small className="cart-unavailable">{availability[item.id]}</small> : null}<div className="cart-quantity"><button onClick={() => change(item.id, -1)} aria-label={t("Giảm số lượng")}><Minus size={13} /></button><span>{item.quantity}</span><button onClick={() => change(item.id, 1)} aria-label={t("Tăng số lượng")}><Plus size={13} /></button><button className="cart-remove" onClick={() => setCart((current) => current.filter((book) => book.id !== item.id))} aria-label={t("Xóa sách")}><Trash2 size={14} /></button></div></div>
        </article>)}</div>{unavailable && <p className="order-message order-error">{t("Một số sách đã bị ẩn hoặc không đủ số lượng. Hãy xóa sách đó khỏi giỏ trước khi đặt hàng.")}</p>}<footer className="cart-total"><span>{t("Tạm tính")}</span><b>{money(total)}</b><button className="primary wide" disabled={checkingAvailability || unavailable} onClick={onCheckout}>{checkingAvailability ? t("Đang kiểm tra sách…") : unavailable ? t("Cập nhật giỏ hàng để tiếp tục") : t("Tiếp tục đặt hàng　→")}</button></footer></>}
    </section>
  </div>;
}

export function CheckoutModal({ cart, token, user, onClose, onComplete }) {
  const { t, money } = useLanguage();
  const [form, setForm] = useState({
    recipient_name: user?.full_name || "", recipient_phone: "", address_line: "",
    to_province_name: "", to_ward_name: "", to_district_name: "", is_new_to_address: true,
  });
  const [provinces, setProvinces] = useState([]);
  const [wards, setWards] = useState([]);
  const [provinceId, setProvinceId] = useState("");
  const [addressLookupError, setAddressLookupError] = useState("");
  const [loadingWards, setLoadingWards] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const total = useMemo(() => cart.reduce((sum, item) => sum + Number(item.price) * item.quantity, 0), [cart]);

  useEffect(() => {
    let active = true;
    api("/shipping/ghn/provinces").then((result) => {
      if (active) setProvinces(Array.isArray(result.data) ? result.data : []);
    }).catch((requestError) => active && setAddressLookupError(requestError.message));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    if (!provinceId) { setWards([]); setLoadingWards(false); return () => { active = false; }; }
    setWards([]);
    setLoadingWards(true);
    api(`/shipping/ghn/provinces/${provinceId}/wards`).then((result) => {
      if (active) setWards(Array.isArray(result.data) ? result.data : []);
    }).catch((requestError) => active && setAddressLookupError(requestError.message))
      .finally(() => active && setLoadingWards(false));
    return () => { active = false; };
  }, [provinceId]);

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
          items: cart.map((item) => ({ book_id: item.id, quantity: item.quantity })),
        }),
      });
      setSuccess(result.data?.shipping_error
        ? `${t("Đã tạo đơn")}${result.data.order_code}; ${t("chưa tạo được vận đơn:")} ${t(result.data.shipping_error)}`
        : `${t("Đặt hàng thành công. Mã đơn: ")}${result.data?.order_code || ""}`);
      onComplete(result.data);
    } catch (requestError) { setError(t(requestError.message)); }
    finally { setBusy(false); }
  }

  return <div className="order-overlay checkout-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="checkout-panel" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
      <header><div><span className="store-kicker">{t("GIAO HÀNG TẬN NƠI")}</span><h2 id="checkout-title">{t("Thông tin đặt hàng")}</h2></div><button className="icon" onClick={onClose} aria-label={t("Đóng")}><X /></button></header>
      <div className="checkout-layout"><form className="checkout-form" onSubmit={submit}>
        <label>{t("Người nhận")}<input required maxLength="255" value={form.recipient_name} onChange={(event) => set("recipient_name", event.target.value)} /></label>
        <label>{t("Số điện thoại")}<input required type="tel" maxLength="20" placeholder="09xx xxx xxx" value={form.recipient_phone} onChange={(event) => set("recipient_phone", event.target.value)} /></label>
        <label className="checkout-full">{t("Địa chỉ cụ thể")}<input required maxLength="1024" placeholder={t("Số nhà, tên đường")} value={form.address_line} onChange={(event) => set("address_line", event.target.value)} /></label>
        <label>{t("Tỉnh / thành phố")}{provinces.length ? <select required value={provinceId} onChange={(event) => { const selectedId = event.target.value; const province = provinces.find((item) => String(field(item, ["ProvinceID", "province_id", "_id", "id"])) === selectedId); setProvinceId(selectedId); setWards([]); setLoadingWards(Boolean(selectedId)); set("to_province_name", field(province, ["ProvinceName", "province_name", "name"])); set("to_ward_name", ""); }}><option value="">{t("Chọn tỉnh / thành phố")}</option>{provinces.map((item) => { const id = field(item, ["ProvinceID", "province_id", "_id", "id"]); return <option key={id} value={id}>{field(item, ["ProvinceName", "province_name", "name"])}</option>; })}</select> : <input required value={form.to_province_name} onChange={(event) => set("to_province_name", event.target.value)} placeholder={t("Nhập tỉnh / thành phố")} />}</label>
        <label>{t("Phường / xã")}{provinceId && (loadingWards || wards.length) ? <select required value={form.to_ward_name} disabled={loadingWards} onChange={(event) => set("to_ward_name", event.target.value)}><option value="">{loadingWards ? t("Đang tải…") : t("Chọn phường / xã")}</option>{wards.map((item) => { const name = field(item, ["WardName", "ward_name", "name"]); return <option key={field(item, ["WardCode", "ward_code", "_id", "id"]) || name} value={name}>{name}</option>; })}</select> : <input required value={form.to_ward_name} onChange={(event) => set("to_ward_name", event.target.value)} placeholder={t("Nhập phường / xã")} />}</label>
        <label className="checkout-old-address"><input type="checkbox" checked={!form.is_new_to_address} onChange={(event) => set("is_new_to_address", !event.target.checked)} /> {t("Địa chỉ theo địa giới hành chính cũ")}</label>
        {!form.is_new_to_address && <label className="checkout-full">{t("Quận / huyện")}<input required value={form.to_district_name} onChange={(event) => set("to_district_name", event.target.value)} placeholder={t("Nhập quận / huyện")} /></label>}
        {addressLookupError && <p className="checkout-hint checkout-full"><Truck size={15} /> {t("Không tải được danh sách GHN; bạn có thể nhập địa chỉ bằng tay.")} {t(addressLookupError)}</p>}
        {error && <p className="order-message order-error checkout-full">{t(error)}</p>}
        {success && <p className="order-message checkout-success checkout-full">{success}</p>}
        <button className="primary checkout-full" disabled={busy || !cart.length}>{busy ? <><LoaderCircle className="spin" size={16} /> {t("Đang tạo đơn…")}</> : `${t("Xác nhận đặt hàng")} · ${money(total)}`}</button>
      </form><aside className="checkout-summary"><b>{t("Đơn hàng của bạn")}</b>{cart.map((item) => <div key={item.id}><span>{item.title} {t("×")} {item.quantity}</span><b>{money(item.price * item.quantity)}</b></div>)}<hr /><div className="checkout-total"><span>{t("Tạm tính")}</span><b>{money(total)}</b></div><small>{t("Giá và tồn kho sẽ được BE xác nhận khi tạo đơn. Phí giao hàng có thể được cập nhật khi tạo vận đơn GHN.")}</small></aside></div>
    </section>
  </div>;
}
