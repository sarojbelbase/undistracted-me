/**
 * OPMLImport — one-click button that opens the native file picker for OPML import.
 * Does NOT render the preview — the parent handles parsing and preview display.
 */

import { useRef } from "react";
import { FileEarmarkArrowDown } from "react-bootstrap-icons";

/**
 * @param {object} props
 * @param {(file: File) => void} props.onFileSelected — called when user picks a file
 */
export const OPMLImport = ({ onFileSelected }) => {
  const fileRef = useRef(null);

  return (
    <>
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => fileRef.current?.click()}
        className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg font-semibold text-[12px] cursor-pointer transition-opacity hover:opacity-85"
        style={{
          background: "var(--w-accent)",
          color: "var(--w-accent-fg)",
          border: "none",
        }}
      >
        <FileEarmarkArrowDown size={12} />
        Import OPML
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".opml,.xml,text/xml,application/xml"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
    </>
  );
};
