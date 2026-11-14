/**
 * Popup utility helpers — shared between PopupApp and its child components.
 */

/** Format seconds as MM:SS */
export const fmtPomo = (s) =>
  `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

/** Capitalize first letter */
export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
