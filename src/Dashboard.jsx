import { useCallback, useEffect, useRef, useState } from "react";
import { BarChart3, BookOpen, Boxes, CircleDollarSign, ShoppingBag, Truck, TrendingUp, RefreshCw, LoaderCircle, Menu, ArrowUpRight } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import "./dashboard.css";

const PERIODS = { day: "Ngày", week: "Tuần", month: "Tháng", quarter: "Quý", year: "Năm" };
const STATUSES = { pending: "Chờ xác nhận", confirmed: "Đã xác nhận", processing: "Đang chuẩn bị", shipped: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy" };

function periodLabel(start, period, language) {
  const date = new Date(start + "T00:00:00Z");
  if (period === "year") return start.slice(0, 4);
  if (period === "quarter") return (language === "vi" ? "Q" : "Q") + (Math.floor((Number(start.slice(5, 7)) - 1) / 3) + 1) + "/" + start.slice(0, 4);
  return new Intl.DateTimeFormat(language === "en" ? "en-GB" : "vi-VN", {
    timeZone: "UTC", ...(period === "month" ? { month: "2-digit", year: "numeric" } : { day: "2-digit", month: "2-digit" }),
  }).format(date);
}

function SalesChart({ rows, period, metric }) {
  const { t, money, language } = useLanguage();
  const [selected, setSelected] = useState(null);
  useEffect(() => setSelected(null), [rows, metric]);
  const width = Math.max(760, rows.length * 40);
  const height = 300, left = 68, right = 20, top = 20, bottom = 45;
  const keys = metric === "orders" ? ["orders"] : ["gross_revenue", "net_revenue"];
  const values = rows.flatMap(row => keys.map(key => Number(row[key])));
  const max = Math.max(metric === "orders" ? 4 : 1, ...values), min = Math.min(0, ...values);
  const y = value => top + (max - value) / (max - min) * (height - top - bottom);
  const band = (width - left - right) / Math.max(rows.length, 1);
  const compact = value => new Intl.NumberFormat(language === "en" ? "en-GB" : "vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(value);
  const active = rows[selected] || rows.at(-1);
  const ticks = Array.from({ length: 5 }, (_, index) => min + (max - min) * index / 4);
  const labelStep = Math.max(1, Math.ceil(rows.length / 16));
  return <>
    <div className="dashboard-chart-scroll">
      <svg viewBox={`0 0 ${width} ${height}`} style={{ minWidth: width }} role="img" aria-label={t("Biểu đồ bán hàng theo kỳ")}>
        {ticks.map((tick, index) => <g key={index}><line x1={left} x2={width - right} y1={y(tick)} y2={y(tick)} stroke="#ecebf2" strokeDasharray="4 5" /><text x={left - 12} y={y(tick) + 4} textAnchor="end" fill="#96909f" fontSize="10">{metric === "orders" ? Math.round(tick) : compact(tick)}</text></g>)}
        <line x1={left} x2={width - right} y1={y(0)} y2={y(0)} stroke="#cfcbd7" />
        {rows.map((row, index) => {
          const x = left + index * band;
          const barWidth = Math.min(20, band * (keys.length === 1 ? .55 : .28));
          const label = periodLabel(row.start, period, language);
          return <g key={row.start} tabIndex={0} onFocus={() => setSelected(index)} onMouseEnter={() => setSelected(index)} aria-label={`${label}: ${t("Doanh thu")} ${money(row.gross_revenue)}, ${t("Sau phí ship")} ${money(row.net_revenue)}, ${row.orders} ${t("đơn")}`}>
            <rect x={x + 2} y={top} width={Math.max(1, band - 4)} height={height - top - bottom} rx="5" fill={selected === index ? "#f5f2fc" : "transparent"} />
            {keys.map((key, keyIndex) => {
              const value = Number(row[key]);
              return <rect key={key} x={x + band / 2 + (keyIndex - keys.length / 2) * (barWidth + 3)} y={Math.min(y(0), y(value))} width={barWidth} height={Math.abs(y(value) - y(0))} rx="3" fill={value < 0 ? "#d88a42" : key === "net_revenue" ? "#45a589" : "#8a6bea"} />;
            })}
            {(index % labelStep === 0 || index === rows.length - 1) && <text x={x + band / 2} y={height - 16} textAnchor="middle" fill="#96909f" fontSize="10">{label}</text>}
          </g>;
        })}
      </svg>
    </div>
    {active && <div className="dashboard-chart-detail" aria-live="polite"><b>{periodLabel(active.start, period, language)}</b><span>{t("Doanh thu")}: <strong>{money(active.gross_revenue)}</strong></span><span>{t("Sau phí ship")}: <strong>{money(active.net_revenue)}</strong></span><span>{t("Phí giao hàng")}: {money(active.shipping_fee)}</span><span>{active.orders} {t("đơn")} · {active.units} {t("cuốn")}</span></div>}
  </>;
}

function Metric({ icon: Icon, label, value, detail, tone = "purple" }) {
  return <article className={`dashboard-metric metric-${tone}`}><div><span>{label}</span><Icon size={19} /></div><strong>{value}</strong><small>{detail}</small></article>;
}

export default function Dashboard({ token, onOpenMenu, onViewOrders, onViewProducts }) {
  const { t, money, dateTime } = useLanguage();
  const [period, setPeriod] = useState("month");
  const [range, setRange] = useState(null);
  const [draft, setDraft] = useState({ from: "", to: "" });
  const [metric, setMetric] = useState("revenue");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams({ period });
      if (range) { params.set("from", range.from); params.set("to", range.to); }
      const result = await api("/admin/dashboard?" + params, { token });
      if (id !== request.current) return;
      setData(result.data);
      setDraft({ from: result.data.range.from, to: result.data.range.to });
    } catch (requestError) { if (id === request.current) setError(requestError.message); }
    finally { if (id === request.current) setLoading(false); }
  }, [period, range, token]);
  useEffect(() => { load(); return () => { request.current++; }; }, [load]);
  const inventory = data?.inventory || {};
  const summary = data?.summary || {};
  const lifetime = data?.lifetime || {};
  const number = value => Number(value || 0).toLocaleString();
  const totalPlaced = data?.order_statuses.reduce((sum, row) => sum + row.count, 0) || 0;
  function changePeriod(value) { setPeriod(value); setRange(null); setDraft({ from: "", to: "" }); }

  return <main className="admin-page-panel dashboard-page"><div className="dashboard-content">
    <header className="dashboard-heading">
      <div><span className="dashboard-kicker">{t("TỔNG QUAN KINH DOANH")}</span><h1><button className="icon mobile" onClick={onOpenMenu} aria-label={t("Mở menu")}><Menu /></button>{t("Dashboard")}</h1><p>{t("Theo dõi cửa hàng qua những con số thực tế.")}</p></div>
      <div className="dashboard-header-actions">{data && <small>{t("Cập nhật")}: {dateTime(data.generated_at)}</small>}<button className="secondary" onClick={load} disabled={loading}><RefreshCw size={15} className={loading ? "spin" : ""} />{t("Làm mới")}</button></div>
    </header>
    <section className="dashboard-controls" aria-label={t("Bộ lọc thống kê")}>
      <div className="dashboard-periods">{Object.entries(PERIODS).map(([value, label]) => <button key={value} className={period === value ? "is-active" : ""} onClick={() => changePeriod(value)} aria-pressed={period === value}>{t(label)}</button>)}</div>
      <form onSubmit={event => { event.preventDefault(); if (draft.from && draft.to) setRange({ ...draft }); }}>
        <label>{t("Từ ngày")}<input type="date" required value={draft.from} max={draft.to || undefined} onChange={event => setDraft(current => ({ ...current, from: event.target.value }))} /></label>
        <span>—</span><label>{t("Đến ngày")}<input type="date" required value={draft.to} min={draft.from || undefined} onChange={event => setDraft(current => ({ ...current, to: event.target.value }))} /></label>
        <button className="primary" disabled={loading}>{t("Áp dụng")}</button>{range && <button type="button" className="secondary" onClick={() => changePeriod(period)}>{t("Mặc định")}</button>}
      </form>
    </section>
    {error && <div className="order-message order-error" role="alert">{t(error)}<button className="order-toggle" onClick={load}>{t("Thử tải lại")}</button></div>}
    {loading && !data ? <div className="dashboard-loading"><LoaderCircle className="spin" />{t("Đang tải thống kê…")}</div> : data && <div className={loading ? "dashboard-body is-loading" : "dashboard-body"} aria-busy={loading}>
      <section className="dashboard-lifetime">
        <div><span>{t("TỔNG DOANH THU LŨY KẾ")}</span><strong>{money(lifetime.net_revenue)}</strong><small>{t("Sau phí ship · từ các đơn đã thanh toán")}</small></div>
        <div><span>{t("Doanh thu đã ghi nhận")}</span><b>{money(lifetime.gross_revenue)}</b></div>
        <div><span>{t("Phí giao hàng đã trừ")}</span><b>{money(lifetime.shipping_fee)}</b></div>
        <div><span>{t("Đơn đã thanh toán")}</span><b>{number(lifetime.orders)}</b></div>
      </section>
      <div className="dashboard-section-heading"><h2>{t("Số liệu trong kỳ")}</h2><span>{data.range.from} → {data.range.to}</span></div>
      <section className="dashboard-metrics">
        <Metric icon={BookOpen} label={t("Sản phẩm")} value={number(inventory.total_products)} detail={t("{active} đang bán · {hidden} đã ẩn", { active: number(inventory.active_products), hidden: number(inventory.hidden_products) })} />
        <Metric icon={Boxes} label={t("Số lượng tồn kho")} value={number(inventory.stock_units)} detail={t("{low} sắp hết · {out} hết hàng", { low: number(inventory.low_stock), out: number(inventory.out_of_stock) })} />
        <Metric icon={CircleDollarSign} label={t("Doanh thu trong kỳ")} value={money(summary.gross_revenue)} detail={t("Sau giảm giá, gồm phí ship khách trả")} />
        <Metric icon={Truck} label={t("Phí giao hàng")} value={money(summary.shipping_fee)} detail={t("Phí ship đã ghi nhận của đơn thanh toán")} tone="orange" />
        <Metric icon={TrendingUp} label={t("Doanh thu sau phí ship")} value={money(summary.net_revenue)} detail={t("Doanh thu trong kỳ − phí giao hàng")} tone="green" />
        <Metric icon={ShoppingBag} label={t("Đơn đã thanh toán")} value={number(summary.orders)} detail={t("{count} cuốn đã bán", { count: number(summary.units) })} />
      </section>
      <section className="dashboard-card dashboard-sales">
        <header><div><h2><BarChart3 size={18} />{t("Biểu đồ bán hàng")}</h2><p>{t("Di chuột hoặc chọn cột để xem số liệu chi tiết.")}</p></div><div className="dashboard-chart-toggle"><button onClick={() => setMetric("revenue")} aria-pressed={metric === "revenue"} className={metric === "revenue" ? "is-active" : ""}>{t("Doanh thu")}</button><button onClick={() => setMetric("orders")} aria-pressed={metric === "orders"} className={metric === "orders" ? "is-active" : ""}>{t("Số đơn")}</button></div></header>
        {metric === "revenue" && <div className="dashboard-legend"><span><i />{t("Doanh thu")}</span><span><i className="net" />{t("Sau phí ship")}</span></div>}
        {summary.orders === 0 && <p className="dashboard-empty">{t("Chưa có đơn đã thanh toán trong khoảng này.")}</p>}
        <SalesChart rows={data.series} period={data.range.period} metric={metric} />
      </section>
      <div className="dashboard-bottom-grid">
        <section className="dashboard-card"><header><h2>{t("Sách bán chạy")}</h2><button className="order-toggle" onClick={onViewProducts}>{t("Sản phẩm")} <ArrowUpRight size={13} /></button></header>
          {data.top_products.length ? <ol className="dashboard-top-books">{data.top_products.map((book, index) => <li key={book.book_id}><em>{String(index + 1).padStart(2, "0")}</em><div><b>{book.title}</b><small>{book.orders} {t("đơn đã thanh toán")}</small></div><strong>{book.units}<small>{t("cuốn")}</small></strong></li>)}</ol> : <p className="dashboard-empty">{t("Chưa có dữ liệu bán hàng.")}</p>}
        </section>
        <section className="dashboard-card"><header><h2>{t("Đơn đặt trong kỳ")}</h2><button className="order-toggle" onClick={onViewOrders}>{t("Đơn hàng")} <ArrowUpRight size={13} /></button></header>
          <div className="dashboard-status-list">{Object.entries(STATUSES).map(([status, label]) => { const count = data.order_statuses.find(row => row.status === status)?.count || 0; return <div key={status}><span>{t(label)}</span><div><i className={`status-bar-${status}`} style={{ width: `${totalPlaced ? count / totalPlaced * 100 : 0}%` }} /></div><b>{count}</b></div>; })}</div>
          <small className="dashboard-caption">{t("Theo ngày đặt đơn, gồm cả đơn chưa thanh toán.")}</small>
        </section>
      </div>
      <section className="dashboard-card"><header><h2>{t("Thanh toán gần đây")}</h2><button className="order-toggle" onClick={onViewOrders}>{t("Xem đơn hàng")} <ArrowUpRight size={13} /></button></header>
        {data.recent_payments.length ? <div className="dashboard-table-scroll"><table><thead><tr><th>{t("Mã đơn")}</th><th>{t("Ngày ghi nhận")}</th><th>{t("Phương thức")}</th><th>{t("Trạng thái đơn hàng")}</th><th>{t("Doanh thu")}</th><th>{t("Sau phí ship")}</th></tr></thead><tbody>{data.recent_payments.map(order => <tr key={order.id}><td><b>{order.order_code}</b></td><td>{dateTime(order.paid_at)}</td><td>{order.payment_method === "vnpay" ? "VNPAY" : "COD"}</td><td>{t(STATUSES[order.status] || order.status)}</td><td>{money(order.total_amount)}</td><td>{money(order.total_amount - order.shipping_fee)}</td></tr>)}</tbody></table></div> : <p className="dashboard-empty">{t("Chưa có giao dịch để hiển thị.")}</p>}
      </section>
      <footer className="dashboard-note"><b>{t("Cách tính")}</b><p>{t("Chỉ tính đơn đã thanh toán, loại đơn đã hủy hoặc hoàn hàng. Thống kê theo ngày thanh toán, múi giờ Việt Nam. Doanh thu sau phí ship = tổng tiền đơn − phí ship đã ghi nhận; chưa trừ giá vốn và chi phí khác.")}</p>
        <p>{t("Số liệu sản phẩm và tồn kho là hiện tại, không phụ thuộc khoảng ngày chọn.")}</p>
        {lifetime.legacy_paid_orders > 0 && <p>{t("{count} đơn cũ thiếu ngày thanh toán được thống kê theo ngày đặt đơn.", { count: lifetime.legacy_paid_orders })}</p>}
      </footer>
    </div>}
  </div></main>;
}
