import { useCallback, useEffect, useRef, useState } from "react";
import { Bell, Heart, Star, X, LoaderCircle, Clock3, CheckCheck } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import "./customerFeatures.css";

const EVENT_LABELS = { order_created:"Đặt đơn", order_status:"Cập nhật đơn hàng", payment_paid:"Thanh toán thành công", payment_failed:"Thanh toán chưa thành công", payment_review:"Thanh toán cần đối soát", payment_expired:"Hết hạn thanh toán", expiry_review:"Chờ đối soát thanh toán", shipment_created:"Đã tạo vận đơn", shipping_status:"Cập nhật vận chuyển" };
const SOURCES = {customer:"Khách hàng",admin:"Cửa hàng",system:"Hệ thống",ghn:"GHN",vnpay:"VNPAY"};
const STATES = {pending:"Chờ xác nhận",confirmed:"Đã xác nhận",processing:"Đang chuẩn bị",shipped:"Đang giao",delivered:"Đã giao",cancelled:"Đã hủy",paid:"Đã thanh toán",failed:"Thanh toán chưa thành công",expired:"Hết hạn thanh toán",refund_required:"Cần xử lý hoàn tiền",review_required:"Cần đối soát thanh toán"};

export function CustomerActivityNav({token,onOpenOrder,onWishlist}) {
 const {t,dateTime}=useLanguage();
 const [open,setOpen]=useState(false),[rows,setRows]=useState([]),[unread,setUnread]=useState(0),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const box=useRef(null);
 const load=useCallback(async()=>{try{const result=await api("/notifications?limit=10",{token});setRows(result.data);setUnread(result.meta.unread);setError("");}catch(e){setError(e.message);}},[token]);
 useEffect(()=>{load();const timer=setInterval(()=>{if(document.visibilityState==="visible")load();},30000);window.addEventListener("book:activity-changed",load);return()=>{clearInterval(timer);window.removeEventListener("book:activity-changed",load);};},[load]);
 useEffect(()=>{if(!open)return;const outside=e=>{if(!box.current?.contains(e.target))setOpen(false);};const escape=e=>{if(e.key==="Escape")setOpen(false);};document.addEventListener("mousedown",outside);document.addEventListener("keydown",escape);return()=>{document.removeEventListener("mousedown",outside);document.removeEventListener("keydown",escape);};},[open]);
 async function read(row){setBusy(true);try{await api("/notifications/"+row.id+"/read",{method:"PATCH",token});await load();setOpen(false);onOpenOrder?.(row.order_id);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function readAll(){setBusy(true);try{await api("/notifications/read-all",{method:"PATCH",token});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <div className="customer-activity-nav" ref={box}>
  <button type="button" className="activity-icon" onClick={onWishlist} aria-label={t("Danh sách yêu thích")} title={t("Danh sách yêu thích")}><Heart size={20}/></button>
  <button type="button" className="activity-icon" aria-expanded={open} aria-label={t("Thông báo ({count} chưa đọc)",{count:unread})} onClick={()=>{setOpen(!open);if(!open)load();}}><Bell size={20}/>{unread>0&&<b>{unread>99?"99+":unread}</b>}</button>
  {open&&<section className="notification-menu" role="dialog" aria-label={t("Thông báo")}>
   <header><b>{t("Thông báo")}</b><button type="button" className="order-toggle" disabled={busy||!unread} onClick={readAll}><CheckCheck size={14}/>{t("Đọc tất cả")}</button><button type="button" className="icon" aria-label={t("Đóng")} onClick={()=>setOpen(false)}><X size={16}/></button></header>
   {error&&<p className="order-error">{t(error)}</p>}
   {!rows.length?<p className="feature-empty">{t("Bạn chưa có thông báo.")}</p>:rows.map(row=><button disabled={busy} type="button" key={row.id} className={"notification-item "+(!row.read_at?"is-unread":"")} onClick={()=>read(row)}><b>{t(row.title)}</b><span>{row.message}</span><small>{dateTime(row.created_at)}</small></button>)}
  </section>}
 </div>;
}

export function OrderHistory({order,token,admin=false}) {
 const {t,dateTime}=useLanguage();
 const [rows,setRows]=useState([]),[error,setError]=useState("");
 const load=useCallback(async()=>{try{const result=await api((admin?"/admin/orders/":"/orders/")+order.id+"/history",{token});setRows(result.data);setError("");}catch(e){setError(e.message);}},[order.id,token,admin]);
 useEffect(()=>{load();const timer=setInterval(()=>{if(document.visibilityState==="visible")load();},30000);return()=>clearInterval(timer);},[load,order.status,order.payment_status,order.ghn_status]);
 return <section className="order-history"><h4><Clock3 size={15}/>{t("Lịch sử đơn hàng")}</h4>{error&&<p className="order-error">{t(error)}</p>}
  {rows.length?<ol>{rows.map(row=><li key={row.id}><div><b>{t(EVENT_LABELS[row.event_type]||row.event_type)}</b><small>{t(SOURCES[row.source]||row.source)} · {dateTime(row.created_at)}</small></div>{row.to_status&&<span>{row.from_status? t(STATES[row.from_status]||row.from_status)+" → ":""}{t(STATES[row.to_status]||row.to_status)}</span>}{row.detail&&<p>{t(row.detail)}</p>}</li>)}</ol>:!error&&<p>{t("Chưa có sự kiện lịch sử.")}</p>}
 </section>;
}

export function PaymentDeadline({order}) {
 const {t,dateTime}=useLanguage();const [now,setNow]=useState(Date.now());
 const active=order.payment_method==="vnpay"&&order.status==="pending"&&["unpaid","failed"].includes(order.payment_status)&&Boolean(order.payment_expires_at);
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[active]);
 if(order.payment_status==="expired")return <p className="payment-deadline is-expired"><Clock3 size={14}/>{t("Đơn tự hết hạn thanh toán. Tồn kho và ưu đãi đã được hoàn lại.")}</p>;
 if(!active)return null;
 const remaining=Math.max(0,Date.parse(order.payment_expires_at)-now),seconds=Math.ceil(remaining/1000);
 return <p className="payment-deadline"><Clock3 size={14}/>{remaining>0?t("Thời hạn giữ đơn: {time} · đến {date}",{time:Math.floor(seconds/60)+":"+String(seconds%60).padStart(2,"0"),date:dateTime(order.payment_expires_at)}):t("Đã quá hạn giữ đơn, hệ thống đang đối soát thanh toán. Nếu đã trả tiền, không thanh toán lại.")}</p>;
}

export function WishlistPage({token,onOpenBook}) {
 const {t,money}=useLanguage();const [rows,setRows]=useState([]),[meta,setMeta]=useState({total:0,limit:12}),[page,setPage]=useState(1),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{setLoading(true);try{const r=await api("/wishlist?page="+page+"&limit=12",{token});if(!r.data.length&&page>1){setPage(page-1);return;}if(!r.data.length&&page>1){setPage(page-1);return;}setRows(r.data);setMeta(r.meta);setError("");}catch(e){setError(e.message);}finally{setLoading(false);}},[token,page]);
 useEffect(()=>{load();},[load]);
 async function remove(id){try{await api("/wishlist/"+id,{method:"DELETE",token});await load();}catch(e){setError(e.message);}}
 return <section className="wishlist-page"><header><h1><Heart/>{t("Danh sách yêu thích")}</h1><span>{meta.total} {t("sách")}</span></header>{error&&<p role="alert" className="order-error">{t(error)}</p>}
  {loading?<p><LoaderCircle className="spin"/>{t("Đang tải…")}</p>:!rows.length?<p className="feature-empty">{t("Chưa có sách yêu thích. Mở chi tiết sách và bấm trái tim để lưu.")}</p>:<div className="wishlist-grid">{rows.map(book=><article key={book.id}>{book.cover_url?<img src={book.cover_url} alt={book.title}/>:<div className="wishlist-no-cover"><Heart/></div>}<div><h3>{book.title}</h3><b>{money(book.price)}</b><small>{t(!book.is_active?"Sách tạm ngừng bán":Number(book.stock_quantity)>0?"Còn hàng":"Hết hàng")}</small><div><button type="button" className="secondary" disabled={!book.is_active} onClick={()=>onOpenBook(book.id)}>{t("Xem sách")}</button><button type="button" className="order-toggle" onClick={()=>remove(book.id)}>{t("Bỏ yêu thích")}</button></div></div></article>)}</div>}
  {meta.total>12&&<div className="feature-pagination"><button className="secondary" disabled={page<=1||loading} onClick={()=>setPage(page-1)}>{t("Trang trước")}</button><span>{page}/{Math.ceil(meta.total/12)}</span><button className="secondary" disabled={page*12>=meta.total||loading} onClick={()=>setPage(page+1)}>{t("Trang sau")}</button></div>}
 </section>;
}

export function BookEngagement({bookId,token,user,onLogin}) {
 const {t,dateTime}=useLanguage();const customer=Boolean(token&&user?.role==="customer");
 const [saved,setSaved]=useState(false),[rows,setRows]=useState([]),[meta,setMeta]=useState({total:0,average:0}),[page,setPage]=useState(1),[eligible,setEligible]=useState(false),[own,setOwn]=useState(null),[rating,setRating]=useState(5),[comment,setComment]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 const loadReviews=useCallback(async()=>{try{const r=await api("/books/"+bookId+"/reviews?page="+page+"&limit=5",{token});setRows(r.data);setMeta(r.meta);}catch(e){setError(e.message);}},[bookId,page,token]);
 useEffect(()=>{loadReviews();},[loadReviews]);
 useEffect(()=>{if(!customer)return;let live=true;Promise.all([api("/wishlist/"+bookId,{token}),api("/books/"+bookId+"/review-eligibility",{token})]).then(([favorite,review])=>{if(!live)return;setSaved(favorite.data.saved);setEligible(review.data.eligible);setOwn(review.data.review);setRating(review.data.review?.rating||5);setComment(review.data.review?.comment||"");}).catch(e=>{if(live)setError(e.message);});return()=>{live=false;};},[bookId,token,customer]);
 async function toggle(){if(!customer){onLogin?.();return;}setBusy(true);setError("");try{await api("/wishlist/"+bookId,{method:saved?"DELETE":"PUT",token});setSaved(!saved);}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function submit(e){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await api("/books/"+bookId+"/review",{method:"PUT",token,body:JSON.stringify({rating,comment})});setOwn(r.data.review);setNotice(t("Đã lưu đánh giá của bạn."));await loadReviews();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function remove(){setBusy(true);setNotice("");setError("");try{await api("/books/"+bookId+"/review",{method:"DELETE",token});setOwn(null);setComment("");setRating(5);setNotice(t("Đã xóa đánh giá."));await loadReviews();}catch(e){setError(e.message);}finally{setBusy(false);}}
 return <section className="book-engagement"><header><h3>{t("Đánh giá từ khách hàng")}</h3><button type="button" className={"favorite-button "+(saved?"is-saved":"")} disabled={busy} onClick={toggle} aria-pressed={saved}><Heart size={17} fill={saved?"currentColor":"none"}/>{t(saved?"Đã yêu thích":"Yêu thích")}</button></header>
  <p className="review-summary"><Star size={20} fill="#dba249" color="#dba249"/><b>{Number(meta.average).toFixed(1)}/5</b><span>({meta.total} {t("đánh giá")})</span></p>
  {error&&<p role="alert" className="order-message order-error">{t(error)}</p>}{notice&&<p role="status" className="order-message checkout-success">{notice}</p>}
  {customer&&eligible?<form className="review-form" onSubmit={submit}><b>{t(own?"Cập nhật đánh giá của bạn":"Viết đánh giá")}</b><label>{t("Số sao")}<select value={rating} disabled={busy} onChange={e=>setRating(Number(e.target.value))}>{[5,4,3,2,1].map(n=><option key={n} value={n}>{n} / 5</option>)}</select></label><label>{t("Nhận xét")}<textarea maxLength={2000} rows={3} value={comment} onChange={e=>setComment(e.target.value)} placeholder={t("Chia sẻ cảm nhận của bạn về cuốn sách…")} disabled={busy}/></label><div><button className="primary" disabled={busy}>{t("Gửi đánh giá")}</button>{own&&<button type="button" className="order-toggle" disabled={busy} onClick={remove}>{t("Xóa đánh giá của tôi")}</button>}</div></form>:<p className="review-eligibility">{t(customer?"Chỉ khách đã thanh toán và nhận sách mới được đánh giá.":"Đăng nhập để lưu yêu thích và đánh giá sách đã mua.")}</p>}
  <div className="review-list">{rows.map(review=><article key={review.id}><header><b>{review.display_name||t("Khách hàng")}</b><span>{review.rating}/5 <Star size={12} fill="#dba249" color="#dba249"/></span>{review.verified_purchase&&<small>{t("Đã mua và nhận sách")}</small>}</header><p>{review.comment||t("Khách hàng không để lại nhận xét.")}</p><time>{dateTime(review.created_at)}</time></article>)}{!rows.length&&<p className="feature-empty">{t("Chưa có đánh giá cho cuốn sách này.")}</p>}</div>
  {meta.total>5&&<div className="feature-pagination"><button type="button" className="secondary" disabled={page<=1} onClick={()=>setPage(page-1)}>{t("Trang trước")}</button><span>{page}/{Math.ceil(meta.total/5)}</span><button type="button" className="secondary" disabled={page*5>=meta.total} onClick={()=>setPage(page+1)}>{t("Trang sau")}</button></div>}
 </section>;
}
