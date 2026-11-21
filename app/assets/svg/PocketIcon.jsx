import React from "react";

/**
 * Patch-pocket glyph: rounded-bottom pouch with a stitched seam. Renders a soft
 * accent-tinted fill inside the pouch plus an accent outline, two stitch "knots"
 * at the seam ends, so the mark reads as a crafted pocket. The pouch spans most
 * of the 16px viewBox so it matches the visual weight of the bootstrap-icons
 * glyphs (e.g. WalletFill) at the same size.
 *
 * The caller passes `color` (usually var(--w-accent)), so it stays accent-aware.
 */
export const PocketIcon = ({ size = 16, color = "currentColor", strokeWidth = 1.5 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Soft accent wash fill */}
      <path
        d="M2.25 2.75h11.5v5.5a4 4 0 0 1-4 4H6.25a4 4 0 0 1-4-4v-5.5Z"
        fill={color}
        fillOpacity={0.13}
      />
      {/* Pouch outline: square top corners, rounded bottom */}
      <path
        d="M2.25 2.75h11.5v5.5a4 4 0 0 1-4 4H6.25a4 4 0 0 1-4-4v-5.5Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stitched seam */}
      <path
        d="M3.75 5.25h8.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="1.6 1.9"
      />
      {/* Stitch knots at the seam ends */}
      <circle cx="3.75" cy="5.25" r="0.65" fill={color} />
      <circle cx="12.25" cy="5.25" r="0.65" fill={color} />
    </svg>
  );
};
