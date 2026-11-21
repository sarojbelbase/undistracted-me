import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check2, ChevronRight } from "react-bootstrap-icons";
import { Popup } from "./Popup";

const MARGIN = 10; // min gap from every viewport edge
const SUB_GAP = 4; // gap between the menu panel and a flyout submenu
const CLOSE_DELAY = 150; // hover-intent delay before a submenu closes (ms)

// Advance to the next non-disabled item index (wraps around). Falls back to
// `current` when every item is disabled.
const nextEnabledIndex = (items, current, dir) => {
  const n = items.length;
  if (!n) return current;
  let idx = current;
  for (let i = 0; i < n; i++) {
    idx = (idx + dir + n) % n;
    if (!items[idx]?.disabled) return idx;
  }
  return current;
};

/**
 * ActionMenu: a keyboard-accessible popover menu built on Popup (portal,
 * auto-flip) with a transparent full-screen backdrop for outside-click close.
 *
 * items: Array<{
 *   label, icon?, onSelect?, danger?, divider?, submenu?, keepOpen?, checked?,
 *   disabled?
 * }>
 *   - `disabled: true` greys the item out and makes it non-activatable (skipped
 *     by keyboard navigation and hover).
 *   - `divider: true` renders a hairline.
 *   - `submenu` (array of items) renders `label` as a parent item with a right
 *     chevron; hovering/focusing it opens a flyout sub-panel to the side listing
 *     the child items (the "Change Type" / "Change Folder" pattern).
 *   - `keepOpen: true` runs `onSelect` but leaves the menu open (multi-toggle).
 *   - `checked: true` renders a trailing accent check.
 *
 * Roving tabindex (only the active item is focusable), Arrow Up/Down/Home/End to
 * move, Arrow Right/Left to enter/exit a submenu, Enter/Space to select, Escape
 * to close the submenu (or the whole menu). Escape is captured in the capture
 * phase so it closes this menu before the enclosing Modal's own Escape handler
 * can fire (§4: Esc closes the top layer).
 *
 * Props:
 *   anchor     – getBoundingClientRect() snapshot of the trigger
 *   items      – item array (above)
 *   onClose    – () => void; called on Escape, outside click or after a select
 *   triggerRef – optional ref; focused on Escape
 *   className  – extra classes on the panel
 */
export const ActionMenu = ({ anchor, items = [], onClose, triggerRef, className = "" }) => {
  // Top-level plan: dividers + items. Submenu parents are ordinary items; their
  // children are kept on the item itself and rendered in a flyout panel.
  const topItems = []; // selectable top-level entries (no dividers)
  const plan = [];
  for (const it of items) {
    if (it.divider) {
      plan.push({ type: "divider", key: `d-${plan.length}` });
    } else {
      const index = topItems.length;
      topItems.push(it);
      plan.push({ type: "item", key: `i-${index}`, item: it, index });
    }
  }

  const [activeIndex, setActiveIndex] = useState(
    () => nextEnabledIndex(topItems, -1, 1), // top-level focus index
  );
  const [openSub, setOpenSub] = useState(null); // top-level index of open submenu
  const [subIndex, setSubIndex] = useState(0); // focus index within the open submenu
  const [subPos, setSubPos] = useState(null); // measured {left,top} for the flyout

  const itemRefs = useRef([]);
  const subItemRefs = useRef([]);
  const subPanelRef = useRef(null);
  const closeTimer = useRef(null);

  const openSubItems = openSub != null ? topItems[openSub]?.submenu || [] : [];

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };
  const scheduleClose = () => {
    clearClose();
    closeTimer.current = setTimeout(() => setOpenSub(null), CLOSE_DELAY);
  };
  useEffect(() => () => clearClose(), []);

  const activate = (item) => {
    if (item.disabled) return;
    item.onSelect?.();
    if (!item.keepOpen) onClose();
  };

  // Live closure for the keydown handler, synced after each render (never
  // written during render). Keeps the document listener subscribed only once
  // per open menu instead of re-subscribing on every arrow-key re-render.
  const liveRef = useRef({ topItems, activeIndex, openSub, subIndex, onClose, triggerRef });
  useEffect(() => {
    liveRef.current = { topItems, activeIndex, openSub, subIndex, onClose, triggerRef };
  });

  useEffect(() => {
    if (!anchor) return undefined;
    const onKey = (e) => {
      const s = liveRef.current;
      const top = s.topItems;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        if (s.openSub != null) {
          setOpenSub(null);
          return;
        }
        s.onClose();
        s.triggerRef?.current?.focus();
        return;
      }
      if (top.length === 0) return;

      const sub = s.openSub != null ? top[s.openSub]?.submenu || [] : [];

      if (s.openSub != null) {
        // Navigating within the open submenu.
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSubIndex((i) => (sub.length ? (i + 1) % sub.length : 0));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSubIndex((i) => (sub.length ? (i - 1 + sub.length) % sub.length : 0));
        } else if (e.key === "Home") {
          e.preventDefault();
          setSubIndex(0);
        } else if (e.key === "End") {
          e.preventDefault();
          setSubIndex(Math.max(0, sub.length - 1));
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          setOpenSub(null);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const entry = sub[s.subIndex];
          if (entry) activate(entry);
        }
      } else {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setActiveIndex((i) => nextEnabledIndex(top, i, 1));
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setActiveIndex((i) => nextEnabledIndex(top, i, -1));
        } else if (e.key === "Home") {
          e.preventDefault();
          setActiveIndex(nextEnabledIndex(top, -1, 1));
        } else if (e.key === "End") {
          e.preventDefault();
          setActiveIndex(nextEnabledIndex(top, top.length, -1));
        } else if (e.key === "ArrowRight") {
          if (top[s.activeIndex]?.submenu) {
            e.preventDefault();
            setOpenSub(s.activeIndex);
            setSubIndex(0);
          }
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          const entry = top[s.activeIndex];
          if (entry) activate(entry);
        }
      }
    };
    // Capture phase so Escape reaches us before the Modal's bubble listener.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [anchor]);

  // Move focus to the active item (top-level or submenu).
  useEffect(() => {
    if (openSub != null) {
      subItemRefs.current[subIndex]?.focus?.();
    } else {
      itemRefs.current[activeIndex]?.focus?.();
    }
  }, [activeIndex, subIndex, openSub]);

  // Position the flyout submenu relative to its parent item (measure before
  // paint so there is no flicker). Flips left when there is no room on the right.
  useLayoutEffect(() => {
    if (openSub == null) {
      setSubPos(null);
      return;
    }
    const parentEl = itemRefs.current[openSub];
    const subEl = subPanelRef.current;
    if (!parentEl || !subEl) return;
    const pr = parentEl.getBoundingClientRect();
    const sw = subEl.offsetWidth;
    const sh = subEl.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let left = pr.right + SUB_GAP;
    if (left + sw > vw - MARGIN) left = pr.left - sw - SUB_GAP;
    const top = Math.max(MARGIN, Math.min(pr.top, vh - sh - MARGIN));
    setSubPos({ left, top });
  }, [openSub]);

  if (!anchor) return null;

  const openSubmenu = (idx) => {
    setOpenSub(idx);
    setSubIndex(0);
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
        <div role="menu" className="um-menu" onMouseLeave={scheduleClose}>
          {plan.map((entry) => {
            if (entry.type === "divider") {
              return <div key={entry.key} className="um-menu__divider" />;
            }
            const idx = entry.index;
            const item = entry.item;
            const hasSub = !!item.submenu;
            const active = idx === activeIndex;
            const expanded = openSub === idx;
            return (
              <button
                key={entry.key}
                type="button"
                role="menuitem"
                aria-haspopup={hasSub ? "menu" : undefined}
                aria-expanded={hasSub ? expanded : undefined}
                aria-disabled={item.disabled ? true : undefined}
                disabled={item.disabled}
                tabIndex={item.disabled ? -1 : active ? 0 : -1}
                ref={(n) => {
                  itemRefs.current[idx] = n;
                }}
                className={`um-menu__item ${item.danger ? "um-menu__item--danger" : ""} ${item.disabled ? "um-menu__item--disabled" : ""}`}
                onMouseEnter={() => {
                  if (item.disabled) return;
                  clearClose();
                  setActiveIndex(idx);
                  if (hasSub) openSubmenu(idx);
                  else setOpenSub(null);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  if (item.disabled) return;
                  if (hasSub) {
                    if (expanded) setOpenSub(null);
                    else openSubmenu(idx);
                    return;
                  }
                  activate(item);
                }}
              >
                {item.icon && <span className="um-menu__icon">{item.icon}</span>}
                <span className="um-menu__label-text">{item.label}</span>
                {hasSub && (
                  <span className="um-menu__chevron" aria-hidden="true">
                    <ChevronRight size={13} />
                  </span>
                )}
                {item.checked && (
                  <span className="um-menu__check" aria-hidden="true">
                    <Check2 size={13} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Popup>

      {openSub != null &&
        openSubItems.length > 0 &&
        createPortal(
          <div
            ref={subPanelRef}
            role="menu"
            className="um-submenu"
            style={{
              left: subPos?.left ?? -9999,
              top: subPos?.top ?? -9999,
              opacity: subPos ? 1 : 0,
            }}
            onMouseEnter={clearClose}
            onMouseLeave={scheduleClose}
          >
            {openSubItems.map((child, i) => (
              <button
                key={`${child.label}-${i}`}
                type="button"
                role="menuitem"
                tabIndex={i === subIndex ? 0 : -1}
                ref={(n) => {
                  subItemRefs.current[i] = n;
                }}
                className={`um-menu__item ${child.danger ? "um-menu__item--danger" : ""}`}
                onMouseEnter={() => {
                  clearClose();
                  setSubIndex(i);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  activate(child);
                }}
              >
                {child.icon && <span className="um-menu__icon">{child.icon}</span>}
                <span className="um-menu__label-text">{child.label}</span>
                {child.checked && (
                  <span className="um-menu__check" aria-hidden="true">
                    <Check2 size={13} />
                  </span>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
};
