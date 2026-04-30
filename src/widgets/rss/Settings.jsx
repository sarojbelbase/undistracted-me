/**
 * RSS Feed Settings panel — rendered inside BaseWidget's settings modal.
 *
 * Props:
 *   feedId              – currently selected preset id or custom feed URL
 *   onChangeFeedId      – (id: string) => void
 *   customFeeds         – [{ label, url }] imported by user
 *   onChangeCustomFeeds – (feeds: [{ label, url }]) => void
 *   viewMode            – 'marquee' | 'brief'
 *   onChangeViewMode    – (mode: string) => void
 *   onClose             – () => void  (injected by BaseWidget)
 *
 * JSON format users upload:
 *   [{ "label": "My Blog", "url": "https://example.com/feed.xml" }]
 */

import { useState, useRef } from "react";
import { PRESET_FEEDS } from "./utils";
import { VIEW_MODES } from "./constants";
import { PillButton } from "../../components/ui/PillButton";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Upload, X, CheckCircleFill } from "react-bootstrap-icons";

export const Settings = ({
  feedId,
  onChangeFeedId,
  customFeeds = [],
  onChangeCustomFeeds,
  viewMode = "marquee",
  onChangeViewMode,
  onClose,
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [parseError, setParseError] = useState(null);
  const fileInputRef = useRef(null);

  const handleFileRead = async (file) => {
    if (!file) return;
    setParseError(null);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error("Root must be a JSON array");
      const feeds = parsed
        .filter((f) => f && typeof f.label === "string" && typeof f.url === "string")
        .map((f) => ({ label: f.label.trim(), url: f.url.trim() }));
      if (feeds.length === 0) throw new Error('No valid {"label","url"} entries found');
      onChangeCustomFeeds(feeds);
      onChangeFeedId(feeds[0].url);
    } catch (err) {
      setParseError(err.message);
    }
  };

  // handleDrop is inlined into the div's onDrop to avoid label-click interference

  const handleClear = () => {
    onChangeCustomFeeds([]);
    onChangeFeedId("hn");
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

      {/* ── Source selector ── */}
      <div className="flex flex-col gap-2">
        {customFeeds.length > 0 ? (
          /* ── JSON active mode ── */
          <>
            {/* Active badge */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircleFill size={11} style={{ color: "var(--w-success)" }} />
                <span style={{ fontSize: "0.6875rem", fontWeight: 600, color: "var(--w-ink-2)" }}>
                  JSON active
                </span>
                <span
                  style={{
                    fontSize: "0.5625rem",
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    color: "var(--w-success)",
                    background: "color-mix(in srgb, var(--w-success) 12%, transparent)",
                    padding: "1px 6px",
                    borderRadius: "999px",
                  }}
                >
                  {customFeeds.length} sources · mixed
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                onMouseDown={(e) => e.stopPropagation()}
                className="flex items-center gap-0.5 px-2 py-0.5 rounded-full cursor-pointer"
                style={{
                  fontSize: "0.625rem",
                  fontWeight: 600,
                  color: "var(--w-ink-4)",
                  background: "rgba(0,0,0,0.06)",
                  border: "1px solid rgba(0,0,0,0.08)",
                  transition: "opacity 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.6"; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
              >
                <X size={10} />
                Reset
              </button>
            </div>

            {/* Read-only source list */}
            <div
              className="rounded-xl flex flex-col"
              style={{
                border: "1px solid color-mix(in srgb, var(--w-success) 20%, transparent)",
                background: "color-mix(in srgb, var(--w-success) 4%, transparent)",
                overflow: "hidden",
              }}
            >
              {customFeeds.map((feed, i) => (
                <div
                  key={feed.url}
                  className="flex items-center gap-2 px-3"
                  style={{
                    paddingTop: "0.4rem",
                    paddingBottom: "0.4rem",
                    borderTop: i > 0 ? "1px solid color-mix(in srgb, var(--w-success) 12%, transparent)" : "none",
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: "50%",
                      flexShrink: 0,
                      background: "var(--w-success)",
                      opacity: 0.7,
                    }}
                  />
                  <span style={{ fontSize: "0.6875rem", color: "var(--w-ink-2)", fontWeight: 500 }}>
                    {feed.label}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* ── Preset mode ── */
          <>
            <span className="w-label" style={{ color: "var(--w-ink-3)" }}>Preset sources</span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_FEEDS.map((src) => {
                const isActive = feedId === src.id || feedId === src.url;
                return (
                  <PillButton
                    key={src.id}
                    active={isActive}
                    onClick={() => {
                      onChangeFeedId(src.id);
                      onClose?.();
                    }}
                  >
                    {src.label}
                  </PillButton>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Divider ── */}
      <div style={{ height: 1, background: "rgba(0,0,0,0.08)" }} />

      {/* ── JSON upload zone ── */}
      <div className="flex flex-col gap-2">
        <span className="w-label" style={{ color: "var(--w-ink-3)" }}>
          {customFeeds.length > 0 ? "Replace JSON" : "Import from JSON"}
        </span>

        <button
          type="button"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragEnter={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); }}
          onDrop={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(false); handleFileRead(e.dataTransfer.files?.[0]); }}
          className="flex flex-col items-center justify-center gap-2 py-5 rounded-xl cursor-pointer w-full"
          style={{
            border: `1.5px dashed ${dragOver ? "var(--w-accent)" : "rgba(0,0,0,0.15)"}`,
            background: dragOver ? "color-mix(in srgb, var(--w-accent) 5%, transparent)" : "rgba(0,0,0,0.02)",
            transition: "border-color 0.15s ease, background 0.15s ease",
          }}
        >
          <Upload
            size={16}
            style={{
              color: dragOver ? "var(--w-accent)" : "var(--w-ink-4)",
              transition: "color 0.15s ease",
              pointerEvents: "none",
            }}
          />
          <p style={{ fontSize: "0.6875rem", color: "var(--w-ink-3)", textAlign: "center", lineHeight: 1.4, pointerEvents: "none" }}>
            Drop <strong>.json</strong> here or{" "}
            <span style={{ color: "var(--w-accent)", fontWeight: 600 }}>browse</span>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => { handleFileRead(e.target.files?.[0]); e.target.value = ""; }}
          />
        </button>

        {parseError && (
          <p style={{ fontSize: "0.6875rem", color: "var(--w-danger)", lineHeight: 1.4 }}>
            {parseError}
          </p>
        )}

        <p style={{ fontSize: "0.625rem", color: "var(--w-ink-5)", lineHeight: 1.6 }}>
          Format:{" "}
          <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 4 }}>
            {'[{"label":"…","url":"…"}]'}
          </code>
        </p>
      </div>

      <p className="text-[11px] leading-snug" style={{ color: "var(--w-ink-5)" }}>
        Headlines refresh every 15 minutes and are cached locally.
      </p>
    </div>
  );
};
