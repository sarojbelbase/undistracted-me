/**
 * RSS Feed Settings panel — rendered inside BaseWidget's settings modal.
 *
 * Source mode (explicit):
 *   "presets"  — pick from curated preset feeds (default)
 *   "custom"   — upload your own JSON feed list
 *
 * These are mutually exclusive modes so the UX is unambiguous.
 */

import { useState, useRef } from "react";
import { PRESET_FEEDS, PRESET_CATEGORIES, DEFAULT_ACTIVE_IDS } from "./utils";
import { VIEW_MODES } from "./constants";
import { PillButton } from "../../components/ui/PillButton";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Upload, InfoCircle } from "react-bootstrap-icons";
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
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState(null);
  const [parseSuccess, setParseSuccess] = useState(null);
  const fileInputRef = useRef(null);

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
  const handleFileRead = async (file) => {
    if (!file) return;
    setParseError(null);
    setParseSuccess(null);

    let text;
    try {
      text = await file.text();
    } catch {
      setParseError("Could not read the file. Try again.");
      return;
    }

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (syntaxErr) {
      setParseError(`Invalid JSON — ${syntaxErr.message}`);
      return;
    }

    if (!Array.isArray(parsed)) {
      setParseError("Expected a JSON array at the root, e.g. [{…}, {…}]");
      return;
    }

    const feeds = parsed
      .filter((f) => f && typeof f.label === "string" && typeof f.url === "string")
      .map((f) => ({ label: f.label.trim(), url: f.url.trim(), active: true }));

    if (feeds.length === 0) {
      setParseError('No valid entries found. Each item needs "label" and "url" string fields.');
      return;
    }

    const existingUrls = new Set(customFeeds.map((f) => f.url));
    const merged = [
      ...customFeeds,
      ...feeds.filter((f) => !existingUrls.has(f.url)),
    ];
    onChangeCustomFeeds(merged);
    const added = feeds.filter((f) => !existingUrls.has(f.url)).length;
    const plural = added === 1 ? "" : "s";
    setParseSuccess(`${added} feed${plural} added`);
  };

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
                    Feeds from uploaded JSON
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

                {/* Divider + destructive replace action */}
                <div style={{ height: 1, background: "rgba(0,0,0,0.07)", marginTop: 2 }} />
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => { onChangeCustomFeeds([]); fileInputRef.current?.click(); }}
                  className="flex items-center gap-1.5 self-start cursor-pointer rounded-md"
                  style={{
                    fontSize: "0.6875rem", fontWeight: 500,
                    padding: "0.25rem 0.625rem",
                    color: "var(--w-danger, #ef4444)",
                    background: "color-mix(in srgb, var(--w-danger, #ef4444) 9%, transparent)",
                    border: "1px solid color-mix(in srgb, var(--w-danger, #ef4444) 22%, transparent)",
                    transition: "background 0.15s ease, border-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--w-danger, #ef4444) 15%, transparent)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "color-mix(in srgb, var(--w-danger, #ef4444) 9%, transparent)"; }}
                >
                  <Upload size={11} />
                  Replace with a new file
                </button>
              </>
            )}

            {/* Upload drop zone — shown when no feeds */}
            {customFeeds.length === 0 && (
              <>
                <button
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                  onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
                  onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
                  onDrop={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    setDragOver(false);
                    handleFileRead(e.dataTransfer.files?.[0]);
                  }}
                  className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl cursor-pointer w-full"
                  style={{
                    border: `1.5px dashed ${dragOver ? "var(--w-accent)" : "rgba(0,0,0,0.15)"}`,
                    background: dragOver ? "color-mix(in srgb, var(--w-accent) 5%, transparent)" : "rgba(0,0,0,0.02)",
                    transition: "border-color 0.15s ease, background 0.15s ease",
                  }}
                >
                  <Upload size={16} style={{ color: dragOver ? "var(--w-accent)" : "var(--w-ink-4)", transition: "color 0.15s ease", pointerEvents: "none" }} />
                  <p style={{ fontSize: "0.6875rem", color: "var(--w-ink-3)", textAlign: "center", lineHeight: 1.4, pointerEvents: "none" }}>
                    Drop <strong>.json</strong> here or{" "}
                    <span style={{ color: "var(--w-accent)", fontWeight: 600 }}>browse</span>
                  </p>
                </button>

                {/* Format example — code block */}
                <div
                  style={{
                    borderRadius: 8,
                    background: "rgba(0,0,0,0.05)",
                    border: "1px solid rgba(0,0,0,0.08)",
                    padding: "0.5rem 0.75rem",
                  }}
                >
                  <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--w-ink-5)", marginBottom: "0.35rem" }}>
                    Expected format
                  </p>
                  <pre
                    style={{
                      fontFamily: "ui-monospace, 'SF Mono', Menlo, Consolas, monospace",
                      fontSize: "0.6875rem",
                      lineHeight: 1.6,
                      color: "var(--w-ink-2)",
                      margin: 0,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                    }}
                  >{`[
  {
    "label": "Buy Me Momo",
    "url": "https://buymemomo.com/sarojbelbase"
  }
]`}</pre>
                </div>
              </>
            )}

            {/* Shared hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              tabIndex={-1}
              onChange={(e) => { handleFileRead(e.target.files?.[0]); e.target.value = ""; }}
            />

            {parseError && (
              <div
                style={{
                  borderRadius: 8,
                  background: "color-mix(in srgb, var(--w-danger) 8%, transparent)",
                  border: "1px solid color-mix(in srgb, var(--w-danger) 20%, transparent)",
                  padding: "0.5rem 0.75rem",
                }}
              >
                <p style={{ fontSize: "0.5625rem", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--w-danger)", marginBottom: "0.2rem" }}>
                  Could not read file
                </p>
                <p style={{ fontSize: "0.6875rem", color: "var(--w-danger)", lineHeight: 1.5, opacity: 0.85 }}>
                  {parseError}
                </p>
              </div>
            )}

            {parseSuccess && !parseError && (
              <p style={{ fontSize: "0.6875rem", color: "var(--w-success)", fontWeight: 500 }}>
                ✓ {parseSuccess}
              </p>
            )}
          </div>
        )}
      </div>

      <p className="text-[11px] leading-snug" style={{ color: "var(--w-ink-5)" }}>
        Headlines refresh every 30 minutes and are cached locally.
      </p>
    </div>
  );
};



