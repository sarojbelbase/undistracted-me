import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Snackbar: a bottom-center transient message with an optional action button,
 * rendered through a portal at z-index 10000 (above Popup's 9999). role="status"
 * announces it politely.
 *
 * Two parts:
 *   <SnackbarHost />       : mount once (Pocket renders it in its root)
 *   snackbar(msg, opts)    : imperative: push a message
 *
 *   snackbar("Saved to Pocket.", { action: "Undo", onAction: undo, duration: 6000 });
 *
 * The imperative API uses a module-level listener set so any component in the
 * bundle can raise a snackbar without prop-drilling.
 */

let activeListener = null;
let idCounter = 0;

/** Push a snackbar to the single active host. Returns its id (unused today). */
export function snackbar(message, { action, onAction, duration = 6000 } = {}) {
  const id = ++idCounter;
  activeListener?.({ id, message, action, onAction, duration });
  return id;
}

export function SnackbarHost() {
  const [snacks, setSnacks] = useState([]);
  const timersRef = useRef({});

  useEffect(() => {
    const l = (msg) => {
      setSnacks((s) => [...s, msg]);
      timersRef.current[msg.id] = setTimeout(() => {
        setSnacks((s) => s.filter((x) => x.id !== msg.id));
        delete timersRef.current[msg.id];
      }, msg.duration);
    };
    // Only the most recently mounted host renders toasts: with multiple Pocket
    // widgets on the grid, a single shared host prevents duplicate toasts. On
    // unmount the previously-active host is restored (a stack).
    const prev = activeListener;
    activeListener = l;
    return () => {
      if (activeListener === l) activeListener = prev;
      for (const id of Object.keys(timersRef.current)) clearTimeout(timersRef.current[id]);
      timersRef.current = {};
    };
  }, []);

  const remove = (id) => {
    if (timersRef.current[id]) clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
    setSnacks((s) => s.filter((x) => x.id !== id));
  };

  if (snacks.length === 0) return null;

  return createPortal(
    <div className="um-snackbar-stack">
      {snacks.map((s) => (
        <div key={s.id} role="status" className="um-snackbar">
          <span>{s.message}</span>
          {s.action && (
            <button
              type="button"
              className="um-snackbar__action"
              onClick={() => {
                s.onAction?.();
                remove(s.id);
              }}
            >
              {s.action}
            </button>
          )}
        </div>
      ))}
    </div>,
    document.body,
  );
}
