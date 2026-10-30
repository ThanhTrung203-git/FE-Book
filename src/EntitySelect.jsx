import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Plus,
  Search,
  X,
} from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";
import { catalogEntities } from "./catalogEntities.js";

const unique = (rows) => [
  ...new Map(rows.map((row) => [Number(row.id), row])).values(),
];
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

export default function EntitySelect({
  kind,
  token,
  value,
  onChange,
  onCreate,
  disabled = false,
  revision = 0,
}) {
  const { t } = useLanguage();
  const config = catalogEntities[kind];
  const id = useId();
  const trigger = useRef(null),
    menu = useRef(null),
    searchInput = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [options, setOptions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [position, setPosition] = useState({});
  const selectedIds = new Set(value.map((item) => Number(item.id)));
  const visible = unique([
    ...value.filter((item) => normalize(item.name).includes(normalize(query))),
    ...options,
  ]);

  useEffect(() => {
    if (!open || disabled) return;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    const timer = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ page: String(page), limit: "30" });
        if (query.trim()) params.set("search", query.trim());
        const result = await api(`${config.path}?${params}`, {
          token,
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setOptions((current) =>
          page === 1
            ? result.data || []
            : unique([...current, ...(result.data || [])]),
        );
        setTotal(Number(result.meta?.total || 0));
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, disabled, query, page, token, config.path, revision, retry]);

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = trigger.current.getBoundingClientRect();
    const below = window.innerHeight - anchor.bottom - 12,
      above = anchor.top - 12;
    const flip = below < 250 && above > below;
    const maxHeight = Math.max(100, Math.min(380, flip ? above : below));
    const width = Math.min(Math.max(anchor.width, 285), window.innerWidth - 24);
    const height = Math.min(menu.current?.offsetHeight || 300, maxHeight);
    setPosition({
      width,
      maxHeight,
      left: Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12)),
      top: flip ? Math.max(12, anchor.top - height - 6) : anchor.bottom + 6,
    });
  }, [open, options.length, loading, error, value.length]);

  useEffect(() => {
    if (!open) return;
    searchInput.current?.focus({ preventScroll: true });
    const outside = (event) => {
      if (
        !trigger.current?.contains(event.target) &&
        !menu.current?.contains(event.target)
      )
        setOpen(false);
    };
    const close = (event) => {
      if (event.type !== "scroll" || !menu.current?.contains(event.target))
        setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    window.addEventListener("resize", close);
    window.addEventListener("scroll", close, true);
    return () => {
      document.removeEventListener("pointerdown", outside);
      window.removeEventListener("resize", close);
      window.removeEventListener("scroll", close, true);
    };
  }, [open]);
  useEffect(() => {
    if (disabled) setOpen(false);
  }, [disabled]);

  function close() {
    setOpen(false);
    trigger.current?.focus({ preventScroll: true });
  }
  function toggle(item) {
    if (selectedIds.has(Number(item.id)))
      onChange(value.filter((row) => Number(row.id) !== Number(item.id)));
    else if (value.length < 50) onChange([...value, item]);
  }
  function openMenu() {
    if (!open) {
      setQuery("");
      setPage(1);
      setOptions([]);
    }
    setOpen(!open);
  }
  function keydown(event) {
    if (
      event.target === searchInput.current &&
      ["Home", "End"].includes(event.key)
    )
      return;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
    } else if (event.key === "Tab") {
      setOpen(false);
      trigger.current?.focus({ preventScroll: true });
    } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      const buttons = [
        ...menu.current.querySelectorAll('[role="option"]:not(:disabled)'),
      ];
      if (!buttons.length) return;
      const index = buttons.indexOf(document.activeElement);
      const next =
        event.key === "Home"
          ? 0
          : event.key === "End"
            ? buttons.length - 1
            : event.key === "ArrowDown"
              ? (index + 1) % buttons.length
              : index <= 0
                ? buttons.length - 1
                : index - 1;
      event.preventDefault();
      buttons[next]?.focus({ preventScroll: true });
      buttons[next]?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter" && event.target === searchInput.current) {
      event.preventDefault();
      if (visible[0]) toggle(visible[0]);
    }
  }

  return (
    <div className="entity-select">
      <div className="entity-label-row">
        <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
          {t(config.label)}
        </label>
        <button
          type="button"
          disabled={disabled || value.length >= 50}
          title={value.length >= 50 ? t("Chọn tối đa 50 mục.") : undefined}
          onClick={onCreate}
        >
          <Plus size={13} />
          {t(config.create)}
        </button>
      </div>
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        className={`entity-select-trigger ${open ? "is-open" : ""}`}
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? `${id}-list` : undefined}
        disabled={disabled}
        onClick={openMenu}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            if (!open) openMenu();
          }
        }}
      >
        <span className={value.length ? "" : "placeholder"}>
          {value.length
            ? value.map((item) => item.name).join(", ")
            : t(config.placeholder)}
        </span>
        <ChevronDown size={15} />
      </button>
      {value.length > 0 && (
        <div className="entity-selected">
          {value.map((item) => (
            <span key={item.id}>
              {item.name}
              <button
                type="button"
                disabled={disabled}
                aria-label={t("Bỏ chọn {name}", { name: item.name })}
                onClick={() => toggle(item)}
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {open &&
        !disabled &&
        createPortal(
          <div
            ref={menu}
            className="entity-select-menu"
            style={position}
            onKeyDown={keydown}
          >
            <div className="entity-select-search">
              <Search size={15} />
              <input
                ref={searchInput}
                maxLength={255}
                placeholder={t(config.search)}
                aria-label={t(config.search)}
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                  setOptions([]);
                }}
              />
            </div>
            <div
              className="entity-select-options"
              id={`${id}-list`}
              role="listbox"
              aria-label={t(config.label)}
              aria-multiselectable="true"
              aria-busy={loading}
            >
              {visible.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  tabIndex={index === 0 ? 0 : -1}
                  aria-selected={selectedIds.has(Number(item.id))}
                  disabled={
                    value.length >= 50 && !selectedIds.has(Number(item.id))
                  }
                  onClick={() => toggle(item)}
                >
                  <span className="entity-check">
                    {selectedIds.has(Number(item.id)) && <Check size={12} />}
                  </span>
                  <span>{item.name}</span>
                  <small>#{item.id}</small>
                </button>
              ))}
            </div>
            {loading && (
              <p className="entity-select-status" role="status">
                <LoaderCircle size={14} className="spin" />
                {t("Đang tải…")}
              </p>
            )}
            {value.length >= 50 && (
              <p className="entity-select-status" role="status">
                {t("Chọn tối đa 50 mục.")}
              </p>
            )}
            {!loading && !error && !visible.length && (
              <p className="entity-select-status">
                {t("Không tìm thấy mục phù hợp.")}
              </p>
            )}
            {error && (
              <div className="entity-select-error" role="alert">
                <span>{t(error)}</span>
                <button
                  type="button"
                  onClick={() => setRetry((value) => value + 1)}
                >
                  {t("Thử tải lại")}
                </button>
              </div>
            )}
            {!loading && !error && options.length < total && (
              <button
                type="button"
                className="entity-load-more"
                onClick={() => setPage((current) => current + 1)}
              >
                {t("Tải thêm")}
              </button>
            )}
            <footer>
              <span>{t("{count} đã chọn", { count: value.length })}</span>
              <button type="button" onClick={close}>
                {t("Hoàn tất")}
              </button>
            </footer>
          </div>,
          document.body,
        )}
    </div>
  );
}
