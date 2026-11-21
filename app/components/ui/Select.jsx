import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check2, ChevronDown } from "react-bootstrap-icons";
import { Popup } from "./Popup";
import { useSettingsStore } from "../../store";
import {
  CANVAS_INPUT_BG,
  CANVAS_INPUT_BORDER,
  CANVAS_INPUT_TEXT,
  CANVAS_INPUT_ICON,
} from "../../theme/canvas";

/**
 * Select: the themed dropdown primitive. A fully custom menu (not the native
 * OS options list), styled to match `Input`'s pill wrapper so selects and text
 * inputs are visually interchangeable in settings panels and dialogs.
 *
 * The trigger is a glass/flat-aware pill (CANVAS_INPUT_* tokens) that opens a
 * Popup menu of clickable options; the selected value carries an accent check.
 * Closes on outside click (transparent backdrop), Escape (capture-phase, before
 * any enclosing Modal's own handler), or selection.
 *
 * Props:
 *   options    : [{ value, label, color? }]; `color` renders a small swatch dot
 *   value      : currently selected value
 *   onChange   : (value) => void
 *   placeholder: label shown when nothing matches `value` (default "Select…")
 *   ariaLabel  : accessible name for the trigger + listbox
 *   icon       : leading icon element
 *   disabled   : disable the trigger
 *   wrapperStyle- extra styles for the pill trigger
 */
export function Select({
  options = [],
  value,
  onChange,
  placeholder = "Select…",
  ariaLabel,
  icon,
  disabled = false,
  wrapperStyle,
}) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);

  const mode = useSettingsStore((s) => s.mode);
  const cardStyle = useSettingsStore((s) => s.cardStyle);
  const isDarkMode =
    mode === "dark" ||
    (mode === "auto" && document.documentElement.dataset.mode === "dark");
  const isGlass = cardStyle === "glass";
  const isComic = cardStyle === "comic";
  const wrapBg = CANVAS_INPUT_BG(isDarkMode, isGlass);
  const wrapBorder = CANVAS_INPUT_BORDER(isDarkMode, isGlass, isComic);
  const textColor = CANVAS_INPUT_TEXT(isDarkMode);
  const iconColor = CANVAS_INPUT_ICON(isDarkMode);

  const selected = options.find((o) => o.value === value);
  const label = selected?.label ?? placeholder;

  const close = useCallback(() => setOpen(false), []);

  const toggle = useCallback(() => {
    if (disabled) return;
    if (open) {
      setOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setAnchor(rect);
    setOpen(true);
  }, [open, disabled]);

  // Capture-phase Escape closes the menu before any enclosing Modal's handler.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        close();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [open, close]);

  const pick = (v) => {
    onChange?.(v);
    close();
  };

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={toggle}
        className="um-select"
        style={{
          display: "flex",
          alignItems: "center",
          gap: icon ? "4px" : "6px",
          width: "100%",
          boxSizing: "border-box",
          borderRadius: "12px",
          padding: "0 12px",
          height: "36px",
          appearance: "none",
          WebkitAppearance: "none",
          font: "inherit",
          backgroundColor: wrapBg,
          border: wrapBorder,
          cursor: disabled ? "not-allowed" : "pointer",
          opacity: disabled ? 0.5 : 1,
          textAlign: "left",
          ...wrapperStyle,
        }}
      >
        {icon && (
          <span style={{ flexShrink: 0, color: iconColor, lineHeight: 0 }}>
            {icon}
          </span>
        )}
        <span
          style={{
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: textColor,
            fontSize: "12px",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        <ChevronDown
          size={12}
          style={{
            flexShrink: 0,
            color: iconColor,
            transform: open ? "rotate(180deg)" : "none",
            transition: "transform 150ms ease",
          }}
        />
      </button>

      {open && anchor && (
        <>
          {createPortal(
            <div
              aria-hidden="true"
              className="fixed inset-0"
              style={{ zIndex: 9998 }}
              onClick={close}
            />,
            document.body,
          )}
          <Popup anchor={anchor} className="p-1">
            <div
              role="listbox"
              aria-label={ariaLabel}
              className="um-menu"
              style={{ minWidth: Math.max(anchor.width, 168) }}
            >
              {options.map((o) => {
                const isSel = o.value === value;
                return (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    aria-selected={isSel}
                    className="um-menu__item"
                    onClick={() => pick(o.value)}
                  >
                    {o.color != null && (
                      <span
                        aria-hidden="true"
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: o.color,
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <span className="um-menu__label-text">{o.label}</span>
                    {isSel && (
                      <Check2 size={13} style={{ color: "var(--w-accent)" }} />
                    )}
                  </button>
                );
              })}
              {options.length === 0 && (
                <div
                  className="px-2 py-1.5"
                  style={{ color: "var(--w-ink-4)", fontSize: "0.75rem" }}
                >
                  Nothing to select
                </div>
              )}
            </div>
          </Popup>
        </>
      )}
    </>
  );
}
