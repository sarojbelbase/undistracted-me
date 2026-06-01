/**
 * OPMLImport — inline panel for importing RSS feeds from OPML files.
 *
 * Two methods: file picker + paste text. Parses with DOMParser (native, zero deps).
 * Shows a preview with checkboxes before importing. Merges with existing custom
 * feeds, skipping duplicate URLs.
 */

import { useState, useRef, useCallback } from "react";
import { parseOPML } from "./opmlParser";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Upload, FileEarmarkArrowDown, Clipboard, ExclamationTriangle } from "react-bootstrap-icons";

const IMPORT_MODES = [
  { label: "File", value: "file" },
  { label: "Paste", value: "paste" },
];

/**
 * @param {object} props
 * @param {Array<{label:string, url:string, active:boolean}>} props.customFeeds
 * @param {(feeds: Array) => void} props.onChangeCustomFeeds
 */
export const OPMLImport = ({ customFeeds, onChangeCustomFeeds }) => {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("file");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState(null); // { feeds, error } | null
  const [selected, setSelected] = useState({});
  const fileRef = useRef(null);

  const reset = useCallback(() => {
    setParsed(null);
    setText("");
    setSelected({});
  }, []);

  const handleFile = useCallback(async (file) => {
    if (!file) return;
    reset();
    let content;
    try { content = await file.text(); }
    catch { setParsed({ feeds: [], error: "Could not read the file. Try again." }); return; }
    const result = parseOPML(content);
    setParsed(result);
    if (result.feeds.length) {
      setSelected(Object.fromEntries(result.feeds.map((f) => [f.url, true])));
    }
  }, [reset]);

  const handleParse = useCallback(() => {
    reset();
    if (!text.trim()) {
      setParsed({ feeds: [], error: "Paste OPML content above first." });
      return;
    }
    const result = parseOPML(text);
    setParsed(result);
    if (result.feeds.length) {
      setSelected(Object.fromEntries(result.feeds.map((f) => [f.url, true])));
    }
  }, [text, reset]);

  const toggleFeed = useCallback((url) => {
    setSelected((prev) => ({ ...prev, [url]: !prev[url] }));
  }, []);

  const toggleAll = useCallback(() => {
    if (!parsed?.feeds) return;
    const allSelected = parsed.feeds.every((f) => selected[f.url]);
    setSelected(Object.fromEntries(parsed.feeds.map((f) => [f.url, !allSelected])));
  }, [parsed, selected]);

  const handleImport = useCallback(() => {
    if (!parsed?.feeds?.length) return;
    const selectedUrls = new Set(
      Object.entries(selected).filter(([, v]) => v).map(([k]) => k)
    );
    const toImport = parsed.feeds.filter((f) => selectedUrls.has(f.url));
    if (!toImport.length) return;

    const existingUrls = new Set(customFeeds.map((f) => f.url));
    const newFeeds = toImport.filter((f) => !existingUrls.has(f.url) && f.valid);
    if (newFeeds.length) {
      onChangeCustomFeeds([
        ...customFeeds,
        ...newFeeds.map((f) => ({ label: f.label, url: f.url, active: true })),
      ]);
    }
    setOpen(false);
    reset();
  }, [parsed, selected, customFeeds, onChangeCustomFeeds, reset]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const hasSelection = selectedCount > 0;
  const allSelected = parsed?.feeds?.length > 0 && parsed.feeds.every((f) => selected[f.url]);
  const feedCount = parsed?.feeds?.length ?? 0;

  // ── Collapsed state ────────────────────────────────────────────────────
  if (!open) {
    return (
      <button
        type="button"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen(true)}
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
    );
  }

  // ── Expanded state ─────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-2.5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span style={{ fontSize: "0.625rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--w-ink-4)" }}>
          Import OPML
        </span>
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => { setOpen(false); reset(); }}
          style={{ fontSize: "0.625rem", fontWeight: 500, color: "var(--w-ink-4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          Cancel
        </button>
      </div>

      {/* Mode selector */}
      <SegmentedControl options={IMPORT_MODES} value={mode} onChange={(v) => { setMode(v); reset(); }} />

      {/* File mode */}
      {mode === "file" && !parsed && (
        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => fileRef.current?.click()}
          className="flex items-center justify-center gap-2 py-3 rounded-lg cursor-pointer w-full"
          style={{ border: "1.5px dashed rgba(0,0,0,0.15)", background: "rgba(0,0,0,0.02)", transition: "border-color 0.15s ease" }}
        >
          <Upload size={13} style={{ color: "var(--w-ink-4)" }} />
          <span style={{ fontSize: "0.6875rem", color: "var(--w-ink-3)" }}>
            Choose <strong>.opml</strong> or <strong>.xml</strong> file
          </span>
        </button>
      )}

      {/* Paste mode */}
      {mode === "paste" && !parsed && (
        <div className="flex flex-col gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste OPML XML content here..."
            rows={5}
            className="w-full resize-y"
            style={{
              border: "1px solid rgba(0,0,0,0.12)", borderRadius: 8, padding: "0.5rem 0.625rem",
              fontSize: "0.625rem", fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
              lineHeight: 1.5, outline: "none", background: "var(--card-bg)", color: "var(--w-ink-2)",
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = "var(--w-accent)"; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(0,0,0,0.12)"; }}
          />
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleParse}
            disabled={!text.trim()}
            className="flex items-center gap-1.5 self-start rounded-md"
            style={{
              fontSize: "0.6875rem", fontWeight: 500, padding: "0.25rem 0.625rem",
              color: text.trim() ? "var(--w-accent-fg)" : "var(--w-ink-5)",
              background: text.trim() ? "var(--w-accent)" : "rgba(0,0,0,0.06)",
              border: "1px solid transparent", cursor: text.trim() ? "pointer" : "default",
              transition: "opacity 0.15s ease", opacity: text.trim() ? 1 : 0.5,
            }}
          >
            <Clipboard size={11} />
            Parse OPML
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        accept=".opml,.xml,text/xml,application/xml"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
      />

      {/* Error state */}
      {parsed?.error && (
        <div style={{ borderRadius: 8, background: "color-mix(in srgb, var(--w-danger) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--w-danger) 20%, transparent)", padding: "0.5rem 0.75rem" }}>
          <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--w-danger)", marginBottom: "0.2rem" }}>
            Import failed
          </p>
          <p style={{ fontSize: "0.6875rem", color: "var(--w-danger)", lineHeight: 1.5, opacity: 0.85 }}>
            {parsed.error}
          </p>
        </div>
      )}

      {/* Preview: parsed feeds with checkboxes */}
      {feedCount > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--w-ink-4)" }}>
              {feedCount} feed{feedCount === 1 ? "" : "s"} found
            </span>
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={toggleAll}
              style={{ fontSize: "0.5625rem", fontWeight: 500, color: "var(--w-ink-4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
          </div>

          {/* Feed list */}
          <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto" style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)", padding: "0.25rem" }}>
            {parsed.feeds.map((feed) => {
              const isExisting = customFeeds.some((cf) => cf.url === feed.url);
              return (
                <label
                  key={feed.url}
                  className="flex items-center gap-2 cursor-pointer rounded-md"
                  style={{ padding: "0.25rem 0.5rem", opacity: isExisting ? 0.45 : 1, transition: "background 0.1s ease" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <input
                    type="checkbox"
                    checked={!!selected[feed.url]}
                    onChange={() => toggleFeed(feed.url)}
                    disabled={isExisting}
                    style={{ width: 13, height: 13, accentColor: "var(--w-accent)", flexShrink: 0, cursor: isExisting ? "default" : "pointer" }}
                  />
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <span style={{ fontSize: "0.6875rem", color: "var(--w-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {feed.label}
                    </span>
                    {!feed.valid && (
                      <ExclamationTriangle size={10} style={{ color: "var(--w-amber, #d97706)", flexShrink: 0 }} title="Invalid URL" />
                    )}
                    {isExisting && (
                      <span style={{ fontSize: "0.5625rem", color: "var(--w-ink-5)", flexShrink: 0 }}>already added</span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          {/* Import button */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleImport}
            disabled={!hasSelection}
            className="flex items-center gap-1.5 self-start rounded-md"
            style={{
              fontSize: "0.6875rem", fontWeight: 600, padding: "0.3rem 0.75rem",
              color: hasSelection ? "var(--w-accent-fg)" : "var(--w-ink-5)",
              background: hasSelection ? "var(--w-accent)" : "rgba(0,0,0,0.06)",
              border: "1px solid transparent", cursor: hasSelection ? "pointer" : "default",
              transition: "opacity 0.15s ease", opacity: hasSelection ? 1 : 0.5,
            }}
          >
            <Upload size={11} />
            Import {selectedCount} feed{selectedCount === 1 ? '' : 's'}
          </button>
        </div>
      )}
    </div>
  );
};
