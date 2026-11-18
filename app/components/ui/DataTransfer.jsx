import { useRef, useState } from 'react';
import { Download, Upload, InfoCircle, FileEarmarkText, Trash3Fill } from 'react-bootstrap-icons';
import { Button } from './Button';
import { ConfirmButton } from './ConfirmButton';

/**
 * DataTransfer — the shared Import/Export block for settings "Data" sections.
 * Single source of truth for the import/export button pair, the sample-file
 * download ("examples"), the guidance note, the info tooltip, and the
 * destructive clear-all action, so every widget's Data section reads the same.
 *
 * Props:
 *   title        – section label (default "Data")
 *   infoTooltip  – hover tooltip on the header info icon (optional)
 *   importLabel  – import button label (e.g. "Import CSV")
 *   exportLabel  – export button label (e.g. "Export CSV")
 *   onImport(file) – receives the selected File (the input is reset after)
 *   onExport()   – export handler
 *   accept       – file input accept attribute (e.g. ".csv")
 *   importError  – inline error string to show (optional)
 *   note         – guidance note text shown in the callout (optional)
 *   sampleLabel  – sample-file download label (optional; enables the button)
 *   onSample()   – sample download handler (optional)
 *   clearLabel   – clear-all confirm/tooltip label (optional; enables the button)
 *   onClear()    – clear-all handler (optional)
 *   caption      – extra caption line below (optional)
 */
export const DataTransfer = ({
  title = 'Data',
  infoTooltip,
  importLabel,
  exportLabel,
  onImport,
  onExport,
  accept,
  importError,
  note,
  sampleLabel,
  onSample,
  clearLabel,
  onClear,
  caption,
}) => {
  const fileRef = useRef(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onImport(file);
  };

  const showFooter = Boolean((sampleLabel && onSample) || (clearLabel && onClear));

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header */}
      <div className="um-dt__header">
        <span className="w-label">{title}</span>
        {infoTooltip && (
          <button
            type="button"
            className="um-dt__info"
            aria-label={infoTooltip}
            onMouseEnter={() => setShowInfo(true)}
            onMouseLeave={() => setShowInfo(false)}
          >
            <InfoCircle size={13} />
            {showInfo && <span className="um-dt__tooltip">{infoTooltip}</span>}
          </button>
        )}
      </div>

      {/* Import / Export */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          style={{ flex: 1 }}
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={13} />
          {importLabel}
        </Button>
        <Button
          variant="primary"
          size="sm"
          style={{ flex: 1 }}
          onClick={onExport}
        >
          <Download size={13} />
          {exportLabel}
        </Button>
      </div>

      {/* Inline import error */}
      {importError && <div className="um-dt__error">{importError}</div>}

      {/* Guidance note */}
      {note && (
        <div className="um-dt__callout">
          <InfoCircle size={13} className="um-dt__callout-icon" />
          <p className="um-dt__callout-text">{note}</p>
        </div>
      )}

      {/* Footer: sample + clear-all */}
      {showFooter && (
        <div className="um-dt__footer">
          {sampleLabel && onSample && (
            <button type="button" className="um-dt__sample" onClick={onSample}>
              <FileEarmarkText size={11} />
              {sampleLabel}
            </button>
          )}
          {sampleLabel && onSample && clearLabel && onClear && (
            <span className="um-dt__pipe">|</span>
          )}
          {clearLabel && onClear && (
            <ConfirmButton
              danger
              label={clearLabel}
              onConfirm={onClear}
              className="text-[11px] font-semibold"
            >
              <Trash3Fill size={10} />
              Clear All
            </ConfirmButton>
          )}
        </div>
      )}

      {/* Extra caption (e.g. storage usage) */}
      {caption && (
        <span className="w-caption" style={{ color: 'var(--w-ink-4)' }}>
          {caption}
        </span>
      )}

      <input
        ref={fileRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="um-dt__file"
      />
    </div>
  );
};
