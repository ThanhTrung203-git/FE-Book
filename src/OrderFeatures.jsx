import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, LoaderCircle, PackageCheck, RefreshCw, Truck, X } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import StatusDropdown from "./StatusDropdown.jsx";

const STATUSES = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang chuẩn bị",
  shipped: "Đang giao",
  delivered: "Đã giao",
  cancelled: "Đã hủy",
};
const NEXT = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

function OrderItems({ items = [] }) {
  const { t, money } = useLanguage();
  return <ul className="order-items">{items.map((item) => <li key={item.id || `${item.book_id}-${item.book_title}`}>
    <span>{item.book_title} <small>{t("×")} {item.quantity}</small></span>
    <b>{money(item.unit_price * item.quantity)}</b>
  </li>)}</ul>;
}

export function CustomerOrders({ token }) {
  const { t, money, dateTime } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api(`/orders?page=${page}&limit=10`, { token });
      setOrders(result.data || []);
      setMeta(result.meta || { page, limit: 10, total: 0 });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [page, token]);

  useEffect(() => { load(); }, [load]);
  const pages = Math.max(1, Math.ceil(meta.total / (meta.limit || 10)));

  return <section className="orders-page">
    <header className="orders-heading"><div><span className="store-kicker">{t("TÀI KHOẢN CỦA BẠN")}</span><h1>{t("Đơn hàng của tôi")}</h1><p>{t("Theo dõi trạng thái đơn hàng và vận chuyển.")}</p></div>
      <button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15} /> {t("Làm mới")}</button>
    </header>
    {error && <div className="order-message order-error">{t(error)}</div>}
    {loading ? <div className="store-state"><LoaderCircle className="spin" /> {t("Đang tải đơn hàng…")}</div>
      : orders.length === 0 ? <div className="order-empty"><PackageCheck /><b>{t("Bạn chưa có đơn hàng")}</b><span>{t("Thêm sách vào giỏ để bắt đầu đặt hàng.")}</span></div>
        : <div className="order-list">{orders.map((order) => <article className="order-card" key={order.id}>
          <div className="order-card-head"><div><small>{t("MÃ ĐƠN")}</small><b>{order.order_code}</b><span>{dateTime(order.created_at)}</span></div><span className={`order-status status-${order.status}`}>{t(STATUSES[order.status] || order.status)}</span></div>
          <div className="order-summary"><span>{order.items?.length || 0} {t("loại sách")} · {order.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0} {t("cuốn")}</span><b>{money(order.total_amount)}</b></div>
          <div className="order-shipment"><Truck size={15} /><span>{order.ghn_order_code ? `${t("Mã vận đơn GHN:")} ${order.ghn_order_code}` : t("Vận đơn: chưa có")}</span><b>{t(order.ghn_status || "Chưa cập nhật")}</b></div>
          {expanded === order.id && <div className="order-expanded"><OrderItems items={order.items} /><div><b>{t("Người nhận:")}</b> {order.recipient_name} · {order.recipient_phone}</div><div><b>{t("Địa chỉ:")}</b> {order.shipping_address}</div><div><b>{t("Tiền sách:")}</b> {money(order.subtotal)}　·　<b>{t("Phí giao hàng:")}</b> {money(order.shipping_fee)}</div></div>}
          <button className="order-toggle" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? t("Thu gọn") : t("Xem chi tiết")}</button>
        </article>)}</div>}
    {!loading && meta.total > 10 && <div className="store-pagination"><span>{t("Trang ")}{page} / {pages}</span><div><button aria-label={t("Trang trước")} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={16} /></button><button aria-label={t("Trang sau")} disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><ArrowRight size={16} /></button></div></div>}
  </section>;
}

export function AdminOrders({ token, onClose, notify }) {
  const { t, money, dateTime } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      const result = await api(`/admin/orders?${params}`, { token });
      setOrders(result.data || []);
      setMeta(result.meta || { page, limit: 20, total: 0 });
    } catch (requestError) { setError(requestError.message); }
    finally { setLoading(false); }
  }, [page, statusFilter, token]);
  useEffect(() => { load(); }, [load]);

  async function mutate(order, action, status) {
    setBusy(`${order.id}:${action}`);
    try {
      if (action === "status") {
        await api(`/admin/orders/${order.id}/status`, { method: "PATCH", token, body: JSON.stringify({ status }) });
        notify(t("Đã cập nhật trạng thái đơn hàng."));
      } else if (action === "create") {
        await api(`/admin/orders/${order.id}/shipment`, { method: "POST", token });
        notify(t("Đã tạo vận đơn GHN."));
      } else {
        const result = await api(`/admin/orders/${order.id}/shipment`, { token });
        notify(`${t("Đã đồng bộ trạng thái GHN:")} ${result.data?.shipment?.status || t("hoàn tất")}.`);
      }
      await load();
    } catch (requestError) { notify(t(requestError.message)); }
    finally { setBusy(""); }
  }

  const pages = Math.max(1, Math.ceil(meta.total / (meta.limit || 20)));
  return <div className="order-overlay" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="admin-orders" role="dialog" aria-modal="true" aria-labelledby="admin-orders-title">
      <header className="admin-orders-heading"><div><span className="store-kicker">{t("TRUNG TÂM ĐIỀU HÀNH")}</span><h2 id="admin-orders-title">{t("Quản lý đơn hàng")}</h2><p>{meta.total} {t("đơn hàng trong cửa hàng.")}</p></div><button className="icon" onClick={onClose} aria-label={t("Đóng")}><X /></button></header>
      <div className="admin-order-toolbar"><label>{t("Lọc trạng thái")} <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value); setPage(1); }}><option value="">{t("Tất cả đơn hàng")}</option>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}</select></label><button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15} /> {t("Làm mới")}</button></div>
      {error && <div className="order-message order-error">{t(error)}</div>}
      {loading ? <div className="store-state"><LoaderCircle className="spin" /> {t("Đang tải đơn hàng…")}</div>
        : orders.length === 0 ? <div className="order-empty"><PackageCheck /><b>{t("Chưa có đơn hàng")}</b></div>
          : <div className="admin-order-list">{orders.map((order) => <article className="order-card" key={order.id}>
            <div className="order-card-head"><div><small>{t("MÃ ĐƠN")} · {t("KHÁCH")} #{order.user_id}</small><b>{order.order_code}</b><span>{dateTime(order.created_at)} · {order.recipient_name}</span></div><span className={`order-status status-${order.status}`}>{t(STATUSES[order.status] || order.status)}</span></div>
            <div className="order-summary"><span>{order.items?.length || 0} {t("loại sách")} · {order.recipient_phone}</span><b>{money(order.total_amount)}</b></div>
            <div className="admin-order-actions">
              <StatusDropdown value={order.status} disabled={Boolean(busy) || !NEXT[order.status]?.length}
                label={t("Trạng thái đơn hàng: {code}", { code: order.order_code })}
                onChange={(status) => mutate(order, "status", status)}
                options={[order.status, ...(NEXT[order.status] || [])].map((value) => ({
                  value, label: t(STATUSES[value] || value),
                  tone: value === "delivered" ? "green" : value === "cancelled" ? "red" : "purple",
                }))} />
              {!order.ghn_order_code && !["cancelled", "delivered"].includes(order.status) && <button className="secondary" disabled={Boolean(busy)} onClick={() => mutate(order, "create")}><PackageCheck size={15} /> {t("Tạo vận đơn")}</button>}
              {order.ghn_order_code && <><span className="ghn-code"><Truck size={14} /> {order.ghn_order_code} · {t(order.ghn_status || "chưa cập nhật")}</span><button className="secondary" disabled={Boolean(busy)} onClick={() => mutate(order, "sync")}><RefreshCw size={14} /> {t("Đồng bộ GHN")}</button></>}
              <button className="order-toggle" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? t("Thu gọn") : t("Chi tiết")}</button>
            </div>
            {expanded === order.id && <div className="order-expanded"><OrderItems items={order.items} /><div><b>{t("Địa chỉ:")}</b> {order.shipping_address}</div><div><b>{t("Tiền sách:")}</b> {money(order.subtotal)} · <b>{t("Phí giao hàng:")}</b> {money(order.shipping_fee)}</div></div>}
          </article>)}</div>}
      {!loading && meta.total > 20 && <div className="store-pagination"><span>{t("Trang ")}{page} / {pages}</span><div><button aria-label={t("Trang trước")} disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={16} /></button><button aria-label={t("Trang sau")} disabled={page >= pages} onClick={() => setPage((value) => value + 1)}><ArrowRight size={16} /></button></div></div>}
    </section>
  </div>;
}
