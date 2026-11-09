import { defaultOrderTimeValue } from "./orderTimeFilter.js";
import "./adminOrderFilters.css";
import { BulkPanel, BulkCheckbox, useBulkSelection } from "./BulkActions.jsx";
import { OrderHistory, PaymentDeadline } from "./CustomerFeatures.jsx";
import { ORDER_STEPS, getOrderStatusMessage, getPaymentNotice } from "./orderPresentation.js";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, LoaderCircle, PackageCheck, RefreshCw, Truck, X } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import StatusDropdown from "./StatusDropdown.jsx";
import { getOrderDelivery } from "./orderDelivery.js";
import { getOrderTotal } from "./orderTotals.js";

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

function OrderPayment({ order }) {
  const { t, dateTime } = useLanguage();
  const statusLabels = { unpaid: "Chưa thanh toán", paid: "Đã thanh toán", cancelled: "Đã hủy thanh toán", expired: "Hết hạn thanh toán", failed: "Thanh toán chưa thành công", refund_required: "Cần xử lý hoàn tiền", review_required: "Cần đối soát thanh toán" };
  return <div className="order-payment">
    <span>{t("Thanh toán:")} <b>{order.payment_method === "vnpay" ? "VNPAY" : t("Thanh toán khi nhận hàng (COD)")}</b></span>
    <span>{t("Trạng thái thanh toán:")} <span className={`payment-status payment-${order.payment_status || 'unpaid'}`}>{t(statusLabels[order.payment_status] || statusLabels.unpaid)}</span></span>
    {order.paid_at && <small>{t("Thanh toán lúc:")} {dateTime(order.paid_at)}</small>}
  </div>;
}

function OrderDeliveryEstimate({ order }) {
  const { t, language } = useLanguage();
  const delivery = getOrderDelivery(order);
  const messages = {
    pending: "Ngày giao dự kiến sẽ có khi cửa hàng bắt đầu chuẩn bị đơn.",
    confirmed: "Đơn đã xác nhận. Ngày giao dự kiến sẽ được cập nhật khi bắt đầu chuẩn bị.",
    waiting: "Đang chờ GHN cập nhật ngày giao dự kiến.",
    cancelled: "Đơn đã hủy, không còn lịch giao dự kiến.",
    delivered: "Đã giao hàng.",
    unavailable: "Hiện chưa có lịch giao dự kiến.",
  };
  const date = delivery.expected && new Intl.DateTimeFormat(language === "en" ? "en-GB" : "vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh", day: "2-digit", month: "2-digit", year: "numeric",
  }).format(delivery.expected);
  return <div className={`order-delivery-estimate delivery-${delivery.state}`}>
    <Truck size={15} aria-hidden="true" />
    <div>{date ? <><b>{t("Dự kiến giao:")} {date}</b><small>{t(delivery.state === "overdue"
      ? "Đã qua ngày dự kiến; đang chờ GHN cập nhật lịch giao."
      : "Ngày dự kiến theo GHN, có thể thay đổi theo quá trình vận chuyển.")}</small></> : <span>{t(messages[delivery.state])}</span>}</div>
  </div>;
}

function OrderPriceSummary({ order }) {
  const { t, money } = useLanguage();
  return <div className="order-price-summary">
    <div><span>{t("Tiền sách:")}</span><b>{money(Number(order.subtotal || 0) + Number(order.direct_discount_amount || 0))}</b></div>
    <div><span>{t("Giảm trực tiếp:")}</span><b>-{money(order.direct_discount_amount || 0)}</b></div>
    <div><span>{t("Giảm mã đơn hàng:")}</span><b>-{money(order.discount_amount || 0)}</b></div>
    <div><span>{t("Phí giao hàng:")}</span><b>{money(order.shipping_fee || 0)}</b></div>
    <div className="order-price-total"><span>{t("Tổng cộng:")}</span><strong>{money(getOrderTotal(order))}</strong></div>
  </div>;
}

function PaymentResultNotice({ notice, onClose }) {
  const { t, money } = useLanguage();
  return <div className={`payment-result-notice notice-${notice.tone}`} role="status" aria-live="polite">
    {notice.tone === "success" ? <CheckCircle2 size={24} aria-hidden="true" /> : <PackageCheck size={24} aria-hidden="true" />}
    <div><b>{t(notice.title)}</b>{notice.order_code && <p>{notice.order_code} · {money(notice.amount)}</p>}
      {notice.order_status && <small>{t("Trạng thái đơn:")} <strong>{t(STATUSES[notice.order_status] || notice.order_status)}</strong></small>}
      {notice.description && <small>{t(notice.description)}</small>}
    </div>
    <button className="icon" aria-label={t("Đóng thông báo")} onClick={onClose}><X size={16} /></button>
  </div>;
}

function OrderProgress({ order }) {
  const { t } = useLanguage();
  const current = ORDER_STEPS.indexOf(order.status);
  return <div className={`customer-order-progress progress-${order.status}`}>
    <p>{t(getOrderStatusMessage(order))}</p>
    {current >= 0 && <ol aria-label={t("Tiến trình đơn hàng")}>{ORDER_STEPS.map((step, index) => <li key={step} className={index < current ? "is-complete" : index === current ? "is-current" : ""} aria-current={index === current ? "step" : undefined}>
      <span>{index < current ? <CheckCircle2 size={15} aria-hidden="true" /> : index + 1}</span><b>{t(STATUSES[step])}</b>
    </li>)}</ol>}
  </div>;
}

export function CustomerOrders({ token, focusOrderId }) {
  const { t, money, dateTime } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 10, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [paymentBusy, setPaymentBusy] = useState(null);
  const [paymentNotice, setPaymentNotice] = useState(null);
  const requestSequence = useRef(0);
  const hasFilters = Boolean(statusFilter || paymentFilter || methodFilter || search);
  const paymentLabels = {
    unpaid: "Chưa thanh toán", paid: "Đã thanh toán", failed: "Thanh toán chưa thành công",
    cancelled: "Đã hủy thanh toán", expired: "Hết hạn thanh toán", refund_required: "Cần xử lý hoàn tiền", review_required: "Cần đối soát thanh toán",
  };

  const load = useCallback(async ({ silent = false } = {}) => {
    const sequence = ++requestSequence.current;
    if (!silent) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), limit: "10" });
      if (statusFilter) params.set("status", statusFilter);
      if (paymentFilter) params.set("payment_status", paymentFilter);
      if (methodFilter) params.set("payment_method", methodFilter);
      if (search) params.set("search", search);
      const result = await api(`/orders?${params}`, { token });
      if (sequence !== requestSequence.current) return;
      const nextMeta = result.meta || { page, limit: 10, total: 0 };
      const lastPage = Math.max(1, Math.ceil(nextMeta.total / (nextMeta.limit || 10)));
      if (page > lastPage) { setPage(lastPage); return; }
      setOrders(result.data || []);
      setPaymentNotice(current => {
        if (!current?.order_code) return current;
        const updated = result.data?.find(order => order.order_code === current.order_code);
        return updated ? getPaymentNotice(updated) : current;
      });
      setMeta(nextMeta);
    } catch (requestError) {
      if (sequence === requestSequence.current && !silent) setError(requestError.message);
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [page, token, statusFilter, paymentFilter, methodFilter, search]);

  function resetFilters() {
    setStatusFilter(""); setPaymentFilter(""); setMethodFilter("");
    setSearch(""); setSearchDraft(""); setPage(1); setError("");
  }

  async function payOrder(order) {
    setPaymentBusy(order.id); setError(""); setPaymentNotice(null);
    try {
      const result = await api(`/orders/${order.id}/payments/vnpay`, { method: "POST", token });
      window.location.assign(result.data.payment.url);
    } catch (requestError) { setError(requestError.message); }
    finally { setPaymentBusy(null); }
  }

  async function checkOrderPayment(orderId, { focus = false } = {}) {
    setPaymentBusy(orderId); setError("");
    setPaymentNotice({ tone: "info", title: "Đang kiểm tra kết quả với VNPAY…", description: "" });
    try {
      const result = await api(`/orders/${orderId}/payments/vnpay/check`, { method: "POST", token });
      const order = result.data;
      setPaymentNotice(getPaymentNotice(order));
      window.dispatchEvent(new Event("book:activity-changed"));
      setOrders(current => current.map(item => item.id === order.id ? order : item));
      if (focus) {
        setStatusFilter(""); setPaymentFilter(""); setMethodFilter("");
        setSearch(order.order_code); setSearchDraft(order.order_code); setPage(1);
        setExpanded(order.id);
      } else {
        await load({ silent: true });
      }
    } catch (requestError) { setError(requestError.message); setPaymentNotice(null); }
    finally { setPaymentBusy(null); }
  }

  useEffect(() => {
    if(!focusOrderId)return;
    let live=true;
    api("/orders/"+(focusOrderId.id||focusOrderId),{token}).then(result=>{
      if(!live)return;
      const order=result.data;setStatusFilter("");setPaymentFilter("");setMethodFilter("");setSearch(order.order_code);setSearchDraft(order.order_code);setPage(1);setExpanded(order.id);
    }).catch(e=>{if(live)setError(e.message);});
    return()=>{live=false;};
  },[focusOrderId,token]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") !== "vnpay") return;
    const orderId = params.get("order_id");
    const invalid = params.get("result") === "invalid";
    for (const key of ["payment", "order_id", "result"]) params.delete(key);
    window.history.replaceState({}, "", window.location.pathname + (params.size ? "?" + params.toString() : "") + window.location.hash);
    if (invalid || !/^\d+$/.test(orderId || "")) setError(t("Không xác thực được kết quả trả về từ VNPAY."));
    else checkOrderPayment(Number(orderId), { focus: true });
  }, [token]);

  useEffect(() => {
    load();
    return () => { requestSequence.current++; };
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && paymentBusy === null) load({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [load, paymentBusy]);
  const pages = Math.max(1, Math.ceil(meta.total / (meta.limit || 10)));

  return <section className="orders-page">
    <header className="orders-heading"><div><span className="store-kicker">{t("TÀI KHOẢN CỦA BẠN")}</span><h1>{t("Đơn hàng của tôi")}</h1><p>{t("Theo dõi trạng thái đơn hàng và vận chuyển.")}</p></div>
      <button className="secondary" onClick={() => { setError(""); load(); }} disabled={loading}><RefreshCw size={15} /> {t("Làm mới")}</button>
    </header>
    {error && <div role="alert" className="order-message order-error">{t(error)}</div>}
    {paymentNotice && <PaymentResultNotice notice={paymentNotice} onClose={() => setPaymentNotice(null)} />}
    <form className="customer-order-filters" onSubmit={event => { event.preventDefault(); setSearch(searchDraft.trim()); setPage(1); setError(""); }}>
      <label>{t("Trạng thái đơn hàng")}<select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1); setError(""); }}>
        <option value="">{t("Tất cả trạng thái")}</option>{Object.entries(STATUSES).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
      </select></label>
      <label>{t("Trạng thái thanh toán")}<select value={paymentFilter} onChange={event => { setPaymentFilter(event.target.value); setPage(1); setError(""); }}>
        <option value="">{t("Tất cả thanh toán")}</option>{Object.entries(paymentLabels).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
      </select></label>
      <label>{t("Phương thức thanh toán")}<select value={methodFilter} onChange={event => { setMethodFilter(event.target.value); setPage(1); setError(""); }}>
        <option value="">{t("Tất cả phương thức")}</option><option value="cod">COD</option><option value="vnpay">VNPAY</option>
      </select></label>
      <label className="order-search-field">{t("Tìm mã đơn")}<span><input maxLength={100} placeholder={t("Nhập mã đơn hàng…")} value={searchDraft} onChange={event => setSearchDraft(event.target.value)} /><button className="secondary" type="submit">{t("Tìm kiếm")}</button></span></label>
      {hasFilters && <button type="button" className="order-toggle" onClick={resetFilters}>{t("Xóa bộ lọc")}</button>}
    </form>
    <div className="orders-results" role="status" aria-live="polite"><span>{loading ? t("Đang tải đơn hàng…") : t("{count} đơn hàng", { count: meta.total })}</span><small>{t("Trạng thái tự cập nhật mỗi 30 giây.")}</small></div>
    {loading ? <div className="store-state"><LoaderCircle className="spin" /> {t("Đang tải đơn hàng…")}</div>
      : orders.length === 0 ? <div className="order-empty"><PackageCheck /><b>{t(hasFilters ? "Không có đơn hàng phù hợp" : "Bạn chưa có đơn hàng")}</b><span>{t(hasFilters ? "Thử thay đổi hoặc xóa bộ lọc." : "Thêm sách vào giỏ để bắt đầu đặt hàng.")}</span>{hasFilters && <button className="secondary" onClick={resetFilters}>{t("Xóa bộ lọc")}</button>}</div>
        : <div className="order-list">{orders.map(order => <article className="order-card customer-order-card" key={order.id}>
          <div className="order-card-head"><div><small>{t("MÃ ĐƠN")}</small><b>{order.order_code}</b><span>{dateTime(order.created_at)}</span></div><span className={`order-status status-${order.status}`}>{t("Trạng thái đơn:")} {t(STATUSES[order.status] || order.status)}</span></div>
          <OrderProgress order={order} />
          <div className="order-summary"><span>{order.items?.length || 0} {t("loại sách")} · {order.items?.reduce((sum, item) => sum + Number(item.quantity), 0) || 0} {t("cuốn")}</span><b>{money(getOrderTotal(order))}</b></div>
          <div className="order-shipment"><Truck size={15} /><span>{order.ghn_order_code ? `${t("Mã vận đơn GHN:")} ${order.ghn_order_code}` : t("Vận đơn: chưa có")}</span><b>{t(order.ghn_status || "Chưa cập nhật")}</b></div>
          <OrderPayment order={order} />
          <PaymentDeadline order={order} />
          {order.payment_method === "vnpay" && order.status !== "cancelled" && order.payment_status !== "paid" && <div className="order-vnpay-actions">
            {order.status === "pending" && ["unpaid", "failed"].includes(order.payment_status) && (!order.payment_expires_at || Date.parse(order.payment_expires_at)>Date.now()) && <button className="primary" disabled={paymentBusy !== null} onClick={() => payOrder(order)}>{t("Thanh toán VNPAY")}</button>}
            <button className="secondary" disabled={paymentBusy !== null} onClick={() => checkOrderPayment(order.id)}>{paymentBusy === order.id ? t("Đang kiểm tra…") : t("Kiểm tra thanh toán")}</button>
          </div>}
          <OrderDeliveryEstimate order={order} />
          {expanded === order.id && <div className="order-expanded"><OrderItems items={order.items} /><div><b>{t("Người nhận:")}</b> {order.recipient_name} · {order.recipient_phone}</div><div><b>{t("Địa chỉ:")}</b> {order.shipping_address}</div>{(order.promotion_usages || []).map(use => <div key={use.promotion_id}><b>{use.code_snapshot}</b> · {use.name_snapshot} · -{money(use.discount_amount)}</div>)}<OrderPriceSummary order={order} /><OrderHistory order={order} token={token} /></div>}
          <button className="order-toggle" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? t("Thu gọn") : t("Xem chi tiết")}</button>
        </article>)}</div>}
    {!loading && meta.total > 10 && <div className="store-pagination"><span>{t("Trang ")}{page} / {pages}</span><div><button aria-label={t("Trang trước")} disabled={page <= 1} onClick={() => setPage(value => value - 1)}><ArrowLeft size={16} /></button><button aria-label={t("Trang sau")} disabled={page >= pages} onClick={() => setPage(value => value + 1)}><ArrowRight size={16} /></button></div></div>}
  </section>;
}

export function AdminOrders({ token, onClose, notify }) {
  const { t, money, dateTime } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [meta, setMeta] = useState({ page: 1, limit: 20, total: 0 });
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [timeUnit,setTimeUnit]=useState(""),[timeValue,setTimeValue]=useState("");
  const loadVersion=useRef(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(null);
  const [bulkBusy,setBulkBusy]=useState(false);
  const scope=JSON.stringify([page,statusFilter,timeUnit,timeValue]);
  const selection=useBulkSelection(orders,scope);
  const load = useCallback(async () => {
    const version=++loadVersion.current;
    setLoading(true); setError("");
    try {
      if(timeUnit&&!timeValue){setOrders([]);setMeta({page:1,limit:20,total:0});return;}
      const params = new URLSearchParams({ page: String(page), limit: "20" });
      if (statusFilter) params.set("status", statusFilter);
      if(timeUnit){params.set("time_unit",timeUnit);params.set("time_value",timeValue);}
      const result = await api(`/admin/orders?${params}`, { token });
      if(version!==loadVersion.current)return;
      setOrders(result.data || []);
      setMeta(result.meta || { page, limit: 20, total: 0 });
    } catch (requestError) { if(version===loadVersion.current)setError(requestError.message); }
    finally { if(version===loadVersion.current)setLoading(false); }
  }, [page, statusFilter, timeUnit, timeValue, token]);
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

  const bulkActions=[
    ...["confirmed","processing","shipped","delivered","cancelled"].map(status=>({
      id:status,label:({confirmed:"Xác nhận các đơn đã chọn",processing:"Chuyển các đơn sang đang chuẩn bị",shipped:"Chuyển các đơn sang đang giao",delivered:"Đánh dấu các đơn đã giao",cancelled:"Hủy các đơn đã chọn"})[status],
      danger:status==="cancelled",
      check:order=>{
        if(order.status===status)return "Đã ở trạng thái yêu cầu";
        if(!NEXT[order.status]?.includes(status))return "Không thể chuyển từ trạng thái hiện tại";
        if(order.payment_method==="vnpay"){
          if(status==="cancelled"&&["paid","refund_required","review_required"].includes(order.payment_status))return "Đơn VNPAY cần xử lý hoàn tiền hoặc đối soát trước khi hủy";
          if(status!=="cancelled"&&order.payment_status!=="paid")return "Đơn VNPAY chưa thanh toán thành công";
        }
        return null;
      },
      run:order=>api("/admin/orders/"+order.id+"/status",{method:"PATCH",token,body:JSON.stringify({status})}),
    })),
    {id:"create_shipment",label:"Tạo vận đơn cho các đơn đã chọn",check:order=>{
      if(order.ghn_order_code)return "Đơn đã có vận đơn";
      if(["cancelled","delivered"].includes(order.status))return "Đơn hàng đã kết thúc";
      if(order.payment_method==="vnpay"&&order.payment_status!=="paid")return "Đơn VNPAY chưa thanh toán thành công";
      return null;
    },run:order=>api("/admin/orders/"+order.id+"/shipment",{method:"POST",token})},
    {id:"sync_shipment",label:"Đồng bộ GHN cho các đơn đã chọn",check:order=>!order.ghn_order_code?"Đơn chưa có vận đơn":null,run:order=>api("/admin/orders/"+order.id+"/shipment",{token})},
  ];
  const pages = Math.max(1, Math.ceil(meta.total / (meta.limit || 20)));
  return <div className="admin-page-panel">
    <section className="admin-orders admin-page-card" aria-labelledby="admin-orders-title">
      <header className="admin-orders-heading"><div><span className="store-kicker">{t("TRUNG TÂM ĐIỀU HÀNH")}</span><h2 id="admin-orders-title">{t("Quản lý đơn hàng")}</h2><p>{meta.total} {t("đơn hàng trong cửa hàng.")}</p></div><button className="icon" onClick={onClose} aria-label={t("Đóng")}><X /></button></header>
      <div className="admin-order-toolbar admin-order-time-filters">
        <label>{t("Lọc trạng thái")}<select disabled={Boolean(busy)||bulkBusy} value={statusFilter} onChange={event=>{setStatusFilter(event.target.value);setPage(1);}}>
          <option value="">{t("Tất cả đơn hàng")}</option>{Object.entries(STATUSES).map(([value,label])=><option key={value} value={value}>{t(label)}</option>)}
        </select></label>
        <label>{t("Lọc theo thời gian")}<select disabled={Boolean(busy)||bulkBusy} value={timeUnit} onChange={event=>{
          const unit=event.target.value;setTimeUnit(unit);setTimeValue(defaultOrderTimeValue(unit));setPage(1);
        }}>
          <option value="">{t("Tất cả thời gian")}</option>
          <option value="month">{t("Theo tháng")}</option><option value="week">{t("Theo tuần")}</option>
          <option value="day">{t("Theo ngày")}</option><option value="hour">{t("Theo giờ")}</option>
        </select></label>
        {timeUnit&&<label>{t(({month:"Chọn tháng",week:"Chọn tuần",day:"Chọn ngày",hour:"Chọn ngày và giờ"})[timeUnit])}
          <input type={timeUnit==="hour"?"datetime-local":timeUnit==="day"?"date":timeUnit} step={timeUnit==="hour"?3600:undefined}
            value={timeValue} disabled={Boolean(busy)||bulkBusy} required
            onChange={event=>{setTimeValue(timeUnit==="hour"&&event.target.value?event.target.value.slice(0,13)+":00":event.target.value);setPage(1);}}/>
        </label>}
        <div className="admin-order-filter-buttons">
          <button type="button" className="secondary" onClick={load} disabled={loading||Boolean(busy)||bulkBusy}><RefreshCw size={15}/>{t("Làm mới")}</button>
          {(statusFilter||timeUnit)&&<button type="button" className="secondary" disabled={Boolean(busy)||bulkBusy}
            onClick={()=>{setStatusFilter("");setTimeUnit("");setTimeValue("");setPage(1);}}>{t("Xóa bộ lọc")}</button>}
        </div>
      </div>
      {timeUnit&&<p className="admin-order-time-note" role="status">
        {t("Lọc theo thời gian tạo đơn, giờ Việt Nam. Tuần bắt đầu từ thứ Hai.")}
        {!timeValue&&" "+t("Chọn mốc thời gian để lọc.")}
        {meta.time_range&&!loading&&<span>{t("Từ {from} đến trước {to}",{from:meta.time_range.from,to:meta.time_range.to})}</span>}
      </p>}
      <BulkPanel selection={selection} actions={bulkActions} scope={scope} disabled={Boolean(busy) || loading} onBusyChange={setBulkBusy} onComplete={load}/>
      {error && <div className="order-message order-error">{t(error)}</div>}
      {loading ? <div className="store-state"><LoaderCircle className="spin" /> {t("Đang tải đơn hàng…")}</div>
        : orders.length === 0 ? <div className="order-empty"><PackageCheck /><b>{t(statusFilter||timeUnit?"Không có đơn hàng phù hợp":"Chưa có đơn hàng")}</b></div>
          : <div className="admin-order-list">{orders.map((order) => <article className="order-card" key={order.id}>
            <label className="bulk-row-label"><BulkCheckbox checked={selection.has(order.id)} disabled={Boolean(busy)||bulkBusy} aria-label={t("Chọn {name}",{name:order.order_code})} onChange={()=>selection.toggle(order.id)}/>{t("Chọn đơn hàng")}</label>
            <div className="order-card-head"><div><small>{t("MÃ ĐƠN")} · {t("KHÁCH")} #{order.user_id}</small><b>{order.order_code}</b><span>{dateTime(order.created_at)} · {order.recipient_name}</span></div><span className={`order-status status-${order.status}`}>{t(STATUSES[order.status] || order.status)}</span></div>
            <div className="order-summary"><span>{order.items?.length || 0} {t("loại sách")} · {order.recipient_phone}</span><b>{money(getOrderTotal(order))}</b></div>
            <div className="admin-order-actions">
              <StatusDropdown value={order.status} disabled={Boolean(busy) || bulkBusy || !NEXT[order.status]?.length}
                label={t("Trạng thái đơn hàng: {code}", { code: order.order_code })}
                onChange={(status) => mutate(order, "status", status)}
                options={[order.status, ...(NEXT[order.status] || []).filter((status) => order.payment_method !== "vnpay" || (status === "cancelled" ? ["unpaid", "failed"].includes(order.payment_status) : order.payment_status === "paid"))].map((value) => ({
                  value, label: t(STATUSES[value] || value),
                  tone: value === "delivered" ? "green" : value === "cancelled" ? "red" : "purple",
                }))} />
              {!order.ghn_order_code && (order.payment_method !== "vnpay" || order.payment_status === "paid") && !["cancelled", "delivered"].includes(order.status) && <button className="secondary" disabled={Boolean(busy)||bulkBusy} onClick={() => mutate(order, "create")}><PackageCheck size={15} /> {t("Tạo vận đơn")}</button>}
              {order.ghn_order_code && <><span className="ghn-code"><Truck size={14} /> {order.ghn_order_code} · {t(order.ghn_status || "chưa cập nhật")}</span><button className="secondary" disabled={Boolean(busy)||bulkBusy} onClick={() => mutate(order, "sync")}><RefreshCw size={14} /> {t("Đồng bộ GHN")}</button></>}
              <button className="order-toggle" onClick={() => setExpanded(expanded === order.id ? null : order.id)}>{expanded === order.id ? t("Thu gọn") : t("Chi tiết")}</button>
            </div>
            <OrderPayment order={order} />
            <PaymentDeadline order={order} />
          <OrderDeliveryEstimate order={order} />
          {expanded === order.id && <div className="order-expanded"><OrderItems items={order.items} /><div><b>{t("Địa chỉ:")}</b> {order.shipping_address}</div>{(order.promotion_usages || []).map((use) => <div key={use.promotion_id}><b>{use.code_snapshot}</b> · {use.name_snapshot} · -{money(use.discount_amount)}</div>)}<OrderPriceSummary order={order} /><OrderHistory order={order} token={token} admin /></div>}
          </article>)}</div>}
      {!loading && meta.total > 20 && <div className="store-pagination"><span>{t("Trang ")}{page} / {pages}</span><div><button aria-label={t("Trang trước")} disabled={page <= 1||Boolean(busy)||bulkBusy} onClick={() => setPage((value) => value - 1)}><ArrowLeft size={16} /></button><button aria-label={t("Trang sau")} disabled={page >= pages||Boolean(busy)||bulkBusy} onClick={() => setPage((value) => value + 1)}><ArrowRight size={16} /></button></div></div>}
    </section>
  </div>;
}
