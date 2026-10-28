import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  Menu,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  X,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { CustomerProfile, AdminProfileEditor } from "./ProfileForms.jsx";
import { AuthPage } from "./AuthPage.jsx";
import CategoryManager from "./CategoryManager.jsx";
import Storefront from "./Storefront.jsx";
const API = (
    import.meta.env.VITE_API_URL || "http://localhost:3000/api"
  ).replace(/\/$/, ""),
  KEY = "book-admin-token",
  EMPTY = {
    category_id: "",
    title: "",
    price: "",
    weight_grams: "",
    description: "",
    cover_url: "",
    stock_quantity: 0,
    publisher: "",
    publication_year: "",
    is_active: true,
  };
async function api(path, o = {}) {
  let r = await fetch(API + path, {
    method: o.method || "GET",
    headers: {
      ...(o.body ? { "Content-Type": "application/json" } : {}),
      ...(o.token ? { Authorization: "Bearer " + o.token } : {}),
    },
    body: o.body,
  });
  if (r.status === 204) return null;
  let d = await r.json().catch(() => ({}));
  if (!r.ok) {
    let e = Error(d.message || "Yêu cầu thất bại");
    e.status = r.status;
    throw e;
  }
  return d;
}
const money = (n) =>
  new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
function Login({ login }) {
  let [email, E] = useState(""),
    [password, P] = useState(""),
    [busy, B] = useState(false),
    [error, X] = useState("");
  async function go(e) {
    e.preventDefault();
    B(true);
    X("");
    try {
      await login(email.trim(), password);
    } catch (x) {
      X(x.message);
    } finally {
      B(false);
    }
  }
  return (
    <main className="login">
      <section className="art">
        <b className="brand">
          <i>
            <BookOpen />
          </i>{" "}
          mộc<span>.</span>
        </b>
        <div>
          <small>✦　KHÔNG GIAN CỦA NHỮNG CÂU CHUYỆN</small>
          <h1>
            Mỗi cuốn sách
            <br />
            mở ra một <em>thế giới.</em>
          </h1>
          <p>Chăm chút từng trang sách, kết nối những tâm hồn yêu đọc.</p>
        </div>
        <small>Đọc chậm. Sống sâu.　·　EST. 2024</small>
      </section>
      <section className="loginbox">
        <small>●　HỆ THỐNG QUẢN TRỊ</small>
        <div className="loginform">
          <i className="lock">
            <ShieldCheck />
          </i>
          <small className="purple">CHÀO MỪNG TRỞ LẠI</small>
          <h2>Đăng nhập</h2>
          <p>Đăng nhập bằng tài khoản quản trị viên của bạn.</p>
          <form onSubmit={go}>
            <label>Email</label>
            <input
              type="email"
              autoComplete="username"
              placeholder="admin@bookstore.local"
              value={email}
              onChange={(e) => E(e.target.value)}
              required
            />
            <label>Mật khẩu</label>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Mật khẩu"
              value={password}
              onChange={(e) => P(e.target.value)}
              required
            />
            {error && (
              <p className="error">
                <TriangleAlert size={15} />
                {error}
              </p>
            )}
            <button className="primary wide" disabled={busy}>
              {busy ? "Đang xác thực…" : "Đăng nhập hệ thống　→"}
            </button>
          </form>
          <p className="secure">
            <ShieldCheck size={15} /> Phiên đăng nhập được bảo vệ an toàn
          </p>
        </div>
        <small>© 2025 Mộc Bookstore</small>
      </section>
    </main>
  );
}
function Editor({ book, cats, close, save, busy }) {
  let [f, S] = useState(
      book
        ? { ...EMPTY, ...book, is_active: Boolean(book.is_active) }
        : { ...EMPTY },
    ),
    [err, E] = useState("");
  const field = (key, label, type = "text", req = false) => (
    <label className="field">
      {label}
      {req ? " *" : ""}
      <input
        type={type}
        value={f[key] ?? ""}
        required={req}
        onChange={(e) => S({ ...f, [key]: e.target.value })}
      />
    </label>
  );
  async function submit(e) {
    e.preventDefault();
    let d = {
      category_id: Number(f.category_id),
      title: f.title.trim(),
      price: Number(f.price),
      weight_grams: Number(f.weight_grams),
      stock_quantity: Number(f.stock_quantity || 0),
      is_active: f.is_active,
      description: f.description || null,
      cover_url: f.cover_url || null,
      publisher: f.publisher || null,
      publication_year: f.publication_year ? Number(f.publication_year) : null,
    };
    try {
      await save(d);
    } catch (x) {
      E(x.message);
    }
  }
  return (
    <div
      className="shade"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section className="dialog">
        <header>
          <h2>{book ? "Chỉnh sửa sách" : "Thêm sách mới"}</h2>
          <button className="icon" onClick={close}>
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          <div className="fields">
            {field("title", "Tên sách", "text", true)}
            <label className="field">
              Thể loại *
              <select
                required
                value={f.category_id}
                onChange={(e) => S({ ...f, category_id: e.target.value })}
              >
                <option value="">Chọn thể loại</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            {field("price", "Giá bán (₫)", "number", true)}
            {field("weight_grams", "Khối lượng (gram)", "number", true)}
            {field("stock_quantity", "Tồn kho", "number")}
            {field("publisher", "Nhà xuất bản")}
            {field("publication_year", "Năm xuất bản", "number")}
            {field("cover_url", "Ảnh bìa URL", "url")}
            <label className="field full">
              Mô tả
              <textarea
                rows="3"
                value={f.description || ""}
                onChange={(e) => S({ ...f, description: e.target.value })}
              />
            </label>
          </div>
          <label className="toggle">
            Đang kinh doanh{" "}
            <input
              type="checkbox"
              checked={f.is_active}
              onChange={(e) => S({ ...f, is_active: e.target.checked })}
            />
          </label>
          {err && <p className="error">{err}</p>}
          <footer>
            <button type="button" className="secondary" onClick={close}>
              Huỷ
            </button>
            <button className="primary" disabled={busy}>
              {busy ? "Đang lưu…" : book ? "Lưu thay đổi" : "Thêm sách"}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
export default function App() {
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
    [busy, V] = useState(false),
    [toast, Z] = useState(""),
    [mobile, H] = useState(false),
    [profileOpen, ProfileOpen] = useState(false),
    [categoryOpen, CategoryOpen] = useState(false),
    [showAuth, setShowAuth] = useState(false),
    [showStore, setShowStore] = useState(false);
  const logout = useCallback(() => {
      localStorage.removeItem(KEY);
      T("");
      U(null);
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
    if (!d.data?.token) throw Error("No login token was returned.");
    if (d.data.user?.role !== role)
      throw Error(
        role === "customer"
          ? "This account is not a customer."
          : "This account does not have admin access.",
      );
    localStorage.setItem(KEY, d.data.token);
    T(d.data.token);
    U(d.data.user);
  }
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
      if (dialog.book)
        await api("/admin/books/" + dialog.book.id, {
          method: "PATCH",
          token,
          body: JSON.stringify(d),
        });
      else
        await api("/admin/books", {
          method: "POST",
          token,
          body: JSON.stringify(d),
        });
      D(null);
      notify(dialog.book ? "Đã cập nhật sách." : "Đã thêm sách mới.");
      await load();
    } finally {
      V(false);
    }
  }
  async function remove(b) {
    if (!confirm("Bạn có chắc muốn xoá “" + b.title + "”?")) return;
    try {
      await api("/admin/books/" + b.id, { method: "DELETE", token });
      notify("Đã xoá sách.");
      if (books.length === 1 && page > 1) P(page - 1);
      else await load();
    } catch (e) {
      notify(
        e.status === 409
          ? "Sách đang được tham chiếu. Hãy tắt “Đang kinh doanh” để ngừng bán."
          : e.message,
      );
    }
  }
  async function register(data) {
    await api("/auth/register", { method: "POST", body: JSON.stringify(data) });
  }
  if (checking)
    return (
      <div className="checking">
        <LoaderCircle className="spin" /> {"Đang kiểm tra phiên..."}
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
        {toast && <div className="toast">{toast}</div>}
      </>
    ) : (
      <Storefront onLogin={() => setShowAuth(true)} />
    );
  if (user.role === "customer" && showStore)
    return (
      <Storefront
        accountLabel="Tài khoản của tôi"
        onLogin={() => setShowStore(false)}
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
              {"Về cửa hàng"}
            </button>
            {user.full_name} · {"Khách hàng"}
          </span>
        </header>
        <div className="account-content">
          <CustomerProfile
            token={token}
            user={user}
            logout={logout}
            notify={notify}
          />
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
        <div className="workspace">
          <b>M</b> Mộc Bookstore <ChevronDown />
        </div>
        <small className="navtitle">KHÔNG GIAN LÀM VIỆC</small>
        <nav>
          <a>
            <LayoutDashboard />
            Tổng quan
          </a>
          <a className="selected">
            <BookOpen />
            Sản phẩm <b>{meta.total}</b>
          </a>
          <a
            onClick={() => {
              CategoryOpen(true);
              H(false);
            }}
          >
            <Boxes />
            Thể loại
          </a>
          <a
            onClick={() => {
              ProfileOpen(true);
              H(false);
            }}
          >
            <ShieldCheck />
            H&#x1ED3; s&#x1A1; kh&#xE1;ch h&#xE0;ng
          </a>
        </nav>
        <div className="bottom">
          <p>Cần hỗ trợ quản lý cửa hàng?</p>
          <button className="user" onClick={logout}>
            <LogOut />
            {user.full_name || "Quản trị viên"} · Đăng xuất
          </button>
        </div>
      </aside>
      {profileOpen && (
        <div className="modal-shade">
          <div className="profile-modal">
            <button
              className="modal-close"
              type="button"
              onClick={() => ProfileOpen(false)}
              aria-label="&#x110;&#xF3;ng"
            >
              <X size={16} />
            </button>
            <AdminProfileEditor token={token} notify={notify} />
          </div>
        </div>
      )}
      {categoryOpen && (
        <CategoryManager
          token={token}
          onClose={() => CategoryOpen(false)}
          onChange={G}
          notify={notify}
        />
      )}
      {mobile && <button className="scrim" onClick={() => H(false)} />}
      <main className="main">
        <header className="topbar">
          <button className="mobile icon" onClick={() => H(true)}>
            <Menu />
          </button>
          Cửa hàng　/　<b>Sản phẩm</b>
          <span>{user.full_name}</span>
        </header>
        <div className="content">
          <div className="welcome">
            <div>
              <small className="purple">●　TRUNG TÂM ĐIỀU HÀNH</small>
              <h1>Quản lý sản phẩm</h1>
              <p>Theo dõi danh mục sách của cửa hàng.</p>
            </div>
            <button className="primary" onClick={() => D({ book: null })}>
              <Plus />
              Thêm sản phẩm
            </button>
          </div>
          <section className="stats">
            <article>
              <BookOpen />
              <small>Tổng đầu sách</small>
              <b>{meta.total}</b>
            </article>
            <article>
              <Check />
              <small>Đang kinh doanh</small>
              <b>{books.filter((b) => b.is_active).length}</b>
            </article>
            <article>
              <Boxes />
              <small>Thể loại</small>
              <b>{cats.length}</b>
            </article>
          </section>
          <section className="products">
            <header>
              <div>
                <h2>Danh sách sản phẩm</h2>
                <p>{meta.total} đầu sách trong cửa hàng.</p>
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
                  placeholder="Tìm theo tên sách…"
                  value={q}
                  onChange={(e) => Q(e.target.value)}
                />
                <button>Tìm kiếm</button>
              </form>
              <select
                value={cat}
                onChange={(e) => {
                  F(e.target.value);
                  P(1);
                }}
              >
                <option value="">Tất cả thể loại</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="tablewrap">
              <table>
                <thead>
                  <tr>
                    <th>SẢN PHẨM</th>
                    <th>MÃ SÁCH</th>
                    <th>THỂ LOẠI</th>
                    <th>GIÁ BÁN</th>
                    <th>TỒN KHO</th>
                    <th>TRẠNG THÁI</th>
                    <th>THAO TÁC</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="empty">
                        Đang tải…
                      </td>
                    </tr>
                  ) : books.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty">
                        Chưa tìm thấy sách.
                      </td>
                    </tr>
                  ) : (
                    books.map((b, i) => (
                      <tr key={b.id}>
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
                                {b.publisher || "Chưa cập nhật NXB"}
                              </small>
                            </span>
                          </div>
                        </td>
                        <td>BK-{String(b.id).padStart(4, "0")}</td>
                        <td>{b.category_name || "—"}</td>
                        <td>
                          <b>{money(b.price)}</b>
                        </td>
                        <td>{b.stock_quantity ?? 0}</td>
                        <td>
                          <label
                            className={b.is_active ? "active" : "inactive"}
                          >
                            ● {b.is_active ? "Đang bán" : "Đã ẩn"}
                          </label>
                        </td>
                        <td>
                          <button
                            className="icon"
                            onClick={() => D({ book: b })}
                            title="Sửa"
                          >
                            <Pencil />
                          </button>
                          <button
                            className="icon danger"
                            onClick={() => remove(b)}
                            title="Xoá"
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <footer className="tablefoot">
              <span>
                Hiển thị {meta.total ? (page - 1) * meta.limit + 1 : 0}–
                {Math.min(page * meta.limit, meta.total)} / {meta.total}
              </span>
              <div>
                <button
                  className="icon"
                  disabled={page <= 1 || loading}
                  onClick={() => P(page - 1)}
                >
                  <ArrowLeft />
                </button>{" "}
                Trang {page}/{pages}{" "}
                <button
                  className="icon"
                  disabled={page >= pages || loading}
                  onClick={() => P(page + 1)}
                >
                  <ArrowRight />
                </button>
              </div>
            </footer>
          </section>
          <footer className="pagefoot">
            © 2025 Mộc Bookstore <span>Quản lý bằng sự tận tâm ✳</span>
          </footer>
        </div>
      </main>
      {dialog && (
        <Editor
          book={dialog.book}
          cats={cats}
          close={() => D(null)}
          save={save}
          busy={busy}
        />
      )}
      {toast && (
        <div className="toast">
          <Check />
          {toast}
          <button className="icon" onClick={() => Z("")}>
            <X />
          </button>
        </div>
      )}
    </div>
  );
}
