import React from "react";

// Patch-pocket glyph — rounded-bottom rectangle with a short stitched seam
// along the top. Flat top edge + rounded bottom keeps it from reading as a
// chevron or heart.
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
      {/* Pocket body: square top corners, rounded bottom */}
      <path
        d="M2.75 3h10.5v5.25a3.75 3.75 0 0 1-3.75 3.75H6.5A3.75 3.75 0 0 1 2.75 8.25V3Z"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Stitched seam */}
      <path
        d="M4.25 5.25h7.5"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray="1.6 1.7"
      />
    </svg>
  );
};
