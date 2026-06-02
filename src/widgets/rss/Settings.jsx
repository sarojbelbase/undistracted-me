/**
 * RSS Feed Settings panel — rendered inside BaseWidget's settings modal.
 *
 * Source mode (explicit):
 *   "presets"  — pick from curated preset feeds (default)
 *   "custom"   — manage your own feeds via OPML import/export
 *
 * These are mutually exclusive modes so the UX is unambiguous.
 */

import { useState, useCallback } from "react";
import { PRESET_FEEDS, PRESET_CATEGORIES, DEFAULT_ACTIVE_IDS } from "./utils";
import { VIEW_MODES } from "./constants";
import { OPMLImport } from "./OPMLImport";
import { parseOPML, generateOPML, generateSampleOPML, downloadFile } from "./opmlParser";
import { PillButton } from "../../components/ui/PillButton";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ConfirmButton } from "../../components/ui/ConfirmButton";
import { Download, InfoCircle, FileEarmarkArrowDown, Upload, ExclamationTriangle } from "react-bootstrap-icons";
import { TooltipBtn } from "../../components/ui/TooltipBtn";

const SOURCE_MODES = [
  { label: "Presets", value: "presets" },
  { label: "Custom", value: "custom" },
];

export const Settings = ({
  activeFeedIds = DEFAULT_ACTIVE_IDS,
  onChangeActiveFeedIds,
  customFeeds = [],
  onChangeCustomFeeds,
  sourceMode = "presets",
  onChangeSourceMode,
  viewMode = "marquee",
  onChangeViewMode,
  onClose: _onClose,
}) => {
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  // ── OPML import state (lifted from OPMLImport so preview renders full-width) ──
  const [parsed, setParsed] = useState(null);   // { feeds, error } | null
  const [selected, setSelected] = useState({});

  const resetImport = useCallback(() => { setParsed(null); setSelected({}); }, []);

  const handleFileSelected = useCallback(async (file) => {
    if (!file) return;
    resetImport();
    let content;
    try { content = await file.text(); }
    catch { setParsed({ feeds: [], error: "Could not read the file. Try again." }); return; }
    const result = parseOPML(content);
    setParsed(result);
    if (result.feeds.length) {
      setSelected(Object.fromEntries(result.feeds.map((f) => [f.url, true])));
    }
  }, [resetImport]);

  const toggleParsedFeed = useCallback((url) => {
    setSelected((prev) => ({ ...prev, [url]: !prev[url] }));
  }, []);

  const toggleAllParsed = useCallback(() => {
    if (!parsed?.feeds) return;
    const allSelected = parsed.feeds.every((f) => selected[f.url]);
    setSelected(Object.fromEntries(parsed.feeds.map((f) => [f.url, !allSelected])));
  }, [parsed, selected]);

  const handleImportParsed = useCallback(() => {
    if (!parsed?.feeds?.length) return;
    const selectedUrls = new Set(Object.entries(selected).filter(([, v]) => v).map(([k]) => k));
    const toImport = parsed.feeds.filter((f) => selectedUrls.has(f.url));
    if (!toImport.length) return;
    const existingUrls = new Set(customFeeds.map((f) => f.url));
    const newFeeds = toImport.filter((f) => !existingUrls.has(f.url) && f.valid);
    if (newFeeds.length) {
      onChangeCustomFeeds([...customFeeds, ...newFeeds.map((f) => ({ label: f.label, url: f.url, active: true }))]);
    }
    resetImport();
  }, [parsed, selected, customFeeds, onChangeCustomFeeds, resetImport]);

  const selectedCount = Object.values(selected).filter(Boolean).length;
  const allSelected = parsed?.feeds?.length > 0 && parsed.feeds.every((f) => selected[f.url]);
  const feedCount = parsed?.feeds?.length ?? 0;

  // ── Export OPML ──────────────────────────────────────────────────────────
  const handleExportOPML = () => {
    if (!customFeeds.length) return;
    const content = generateOPML(customFeeds);
    downloadFile(content, `rss_feeds_${new Date().toISOString().slice(0, 10)}.opml`, 'text/xml');
  };

  // ── Sample OPML ─────────────────────────────────────────────────────────
  const handleSampleOPML = () => {
    const content = generateSampleOPML();
    downloadFile(content, 'sample_feeds.opml', 'text/xml');
  };

  // ── Clear all custom feeds ──────────────────────────────────────────────
  const handleClearAll = () => {
    onChangeCustomFeeds([]);
  };

  // ── Preset toggle ──────────────────────────────────────────────────────────
  const togglePreset = (id) => {
    const next = activeFeedIds.includes(id)
      ? activeFeedIds.filter((x) => x !== id)
      : [...activeFeedIds, id];
    if (next.length === 0) return;
    onChangeActiveFeedIds(next);
  };

  // ── Custom feed toggle ────────────────────────────────────────────────────
  const toggleCustom = (url) => {
    onChangeCustomFeeds(
      customFeeds.map((f) => (f.url === url ? { ...f, active: !f.active } : f)),
    );
  };

  // ── JSON import ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4 p-1">
      {/* ── Layout / view mode ── */}
      <SegmentedControl
        label="Layout"
        options={VIEW_MODES}
        value={viewMode}
        onChange={onChangeViewMode}
      />

      {/* ── Source mode selector ── */}
      <div className="flex flex-col gap-3">
        <SegmentedControl
          label="Sources"
          options={SOURCE_MODES}
          value={sourceMode}
          onChange={onChangeSourceMode}
        />

        {/* ── PRESETS panel ── */}
        {sourceMode === "presets" && (
          <div className="flex flex-col gap-3">
            {PRESET_CATEGORIES.map((cat) => {
              const feeds = PRESET_FEEDS.filter((f) => f.category === cat.id);
              return (
                <div key={cat.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-1">
                    <span
                      style={{
                        fontSize: "0.5625rem",
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--w-ink-5)",
                      }}
                    >
                      {cat.label}
                    </span>
                    {cat.id === PRESET_CATEGORIES[0].id && (
                      <TooltipBtn
                        tooltip="Click a chip to toggle that source on or off"
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{ background: "none", border: "none", padding: 0, cursor: "default", display: "flex", alignItems: "center", color: "var(--w-ink-6)" }}
                      >
                        <InfoCircle size={9} />
                      </TooltipBtn>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {feeds.map((src) => (
                      <PillButton
                        key={src.id}
                        variant="chip"
                        active={activeFeedIds.includes(src.id)}
                        onClick={() => togglePreset(src.id)}
                      >
                        {src.label}
                      </PillButton>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── CUSTOM panel ── */}
        {sourceMode === "custom" && (
          <div className="flex flex-col gap-3">
            {/* Feed chips — same style as presets, click to toggle */}
            {customFeeds.length > 0 && (
              <>
                <div className="flex items-center gap-1">
                  <p style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--w-ink-5)" }}>
                    Your feeds
                  </p>
                  <TooltipBtn
                    tooltip="Click a chip to enable or disable that feed"
                    type="button"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ background: "none", border: "none", padding: 0, cursor: "default", display: "flex", alignItems: "center", color: "var(--w-ink-6)" }}
                  >
                    <InfoCircle size={9} />
                  </TooltipBtn>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {customFeeds.map((feed) => (
                    <PillButton
                      key={feed.url}
                      variant="chip"
                      active={feed.active !== false}
                      onClick={() => toggleCustom(feed.url)}
                    >
                      {feed.label}
                    </PillButton>
                  ))}
                </div>
              </>
            )}

            {/* Empty state — shown when no feeds */}
            {customFeeds.length === 0 && (
              <div
                style={{
                  borderRadius: 8,
                  background: "rgba(0,0,0,0.02)",
                  border: "1px dashed rgba(0,0,0,0.12)",
                  padding: "1.25rem 1rem",
                  textAlign: "center",
                }}
              >
                <p style={{ fontSize: "0.6875rem", color: "var(--w-ink-4)", lineHeight: 1.5 }}>
                  No custom feeds yet. Import an OPML file to get started.
                </p>
              </div>
            )}

            {/* ── Divider ─────────────────────────────────────────────── */}
            <div style={{ height: 1, background: "rgba(0,0,0,0.07)" }} />

            {/* ── Data section (matching expense tracker pattern) ──────── */}
            <div className="flex flex-col gap-2.5">
              {/* Header with disclaimer tooltip */}
              <div className="flex items-center justify-between">
                <span className="w-label">Data</span>
                <button
                  type="button"
                  className="relative flex items-center"
                  onMouseEnter={() => setShowDisclaimer(true)}
                  onMouseLeave={() => setShowDisclaimer(false)}
                  aria-label="Import info"
                  style={{ background: "none", border: "none", padding: 0, cursor: "default" }}
                >
                  <InfoCircle size={13} style={{ color: "var(--w-ink-4)" }} />
                  {showDisclaimer && (
                    <div
                      className="absolute right-0 top-full mt-1.5 w-52 rounded-lg px-3 py-2 text-[10px] font-medium leading-relaxed shadow-lg z-20"
                      style={{
                        background: "var(--card-bg)",
                        backdropFilter: "var(--card-blur)",
                        WebkitBackdropFilter: "var(--card-blur)",
                        border: "1px solid var(--card-border)",
                        color: "var(--w-ink-3)",
                      }}
                    >
                      OPML is the standard format for RSS feed readers. Import lets you preview and pick which feeds to add. Export first to keep a backup.
                    </div>
                  )}
                </button>
              </div>

              {/* Button row: Export OPML + Import OPML */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleExportOPML}
                  disabled={!customFeeds.length}
                  className="flex-1 flex items-center justify-center gap-1.5 h-9 rounded-lg font-semibold text-[12px] cursor-pointer transition-opacity hover:opacity-85"
                  style={{
                    background: "var(--w-accent)",
                    color: "var(--w-accent-fg)",
                    border: "none",
                    opacity: customFeeds.length ? 1 : 0.45,
                  }}
                >
                  <Download size={12} />
                  Export OPML
                </button>
                <OPMLImport onFileSelected={handleFileSelected} />
              </div>

              {/* ── Import preview (full-width, below buttons) ──────────── */}
              {parsed?.error && (
                <div style={{ borderRadius: 8, background: "color-mix(in srgb, var(--w-danger) 8%, transparent)", border: "1px solid color-mix(in srgb, var(--w-danger) 20%, transparent)", padding: "0.5rem 0.75rem" }}>
                  <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--w-danger)", marginBottom: "0.2rem" }}>Import failed</p>
                  <p style={{ fontSize: "0.6875rem", color: "var(--w-danger)", lineHeight: 1.5, opacity: 0.85 }}>{parsed.error}</p>
                </div>
              )}

              {feedCount > 0 && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span style={{ fontSize: "0.5625rem", fontWeight: 600, letterSpacing: "0.05em", textTransform: "uppercase", color: "var(--w-ink-4)" }}>
                      {feedCount} feed{feedCount === 1 ? "" : "s"} found
                    </span>
                    <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={toggleAllParsed}
                      style={{ fontSize: "0.5625rem", fontWeight: 500, color: "var(--w-ink-4)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {allSelected ? "Deselect all" : "Select all"}
                    </button>
                  </div>
                  <div className="flex flex-col gap-0.5 max-h-36 overflow-y-auto" style={{ borderRadius: 8, border: "1px solid rgba(0,0,0,0.08)", background: "rgba(0,0,0,0.02)", padding: "0.25rem" }}>
                    {parsed.feeds.map((feed) => {
                      const isExisting = customFeeds.some((cf) => cf.url === feed.url);
                      return (
                        <label key={feed.url} className="flex items-center gap-2 cursor-pointer rounded-md"
                          style={{ padding: "0.25rem 0.5rem", opacity: isExisting ? 0.45 : 1, transition: "background 0.1s ease" }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.04)"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}>
                          <input type="checkbox" checked={!!selected[feed.url]} onChange={() => toggleParsedFeed(feed.url)} disabled={isExisting}
                            style={{ width: 13, height: 13, accentColor: "var(--w-accent)", flexShrink: 0, cursor: isExisting ? "default" : "pointer" }} />
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            <span style={{ fontSize: "0.6875rem", color: "var(--w-ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{feed.label}</span>
                            {!feed.valid && <ExclamationTriangle size={10} style={{ color: "var(--w-amber, #d97706)", flexShrink: 0 }} title="Invalid URL" />}
                            {isExisting && <span style={{ fontSize: "0.5625rem", color: "var(--w-ink-5)", flexShrink: 0 }}>already added</span>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                  <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={handleImportParsed} disabled={selectedCount === 0}
                    className="flex items-center gap-1.5 self-start rounded-md"
                    style={{
                      fontSize: "0.6875rem", fontWeight: 600, padding: "0.3rem 0.75rem",
                      color: selectedCount > 0 ? "var(--w-accent-fg)" : "var(--w-ink-5)",
                      background: selectedCount > 0 ? "var(--w-accent)" : "rgba(0,0,0,0.06)",
                      border: "1px solid transparent", cursor: selectedCount > 0 ? "pointer" : "default",
                      transition: "opacity 0.15s ease", opacity: selectedCount > 0 ? 1 : 0.5
                    }}>
                    <Upload size={11} />
                    Import {selectedCount} feed{selectedCount === 1 ? "" : "s"}
                  </button>
                </div>
              )}

              {/* Guidance callout */}
              <div
                className="rounded-lg px-3 py-2.5 flex items-start gap-2"
                style={{ background: "color-mix(in srgb, var(--w-ink-1) 3%, transparent)" }}
              >
                <InfoCircle size={13} style={{ color: "var(--w-ink-4)", flexShrink: 0, marginTop: 0.5 }} />
                <p className="text-[10px] font-medium leading-relaxed" style={{ color: "var(--w-ink-3)" }}>
                  OPML is the universal format for sharing RSS feed subscriptions between readers. Import from Feedly, NetNewsWire, or use an online OPML generator to bring in your favourite news sites and podcasts. Download a sample below to see the expected format.
                </p>
              </div>

              {/* Footer actions */}
              <div
                className="flex items-center justify-center rounded-lg px-3 py-2 gap-3 flex-wrap"
                style={{ background: "rgba(0,0,0,0.02)" }}
              >
                <button
                  type="button"
                  onClick={handleSampleOPML}
                  className="flex items-center gap-1.5 text-[11px] font-semibold cursor-pointer transition-opacity hover:opacity-70"
                  style={{ color: "var(--w-ink-3)", background: "none", border: "none" }}
                >
                  <FileEarmarkArrowDown size={11} />
                  Sample OPML
                </button>
                {customFeeds.length > 0 && (
                  <>
                    <span className="text-[11px] font-medium" style={{ color: "var(--w-ink-5)" }}>|</span>
                    <ConfirmButton onConfirm={handleClearAll} label="Clear all feeds" danger className="text-[11px] font-semibold">
                      Clear All
                    </ConfirmButton>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="text-[11px] leading-snug" style={{ color: "var(--w-ink-5)" }}>
        Headlines refresh every 30 minutes and are cached locally.
      </p>
    </div>
  );
};



