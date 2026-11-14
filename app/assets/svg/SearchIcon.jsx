import React from "react";

// Filled circle (BI radius 6.5) + wider handle line.
// Mask cuts the line flush at the circle edge → no alpha overlap.
export const SearchIcon = ({ size = 16, color = "currentColor" }) => {
  const id = React.useId().replace(/:/g, "");
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <mask id={`si-${id}`}>
          <rect width="16" height="16" fill="white" />
          <circle cx="6.5" cy="6.5" r="6.6" fill="black" />
        </mask>
      </defs>
      <circle cx="6.5" cy="6.5" r="6.5" />
      <line
        x1="10.8" y1="10.8" x2="15" y2="15"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        mask={`url(#si-${id})`}
      />
    </svg>
  );
};


