import { useLanguage } from "./i18n.jsx";
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
      data.message || "Không thể xử lý thể loại.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function CategoryManager({ token, onClose, onChange, notify }) {
  const { t, categoryLabel } = useLanguage();
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
          ? "Đã cập nhật thể loại."
          : "Đã thêm thể loại.",
      );
      notify?.(
        editingId
          ? "Đã cập nhật thể loại."
          : "Đã thêm thể loại.",
      );
      await load();
    } catch (requestError) {
      setError(
        requestError.status === 409
          ? "Không thể thực hiện vì tên thể loại bị trùng."
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
    if (!window.confirm(t("Xóa thể loại {name}?", { name: categoryLabel(category.name) })))
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
      setMessage("Đã xóa thể loại.");
      notify?.("Đã xóa thể loại.");
      await load();
    } catch (requestError) {
      setError(
        requestError.status === 409
          ? "Thể loại đang có sách sử dụng, không thể xóa."
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
          aria-label={t("Đóng")}
        >
          <X size={16} />
        </button>
        <div className="account-heading">
          <div className="avatar">
            <Boxes />
          </div>
          <div>
            <small className="purple">
              {t("QUẢN LÝ DANH MỤC")}
            </small>
            <h1 id="category-manager-title">
              {t("Thể loại sách")}
            </h1>
            <p>
              {
                t("Thêm, đổi tên hoặc xóa thể loại.")
              }
            </p>
          </div>
        </div>

        <form className="category-form" onSubmit={save}>
          <label className="profile-field" htmlFor="category-name">
            {t("Tên thể loại")}
          </label>
          <div className="category-input-row">
            <input
              id="category-name"
              maxLength="255"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={t("Ví dụ: Văn học")}
            />
            <button className="primary" disabled={busy || !name.trim()}>
              <Plus size={15} />
              {editingId ? t("Lưu tên") : t("Thêm mới")}
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
                {t("Hủy")}
              </button>
            )}
          </div>
        </form>

        {message && <p className="notice">{t(message)}</p>}
        {error && <p className="notice notice-error">{t(error)}</p>}
        <div className="category-list">
          {loading ? (
            <p className="empty">
              <LoaderCircle size={15} className="spin" />{" "}
              {t("Đang tải danh mục...")}
            </p>
          ) : categories.length === 0 ? (
            <p className="empty">{t("Chưa có thể loại.")}</p>
          ) : (
            categories.map((category) => (
              <div className="category-row" key={category.id}>
                <span>
                  <b>{categoryLabel(category.name)}</b>
                  <small>ID: {category.id}</small>
                </span>
                <div>
                  <button
                    className="icon"
                    type="button"
                    title={"Sửa"}
                    aria-label={"Sửa"}
                    disabled={busy}
                    onClick={() => beginEdit(category)}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="icon danger"
                    type="button"
                    title={"Xóa"}
                    aria-label={"Xóa"}
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
            {categories.length} {t("thể loại")}
          </span>
          <button type="button" className="secondary" onClick={onClose}>
            <Check size={15} /> {t("Hoàn tất")}
          </button>
        </footer>
      </section>
    </div>
  );
}
