import React from "react";

export const RainNoiseIcon = ({ active, fadeDurationMs = 450 }) => (
  <svg
    width="17"
    height="17"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    {/* Sine-wave arc representing white-noise texture */}
    <path
      d="M1.5 8 Q4.5 3.5 7.5 8 Q10.5 12.5 13.5 8 Q16.5 3.5 19.5 8 Q21.5 10.5 23 8"
      stroke={active ? "var(--w-accent)" : "rgba(255,255,255,0.85)"}
      strokeWidth="1.75"
      strokeLinecap="round"
      fill="none"
      style={{ transition: `stroke ${fadeDurationMs}ms ease` }}
    />
    {/* Three angled rain drops */}
    {[5, 11, 17].map((x, i) => (
      <line
        key={i}
        x1={x + 1.5}
        y1={13.5 + i * 0.4}
        x2={x - 1.5}
        y2={21 + i * 0.4}
        stroke={active ? "var(--w-accent)" : "rgba(255,255,255,0.85)"}
        strokeWidth="1.65"
        strokeLinecap="round"
        style={{ transition: `stroke ${fadeDurationMs}ms ease` }}
      />
    ))}
  </svg>
);
