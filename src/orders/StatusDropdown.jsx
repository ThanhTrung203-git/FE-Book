import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export default function StatusDropdown({ value, options, onChange, disabled = false, label }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({});
  const trigger = useRef(null);
  const menu = useRef(null);
  const id = useId();
  const selected = options.find((option) => option.value === value) || options[0];
  const Icon = selected?.icon;

  useLayoutEffect(() => {
    if (!open) return;
    const anchor = trigger.current.getBoundingClientRect();
    const height = menu.current?.offsetHeight || 150;
    const width = Math.min(260, window.innerWidth - 24);
    setPosition({
      width,
      left: Math.max(12, Math.min(anchor.left, window.innerWidth - width - 12)),
      top: anchor.bottom + height + 12 > window.innerHeight
        ? Math.max(12, anchor.top - height - 6)
        : anchor.bottom + 6,
    });
    const buttons = menu.current?.querySelectorAll('[role="menuitemradio"]');
    buttons?.[Math.max(0, options.findIndex((option) => option.value === value))]?.focus();
  }, [open, options, value]);

  useEffect(() => {
    if (!open) return;
    const outside = (event) => {
      if (!trigger.current?.contains(event.target) && !menu.current?.contains(event.target)) setOpen(false);
    };
    const close = (event) => {
      if (event.type === "scroll" && menu.current?.contains(event.target)) return;
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

  function closeAndFocus() {
    setOpen(false);
    trigger.current?.focus();
  }

  function navigate(event) {
    if (event.key === "Escape") {
      event.preventDefault();
      closeAndFocus();
      return;
    }
    if (event.key === "Tab") { setOpen(false); trigger.current?.focus(); return; }
    const buttons = [...menu.current.querySelectorAll('[role="menuitemradio"]')];
    const index = buttons.indexOf(document.activeElement);
    const next = event.key === "ArrowDown" ? (index + 1) % buttons.length
      : event.key === "ArrowUp" ? (index - 1 + buttons.length) % buttons.length
      : event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : -1;
    if (next >= 0) { event.preventDefault(); buttons[next]?.focus(); }
  }

  return <>
    <button ref={trigger} type="button" className={`status-dropdown-trigger tone-${selected?.tone || "purple"}`}
      aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id : undefined}
      disabled={disabled} onClick={() => setOpen(!open)}
      onKeyDown={(event) => { if (["ArrowDown", "ArrowUp"].includes(event.key)) { event.preventDefault(); setOpen(true); } }}>
      {Icon && <Icon size={15} />}<span>{selected?.label}</span><ChevronDown size={14} className={open ? "rotated" : ""} />
    </button>
    {open && !disabled && createPortal(
      <div id={id} ref={menu} role="menu" aria-label={label} className="status-dropdown-menu" style={position} onKeyDown={navigate}>
        {options.map((option) => {
          const OptionIcon = option.icon;
          return <button key={option.value} type="button" role="menuitemradio" aria-checked={option.value === value}
            className={`status-dropdown-option tone-${option.tone || "purple"}`}
            onClick={() => { closeAndFocus(); if (option.value !== value) onChange(option.value); }}>
            {OptionIcon ? <OptionIcon size={17} /> : <span className="status-dot" />}
            <span><b>{option.label}</b>{option.description && <small>{option.description}</small>}</span>
            {option.value === value && <Check size={16} className="status-selected-check" />}
          </button>;
        })}
      </div>, document.body,
    )}
  </>;
}
