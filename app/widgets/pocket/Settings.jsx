import { useRef } from "react";
import { Download, Upload } from "react-bootstrap-icons";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { Toggle } from "../../components/ui/Toggle";
import { Button } from "../../components/ui/Button";
import { Select } from "../../components/ui/Select";
import { snackbar } from "../../components/ui/Snackbar";
import { usePocket } from "./usePocket";
import { clearAll, exportJson, importJson, updatePrefs } from "./pocketStore";
import { liveFolders, storageSize, totalCount, formatBytes } from "./selectors";
import {
  DENSITY_OPTIONS,
  GROUP_BY_OPTIONS,
  PREVIEW_LENGTH_OPTIONS,
  WIDGET_ITEMS_OPTIONS,
} from "./constants";

const Section = ({ title, children }) => (
  <div className="flex flex-col gap-2.5">
    <span className="w-label">{title}</span>
    {children}
  </div>
);

const Helper = ({ children }) => (
  <span className="w-caption" style={{ color: "var(--w-ink-4)", marginTop: -2 }}>
    {children}
  </span>
);

/**
 * Settings — the Pocket settings body, rendered inside BaseSettingsModal (from
 * the ⋯ menu and the expanded header gear). All prefs live in pocket:meta
 * (chrome.storage.local) so the service worker can read them — not
 * useWidgetSettings. Changes apply right away.
 */
export function Settings() {
  const { items, folders, meta } = usePocket();
  const fileRef = useRef(null);
  const prefs = meta?.prefs || {};

  const set = (key, value) => updatePrefs({ [key]: value });
  const saved = totalCount(items);

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
      if (res.error) {
        snackbar("That file isn't a Pocket export. Choose a file you exported from Pocket.");
      } else {
        snackbar(`Imported ${res.added} saves.`);
      }
    };
    reader.onerror = () => snackbar("Couldn't read that file.");
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5 p-1">
      <Section title="Display">
        <SegmentedControl
          label="Group Saves By"
          options={GROUP_BY_OPTIONS}
          value={prefs.groupBy || "date"}
          onChange={(v) => set("groupBy", v)}
        />
        <Helper>How the Pocket window arranges your saves.</Helper>

        <SegmentedControl
          label="Row Spacing"
          options={DENSITY_OPTIONS}
          value={prefs.density || "comfortable"}
          onChange={(v) => set("density", v)}
        />

        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Show Site Icons</span>
          <Toggle
            checked={prefs.showSiteIcons !== false}
            onChange={(v) => set("showSiteIcons", v)}
            ariaLabel="Show site icons"
          />
        </div>

        <SegmentedControl
          label="Preview Length"
          options={PREVIEW_LENGTH_OPTIONS}
          value={prefs.previewLength || "medium"}
          onChange={(v) => set("previewLength", v)}
        />
        <Helper>How much of a paragraph or code block shows before Show more.</Helper>

        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Wrap Long Code Lines</span>
          <Toggle checked={!!prefs.wrapCode} onChange={(v) => set("wrapCode", v)} ariaLabel="Wrap long code lines" />
        </div>
      </Section>

      <Section title="Widget">
        <SegmentedControl
          label="Saves Shown in Widget"
          options={WIDGET_ITEMS_OPTIONS.map((n) => ({ label: String(n), value: String(n) }))}
          value={String(prefs.widgetItems ?? 5)}
          onChange={(v) => set("widgetItems", Number(v))}
        />
        <Helper>Newest first. The rest are in Pocket.</Helper>
      </Section>

      <Section title="Saving">
        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Show a Notice on the Page</span>
          <Toggle checked={prefs.pageNotice !== false} onChange={(v) => set("pageNotice", v)} ariaLabel="Show a notice on the page" />
        </div>
        <Helper>A small “Saved to Pocket” message with Undo.</Helper>

        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Ask Before Saving Pasted Text</span>
          <Toggle checked={prefs.askOnPaste !== false} onChange={(v) => set("askOnPaste", v)} ariaLabel="Ask before saving pasted text" />
        </div>
        <Helper>Pasting opens a quick prompt so you can pick the type and folder.</Helper>

        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Remove Tracking From Links</span>
          <Toggle checked={prefs.cleanLinks !== false} onChange={(v) => set("cleanLinks", v)} ariaLabel="Remove tracking from links" />
        </div>
        <Helper>Strips utm_ and similar parameters.</Helper>

        <div className="flex items-center justify-between">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Skip Duplicates</span>
          <Toggle checked={prefs.skipDuplicates !== false} onChange={(v) => set("skipDuplicates", v)} ariaLabel="Skip duplicates" />
        </div>
        <Helper>Saving the same text again moves it to the top.</Helper>

        <div className="flex flex-col gap-1.5">
          <span className="w-body" style={{ color: "var(--w-ink-2)" }}>Save New Items To</span>
          <Select
            value={prefs.defaultFolderId || ""}
            onChange={(e) => set("defaultFolderId", e.target.value || null)}
            aria-label="Save new items to"
          >
            <option value="">No folder</option>
            {liveFolders(folders)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
          </Select>
        </div>
      </Section>

      <div style={{ height: 1, background: "var(--w-divider)" }} />

      <Section title="Data">
        <div className="flex items-center gap-2">
          <Button variant="primary" size="sm" onClick={doExport}>
            <Download size={13} />
            Export JSON
          </Button>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()}>
            <Upload size={13} />
            Import JSON
          </Button>
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={onPickFile} />
        </div>
        <span className="w-caption" style={{ color: "var(--w-ink-4)" }}>
          {saved} saves · {formatBytes(storageSize(items, folders))} used on this device
        </span>
      </Section>

      <div style={{ height: 1, background: "var(--w-divider)" }} />

      <Section title="Reset">
        <ConfirmButton
          danger
          label="Delete all saves"
          onConfirm={() => clearAll()}
          className="um-btn um-btn--danger um-btn--sm"
          style={{ alignSelf: "flex-start" }}
        >
          Delete all saves…
        </ConfirmButton>
      </Section>

      <div className="w-caption" style={{ color: "var(--w-ink-5)" }}>
        Changes apply right away.
      </div>
      <div className="w-caption" style={{ color: "var(--w-ink-5)" }}>
        Pocket stores text only, on this device.
      </div>
    </div>
  );
}
