import { useLanguage } from "./i18n.jsx";
import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, UserRound, LoaderCircle } from "lucide-react";

const PROFILE_KEYS = [
  "full_name",
  "phone",
  "gender",
  "date_of_birth",
  "shipping_address",
];
const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");
const emptyCustomer = (fullName = "") => ({
  full_name: fullName,
  phone: "",
  gender: "undisclosed",
  date_of_birth: "",
  shipping_address: "",
});
const emptyAdmin = () => ({
  ...emptyCustomer(),
  loyalty_points: 0,
  membership_tier: "bronze",
});

function fromProfile(profile, admin = false, fallbackName = "") {
  return {
    full_name: profile.full_name ?? fallbackName,
    phone: profile.phone ?? "",
    gender: profile.gender || "undisclosed",
    date_of_birth: profile.date_of_birth
      ? String(profile.date_of_birth).slice(0, 10)
      : "",
    shipping_address: profile.shipping_address ?? "",
    ...(admin
      ? {
          loyalty_points: profile.loyalty_points ?? 0,
          membership_tier: profile.membership_tier || "bronze",
        }
      : {}),
  };
}

function Field({ label, children, className = "" }) {
  const { t } = useLanguage();
  return (
    <label className={"profile-field " + className}>
      {t(label)}
      {children}
    </label>
  );
}

function PersonalFields({ value, setValue, admin = false }) {
  const { t } = useLanguage();
  const set = (key, nextValue) =>
    setValue((current) => ({ ...current, [key]: nextValue }));
  return (
    <>
      <Field label={t("Họ và tên")}>
        <input
          maxLength="255"
          value={value.full_name}
          onChange={(event) => set("full_name", event.target.value)}
          required
          placeholder={t("Ví dụ: Nguyễn Văn An")}
        />
      </Field>
      <Field label={t("Số điện thoại")}>
        <input
          type="tel"
          maxLength="20"
          value={value.phone}
          onChange={(event) => set("phone", event.target.value)}
          placeholder="09xx xxx xxx"
        />
      </Field>
      <Field label={t("Giới tính")}>
        <select
          value={value.gender}
          onChange={(event) => set("gender", event.target.value)}
        >
          <option value="undisclosed">
            {t("Không muốn tiết lộ")}
          </option>
          <option value="female">{t("Nữ")}</option>
          <option value="male">{t("Nam")}</option>
          <option value="other">{t("Khác")}</option>
        </select>
      </Field>
      <Field label={t("Ngày sinh")}>
        <input
          type="date"
          value={value.date_of_birth}
          onChange={(event) => set("date_of_birth", event.target.value)}
        />
      </Field>
      <Field
        label={t("Địa chỉ giao hàng")}
        className="profile-field-wide"
      >
        <textarea
          rows="3"
          maxLength="1000"
          value={value.shipping_address}
          onChange={(event) => set("shipping_address", event.target.value)}
          placeholder={
            t("Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố")
          }
        />
      </Field>
      {admin && (
        <>
          <Field label={t("Điểm thành viên")}>
            <input
              type="number"
              min="0"
              step="1"
              value={value.loyalty_points}
              onChange={(event) => set("loyalty_points", event.target.value)}
              required
            />
          </Field>
          <Field label={t("Hạng thành viên")}>
            <select
              value={value.membership_tier}
              onChange={(event) => set("membership_tier", event.target.value)}
            >
              <option value="bronze">{t("Đồng")}</option>
              <option value="silver">{t("Bạc")}</option>
              <option value="gold">{t("Vàng")}</option>
              <option value="platinum">{t("Bạch kim")}</option>
            </select>
          </Field>
        </>
      )}
    </>
  );
}

function ProfileCard({ title, subtitle, icon, children }) {
  const { t } = useLanguage();
  return (
    <section className="account-card">
      <div className="account-heading">
        <div className="avatar">{icon}</div>
        <div>
          <small className="purple">{t("NHÀ SÁCH MỘC")}</small>
          <h1>{t(title)}</h1>
          <p>{t(subtitle)}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Feedback({ message, error }) {
  const { t } = useLanguage();
  return (
    <>
      {message && <p className="notice">{t(message)}</p>}
      {error && <p className="notice notice-error">{t(error)}</p>}
    </>
  );
}

async function requestProfile(path, token, method = "GET", payload) {
  const response = await fetch(API + path, {
    method,
    headers: {
      ...(payload ? { "Content-Type": "application/json" } : {}),
      Authorization: "Bearer " + token,
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      data.message ||
        data.error ||
        (method === "GET"
          ? "Không thể tải hồ sơ."
          : "Không thể cập nhật hồ sơ."),
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

function profilePayload(value, admin = false) {
  const payload = {
    full_name: value.full_name.trim(),
    phone: value.phone.trim() || null,
    gender: value.gender,
    date_of_birth: value.date_of_birth || null,
    shipping_address: value.shipping_address.trim() || null,
  };
  if (admin) {
    payload.loyalty_points = Number(value.loyalty_points);
    payload.membership_tier = value.membership_tier;
  }
  return payload;
}

export function CustomerProfile({ token, user, logout, notify }) {
  const { t } = useLanguage();
  const [value, setValue] = useState(() => emptyCustomer(user.full_name || ""));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    requestProfile("/auth/me/profile", token)
      .then((data) => {
        if (active)
          setValue(
            fromProfile(data.data?.profile || {}, false, user.full_name || ""),
          );
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 404) {
          setValue(emptyCustomer(user.full_name || ""));
          setMessage(
            "Hồ sơ chưa có dữ liệu. Hãy kiểm tra tên và lưu thông tin của bạn.",
          );
        } else {
          setError(requestError.message);
          if (requestError.status === 401) logout();
        }
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [token, user.full_name, logout]);

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await requestProfile(
        "/auth/me/profile",
        token,
        "PATCH",
        profilePayload(value),
      );
      setMessage(
        "Đã cập nhật hồ sơ thành công.",
      );
      notify(
        "Hồ sơ của bạn đã được cập nhật.",
      );
    } catch (requestError) {
      setError(requestError.message);
      if (requestError.status === 401) logout();
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileCard
      title={t("Hồ sơ của tôi")}
      subtitle={(user.full_name || "") + " · " + (user.email || "")}
      icon={<UserRound />}
    >
      <p className="api-note">
        {
          t("Email đăng nhập của bạn không thể đổi tại đây. Bạn có thể cập nhật tên, số điện thoại, ngày sinh và địa chỉ giao hàng.")
        }
      </p>
      <Feedback message={t(message)} error={t(error)} />
      {loading ? (
        <p className="notice">
          <LoaderCircle size={14} className="spin" />{" "}
          {t("Đang tải hồ sơ...")}
        </p>
      ) : (
        <form className="profile-form" onSubmit={submit}>
          <PersonalFields value={value} setValue={setValue} />
          <div className="profile-actions">
            <button className="primary" disabled={busy}>
              {busy ? t("Đang lưu...") : t("Lưu hồ sơ")}
            </button>
            <button type="button" className="secondary" onClick={logout}>
              <LogOut size={15} /> {t("Đăng xuất")}
            </button>
          </div>
        </form>
      )}
    </ProfileCard>
  );
}

export function AdminProfileEditor({ token, notify }) {
  const { t } = useLanguage();
  const [id, setId] = useState("");
  const [value, setValue] = useState(emptyAdmin);
  const [loadedId, setLoadedId] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoadedId("");
    setLoading(true);
    try {
      const data = await requestProfile(
        "/admin/users/" + encodeURIComponent(id) + "/profile",
        token,
      );
      setValue(fromProfile(data.data?.profile || {}, true));
      setLoadedId(id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setMessage("");
    setError("");
    setBusy(true);
    try {
      await requestProfile(
        "/admin/users/" + encodeURIComponent(loadedId) + "/profile",
        token,
        "PATCH",
        profilePayload(value, true),
      );
      setMessage(
        "Đã cập nhật hồ sơ khách hàng #" +
          loadedId +
          ".",
      );
      notify(
        "Đã cập nhật hồ sơ khách hàng.",
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileCard
      title={t("Sửa hồ sơ khách hàng")}
      subtitle={
        t("Tải hồ sơ theo ID khách hàng rồi cập nhật thông tin.")
      }
      icon={<ShieldCheck />}
    >
      <p className="api-note">
        {
          t("Admin có thể cập nhật tên, thông tin liên hệ, địa chỉ giao hàng, điểm và hạng thành viên.")
        }
      </p>
      <Feedback message={t(message)} error={t(error)} />
      <form className="profile-form" onSubmit={load}>
        <Field label={t("ID khách hàng")}>
          <input
            type="number"
            min="1"
            step="1"
            value={id}
            onChange={(event) => {
              setId(event.target.value);
              setLoadedId("");
            }}
            required
            placeholder={t("Ví dụ: 12")}
          />
        </Field>
        <div className="profile-actions">
          <button className="primary" disabled={loading || !id}>
            {loading ? t("Đang tải...") : t("Tải hồ sơ")}
          </button>
        </div>
      </form>
      {loadedId && (
        <form className="profile-form" onSubmit={submit}>
          <PersonalFields value={value} setValue={setValue} admin />
          <div className="profile-actions">
            <button className="primary" disabled={busy}>
              {busy
                ? t("Đang cập nhật...")
                : t("Cập nhật hồ sơ")}
            </button>
          </div>
        </form>
      )}
    </ProfileCard>
  );
}
