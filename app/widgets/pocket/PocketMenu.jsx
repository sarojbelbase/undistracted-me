import { useEffect } from "react";
import { createPortal } from "react-dom";
import { Popup } from "../../components/ui/Popup";

/**
 * PocketMenu — Popup (portal, card-token chrome, auto-flip) + a transparent
 * full-screen backdrop that closes on outside click, plus Escape handling.
 * Used for the Folders popover, Change-type menu and folder "..." menu.
 */
export function PocketMenu({ anchor, onClose, children }) {
  useEffect(() => {
    if (!anchor) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [anchor, onClose]);

  if (!anchor) return null;

  // Portal the backdrop too — the widget sits inside a grid transform, where a
  // `position: fixed` element resolves against the transformed ancestor rather
  // than the viewport (AGENTS.md grid-transform rule).
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
      <Popup anchor={anchor} className="p-1.5">
        {children}
      </Popup>
    </>
  );
}
