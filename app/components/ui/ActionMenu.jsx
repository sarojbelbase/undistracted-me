import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check2 } from "react-bootstrap-icons";
import { Popup } from "./Popup";

/**
 * ActionMenu — a keyboard-accessible popover menu built on Popup (portal,
 * auto-flip) with a transparent full-screen backdrop for outside-click close.
 *
 * items: Array<{
 *   label, icon?, onSelect?, danger?, divider?, submenu?, keepOpen?, checked?
 * }>
 *   - `divider: true` renders a hairline.
 *   - `submenu` (array of items) renders `label` as a section header with the
 *     submenu items listed beneath it (the "Change Type" pattern).
 *   - `keepOpen: true` runs `onSelect` but leaves the menu open (multi-toggle).
 *   - `checked: true` renders a trailing accent check.
 *
 * Roving tabindex (only the active item is focusable), Arrow Up/Down to move,
 * Enter/Space to select, Escape to close and return focus to the trigger.
 * Escape is captured in the capture phase so it closes this menu before the
 * enclosing Modal's own Escape handler can fire (§4: Esc closes the top layer).
 *
 * Props:
 *   anchor     – getBoundingClientRect() snapshot of the trigger
 *   items      – item array (above)
 *   onClose    – () => void; called on Escape, outside click, or after a select
 *   triggerRef – optional ref; focused on Escape
 *   className  – extra classes on the panel
 */
export const ActionMenu = ({ anchor, items = [], onClose, triggerRef, className = "" }) => {
  const flat = [];
  const plan = [];
  for (const it of items) {
    if (it.divider) {
      plan.push({ type: "divider", key: `d-${plan.length}` });
    } else if (it.submenu) {
      plan.push({ type: "label", key: `l-${plan.length}`, item: it });
      for (const child of it.submenu) {
        const flatIndex = flat.length;
        flat.push(child);
        plan.push({ type: "item", key: `${child.label}-${flatIndex}`, item: child, level: 1, flatIndex });
      }
    } else {
      const flatIndex = flat.length;
      flat.push(it);
      plan.push({ type: "item", key: `${it.label}-${flatIndex}`, item: it, level: 0, flatIndex });
    }
  }

  const [activeIndex, setActiveIndex] = useState(0);
  const nodeRefs = useRef([]);
  // Live closure for the keydown handler, synced after each render (never
  // written during render). Keeps the document listener subscribed only once
  // per open menu instead of re-subscribing on every arrow-key re-render.
  const liveRef = useRef({ flat, activeIndex, onClose, triggerRef });
  useEffect(() => {
    liveRef.current = { flat, activeIndex, onClose, triggerRef };
  });

  useEffect(() => {
    if (!anchor) return undefined;
    const onKey = (e) => {
      const { flat, activeIndex, onClose, triggerRef } = liveRef.current;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        triggerRef?.current?.focus();
        return;
      }
      if (flat.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => (i + 1) % flat.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => (i - 1 + flat.length) % flat.length);
      } else if (e.key === "Home") {
        e.preventDefault();
        setActiveIndex(0);
      } else if (e.key === "End") {
        e.preventDefault();
        setActiveIndex(flat.length - 1);
      } else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const entry = flat[activeIndex];
        if (entry) {
          entry.onSelect?.();
          if (!entry.keepOpen) onClose();
        }
      }
    };
    // Capture phase so Escape reaches us before the Modal's bubble listener.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [anchor]);

  useEffect(() => {
    const el = nodeRefs.current[activeIndex];
    if (el && el.focus) el.focus();
  }, [activeIndex]);

  if (!anchor) return null;

  const renderItem = (entry) => {
    const active = entry.flatIndex === activeIndex;
    return (
      <button
        key={entry.key}
        type="button"
        role="menuitem"
        tabIndex={active ? 0 : -1}
        ref={(n) => {
          nodeRefs.current[entry.flatIndex] = n;
        }}
        className={`um-menu__item ${entry.level ? "um-menu__item--sub" : ""} ${
          entry.item.danger ? "um-menu__item--danger" : ""
        }`}
        onMouseEnter={() => setActiveIndex(entry.flatIndex)}
        onClick={(e) => {
          e.stopPropagation();
          entry.item.onSelect?.();
          if (!entry.item.keepOpen) onClose();
        }}
      >
        {entry.item.icon && <span className="um-menu__icon">{entry.item.icon}</span>}
        <span className="um-menu__label-text">{entry.item.label}</span>
        {entry.item.checked && (
          <span className="um-menu__check" aria-hidden="true">
            <Check2 size={13} />
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {createPortal(
        <div
          aria-hidden="true"
          className="fixed inset-0"
          style={{ zIndex: 9998, background: "transparent" }}
          onClick={onClose}
        />,
        document.body,
      )}
      <Popup anchor={anchor} className={`p-1.5 ${className}`}>
        <div role="menu" className="um-menu">
          {plan.map((entry) => {
            if (entry.type === "divider") return <div key={entry.key} className="um-menu__divider" />;
            if (entry.type === "label") {
              return (
                <div key={entry.key} className="um-menu__label">
                  {entry.item.icon && <span className="um-menu__icon">{entry.item.icon}</span>}
                  <span>{entry.item.label}</span>
                </div>
              );
            }
            return renderItem(entry);
          })}
        </div>
      </Popup>
    </>
  );
};
