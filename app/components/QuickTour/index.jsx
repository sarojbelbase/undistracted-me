/**
 * QuickTour — two-step first-run welcome overlay.
 *
 * Steps:
 *   1. Pick a theme → accent + light/auto/dark (applied live)
 *   2. Try Focus Mode → jump straight in, or finish to the dashboard
 *
 * Gating: shown only on the very first run (quickTourSeenVersion === null).
 * Dismissing writes markQuickTourSeen(TOUR_VERSION) so it never re-appears.
 */

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  SunFill,
  MoonFill,
  CircleHalf,
  CheckLg,
  Fullscreen,
  ArrowRight,
  ArrowLeft,
} from "react-bootstrap-icons";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useUIStore } from "../../store/useUIStore";
import { ACCENT_COLORS } from "../../theme";
import { APP_VERSION } from "../../constants/version";

// ─── Constants ────────────────────────────────────────────────────────────────

const TOUR_VERSION = APP_VERSION;

// ─── Steps ────────────────────────────────────────────────────────────────────

/** Step 0 — pick a theme */
const StepTheme = ({ mode, setMode, accent, setAccent }) => {
  const isDark = mode === "dark";
  return (
    <div className="flex flex-col gap-4">
      <div className="text-center flex flex-col gap-1">
        <h2 className="text-[21px] font-bold tracking-tight qt-s2-heading">
          Make it yours.
        </h2>
        <p className="text-[12.5px] qt-s2-subtitle">
          Pick a theme to start — you can change this anytime.
        </p>
      </div>

      {/* Mode */}
      <div
        className="flex rounded-xl p-1 gap-1"
        style={{ background: "var(--panel-bg)", border: "1px solid var(--card-border)" }}
      >
        {[
          { id: "light", label: "Light", icon: <SunFill size={12} /> },
          { id: "auto", label: "Auto", icon: <CircleHalf size={12} /> },
          { id: "dark", label: "Dark", icon: <MoonFill size={12} /> },
        ].map(({ id, label, icon }) => {
          const selected = mode === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setMode(id)}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "8px 0",
                borderRadius: 9,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                transition: "all 0.15s ease",
                background: selected ? "var(--w-accent)" : "transparent",
                color: selected ? "var(--w-accent-fg)" : "var(--w-ink-3)",
              }}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* Accent */}
      <div>
        <p
          className="text-[10px] font-bold tracking-widest uppercase mb-2"
          style={{ color: "var(--w-ink-3)" }}
        >
          Accent colour
        </p>
        <div className="flex flex-wrap gap-2.5">
          {ACCENT_COLORS.map((color) => {
            const swatchHex = isDark ? (color.darkHex ?? color.hex) : color.hex;
            const selected = accent === color.name;
            return (
              <button
                key={color.name}
                type="button"
                title={color.name}
                aria-label={color.name}
                aria-pressed={selected}
                onClick={() => setAccent(color.name)}
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: "50%",
                  border: "none",
                  padding: 0,
                  backgroundColor: swatchHex,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: selected
                    ? "0 0 0 2px var(--w-page-bg), 0 0 0 4px var(--w-accent)"
                    : "none",
                  transition: "all 0.15s ease",
                  flexShrink: 0,
                }}
              >
                {selected && (
                  <CheckLg
                    size={13}
                    style={{ color: isDark ? (color.darkFg ?? color.fg) : color.fg }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/** Step 1 — try Focus Mode */
const StepFocus = ({ onTryFocusMode }) => (
  <div className="flex flex-col items-center gap-4 text-center">
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center"
        style={{ background: "color-mix(in srgb, var(--w-accent) 14%, transparent)" }}
      >
        <Fullscreen size={22} style={{ color: "var(--w-accent)" }} />
      </div>
      <h2 className="text-[21px] font-bold tracking-tight qt-s2-heading">
        You're all set.
      </h2>
      <p className="text-[12.5px] qt-s2-subtitle max-w-[320px]">
        Focus Mode turns your new tab into a full-screen clock with a Pomodoro
        timer, rain sounds and your tasks. Try it now, or explore your dashboard
        first.
      </p>
    </div>

    <button
      type="button"
      onClick={onTryFocusMode}
      className="flex items-center gap-1.5 px-5 py-2.5 rounded-full text-[13px] font-semibold cursor-pointer transition-opacity hover:opacity-90 qt-cta-btn"
    >
      Enter Focus Mode
      <ArrowRight size={13} />
    </button>
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────

export function QuickTour() {
  const quickTourSeenVersion = useSettingsStore((s) => s.quickTourSeenVersion);
  const markQuickTourSeen = useSettingsStore((s) => s.markQuickTourSeen);
  const mode = useSettingsStore((s) => s.mode);
  const setMode = useSettingsStore((s) => s.setMode);
  const accent = useSettingsStore((s) => s.accent);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const requestFocusMode = useUIStore((s) => s.requestFocusMode);

  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);
  // Animate step change: 'idle' | 'out' | 'in'
  const [stepAnim, setStepAnim] = useState("idle");

  const shouldShow = quickTourSeenVersion === null;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => {
      markQuickTourSeen(TOUR_VERSION);
      setVisible(false);
    }, 280);
  }, [markQuickTourSeen]);

  const goToStep = useCallback((next) => {
    setStepAnim("out");
    setTimeout(() => {
      setStep(next);
      setStepAnim("in");
      setTimeout(() => setStepAnim("idle"), 220);
    }, 180);
  }, []);

  const tryFocusMode = useCallback(() => {
    requestFocusMode();
    dismiss();
  }, [requestFocusMode, dismiss]);

  // Mount after a short delay so the app renders first (smooth experience)
  useEffect(() => {
    if (!shouldShow) return;
    const t = setTimeout(() => {
      setVisible(true);
      setExiting(false);
    }, 600);
    return () => clearTimeout(t);
  }, [shouldShow]);

  // ESC to dismiss, arrow keys to navigate between the two steps
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === "Escape") {
        dismiss();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        if (step === 0) goToStep(1);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        if (step > 0) goToStep(step - 1);
        return;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, step, dismiss, goToStep]);

  if (!shouldShow || !visible) return null;

  const isLast = step === 1;

  let stepTransform = "translateY(0)";
  if (stepAnim === "out") stepTransform = "translateY(6px)";
  else if (stepAnim === "in") stepTransform = "translateY(-4px)";

  const stepStyle = {
    opacity: stepAnim === "out" ? 0 : 1,
    transform: stepTransform,
    transition: "opacity 180ms ease, transform 180ms ease",
  };

  const cardStyle = exiting
    ? {
        opacity: 0,
        transform: "scale(0.97) translateY(8px)",
        transition: "all 280ms cubic-bezier(0.4,0,1,1)",
      }
    : { opacity: 1, transform: "scale(1) translateY(0)", transition: "all 0ms" };

  return createPortal(
    <dialog
      open
      aria-label="Quick Tour"
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
      className="fixed inset-0 m-0 max-w-none max-h-none border-0 flex items-center justify-center p-0 z-9999 qt-overlay"
    >
      {/* Card */}
      <div
        className={`relative flex flex-col w-full mx-4 rounded-2xl overflow-hidden qt-card ${exiting ? "" : "qt-card--enter"}`}
        style={cardStyle}
      >
        {/* Step content — min-height locks card size between steps */}
        <div className="px-6 pt-6 pb-2 qt-content" style={stepStyle}>
          {step === 0 && (
            <StepTheme mode={mode} setMode={setMode} accent={accent} setAccent={setAccent} />
          )}
          {step === 1 && <StepFocus onTryFocusMode={tryFocusMode} />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 qt-footer">
          {/* Back / Skip */}
          {step === 0 ? (
            <button
              type="button"
              onClick={dismiss}
              className="text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-60 qt-skip-btn"
            >
              Skip tour
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(step - 1)}
              className="flex items-center gap-1.5 text-[12px] font-medium cursor-pointer transition-opacity hover:opacity-70 select-none qt-back-btn"
            >
              <ArrowLeft size={12} />
              Back
            </button>
          )}

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {[0, 1].map((i) => (
              <button
                key={i}
                type="button"
                onClick={() => goToStep(i)}
                aria-label={`Go to step ${i + 1}`}
                className="transition-all rounded-full cursor-pointer qt-dot"
                style={{
                  width: i === step ? 16 : 6,
                  background: i === step ? "var(--w-accent)" : "var(--w-border)",
                }}
              />
            ))}
          </div>

          {/* Next / Finish */}
          {isLast ? (
            <button
              type="button"
              onClick={dismiss}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-opacity hover:opacity-90 select-none qt-cta-btn"
            >
              Get started
              <ArrowRight size={12} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => goToStep(1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12px] font-semibold cursor-pointer transition-opacity hover:opacity-90 select-none qt-cta-btn"
            >
              Next
              <ArrowRight size={12} />
            </button>
          )}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
