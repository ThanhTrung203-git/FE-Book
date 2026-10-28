import { useCallback, useEffect, useState } from "react";
import {
  Boxes,
  Check,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";

const API = (
  import.meta.env.VITE_API_URL || "http://localhost:3000/api"
).replace(/\/$/, "");

async function request(path, token, method = "GET", payload) {
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
      data.message || "Kh\u00F4ng th\u1EC3 x\u1EED l\u00FD th\u1EC3 lo\u1EA1i.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function CategoryManager({ token, onClose, onChange, notify }) {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await request("/admin/categories", token);
      const list = data.data || [];
      setCategories(list);
      onChange?.(list);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, [token, onChange]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await request(
        editingId ? "/admin/categories/" + editingId : "/admin/categories",
        token,
        editingId ? "PATCH" : "POST",
        { name: name.trim() },
      );
      setName("");
      setEditingId(null);
      setMessage(
        editingId
          ? "\u0110\u00E3 c\u1EADp nh\u1EADt th\u1EC3 lo\u1EA1i."
          : "\u0110\u00E3 th\u00EAm th\u1EC3 lo\u1EA1i.",
      );
      notify?.(
        editingId
          ? "\u0110\u00E3 c\u1EADp nh\u1EADt th\u1EC3 lo\u1EA1i."
          : "\u0110\u00E3 th\u00EAm th\u1EC3 lo\u1EA1i.",
      );
      await load();
    } catch (requestError) {
      setError(
        requestError.status === 409
          ? "Kh\u00F4ng th\u1EC3 th\u1EF1c hi\u1EC7n v\u00EC t\u00EAn th\u1EC3 lo\u1EA1i b\u1ECB tr\u00F9ng."
          : requestError.message,
      );
    } finally {
      setBusy(false);
    }
  }

  function beginEdit(category) {
    setEditingId(category.id);
    setName(category.name);
    setError("");
    setMessage("");
  }

  async function remove(category) {
    if (!window.confirm('X\u00F3a th\u1EC3 lo\u1EA1i "' + category.name + '"?'))
      return;
    setError("");
    setMessage("");
    setBusy(true);
    try {
      await request("/admin/categories/" + category.id, token, "DELETE");
      if (editingId === category.id) {
        setEditingId(null);
        setName("");
      }
      setMessage("\u0110\u00E3 x\u00F3a th\u1EC3 lo\u1EA1i.");
      notify?.("\u0110\u00E3 x\u00F3a th\u1EC3 lo\u1EA1i.");
      await load();
    } catch (requestError) {
      setError(
        requestError.status === 409
          ? "Th\u1EC3 lo\u1EA1i \u0111ang c\u00F3 s\u00E1ch s\u1EED d\u1EE5ng, kh\u00F4ng th\u1EC3 x\u00F3a."
          : requestError.message,
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="modal-shade"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section
        className="category-manager account-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
      >
        <button
          className="modal-close"
          type="button"
          onClick={onClose}
          aria-label={"\u0110\u00F3ng"}
        >
          <X size={16} />
        </button>
        <div className="account-heading">
          <div className="avatar">
            <Boxes />
          </div>
          <div>
            <small className="purple">
              {"QU\u1EA2N L\u00DD DANH M\u1EE4C"}
            </small>
            <h1 id="category-manager-title">
              {"Th\u1EC3 lo\u1EA1i s\u00E1ch"}
            </h1>
            <p>
              {
                "Th\u00EAm, \u0111\u1ED5i t\u00EAn ho\u1EB7c x\u00F3a th\u1EC3 lo\u1EA1i."
              }
            </p>
          </div>
        </div>

        <form className="category-form" onSubmit={save}>
          <label className="profile-field" htmlFor="category-name">
            {"T\u00EAn th\u1EC3 lo\u1EA1i"}
          </label>
          <div className="category-input-row">
            <input
              id="category-name"
              maxLength="255"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={"V\u00ED d\u1EE5: V\u0103n h\u1ECDc"}
            />
            <button className="primary" disabled={busy || !name.trim()}>
              <Plus size={15} />
              {editingId ? "L\u01B0u t\u00EAn" : "Th\u00EAm m\u1EDBi"}
            </button>
            {editingId && (
              <button
                className="secondary"
                type="button"
                disabled={busy}
                onClick={() => {
                  setEditingId(null);
                  setName("");
                }}
              >
                {"H\u1EE7y"}
              </button>
            )}
          </div>
        </form>

        {message && <p className="notice">{message}</p>}
        {error && <p className="notice notice-error">{error}</p>}
        <div className="category-list">
          {loading ? (
            <p className="empty">
              <LoaderCircle size={15} className="spin" />{" "}
              {"\u0110ang t\u1EA3i danh m\u1EE5c..."}
            </p>
          ) : categories.length === 0 ? (
            <p className="empty">{"Ch\u01B0a c\u00F3 th\u1EC3 lo\u1EA1i."}</p>
          ) : (
            categories.map((category) => (
              <div className="category-row" key={category.id}>
                <span>
                  <b>{category.name}</b>
                  <small>ID: {category.id}</small>
                </span>
                <div>
                  <button
                    className="icon"
                    type="button"
                    title={"S\u1EEDa"}
                    aria-label={"S\u1EEDa"}
                    disabled={busy}
                    onClick={() => beginEdit(category)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon danger"
                    type="button"
                    title={"X\u00F3a"}
                    aria-label={"X\u00F3a"}
                    disabled={busy}
                    onClick={() => remove(category)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <footer className="category-footer">
          <span>
            {categories.length} {"th\u1EC3 lo\u1EA1i"}
          </span>
          <button type="button" className="secondary" onClick={onClose}>
            <Check size={15} /> {"Ho\u00E0n t\u1EA5t"}
          </button>
        </footer>
      </section>
    </div>
  );
}
