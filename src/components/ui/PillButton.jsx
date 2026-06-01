/**
 * PillButton — a toggle button with active/inactive states.
 *
 * Props:
 *  active    – Whether this option is currently selected
 *  variant   – "pill" (default, rounded-full) | "chip" (rounded-md, tinted active style)
 *  tinted    – When true, active state uses accent-tinted bg instead of solid accent
 *  onClick   – Click handler
 *  children  – Button label text
 */
import { useSettingsStore } from "../../store";

export const PillButton = ({
  active,
  variant = "pill",
  tinted = false,
  onClick,
  children,
}) => {
  const cardStyle = useSettingsStore((s) => s.cardStyle);
  const isComic = cardStyle === "comic";
  const isChip = variant === "chip";
  const useTinted = isChip || tinted;

  let activeStyle;
  if (active && useTinted) {
    activeStyle = isComic
      ? {
        background: "color-mix(in srgb, var(--w-accent) 18%, transparent)",
        color: "var(--w-accent)",
        border:
          "1.5px solid color-mix(in srgb, var(--w-accent) 40%, transparent)",
      }
      : {
        background: "color-mix(in srgb, var(--w-accent) 14%, transparent)",
        color: "var(--w-accent)",
        border:
          "1px solid color-mix(in srgb, var(--w-accent) 30%, transparent)",
      };
  } else if (active) {
    activeStyle = isComic
      ? {
        backgroundColor: "var(--w-accent)",
        color: "var(--w-accent-fg)",
        border: "1.5px solid transparent",
      }
      : {
        backgroundColor: "var(--w-accent)",
        color: "var(--w-accent-fg)",
        border: "1px solid transparent",
      };
  } else {
    activeStyle = isComic
      ? {
        backgroundColor: "rgba(0,0,0,0.04)",
        color: "var(--w-ink-4)",
        border: "1.5px solid rgba(0,0,0,0.18)",
      }
      : {
        backgroundColor: "rgba(0,0,0,0.04)",
        color: "var(--w-ink-4)",
        border: "1px solid rgba(0,0,0,0.08)",
      };
  }

  const shape = isChip ? "rounded-md" : "rounded-full";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseDown={(e) => e.stopPropagation()}
      className={`px-2.5 py-0.5 ${shape} text-xs font-medium transition-all cursor-pointer`}
      style={activeStyle}
    >
      {children}
    </button>
  );
};
