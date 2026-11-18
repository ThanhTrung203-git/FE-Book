import { useState } from "react";
import { ArrowRight, BookOpen, ShieldCheck, Store, TriangleAlert } from "lucide-react";
import { useLanguage } from "../shared/i18n.jsx";

export function AuthPage({ onLogin, onRegister, onResendRegistration, onVerifyRegistration, onBack }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("customer");
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const set = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (mode === "register") {
        if (otpSent) {
          await onVerifyRegistration({ email: form.email.trim(), otp });
          setMode("login");
          setRole("customer");
          setOtpSent(false);
          setOtp("");
          setForm((old) => ({ ...old, password: "" }));
          setMessage("Xác minh email thành công. Bạn có thể đăng nhập.");
        } else {
          await onRegister({
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            password: form.password,
          });
          setOtpSent(true);
          setOtp("");
          setForm((old) => ({ ...old, password: "" }));
          setMessage("Mã xác minh đã được gửi đến email của bạn. Hãy nhập mã gồm 6 chữ số.");
        }
      } else await onLogin(form.email.trim(), form.password, role);
    } catch (err) {
      setError(t(err.message));
    } finally {
      setBusy(false);
    }
  }
  async function resendOtp() {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await onResendRegistration({ email: form.email.trim() });
      setMessage("Mã xác minh mới đã được gửi đến email của bạn.");
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
        <div className="auth-system-label">
          <span className="auth-system-name">●　{t("HỆ THỐNG NHÀ SÁCH MỘC")}</span>
          <div className="auth-tools">
            {onBack && (
              <button className="auth-store-link" type="button" onClick={onBack}>
                <Store size={16} aria-hidden="true" />
                <span>{t("Về cửa hàng")}</span>
                <ArrowRight size={15} aria-hidden="true" />
              </button>
            )}

          </div>
        </div>
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
            {mode === "register" && !otpSent && (
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
              readOnly={mode === "register" && otpSent}
              required
            />
            {mode === "register" && otpSent ? (
              <>
                <label htmlFor="register-otp">{t("Mã OTP")}</label>
                <input
                  id="register-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength="6"
                  placeholder={t("Nhập mã 6 chữ số")}
                  value={otp}
                  onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                />
              </>
            ) : (
              <>
                <label htmlFor="auth-password">{t("Mật khẩu")}</label>
                <input
                  id="auth-password"
                  type="password"
                  minLength={mode === "register" ? 8 : undefined}
                  maxLength="200"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  placeholder={mode === "register" ? t("Tối thiểu 8 ký tự") : t("Nhập mật khẩu")}
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  required
                />
              </>
            )}
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
                  ? otpSent ? t("Xác minh và tạo tài khoản") : t("Gửi mã xác minh")
                  : t("Đăng nhập")}
              　→
            </button>
            {mode === "register" && otpSent && (
              <button type="button" className="secondary wide" onClick={resendOtp} disabled={busy}>
                {t("Gửi lại mã OTP")}
              </button>
            )}
          </form>
          <div className="auth-links">
            {mode === "login" && role === "customer" && (
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setOtpSent(false);
                  setOtp("");
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
                  setOtpSent(false);
                  setOtp("");
                  setError("");
                  setMessage("");
                }}
              > {t("Quay lại đăng nhập")} </button>
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
