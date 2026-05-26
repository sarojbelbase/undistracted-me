/**
 * Background — Canvas background selection (inline).
 * Self-contained: Solid colour + Motion orb tabs. No BackgroundPicker dependency.
 */

import React, { useState, useCallback } from "react";
import { CheckLg } from "react-bootstrap-icons";
import { TabRow } from "../ui/TabRow";
import { useSettingsStore } from "../../store";

// ─── Tabs ──────────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "solid", label: "Solid", hint: "Accent tint, no motion" },
  { id: "orb", label: "Motion", hint: "Animated color orb" },
];

// ─── Active badge ─────────────────────────────────────────────────────────────────────────

const ActiveBadge = () => (
  <>
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        boxShadow: "inset 0 0 0 2.5px var(--w-accent)",
        borderRadius: "inherit",
      }}
    />
    <div
      className="absolute bottom-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full"
      style={{
        background: "var(--w-accent)",
        color: "var(--w-accent-fg)",
        fontSize: 9,
        fontWeight: 700,
      }}
    >
      <CheckLg size={9} />
      <span>Active</span>
    </div>
  </>
);

// ─── Solid panel ─────────────────────────────────────────────────────────────────────────

const SolidPanel = ({ isActive, onApply }) => (
  <div className="flex flex-col items-center gap-4">
    <div
      className={`w-full rounded-xl overflow-hidden relative${isActive ? "" : " cursor-pointer hover:opacity-90 transition-opacity"}`}
      style={{ aspectRatio: "16/9" }}
      onClick={isActive ? undefined : onApply}
      role={isActive ? undefined : "button"}
      aria-label={isActive ? undefined : "Use Solid"}
    >
      <div
        className="w-full h-full"
        style={{
          background:
            "color-mix(in srgb, var(--w-accent) 10%, var(--w-page-bg))",
        }}
      />
      {isActive && <ActiveBadge />}
    </div>
    <p className="text-xs text-center" style={{ color: "var(--w-ink-4)" }}>
      A solid tint of your current accent color.
    </p>
  </div>
);

// ─── Orb panel ────────────────────────────────────────────────────────────────────────────

const OrbPanel = ({ isActive, onApply }) => {
  const previewBg = "var(--w-page-bg)";
  const vignetteBg =
    "radial-gradient(ellipse 85% 80% at 50% 50%, transparent 28%, color-mix(in srgb, var(--w-page-bg) 55%, transparent) 65%, var(--w-page-bg) 100%)";
  return (
    <div className="flex flex-col gap-4">
      <div
        className={`w-full rounded-xl overflow-hidden relative select-none${isActive ? "" : " cursor-pointer hover:opacity-90 transition-opacity"}`}
        style={{ aspectRatio: "16/9", background: previewBg }}
        onClick={isActive ? undefined : () => onApply({ orbId: "accent" })}
        role={isActive ? undefined : "button"}
        aria-label={isActive ? undefined : "Use Color Motion"}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: "bpOrbSpin 14s linear infinite",
            transformOrigin: "50% 50%",
            pointerEvents: "none",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: "70%",
              height: "70%",
              top: "15%",
              left: "15%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.55) 0%, rgba(var(--w-accent-rgb),0.18) 45%, transparent 70%)",
              filter: "blur(24px)",
              animation: "bpOrbBloom 5s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "45%",
              height: "45%",
              top: "5%",
              right: "5%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.32) 0%, transparent 65%)",
              filter: "blur(24px)",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: "40%",
              height: "40%",
              bottom: "5%",
              left: "5%",
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 50% 50%, rgba(var(--w-accent-rgb),0.20) 0%, transparent 62%)",
              filter: "blur(32px)",
              animation: "bpOrbCounter 9s linear infinite",
              transformOrigin: "50% 50%",
            }}
          />
        </div>
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: vignetteBg,
          }}
        />
        {isActive && <ActiveBadge />}
      </div>
    </div>
  );
};

// ─── Main export ──────────────────────────────────────────────────────────────────────────────

export const Background = () => {
  const { canvasBg, setCanvasBg } = useSettingsStore();
  const type = canvasBg?.type ?? "solid";
  const [tab, setTab] = useState(() => (type === "solid" ? "solid" : "orb"));
  const [activeSource, setActiveSource] = useState(type);

  const handleApply = useCallback(
    (bgType, opts = {}) => {
      setActiveSource(bgType);
      setCanvasBg({
        type: bgType,
        orbId: opts.orbId ?? canvasBg?.orbId ?? "blueberry",
        url: null,
        color: null,
      });
    },
    [canvasBg, setCanvasBg],
  );

  return (
    <div className="flex flex-col gap-3">
      <TabRow tabs={TABS} value={tab} onChange={setTab} />
      <div>
        {tab === "solid" && (
          <SolidPanel
            isActive={activeSource === "solid"}
            onApply={() => handleApply("solid")}
          />
        )}
        {tab === "orb" && (
          <OrbPanel
            isActive={activeSource === "orb"}
            onApply={(opts) => handleApply("orb", opts)}
          />
        )}
      </div>
    </div>
  );
};
