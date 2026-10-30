import { useId, useRef, useState } from "react";
import { LoaderCircle, Plus } from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import { catalogEntities } from "./catalogEntities.js";

export default function CatalogCreateForm({
  kind,
  token,
  onCreated,
  onCancel,
  onBusyChange,
}) {
  const { t } = useLanguage();
  const config = catalogEntities[kind];
  const titleId = useId();
  const fields = useRef(null);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [website, setWebsite] = useState("");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [error, setError] = useState("");

  async function create() {
    if (pendingRef.current) return;
    for (const input of fields.current.querySelectorAll("input, textarea"))
      if (!input.reportValidity()) return;
    pendingRef.current = true;
    setPending(true);
    onBusyChange?.(true);
    setError("");
    try {
      const result = await api(config.path, {
        method: "POST",
        token,
        body: JSON.stringify({
          name: name.trim(),
          [config.detailKey]: detail.trim() || null,
          ...(kind === "publisher" ? { website: website.trim() || null } : {}),
        }),
      });
      onCreated(result.data);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      pendingRef.current = false;
      setPending(false);
      onBusyChange?.(false);
    }
  }

  return (
    <section className="catalog-create" aria-labelledby={titleId}>
      <header>
        <Plus size={17} />
        <h3 id={titleId}>{t(config.create)}</h3>
      </header>
      <div
        className="catalog-create-fields"
        ref={fields}
        onKeyDown={(event) => {
          if (event.key === "Enter" && event.target.tagName === "INPUT") {
            event.preventDefault();
            event.stopPropagation();
            create();
          }
        }}
      >
        <label className="field">
          {t(config.name)} *
          <input
            autoFocus
            required
            maxLength={255}
            value={name}
            disabled={pending}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        {kind === "publisher" && (
          <label className="field">
            {t("Website")}
            <input
              type="url"
              maxLength={2048}
              placeholder="https://example.com"
              value={website}
              disabled={pending}
              onChange={(event) => setWebsite(event.target.value)}
            />
          </label>
        )}
        <label className="field full">
          {t(config.detail)}
          <textarea
            rows={3}
            maxLength={16000}
            value={detail}
            disabled={pending}
            onChange={(event) => setDetail(event.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="error" role="alert">
          {t(error)}
        </p>
      )}
      <div className="catalog-create-actions">
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={onCancel}
        >
          {t("Hủy")}
        </button>
        <button
          type="button"
          className="primary"
          disabled={pending}
          onClick={create}
        >
          {pending ? (
            <LoaderCircle size={15} className="spin" />
          ) : (
            <Plus size={15} />
          )}
          {pending ? t("Đang lưu...") : t(config.create)}
        </button>
      </div>
    </section>
  );
}
