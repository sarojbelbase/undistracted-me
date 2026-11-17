import { useRef, useState } from "react";
import { Download, Upload } from "react-bootstrap-icons";

import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { Toggle } from "../../components/ui/Toggle";
import { usePocket } from "./usePocket";
import { clearAll, exportJson, importJson, updatePrefs } from "./pocketStore";

const sectionHeader = {
  fontSize: "0.5625rem",
  fontWeight: 600,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "var(--w-ink-5)",
};

const primaryBtn = {
  background: "var(--w-accent)",
  color: "var(--w-accent-fg)",
  border: "none",
  height: 36,
  borderRadius: 8,
  fontSize: "12px",
  fontWeight: 600,
  padding: "0 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

const secondaryBtn = {
  background: "var(--panel-bg)",
  color: "var(--w-ink-2)",
  border: "1px solid var(--card-border)",
  height: 36,
  borderRadius: 8,
  fontSize: "12px",
  fontWeight: 600,
  padding: "0 12px",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
};

/**
 * Settings — Pocket settings menu body, rendered inside BaseWidget's
 * BaseSettingsModal. Default tab, site icons, export/import JSON, clear all.
 */
export function Settings() {
  const { meta, items } = usePocket();
  const fileRef = useRef(null);
  const [importResult, setImportResult] = useState(null);

  const prefs = meta?.prefs || {};
  const defaultTab = prefs.defaultTab || "recent";

  const doExport = () => {
    const blob = new Blob([exportJson()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pocket.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const onPickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importJson(reader.result);
      setImportResult(res?.error || `Imported ${res.added} items`);
    };
    reader.onerror = () => setImportResult("Could not read that file");
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="flex flex-col gap-2">
        <span style={sectionHeader}>View</span>
        <SegmentedControl
          label="Default tab"
          options={[
            { label: "Recent", value: "recent" },
            { label: "All", value: "all" },
            { label: "Sites", value: "sites" },
          ]}
          value={defaultTab}
          onChange={(v) => updatePrefs({ defaultTab: v })}
        />
        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>
            Show site icons
          </span>
          <Toggle
            checked={prefs.showFavicons !== false}
            onChange={(v) => updatePrefs({ showFavicons: v })}
            ariaLabel="Show site icons"
          />
        </div>
      </div>

      <div style={{ height: 1, background: "var(--w-divider)" }} />

      <div className="flex flex-col gap-2">
        <span style={sectionHeader}>Data</span>
        <div className="flex items-center gap-2">
          <button type="button" style={primaryBtn} onClick={doExport}>
            <Download size={13} />
            Export Pocket (JSON)
          </button>
          <button type="button" style={secondaryBtn} onClick={() => fileRef.current?.click()}>
            <Upload size={13} />
            Import Pocket (JSON)
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={onPickFile}
          />
        </div>
        {importResult && (
          <span className="w-caption">{importResult}</span>
        )}
      </div>

      <div style={{ height: 1, background: "var(--w-divider)" }} />

      <div className="flex flex-col gap-2">
        <span style={sectionHeader}>Reset</span>
        <ConfirmButton
          danger
          label="Delete everything in Pocket? This can't be undone."
          onConfirm={() => clearAll()}
          style={{ alignSelf: "flex-start" }}
        >
          Clear all saves
        </ConfirmButton>
        <span className="w-caption">
          {items.filter((i) => !i.deletedAt).length} saved
        </span>
      </div>

      <div className="w-caption" style={{ color: "var(--w-ink-5)" }}>
        Pocket stores text only, on this device.
      </div>
    </div>
  );
}
