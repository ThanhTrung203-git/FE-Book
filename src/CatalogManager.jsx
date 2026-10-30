import { useEffect, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  LoaderCircle,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import { catalogEntities } from "./catalogEntities.js";
import CatalogCreateForm from "./CatalogCreateForm.jsx";

export default function CatalogManager({ kind, token, close, notify }) {
  const { t } = useLanguage();
  const config = catalogEntities[kind];
  const Icon = kind === "author" ? Users : Building2;
  const [rows, setRows] = useState([]);
  const [keyword, setKeyword] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const pages = Math.max(1, Math.ceil(total / 20));

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search) params.set("search", search);
    api(`${config.path}?${params}`, { token, signal: controller.signal })
      .then((result) => {
        if (controller.signal.aborted) return;
        setRows(result.data || []);
        setTotal(Number(result.meta?.total || 0));
      })
      .catch((requestError) => {
        if (!controller.signal.aborted) setError(requestError.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [config.path, token, page, search, revision]);

  return (
    <div
      className="shade"
      onMouseDown={(event) =>
        event.target === event.currentTarget && !createBusy && close()
      }
    >
      <section
        className="dialog catalog-manager"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-manager-title"
      >
        <header>
          <div className="catalog-manager-heading">
            <Icon size={23} />
            <div>
              <h2 id="catalog-manager-title">{t(config.title)}</h2>
              <p>{t(config.description)}</p>
            </div>
          </div>
          <button
            className="icon"
            disabled={createBusy}
            onClick={close}
            aria-label={t("Đóng")}
          >
            <X />
          </button>
        </header>
        <div className="catalog-manager-toolbar">
          <form
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              setSearch(keyword.trim());
              setPage(1);
            }}
          >
            <Search size={16} />
            <input
              aria-label={t(config.search)}
              placeholder={t(config.search)}
              value={keyword}
              maxLength={255}
              onChange={(event) => setKeyword(event.target.value)}
            />
            <button type="submit">{t("Tìm kiếm")}</button>
          </form>
          <button
            className="primary"
            disabled={creating}
            onClick={() => setCreating(true)}
          >
            <Plus size={16} />
            {t(config.create)}
          </button>
        </div>
        {creating && (
          <CatalogCreateForm
            kind={kind}
            token={token}
            onCancel={() => setCreating(false)}
            onBusyChange={setCreateBusy}
            onCreated={(record) => {
              setCreating(false);
              setKeyword(record.name);
              setSearch(record.name);
              setPage(1);
              setRevision((current) => current + 1);
              notify?.(config.success);
            }}
          />
        )}
        {error && (
          <p className="error" role="alert">
            {t(error)}{" "}
            <button
              type="button"
              className="catalog-retry"
              onClick={() => setRevision((current) => current + 1)}
            >
              {t("Thử tải lại")}
            </button>
          </p>
        )}
        <div className="catalog-records" aria-busy={loading}>
          {loading ? (
            <p className="catalog-empty">
              <LoaderCircle className="spin" size={18} />
              {t("Đang tải…")}
            </p>
          ) : rows.length ? (
            rows.map((record) => (
              <article key={record.id} className="catalog-record">
                <span className="catalog-record-icon">
                  <Icon size={18} />
                </span>
                <div>
                  <b>{record.name}</b>
                  <p>{record[config.detailKey] || t("Chưa có giới thiệu.")}</p>
                  {kind === "publisher" && record.website && (
                    <small>{record.website}</small>
                  )}
                </div>
                <span className="catalog-record-count">
                  {t("{count} sách", { count: record.book_count || 0 })}
                  <small>#{record.id}</small>
                </span>
              </article>
            ))
          ) : (
            !error && (
              <p className="catalog-empty">
                {t("Không tìm thấy mục phù hợp.")}
              </p>
            )
          )}
        </div>
        <div className="catalog-manager-footer">
          <span>
            {t("{count} kết quả", { count: total })}
            {search && (
              <button
                type="button"
                onClick={() => {
                  setKeyword("");
                  setSearch("");
                  setPage(1);
                }}
              >
                {t("Xóa tìm kiếm")}
              </button>
            )}
          </span>
          <div>
            <button
              className="icon"
              disabled={loading || page <= 1}
              onClick={() => setPage((current) => current - 1)}
              aria-label={t("Trang trước")}
            >
              <ArrowLeft size={16} />
            </button>
            <span>
              {t("Trang ")}
              {page}/{pages}
            </span>
            <button
              className="icon"
              disabled={loading || page >= pages}
              onClick={() => setPage((current) => current + 1)}
              aria-label={t("Trang sau")}
            >
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
