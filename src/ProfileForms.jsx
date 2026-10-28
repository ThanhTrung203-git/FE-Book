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
  return (
    <label className={"profile-field " + className}>
      {label}
      {children}
    </label>
  );
}

function PersonalFields({ value, setValue, admin = false }) {
  const set = (key, nextValue) =>
    setValue((current) => ({ ...current, [key]: nextValue }));
  return (
    <>
      <Field label={"H\u1ECD v\u00E0 t\u00EAn"}>
        <input
          maxLength="255"
          value={value.full_name}
          onChange={(event) => set("full_name", event.target.value)}
          required
          placeholder={"V\u00ED d\u1EE5: Nguy\u1EC5n V\u0103n An"}
        />
      </Field>
      <Field label={"S\u1ED1 \u0111i\u1EC7n tho\u1EA1i"}>
        <input
          type="tel"
          maxLength="20"
          value={value.phone}
          onChange={(event) => set("phone", event.target.value)}
          placeholder="09xx xxx xxx"
        />
      </Field>
      <Field label={"Gi\u1EDBi t\u00EDnh"}>
        <select
          value={value.gender}
          onChange={(event) => set("gender", event.target.value)}
        >
          <option value="undisclosed">
            {"Kh\u00F4ng mu\u1ED1n ti\u1EBFt l\u1ED9"}
          </option>
          <option value="female">{"N\u1EEF"}</option>
          <option value="male">Nam</option>
          <option value="other">{"Kh\u00E1c"}</option>
        </select>
      </Field>
      <Field label={"Ng\u00E0y sinh"}>
        <input
          type="date"
          value={value.date_of_birth}
          onChange={(event) => set("date_of_birth", event.target.value)}
        />
      </Field>
      <Field
        label={"\u0110\u1ECBa ch\u1EC9 giao h\u00E0ng"}
        className="profile-field-wide"
      >
        <textarea
          rows="3"
          maxLength="1000"
          value={value.shipping_address}
          onChange={(event) => set("shipping_address", event.target.value)}
          placeholder={
            "S\u1ED1 nh\u00E0, \u0111\u01B0\u1EDDng, ph\u01B0\u1EDDng/x\u00E3, qu\u1EADn/huy\u1EC7n, t\u1EC9nh/th\u00E0nh ph\u1ED1"
          }
        />
      </Field>
      {admin && (
        <>
          <Field label={"\u0110i\u1EC3m th\u00E0nh vi\u00EAn"}>
            <input
              type="number"
              min="0"
              step="1"
              value={value.loyalty_points}
              onChange={(event) => set("loyalty_points", event.target.value)}
              required
            />
          </Field>
          <Field label={"H\u1EA1ng th\u00E0nh vi\u00EAn"}>
            <select
              value={value.membership_tier}
              onChange={(event) => set("membership_tier", event.target.value)}
            >
              <option value="bronze">{"\u0110\u1ED3ng"}</option>
              <option value="silver">{"B\u1EA1c"}</option>
              <option value="gold">{"V\u00E0ng"}</option>
              <option value="platinum">{"B\u1EA1ch kim"}</option>
            </select>
          </Field>
        </>
      )}
    </>
  );
}

function ProfileCard({ title, subtitle, icon, children }) {
  return (
    <section className="account-card">
      <div className="account-heading">
        <div className="avatar">{icon}</div>
        <div>
          <small className="purple">{"NH\u00C0 S\u00C1CH M\u1ED8C"}</small>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Feedback({ message, error }) {
  return (
    <>
      {message && <p className="notice">{message}</p>}
      {error && <p className="notice notice-error">{error}</p>}
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
          ? "Kh\u00F4ng th\u1EC3 t\u1EA3i h\u1ED3 s\u01A1."
          : "Kh\u00F4ng th\u1EC3 c\u1EADp nh\u1EADt h\u1ED3 s\u01A1."),
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
            "H\u1ED3 s\u01A1 ch\u01B0a c\u00F3 d\u1EEF li\u1EC7u. H\u00E3y ki\u1EC3m tra t\u00EAn v\u00E0 l\u01B0u th\u00F4ng tin c\u1EE7a b\u1EA1n.",
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
        "\u0110\u00E3 c\u1EADp nh\u1EADt h\u1ED3 s\u01A1 th\u00E0nh c\u00F4ng.",
      );
      notify(
        "H\u1ED3 s\u01A1 c\u1EE7a b\u1EA1n \u0111\u00E3 \u0111\u01B0\u1EE3c c\u1EADp nh\u1EADt.",
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
      title={"H\u1ED3 s\u01A1 c\u1EE7a t\u00F4i"}
      subtitle={(user.full_name || "") + " \u00B7 " + (user.email || "")}
      icon={<UserRound />}
    >
      <p className="api-note">
        {
          "Email \u0111\u0103ng nh\u1EADp c\u1EE7a b\u1EA1n kh\u00F4ng th\u1EC3 \u0111\u1ED5i t\u1EA1i \u0111\u00E2y. B\u1EA1n c\u00F3 th\u1EC3 c\u1EADp nh\u1EADt t\u00EAn, s\u1ED1 \u0111i\u1EC7n tho\u1EA1i, ng\u00E0y sinh v\u00E0 \u0111\u1ECBa ch\u1EC9 giao h\u00E0ng."
        }
      </p>
      <Feedback message={message} error={error} />
      {loading ? (
        <p className="notice">
          <LoaderCircle size={14} className="spin" />{" "}
          {"\u0110ang t\u1EA3i h\u1ED3 s\u01A1..."}
        </p>
      ) : (
        <form className="profile-form" onSubmit={submit}>
          <PersonalFields value={value} setValue={setValue} />
          <div className="profile-actions">
            <button className="primary" disabled={busy}>
              {busy ? "\u0110ang l\u01B0u..." : "L\u01B0u h\u1ED3 s\u01A1"}
            </button>
            <button type="button" className="secondary" onClick={logout}>
              <LogOut size={15} /> {"\u0110\u0103ng xu\u1EA5t"}
            </button>
          </div>
        </form>
      )}
    </ProfileCard>
  );
}

export function AdminProfileEditor({ token, notify }) {
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
        "\u0110\u00E3 c\u1EADp nh\u1EADt h\u1ED3 s\u01A1 kh\u00E1ch h\u00E0ng #" +
          loadedId +
          ".",
      );
      notify(
        "\u0110\u00E3 c\u1EADp nh\u1EADt h\u1ED3 s\u01A1 kh\u00E1ch h\u00E0ng.",
      );
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <ProfileCard
      title={"S\u1EEDa h\u1ED3 s\u01A1 kh\u00E1ch h\u00E0ng"}
      subtitle={
        "T\u1EA3i h\u1ED3 s\u01A1 theo ID kh\u00E1ch h\u00E0ng r\u1ED3i c\u1EADp nh\u1EADt th\u00F4ng tin."
      }
      icon={<ShieldCheck />}
    >
      <p className="api-note">
        {
          "Admin c\u00F3 th\u1EC3 c\u1EADp nh\u1EADt t\u00EAn, th\u00F4ng tin li\u00EAn h\u1EC7, \u0111\u1ECBa ch\u1EC9 giao h\u00E0ng, \u0111i\u1EC3m v\u00E0 h\u1EA1ng th\u00E0nh vi\u00EAn."
        }
      </p>
      <Feedback message={message} error={error} />
      <form className="profile-form" onSubmit={load}>
        <Field label="ID khách hàng">
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
            placeholder="Ví dụ: 12"
          />
        </Field>
        <div className="profile-actions">
          <button className="primary" disabled={loading || !id}>
            {loading ? "\u0110ang t\u1EA3i..." : "T\u1EA3i h\u1ED3 s\u01A1"}
          </button>
        </div>
      </form>
      {loadedId && (
        <form className="profile-form" onSubmit={submit}>
          <PersonalFields value={value} setValue={setValue} admin />
          <div className="profile-actions">
            <button className="primary" disabled={busy}>
              {busy
                ? "\u0110ang c\u1EADp nh\u1EADt..."
                : "C\u1EADp nh\u1EADt h\u1ED3 s\u01A1"}
            </button>
          </div>
        </form>
      )}
    </ProfileCard>
  );
}
