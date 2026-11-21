/**
 * OPMLImport: one-click button that opens the native file picker for OPML import.
 * Does NOT render the preview: the parent handles parsing and preview display.
 */

import { useRef } from "react";
import { FileEarmarkArrowDown } from "react-bootstrap-icons";
import { Button } from "../../components/ui/Button";

/**
 * @param {object} props
 * @param {(file: File) => void} props.onFileSelected: called when user picks a file
 */
export const OPMLImport = ({ onFileSelected }) => {
  const fileRef = useRef(null);

  return (
    <>
      <Button
        variant="primary"
        size="md"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => fileRef.current?.click()}
        style={{ flex: 1 }}
      >
        <FileEarmarkArrowDown size={13} />
        Import OPML
      </Button>
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
