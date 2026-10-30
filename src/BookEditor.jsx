import { useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, X } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import EntitySelect from "./EntitySelect.jsx";
import CatalogCreateForm from "./CatalogCreateForm.jsx";

const EMPTY = {
  category_id: "",
  title: "",
  price: "",
  weight_grams: "",
  stock_quantity: 1,
  description: "",
  cover_url: "",
  publication_year: "",
};
export default function BookEditor({ book, cats, token, close, save, busy }) {
  const { t, categoryLabel } = useLanguage();
  const editing = Boolean(book);
  const [form, setForm] = useState(() => ({
    ...EMPTY,
    ...book,
  }));
  const [authors, setAuthors] = useState(() =>
    (book?.author_ids || []).map((id, index) => ({
      id: Number(id),
      name: book.author_names[index],
    })),
  );
  const [publishers, setPublishers] = useState(
    () =>
      book?.publishers ||
      (book?.publisher_ids || []).map((id, index) => ({
        id: Number(id),
        name: book.publisher_names[index],
      })),
  );
  const [creatingKind, setCreatingKind] = useState(null);
  const [createBusy, setCreateBusy] = useState(false);
  const [catalogRevision, setCatalogRevision] = useState(0);
  const blocked = busy || createBusy;
  const [duplicate, setDuplicate] = useState(null);
  const [checking, setChecking] = useState(false);
  const [lookupError, setLookupError] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) =>
    setForm((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    setDuplicate(null);
    setLookupError(false);
    if (editing || !form.title.trim()) {
      setChecking(false);
      return;
    }
    const controller = new AbortController();
    setChecking(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api("/admin/books/match", {
          method: "POST",
          token,
          signal: controller.signal,
          body: JSON.stringify({
            title: form.title.trim(),
            publisher_ids: publishers.map((item) => Number(item.id)),
            author_ids: authors.map((item) => Number(item.id)),
          }),
        });
        if (!controller.signal.aborted) setDuplicate(result.data || null);
      } catch (requestError) {
        if (!controller.signal.aborted) setLookupError(true);
      } finally {
        if (!controller.signal.aborted) setChecking(false);
      }
    }, 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [editing, form.title, publishers, authors, token]);

  const merging = Boolean(duplicate) && !editing;
  function field(key, label, type = "text", required = false) {
    const identityField = ["title", "stock_quantity"].includes(key);
    const disabled =
      blocked ||
      (merging && !identityField) ||
      (editing && key === "stock_quantity");
    return (
      <label className="field">
        {t(label)}
        {required ? " *" : ""}
        <input
          type={type}
          required={required}
          value={
            merging && !identityField
              ? (duplicate[key] ?? "")
              : (form[key] ?? "")
          }
          disabled={disabled}
          min={type === "number" ? (key === "price" ? 0 : 1) : undefined}
          max={
            key === "publication_year"
              ? 9999
              : ["stock_quantity", "weight_grams"].includes(key)
                ? 2147483647
                : undefined
          }
          step={
            type === "number" ? (key === "price" ? "0.01" : "1") : undefined
          }
          maxLength={type === "text" ? 255 : undefined}
          onChange={(event) => set(key, event.target.value)}
        />
      </label>
    );
  }

  async function submit(event) {
    event.preventDefault();
    if (blocked || checking || creatingKind) return;
    setError("");
    const values = merging
      ? { ...form, ...duplicate, title: form.title }
      : form;
    const payload = {
      title: form.title.trim(),
      author_ids: authors.map((item) => Number(item.id)),
      publisher_ids: publishers.map((item) => Number(item.id)),
      category_id: Number(values.category_id),
      price: Number(values.price),
      weight_grams: Number(values.weight_grams),
      description: values.description || null,
      cover_url: values.cover_url || null,
      publication_year: values.publication_year
        ? Number(values.publication_year)
        : null,
      ...(!editing ? { stock_quantity: Number(form.stock_quantity) } : {}),
    };
    try {
      await save(payload);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return (
    <div
      className="shade"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !blocked && close()
      }
    >
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="book-editor-title"
      >
        <header>
          <h2 id="book-editor-title">
            {editing
              ? t("Chỉnh sửa sách")
              : merging
                ? t("Thêm số lượng sách")
                : t("Thêm sách mới")}
          </h2>
          <button
            className="icon"
            disabled={blocked}
            onClick={close}
            aria-label={t("Đóng")}
          >
            <X />
          </button>
        </header>
        <form onSubmit={submit}>
          {!editing && (
            <p className="book-editor-help">
              {t(
                "Trùng tên sách, tác giả và nhà xuất bản: số lượng sẽ được cộng vào sách hiện có, các thông tin khác giữ nguyên.",
              )}
            </p>
          )}
          <div className="fields">
            {field("title", "Tên sách", "text", true)}
            <EntitySelect
              kind="publisher"
              token={token}
              value={publishers}
              onChange={setPublishers}
              onCreate={() => setCreatingKind("publisher")}
              disabled={blocked || Boolean(creatingKind)}
              revision={catalogRevision}
            />
            <div className="full">
              <EntitySelect
                kind="author"
                token={token}
                value={authors}
                onChange={setAuthors}
                onCreate={() => setCreatingKind("author")}
                disabled={blocked || Boolean(creatingKind)}
                revision={catalogRevision}
              />
            </div>
            {creatingKind && (
              <div className="full">
                <CatalogCreateForm
                  key={creatingKind}
                  kind={creatingKind}
                  token={token}
                  onCancel={() => setCreatingKind(null)}
                  onBusyChange={setCreateBusy}
                  onCreated={(record) => {
                    const add = (current) =>
                      current.some(
                        (item) => Number(item.id) === Number(record.id),
                      )
                        ? current
                        : [...current, record];
                    if (creatingKind === "author") setAuthors(add);
                    else setPublishers(add);
                    setCatalogRevision((current) => current + 1);
                    setCreatingKind(null);
                  }}
                />
              </div>
            )}
            {checking && (
              <p className="book-match-state full" role="status">
                <LoaderCircle className="spin" size={15} />
                {t("Đang kiểm tra sách đã có…")}
              </p>
            )}
            {merging && (
              <div className="book-match-notice full" role="status">
                <CheckCircle2 size={19} />
                <div>
                  <b>
                    {t("Đã tìm thấy sách trùng thông tin")} · BK-
                    {String(duplicate.id).padStart(4, "0")}
                  </b>
                  <p>
                    {t("Số lượng hiện tại:")}{" "}
                    <strong>{duplicate.stock_quantity}</strong>.{" "}
                    {t("Chỉ nhập số lượng cần thêm rồi xác nhận.")}
                  </p>
                  {!Number(duplicate.is_active) && (
                    <p>
                      {t(
                        "Sách này đang ẩn. Thêm số lượng không thay đổi trạng thái hiển thị.",
                      )}
                    </p>
                  )}
                </div>
              </div>
            )}
            {lookupError && (
              <p className="book-editor-help full">
                {t(
                  "Chưa kiểm tra được sách trùng. Hệ thống sẽ kiểm tra lại khi lưu.",
                )}
              </p>
            )}
            {merging ? (
              field("stock_quantity", "Số lượng cần thêm", "number", true)
            ) : (
              <>
                <label className="field">
                  {t("Thể loại")} *
                  <select
                    required
                    disabled={blocked}
                    value={form.category_id}
                    onChange={(event) => set("category_id", event.target.value)}
                  >
                    <option value="">{t("Chọn thể loại")}</option>
                    {cats.map((category) => (
                      <option key={category.id} value={category.id}>
                        {categoryLabel(category.name)}
                      </option>
                    ))}
                  </select>
                </label>
                {field("price", "Giá bán (₫)", "number", true)}
                {field("weight_grams", "Khối lượng (gram)", "number", true)}
                {field(
                  "stock_quantity",
                  editing
                    ? "Số lượng hiện tại"
                    : merging
                      ? "Số lượng cần thêm"
                      : "Số lượng ban đầu",
                  "number",
                  !editing,
                )}
                {field("publication_year", "Năm xuất bản", "number")}
                {field("cover_url", "Ảnh bìa URL", "url")}
                <label className="field full">
                  {t("Mô tả")}
                  <textarea
                    rows="3"
                    disabled={blocked || merging}
                    value={
                      (merging ? duplicate.description : form.description) || ""
                    }
                    onChange={(event) => set("description", event.target.value)}
                  />
                </label>
              </>
            )}
          </div>
          {editing && (
            <p className="book-editor-help">
              {t(
                "Để bổ sung số lượng, dùng nút Thêm số lượng trong danh sách sản phẩm.",
              )}
            </p>
          )}
          {error && (
            <p className="error" role="alert">
              {t(error)}
            </p>
          )}
          <footer>
            <button
              type="button"
              className="secondary"
              disabled={blocked}
              onClick={close}
            >
              {t("Hủy")}
            </button>
            <button
              className="primary"
              disabled={blocked || checking || Boolean(creatingKind)}
            >
              {blocked
                ? t("Đang lưu...")
                : editing
                  ? t("Lưu thay đổi")
                  : merging
                    ? t("Cộng số lượng")
                    : t("Thêm sách")}
            </button>
          </footer>
        </form>
      </section>
    </div>
  );
}
