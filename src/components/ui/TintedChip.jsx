/**
 * TintedChip — accent-tinted label chip.
 *
 * Renders as <a> when `href` is provided, otherwise as <button>.
 * Used for "Go to Meet", "View All", etc.
 *
 * Props:
 *  href      – Link URL. When set, renders an <a> with target="_blank"
 *  onClick   – Click handler (button variant)
 *  size      – 'sm' (default) | 'md'
 *  children  – Chip content
 *  className – Extra classes
 */
import { useSettingsStore } from "../../store";

export const TintedChip = ({
  href,
  onClick,
  children,
  size = "sm",
  className = "",
  ...rest
}) => {
  const cardStyle = useSettingsStore((s) => s.cardStyle);
  const isComic = cardStyle === "comic";

  const style = isComic
    ? {
        background: "color-mix(in srgb, var(--w-accent) 14%, transparent)",
        color: "var(--w-accent)",
        border:
          "1.5px solid color-mix(in srgb, var(--w-accent) 35%, transparent)",
      }
    : {
        background: "color-mix(in srgb, var(--w-accent) 8%, transparent)",
        color: "var(--w-accent)",
      };

  const cls =
    `font-semibold rounded-lg whitespace-nowrap transition-opacity hover:opacity-80 cursor-pointer ${
      size === "sm"
        ? "text-[10px] px-2.5 py-1"
        : "text-[13px] px-3 h-8 inline-flex items-center gap-1"
    } ${className}`.trim();

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noreferrer"
        className={cls}
        style={style}
        {...rest}
      >
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cls}
      style={style}
      {...rest}
    >
      {children}
    </button>
  );
};
