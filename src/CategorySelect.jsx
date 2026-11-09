import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  LoaderCircle,
  Search,
} from "lucide-react";
import { api } from "./api.js";
import { useLanguage } from "./i18n.jsx";

const unique = (rows) => [
  ...new Map(rows.map((row) => [Number(row.id), row])).values(),
];
const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase();

export default function CategorySelect({ categories, selectedId, onChange, token, disabled = false }) {
  const { t, categoryLabel } = useLanguage();
  const config = { label: "Thể loại", placeholder: "Chọn thể loại", search: "Tìm thể loại bằng tiếng Anh hoặc tiếng Việt" };
  const value = categories.filter(item => String(item.id) === String(selectedId));
  const id = useId();
  const trigger = useRef(null),
    menu = useRef(null),
    searchInput = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [position, setPosition] = useState({});
  const selectedIds = new Set(value.map((item) => Number(item.id)));
  const needle = normalize(query).trim();
  const visible = unique([
    ...categories.filter(item => !needle || [item.name, categoryLabel(item.name)].some(name => normalize(name).includes(needle))),
    ...options,
  ]);
  const [matchStatus, setMatchStatus] = useState("");

  useEffect(() => {
    setOptions([]);
    setMatchStatus("");
    setError("");
    setLoading(false);
    if (!open || disabled || !query.trim()) return;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const result = await api("/admin/categories/resolve", {
          method: "POST", token, signal: controller.signal,
          body: JSON.stringify({ names: [query.trim()] }),
        });
        if (controller.signal.aborted) return;
        const match = result.data[0];
        setOptions(match.category ? [match.category] : match.candidates);
        setMatchStatus(match.status);
      } catch (requestError) {
        if (!controller.signal.aborted) setError(requestError.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [open, disabled, query, token, retry]);

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
  }, [open, visible.length, loading, error, value.length, matchStatus]);

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
    onChange(String(item.id));
    close();
  }
  function openMenu() {
    if (!open) {
      setQuery("");
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
      if (!loading && !error && visible[0]) toggle(visible[0]);
    }
  }

  return (
    <div className="entity-select category-select">
      <div className="entity-label-row">
        <label id={`${id}-label`} htmlFor={`${id}-trigger`}>
          {t(config.label)} *
        </label>
      </div>
      <button
        ref={trigger}
        id={`${id}-trigger`}
        type="button"
        className={`entity-select-trigger ${open ? "is-open" : ""}`}
        role="combobox"
        aria-labelledby={`${id}-label`}
        aria-required="true"
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
            ? value.map((item) => categoryLabel(item.name)).join(", ")
            : t(config.placeholder)}
        </span>
        <ChevronDown size={15} />
      </button>
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
                  setOptions([]);
                  setMatchStatus("");
                  setError("");
                }}
              />
            </div>
            <div
              className="entity-select-options"
              id={`${id}-list`}
              role="listbox"
              aria-label={t(config.label)}
              aria-multiselectable="false"
              aria-busy={loading}
            >
              {visible.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="option"
                  tabIndex={index === 0 ? 0 : -1}
                  aria-selected={selectedIds.has(Number(item.id))}
                  onClick={() => toggle(item)}
                >
                  <span className="entity-check">
                    {selectedIds.has(Number(item.id)) && <Check size={12} />}
                  </span>
                  <span>{categoryLabel(item.name)}{categoryLabel(item.name) !== item.name && <small className="category-original-name">{item.name}</small>}</span>
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
            {matchStatus === "ambiguous" && <p className="entity-select-status" role="status">{t("Có nhiều thể loại tương đương. Hãy chọn thể loại đúng.")}</p>}
            {matchStatus === "unmatched" && options.length > 0 && <p className="entity-select-status">{t("Các lựa chọn cần xác nhận:")}</p>}
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
