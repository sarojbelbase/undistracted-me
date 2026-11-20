/**
 * SegmentedControl — horizontal pill-track toggle for widget settings panels
 * and anywhere there are multiple options.
 *
 * Renders a subtle pill-shaped track with a sliding accent-tinted thumb via the
 * `.um-seg` / `.um-seg--full` design-system classes. The thumb is measured to
 * the active button and animates (left/width) when the selection changes — the
 * canonical "multiple-option" selector used app-wide (Pocket "Group by",
 * Appearance, Focus Mode, Notes, widget settings).
 *
 * Props:
 *  label    – Section label shown above the control (optional)
 *  options  – Array of { label: string, value: string }
 *  value    – Currently selected value
 *  onChange – (newValue: string) => void
 *  inline   – true = size to content (e.g. Pocket toolbar "Group by");
 *             false (default) = fill the parent width (settings rows)
 *  size     – "sm" (Pocket toolbar) | "md" | "lg" (settings rows, default)
 *  variant  – "accent" (default, sliding accent thumb) | "subtle" (quiet raised
 *             pill — for inline toolbars like Pocket "Group by")
 *  ariaLabel – accessible group name (falls back to label)
 */

import { useRef, useState, useLayoutEffect, useEffect, useCallback } from "react";

export const SegmentedControl = ({ label, options, value, onChange, inline = false, ariaLabel, size = "lg", variant = "accent" }) => {
  const trackRef = useRef(null);
  const [thumb, setThumb] = useState(null);

  const measure = useCallback(() => {
    if (variant !== "accent") return; // subtle variant has no thumb to measure
    const track = trackRef.current;
    if (!track) return;
    const btn = [...track.querySelectorAll("button")].find(
      (b) => b.dataset.value === value,
    );
    if (!btn) return;
    const tr = track.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setThumb({
      left: br.left - tr.left,
      top: br.top - tr.top,
      width: br.width,
      height: br.height,
    });
  }, [value, variant]);

  useLayoutEffect(measure, [measure]);

  // Re-measure when the track resizes (settings panel resize, font/scale changes).
  useEffect(() => {
    if (variant !== "accent") return;
    const track = trackRef.current;
    if (!track || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(track);
    return () => ro.disconnect();
  }, [measure, variant]);

  const track = (
    <div
      ref={trackRef}
      className={`um-seg um-seg--${size} um-seg--${variant} ${inline ? "" : "um-seg--full"}`}
      role="group"
      aria-label={ariaLabel || label}
    >
      {variant === "accent" && thumb && (
        <span
          className="um-seg-thumb"
          aria-hidden="true"
          style={{
            left: thumb.left,
            top: thumb.top,
            width: thumb.width,
            height: thumb.height,
          }}
        />
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          data-value={opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (!label) return track;

  return (
    <div className="flex flex-col gap-2">
      <span className="w-label">{label}</span>
      {track}
    </div>
  );
};
