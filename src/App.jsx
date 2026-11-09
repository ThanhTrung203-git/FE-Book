import { CustomerActivityNav, WishlistPage } from "./CustomerFeatures.jsx";
import Dashboard from "./Dashboard.jsx";
import BookExcelImport from "./BookExcelImport.jsx";
import { BulkPanel, BulkCheckbox, useBulkSelection } from "./BulkActions.jsx";
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Boxes,
  Check,
  LoaderCircle,
  LogOut,
  Menu,
  Plus,
  PackagePlus,
  Pencil,
  Eye,
  EyeOff,
  Search,
  ShieldCheck,
  X,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Users,
  Building2,
  TicketPercent,
  LayoutDashboard,
  FileSpreadsheet,
} from "lucide-react";
import { CustomerProfile, AdminProfileEditor } from "./ProfileForms.jsx";
import { AuthPage } from "./AuthPage.jsx";
import CategoryManager from "./CategoryManager.jsx";
import Storefront from "./Storefront.jsx";
import { AdminOrders, CustomerOrders } from "./OrderFeatures.jsx";
import { ACCESS_KEY, REFRESH_KEY, api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import StatusDropdown from "./StatusDropdown.jsx";
import Editor from "./BookEditor.jsx";
import CatalogManager from "./CatalogManager.jsx";
import PromotionManager from "./PromotionManager.jsx";
const KEY = ACCESS_KEY;
function StockEditor({ book, close, addStock, busy }) {
  const { t } = useLanguage();
  const [quantity, setQuantity] = useState("");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    setError("");
    try {
      await addStock(Number(quantity));
    } catch (requestError) {
      setError(t(requestError.message));
    }
  }
  return (
    <div
      className="admin-page-panel"
    >
      <section className="dialog stock-dialog admin-page-card">
        <header>
          <div>
            <small className="purple">{t("CẬP NHẬT KHO")}</small>
            <h2>{t("Thêm số lượng sách")}</h2>
          </div>
          <button className="icon" onClick={close} aria-label={t("Đóng")}>
            <X />
          </button>
        </header>
        <p className="stock-book-title">{book.title}</p>
        <p className="stock-current">
          {t("Số lượng hiện tại:")} <b>{book.stock_quantity ?? 0}</b>
        </p>
        <form onSubmit={submit}>
          <label className="field">
            {t("Số lượng cần thêm *")}
            <input
              type="number"
              min="1"
              step="1"
              required
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              placeholder={t("Nhập số lượng")}
            />
          </label>
          {error && <p className="error">{t(error)}</p>}
          <footer>
            <button type="button" className="secondary" onClick={close}>
              {t("Hủy")}
            </button>
            <button className="primary" disabled={busy}>
              {busy ? t("Đang cập nhật…") : t("Cộng số lượng")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
export default function App() {
  const { t, money, categoryLabel } = useLanguage();
  let [token, T] = useState(() => localStorage.getItem(KEY) || ""),
    [user, U] = useState(null),
    [checking, C] = useState(Boolean(localStorage.getItem(KEY))),
    [books, B] = useState([]),
    [cats, G] = useState([]),
    [meta, M] = useState({ page: 1, limit: 20, total: 0 }),
    [page, P] = useState(1),
    [q, Q] = useState(""),
    [search, S] = useState(""),
    [cat, F] = useState(""),
    [loading, L] = useState(false),
    [dialog, D] = useState(null),
    [stockDialog, setStockDialog] = useState(null),
    [busy, V] = useState(false),
    [toast, Z] = useState(""),
    [mobile, H] = useState(false),
    [catalogManager, setCatalogManager] = useState(null),
    [showAuth, setShowAuth] = useState(false),
    [showStore, setShowStore] = useState(false),
    [accountView, setAccountView] = useState(() => new URLSearchParams(window.location.search).get("payment") === "vnpay" ? "orders" : "profile"),
    [activePage, setActivePage] = useState("dashboard");
  const [focusedOrderId, setFocusedOrderId] = useState(null);
  const [focusedBookId, setFocusedBookId] = useState(null);
  const productSelection = useBulkSelection(books, JSON.stringify([page, search, cat, activePage]));
  const openCustomerOrder = (id) => { setFocusedOrderId({id,version:Date.now()}); setShowStore(false); setAccountView("orders"); };
  const openWishlist = () => { setShowStore(false); setAccountView("wishlist"); };
  const logout = useCallback(() => {
      const refreshToken = localStorage.getItem(REFRESH_KEY);
      if (refreshToken)
        api("/auth/logout", {
          method: "POST",
          skipAuth: true,
          skipRefresh: true,
          body: JSON.stringify({ refresh_token: refreshToken }),
        }).catch(() => {});
      localStorage.removeItem(KEY);
      localStorage.removeItem(REFRESH_KEY);
      T("");
      U(null);
      setCatalogManager(null);
      setActivePage("products");
      B([]);
    }, []),
    notify = (m) => {
      Z(m);
      setTimeout(() => Z(""), 4000);
    };
  async function login(email, password, role = "customer") {
    let d = await api(role === "admin" ? "/auth/admin/login" : "/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const accessToken = d.data?.access_token || d.data?.token;
    if (!accessToken || !d.data?.refresh_token)
      throw Error("BE không trả về đủ token đăng nhập.");
    if (d.data.user?.role !== role)
      throw Error(
        role === "customer"
          ? "Tài khoản này không phải tài khoản khách hàng."
          : "Tài khoản này không có quyền quản trị.",
      );
    localStorage.setItem(KEY, accessToken);
    localStorage.setItem(REFRESH_KEY, d.data.refresh_token);
    T(accessToken);
    U(d.data.user);
    if (d.data.user?.role === "customer") {
      const returningPayment = new URLSearchParams(window.location.search).get("payment") === "vnpay";
      setAccountView(returningPayment ? "orders" : "profile");
      setShowStore(!returningPayment);
    } else {
      setShowStore(false);
    }
  }
  useEffect(() => {
    const handleExpired = () => logout();
    window.addEventListener("book:session-expired", handleExpired);
    return () =>
      window.removeEventListener("book:session-expired", handleExpired);
  }, [logout]);
  useEffect(() => {
    if (!token) {
      C(false);
      return;
    }
    let live = true;
    api("/auth/me", { token })
      .then((d) => {
        if (!live) return;
        if (!["admin", "customer"].includes(d.data?.role)) throw Error();
        U(d.data);
        T(localStorage.getItem(KEY) || token);
        if (d.data.role === "customer") setShowStore(true);
      })
      .catch(() => live && logout())
      .finally(() => live && C(false));
    return () => {
      live = false;
    };
  }, [token, logout]);
  const load = useCallback(async () => {
    L(true);
    let p = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) p.set("search", search);
    if (cat) p.set("category_id", cat);
    try {
      let d = await api("/admin/books?" + p, { token });
      B(d.data || []);
      M(d.meta || { page, limit: 20, total: 0 });
    } catch (e) {
      if (e.status === 401 || e.status === 403) logout();
      else notify(e.message);
    } finally {
      L(false);
    }
  }, [token, page, search, cat, logout]);
  useEffect(() => {
    if (token && user?.role === "admin") load();
  }, [token, user, load]);
  useEffect(() => {
    if (token && user?.role === "admin")
      api("/admin/categories", { token })
        .then((d) => G(d.data || []))
        .catch((e) => notify(e.message));
  }, [token, user]);
  async function save(d) {
    V(true);
    try {
      const editing = Boolean(dialog?.book);
      const result = await api(
        editing ? `/admin/books/${dialog.book.id}` : "/admin/books",
        {
          method: editing ? "PATCH" : "POST",
          token,
          body: JSON.stringify(d),
        },
      );
      D(null);
      setActivePage("products");
      if (result.action === "stock_added") {
        notify({
          key: Number(result.data?.is_active)
            ? "Sách đã tồn tại. Đã cộng {quantity} cuốn vào sách hiện có."
            : "Sách đã tồn tại. Đã cộng {quantity} cuốn. Sách vẫn đang ẩn.",
          params: { quantity: result.quantity_added },
        });
      } else
        notify(editing ? "Đã cập nhật thông tin sách." : "Đã thêm sách mới.");
      await load();
    } finally {
      V(false);
    }
  }
  async function openEditor(book) {
    V(true);
    try {
      const result = await api(`/admin/books/${book.id}`, { token });
      D({ book: result.data });
      setActivePage("book-editor");
    } catch (error) {
      notify(error.message);
    } finally {
      V(false);
    }
  }
  async function addStockQuantity(quantity) {
    if (!stockDialog) return;
    V(true);
    try {
      await api(`/admin/books/${stockDialog.id}/stock`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ quantity }),
      });
      setStockDialog(null);
      setActivePage("products");
      notify(t("Đã cộng số lượng sách."));
      await load();
    } finally {
      V(false);
    }
  }
  async function changeVisibility(book, isActive) {
    if (Boolean(book.is_active) === isActive) return;
    if (
      !isActive &&
      !confirm(
        `${t("Ẩn sách")} “${book.title}”? ${t("Ẩn sách sẽ khiến sản phẩm biến mất khỏi cửa hàng. Nếu khách đã thêm vào giỏ, sách sẽ được đánh dấu không khả dụng và cần xóa trước khi đặt hàng.")}`,
      )
    )
      return;
    V(true);
    try {
      await api(`/admin/books/${book.id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ is_active: isActive }),
      });
      notify(
        isActive
          ? t("Đã hiện sách trên cửa hàng.")
          : t("Đã ẩn sách khỏi cửa hàng."),
      );
      await load();
    } catch (error) {
      notify(t(error.message));
    } finally {
      V(false);
    }
  }
  async function register(data) {
    await api("/auth/register", { method: "POST", body: JSON.stringify(data) });
  }
  if (checking)
    return (
      <div className="checking">
        <LoaderCircle className="spin" /> {t("Đang kiểm tra phiên...")}
      </div>
    );
  if (!token || !user)
    return showAuth ? (
      <>
        <AuthPage
          onLogin={login}
          onRegister={register}
          onBack={() => setShowAuth(false)}
        />
        {toast && <div className="toast">{t(toast)}</div>}
      </>
    ) : (
      <Storefront onLogin={() => setShowAuth(true)} />
    );
  if (user.role === "customer" && showStore)
    return (
      <Storefront
        focusBookId={focusedBookId} onWishlist={openWishlist} onOpenOrder={openCustomerOrder}
        accountLabel="Tài khoản của tôi"
        token={token}
        user={user}
        onViewProfile={() => {
          setShowStore(false);
          setAccountView("profile");
        }}
        onViewOrders={() => {
          setShowStore(false);
          setAccountView("orders");
        }}
        onLogout={logout}
        onOrderCreated={() => {
          setShowStore(false);
          setAccountView("orders");
        }}
      />
    );
  if (user.role === "customer")
    return (
      <main className="account-page">
        <header className="account-top">
          <b className="brand">
            <i>
              <BookOpen />
            </i>{" "}
            m&#x1ED9;c<span>.</span>
          </b>
          <span className="customer-top-actions">
            <button className="secondary" onClick={() => setShowStore(true)}>
              {t("Về cửa hàng")}
            </button>
            <button
              className="secondary"
              onClick={() => setAccountView("orders")}
            >
              {t("Đơn hàng")}
            </button>
            <button
              className="secondary"
              onClick={() => setAccountView("profile")}
            >
              {t("Hồ sơ")}
            </button>
            <CustomerActivityNav token={token} onOpenOrder={openCustomerOrder} onWishlist={openWishlist} />
             {user.full_name} · {t("Khách hàng")}
          </span>
        </header>
        <div className="account-content">
          {accountView === "orders" ? (
            <CustomerOrders token={token} focusOrderId={focusedOrderId} />
          ) : accountView === "wishlist" ? <WishlistPage token={token} onOpenBook={(id) => {setFocusedBookId(id);setShowStore(true);}} /> : (
            <CustomerProfile
              token={token}
              user={user}
              logout={logout}
              notify={notify}
            />
          )}
        </div>
      </main>
    );
  let pages = Math.max(1, Math.ceil(meta.total / (meta.limit || 20)));
  return (
    <div className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <b className="brand">
          <i>
            <BookOpen />
          </i>{" "}
          mộc<span>.</span>
        </b>
        <nav aria-label={t("Điều hướng quản trị")}>
          <button type="button" className={activePage === "dashboard" ? "selected" : ""} aria-current={activePage === "dashboard" ? "page" : undefined} onClick={() => { setActivePage("dashboard"); H(false); }}><LayoutDashboard />{t("Dashboard")}</button>
          <button
            type="button"
            className={activePage === "products" ? "selected" : ""}
            aria-current={activePage === "products" ? "page" : undefined}
            onClick={() => { setActivePage("products"); D(null); setStockDialog(null); H(false); }}
          >
            <BookOpen />
            {t("Sản phẩm")}
            <b>{meta.total}</b>
          </button>
          <button
            type="button"
            className={activePage === "categories" ? "selected" : ""}
            onClick={() => {
              setActivePage("categories");
              H(false);
            }}
          >
            <Boxes />
            {t("Thể loại")}
          </button>
          <button
            type="button"
            className={activePage === "author" ? "selected" : ""}
            onClick={() => {
              setCatalogManager("author");
              setActivePage("author");
              H(false);
            }}
          >
            <Users />
            {t("Tác giả")}
          </button>
          <button
            type="button"
            className={activePage === "publisher" ? "selected" : ""}
            onClick={() => {
              setCatalogManager("publisher");
              setActivePage("publisher");
              H(false);
            }}
          >
            <Building2 />
            {t("Nhà xuất bản")}
          </button>
          <button
            type="button"
            className={activePage === "orders" ? "selected" : ""}
            onClick={() => {
              setActivePage("orders");
              H(false);
            }}
          >
            <ClipboardList />
            {t("Đơn hàng")}
          </button>
          <button type="button" className={activePage === "promotions" ? "selected" : ""} onClick={() => { setActivePage("promotions"); H(false); }}>
            <TicketPercent />
            {t("Khuyến Mãi")}
          </button>
          <button
            type="button"
            className={activePage === "profile" ? "selected" : ""}
            onClick={() => {
              setActivePage("profile");
              H(false);
            }}
          >
            <ShieldCheck />
            {t("Hồ sơ khách hàng")}
          </button>
        </nav>
        <div className="bottom">
          <button className="user" onClick={logout}>
            <LogOut />
            {user.full_name || t("Quản trị viên")} {t("· Đăng xuất")}{" "}
          </button>
        </div>
      </aside>
      {activePage === "dashboard" && <Dashboard token={token} onOpenMenu={() => H(true)} onViewOrders={() => setActivePage("orders")} onViewProducts={() => setActivePage("products")} />}
      {activePage === "profile" && (
        <div className="admin-page-panel">
          <div className="profile-modal admin-page-card">
            <button
              className="modal-close"
              type="button"
              onClick={() => setActivePage("products")}
              aria-label={t("Đóng")}
            >
              <X size={16} />
            </button>
            <AdminProfileEditor token={token} notify={notify} />
          </div>
        </div>
      )}
      {activePage === "categories" && (
        <CategoryManager
          token={token}
          onClose={() => setActivePage("products")}
          onChange={G}
          notify={notify}
        />
      )}
      {activePage === "orders" && (
        <AdminOrders
          token={token}
          onClose={() => setActivePage("products")}
          notify={notify}
        />
      )}
      {activePage === "promotions" && (
        <PromotionManager token={token} onClose={() => setActivePage("products")} notify={notify} />
      )}
      {(activePage === "author" || activePage === "publisher") && catalogManager && (
        <CatalogManager
          key={catalogManager}
          kind={catalogManager}
          token={token}
          close={() => { setCatalogManager(null); setActivePage("products"); }}
          notify={notify}
        />
      )}
      {mobile && <button className="scrim" onClick={() => H(false)} />}
      <main className={activePage === "products" ? "main" : "main admin-main-hidden"}>
        <header className="topbar">
          <button className="mobile icon" onClick={() => H(true)}>
            <Menu />
          </button>
          {t("Cửa hàng")}　/　<b>{t("Sản phẩm")}</b>
          <span className="admin-top-actions">

            {user.full_name}
          </span>
        </header>
        <div className="content">
          <div className="welcome">
            <div>
              <small className="purple">●　{t("TRUNG TÂM ĐIỀU HÀNH")}</small>
              <h1>{t("Quản lý sản phẩm")}</h1>
              <p>{t("Theo dõi danh mục sách của cửa hàng.")}</p>
            </div>
            <div className="product-create-actions">
            <button type="button" className="secondary" disabled={busy} onClick={() => setActivePage("book-import")}><FileSpreadsheet size={17}/>{t("Nhập Excel")}</button>
            <button
              className="primary"
              disabled={busy}
              onClick={() => { D({ book: null }); setActivePage("book-editor"); }}
            >
              <Plus />
              {t("Thêm sản phẩm")}
            </button>
            </div>
          </div>
          <section className="stats">
            <article>
              <BookOpen />
              <small>{t("Tổng đầu sách")}</small>
              <b>{meta.total}</b>
            </article>
            <article>
              <Check />
              <small>{t("Đang kinh doanh")}</small>
              <b>{books.filter((b) => b.is_active).length}</b>
            </article>
            <article>
              <Boxes />
              <small>{t("Thể loại")}</small>
              <b>{cats.length}</b>
            </article>
          </section>
          <BulkPanel selection={productSelection} showSelectAll={false} disabled={busy || loading} onBusyChange={V} scope={JSON.stringify([page,search,cat,activePage])} onComplete={load}
            actions={[
              {id:"show",label:"Hiện các sách đã chọn",check:row=>Number(row.is_active)?"Đã ở trạng thái yêu cầu":null,run:row=>api("/admin/books/"+row.id,{method:"PATCH",token,body:JSON.stringify({is_active:true})})},
              {id:"hide",label:"Ẩn các sách đã chọn",check:row=>!Number(row.is_active)?"Đã ở trạng thái yêu cầu":null,run:row=>api("/admin/books/"+row.id,{method:"PATCH",token,body:JSON.stringify({is_active:false})})},
              {id:"category",label:"Đổi thể loại các sách đã chọn",input:{label:"Thể loại",options:cats.map(category=>({value:String(category.id),label:categoryLabel(category.name)}))},check:(row,value)=>Number(row.category_id)===Number(value)?"Đã ở thể loại yêu cầu":null,run:(row,value)=>api("/admin/books/"+row.id,{method:"PATCH",token,body:JSON.stringify({category_id:Number(value)})})},
            ]}/>
          <section className="products">
            <header>
              <div>
                <h2>{t("Danh sách sản phẩm")}</h2>
                <p>
                  {meta.total} {t("đầu sách trong cửa hàng.")}
                </p>
              </div>
            </header>
            <div className="toolbar">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  P(1);
                  S(q.trim());
                }}
              >
                <Search />
                <input
                  disabled={busy}
                  placeholder={t("Tìm theo tên sách…")}
                  value={q}
                  onChange={(e) => Q(e.target.value)}
                />
                <button disabled={busy}>{t("Tìm kiếm")}</button>
              </form>
              <select
                value={cat}
                disabled={busy}
                onChange={(e) => {
                  F(e.target.value);
                  P(1);
                }}
              >
                <option value="">{t("Tất cả thể loại")}</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {categoryLabel(c.name)}
                  </option>
                ))}
              </select>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th className="bulk-table-check"><BulkCheckbox aria-label={t("Chọn trang hiện tại")} checked={productSelection.all} indeterminate={productSelection.some} disabled={busy || loading} onChange={productSelection.toggleAll}/></th>
                    <th>{t("SẢN PHẨM")}</th>
                    <th>{t("MÃ SÁCH")}</th>
                    <th>{t("THỂ LOẠI")}</th>
                    <th>{t("GIÁ BÁN")}</th>
                    <th>{t("SỐ LƯỢNG")}</th>
                    <th>{t("TRẠNG THÁI")}</th>
                    <th>{t("THAO TÁC")}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="empty">
                        {t("Đang tải…")}
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="empty">
                        {t("Chưa tìm thấy sách.")}
                      </td>
                    </tr>
                  ) : (
                    books.map((b, i) => (
                      <tr key={b.id}>
                        <td className="bulk-table-check"><BulkCheckbox aria-label={t("Chọn {name}",{name:b.title})} checked={productSelection.has(b.id)} disabled={busy} onChange={()=>productSelection.toggle(b.id)}/></td>
                        <td>
                          <div className="book">
                            {b.cover_url ? (
                              <img src={b.cover_url} alt="" />
                            ) : (
                              <i className={"cover c" + (i % 4)}>
                                <BookOpen />
                              </i>
                            )}
                            <span>
                              <b>{b.title}</b>
                              <small>
                                {b.authors || t("Chưa cập nhật tác giả")}
                              </small>
                              <small>
                                {b.publisher || t("Chưa cập nhật NXB")}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>BK-{String(b.id).padStart(4, "0")}</td>
                        <td>{categoryLabel(b.category_name) || "—"}</td>
                        <td>
                          <b>{money(b.price)}</b>
                        </td>
                        <td>{b.stock_quantity ?? 0}</td>
                        <td>
                          <StatusDropdown
                            value={Number(b.is_active) ? "visible" : "hidden"}
                            disabled={busy}
                            label={t("Trạng thái hiển thị: {title}", {
                              title: b.title,
                            })}
                            onChange={(value) =>
                              changeVisibility(b, value === "visible")
                            }
                            options={[
                              {
                                value: "visible",
                                label: t("Đang hiển thị"),
                                description: t("Khách có thể xem và đặt sách"),
                                icon: Eye,
                                tone: "green",
                              },
                              {
                                value: "hidden",
                                label: t("Đã ẩn"),
                                description: t(
                                  "Tạm ngừng nhận đơn cho sách này",
                                ),
                                icon: EyeOff,
                                tone: "gray",
                              },
                            ]}
                          />
                        </td>
                        <td>
                          <div className="book-actions">
                            <button
                              className="icon"
                              disabled={busy}
                              onClick={() => openEditor(b)}
                              title={t("Chỉnh sửa sách")}
                              aria-label={`${t("Chỉnh sửa sách")} ${b.title}`}
                            >
                              <Pencil />
                            </button>
                            <button
                              className="icon"
                              disabled={busy}
                              onClick={() => { setStockDialog(b); setActivePage("stock"); }}
                              title={t("Thêm số lượng")}
                              aria-label={`${t("Thêm số lượng")} ${b.title}`}
                            >
                              <PackagePlus />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <footer className="tablefoot">
              <span>
                {" "}
                {t("Hiển thị")} {meta.total ? (page - 1) * meta.limit + 1 : 0}–
                {Math.min(page * meta.limit, meta.total)} / {meta.total}
              </span>
              <div>
                <button
                  className="icon"
                  disabled={page <= 1 || loading || busy}
                  onClick={() => P(page - 1)}
                >
                  <ArrowLeft />
                </button>{" "}
                {t("Trang ")}
                {page}/{pages}{" "}
                <button
                  className="icon"
                  disabled={page >= pages || loading || busy}
                  onClick={() => P(page + 1)}
                >
                  <ArrowRight />
                </button>
              </div>
            </footer>
          </section>
          <footer className="pagefoot">
            © 2025 Mộc Bookstore <span>{t("Quản lý bằng sự tận tâm ✳")}</span>
          </footer>
        </div>
      </main>
      {activePage === "book-import" && <BookExcelImport token={token} onClose={() => setActivePage("products")} onComplete={async () => { await load(); const categories = await api("/admin/categories", {token}); G(categories.data || []); }} />}
      {dialog && activePage === "book-editor" && (
        <Editor
          key={dialog.book?.id || "new"}
          book={dialog.book}
          token={token}
          cats={cats}
          close={() => { D(null); setActivePage("products"); }}
          save={save}
          busy={busy}
        />
      )}
      {stockDialog && activePage === "stock" && (
        <StockEditor
          book={stockDialog}
          close={() => { setStockDialog(null); setActivePage("products"); }}
          addStock={addStockQuantity}
          busy={busy}
        />
      )}
      {toast && (
        <div className="toast">
          <Check />
          {t(toast)}
          <button className="icon" onClick={() => Z("")}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
