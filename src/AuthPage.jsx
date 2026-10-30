import { useState } from "react";
import { BookOpen, ShieldCheck, TriangleAlert } from "lucide-react";
import { LanguageToggle, useLanguage } from "./i18n.jsx";

export function AuthPage({ onLogin, onRegister, onBack }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") {
        await onRegister({
          full_name: form.full_name.trim(),
          email: form.email.trim(),
          password: form.password,
        });
        setMode("login");
        setRole("customer");
        setForm((old) => ({ ...old, password: "" }));
        setMessage("Đăng ký thành công. Bạn có thể đăng nhập.");
      } else await onLogin(form.email.trim(), form.password, role);
    } catch (err) {
      setError(t(err.message));
    } finally {
      setBusy(false);
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
          <small>✦　{t("KHÔNG GIAN CỦA NHỮNG CÂU CHUYỆN")}</small>
          <h1>
            {t("Mỗi cuốn sách")}
            <br />
            {t("mở ra một ")}<em>{t("thế giới.")}</em>
          </h1>
          <p>{t("Chăm chút từng trang sách, kết nối những tâm hồn yêu đọc.")}</p>
        </div>
        <small>{t("Đọc chậm. Sống sâu. · EST. 2024")}</small>
      </section>
      <section className="loginbox">
        <small className="auth-system-label">●　{t("HỆ THỐNG NHÀ SÁCH MỘC")} <LanguageToggle /></small>
        <div className="loginform">
          <i className="lock">
            <ShieldCheck />
          </i>
          <small className="purple">
            {mode === "register"
              ? t("TẠO TÀI KHOẢN KHÁCH HÀNG")
              : t("CHÀO MỪNG TRỞ LẠI")}
          </small>
          <h2>{mode === "register" ? t("Đăng ký") : t("Đăng nhập")}</h2>
          {mode === "login" && (
            <div className="auth-switch">
              <button
                type="button"
                className={role === "customer" ? "chosen" : ""}
                onClick={() => setRole("customer")}
              >
                {t("Khách hàng")}
              </button>
              <button
                type="button"
                className={role === "admin" ? "chosen" : ""}
                onClick={() => setRole("admin")}
              >
                {t("Quản trị viên")}
              </button>
            </div>
          )}
          <p>
            {mode === "register"
              ? t("Tạo tài khoản để quản lý thông tin thành viên.")
              : role === "admin"
                ? t("Đăng nhập bằng tài khoản quản trị viên.")
                : t("Đăng nhập để cập nhật hồ sơ của bạn.")}
          </p>
          <form onSubmit={submit}>
            {mode === "register" && (
              <>
                <label htmlFor="register-name">{t("Họ và tên")}</label>
                <input
                  id="register-name"
                  autoComplete="name"
                  maxLength="255"
                  placeholder={t("Nguyễn Văn An")}
                  value={form.full_name}
                  onChange={(e) => set("full_name", e.target.value)}
                  required
                />
              </>
            )}
            <label htmlFor="auth-email">{t("Địa chỉ email")}</label>
            <input
              id="auth-email"
              type="email"
              autoComplete="username"
              placeholder="ban@example.com"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              required
            />
            <label htmlFor="auth-password">{t("Mật khẩu")}</label>
            <input
              id="auth-password"
              type="password"
              minLength={mode === "register" ? 8 : undefined}
              maxLength="200"
              autoComplete={
                mode === "register" ? "new-password" : "current-password"
              }
              placeholder={
                mode === "register" ? t("Tối thiểu 8 ký tự") : t("Nhập mật khẩu")
              }
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              required
            />
            {error && (
              <p className="error">
                <TriangleAlert size={15} />
                {t(error)}
              </p>
            )}
            {message && <p className="notice">{t(message)}</p>}
            <button className="primary wide" disabled={busy}>
              {busy
                ? t("Đang xử lý…")
                : mode === "register"
                  ? t("Tạo tài khoản")
                  : t("Đăng nhập")}
              　→
            </button>
          </form>
          <div className="auth-links">
            {mode === "login" && role === "customer" && (
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                  setMessage("");
                }}
              > {t("Chưa có tài khoản?")} <b>{t("Đăng ký")}</b>
              </button>
            )}
            {(mode === "register" || role === "admin") && (
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setRole("customer");
                  setError("");
                  setMessage("");
                }}
              > {t("Quay lại đăng nhập")} </button>
            )}
            {onBack && (
              <button type="button" onClick={onBack}> {t("Về cửa hàng")} </button>
            )}
          </div>
          <p className="secure">
            <ShieldCheck size={15} /> {t("Thông tin tài khoản được bảo vệ an toàn")} </p>
        </div>
        <small>© 2025 Mộc Bookstore</small>
      </section>
    </main>
  );
}
