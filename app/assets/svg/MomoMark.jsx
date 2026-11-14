/**
 * MomoMark — a pleated, half-moon momo drawn in one line weight.
 * Bespoke mark for the support dialog (riso print style). Sized by its
 * `.sd-badge` container via CSS; the body path is tinted by `--momo-fill`.
 */
export const MomoMark = () => (
  <svg
    viewBox="0 0 48 40"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path
      className="sd-momo-body"
      d="M3 31C3 12 13 8 24 8s21 4 21 23c-6 3-36 3-42 0z"
    />
    <path d="M24 8v13M16.5 10.5l2.5 12M31.5 10.5L29 22.5M10 15l5 9M38 15l-5 9" />
  </svg>
);
