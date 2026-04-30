/**
 * RSS News Headlines Widget
 *
 * Continuous-flow feed: scrollable body, no hard dividers, ordinal row numbers,
 * left-accent hover indicator. Supports custom JSON-imported feeds alongside presets.
 */

import { useState } from "react";
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { useRss } from "./useRss";
import { Settings } from "./Settings";
import { relativeTime, PRESET_FEEDS, DEFAULT_FEED_ID } from "./utils";
import { useAgeLabel } from "../../hooks/useAgeLabel";
import { Rss, ArrowClockwise } from "react-bootstrap-icons";

// ── Skeleton bone ─────────────────────────────────────────────────────────────

const Bone = ({ w, h = "0.6875rem" }) => (
  <div
    className="animate-pulse rounded"
    style={{ width: w, height: h, backgroundColor: "rgba(0,0,0,0.06)", flexShrink: 0 }}
  />
);

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow = () => (
  <div className="flex gap-2.5 px-3 py-2.5">
    <Bone w="12px" />
    <div className="flex-1 flex flex-col gap-1.5">
      <Bone w="88%" />
      <Bone w="62%" />
      <Bone w="4rem" h="0.5rem" />
    </div>
  </div>
);

// ── Headline row ──────────────────────────────────────────────────────────────

const HeadlineRow = ({ item, index }) => {
  const [hovered, setHovered] = useState(false);
  const time = item.isoDate ? relativeTime(item.isoDate) : "";

  const handleOpen = () => {
    if (item.link) window.open(item.link, "_blank", "noopener");
  };

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={handleOpen}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex gap-2.5 px-3 py-2.5 w-full text-left cursor-pointer"
      style={{
        boxShadow: hovered ? "inset 2px 0 0 var(--w-accent)" : "inset 2px 0 0 transparent",
        background: hovered ? "rgba(var(--w-accent-rgb), 0.04)" : "transparent",
        transition: "background 0.15s ease, box-shadow 0.15s ease",
        outline: "none",
        border: "none",
      }}
    >
      {/* Ordinal */}
      <span
        className="shrink-0 tabular-nums font-semibold"
        style={{ fontSize: "0.5625rem", color: "var(--w-ink-6)", lineHeight: "1.375rem", minWidth: 12, textAlign: "right" }}
      >
        {index + 1}
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        {/* Title — 2-line clamp */}
        <p
          style={{
            fontSize: "0.78125rem",
            fontWeight: 600,
            color: "var(--w-ink-1)",
            lineHeight: 1.375,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {item.title}
        </p>
        {/* Meta: source · age */}
        <div className="flex items-center gap-1">
          {item.source && (
            <span style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--w-accent)", opacity: 0.65 }}>
              {item.source}
            </span>
          )}
          {item.source && time && (
            <span style={{ fontSize: "0.625rem", color: "var(--w-ink-6)" }}>·</span>
          )}
          {time && (
            <span style={{ fontSize: "0.625rem", color: "var(--w-ink-5)" }}>{time}</span>
          )}
        </div>
      </div>
    </button>
  );
};

// ── Error state ───────────────────────────────────────────────────────────────

const ErrorState = ({ onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
    <Rss size={20} style={{ color: "var(--w-ink-5)", opacity: 0.5 }} aria-hidden />
    <p className="w-muted font-semibold">Couldn't load feed</p>
    <button
      onClick={onRetry}
      onMouseDown={(e) => e.stopPropagation()}
      className="w-caption font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
      style={{ background: "var(--w-surface-2)", color: "var(--w-ink-3)", border: "1px solid rgba(0,0,0,0.1)" }}
    >
      Retry
    </button>
  </div>
);

// ── Widget ────────────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, {
    feedId: DEFAULT_FEED_ID,
    customFeeds: [],
  });
  const feedId = settings.feedId ?? DEFAULT_FEED_ID;
  const customFeeds = settings.customFeeds ?? [];

  const { items, loading, error, refreshedAt, refresh } = useRss(feedId);
  const ageLabel = useAgeLabel(refreshedAt);

  // Resolve display name: presets → custom feeds → raw feedId
  const sourceName =
    PRESET_FEEDS.find((f) => f.id === feedId)?.label ??
    customFeeds.find((f) => f.url === feedId)?.label ??
    feedId;

  const displayItems = items.slice(0, 15);
  const showSkeleton = loading && items.length === 0;
  const showError = !!error && !showSkeleton;

  const settingsContent = (onClose) => (
    <Settings
      feedId={feedId}
      onChangeFeedId={(id) => updateSetting("feedId", id)}
      customFeeds={customFeeds}
      onChangeCustomFeeds={(feeds) => updateSetting("customFeeds", feeds)}
      onClose={onClose}
    />
  );

  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsContent={settingsContent}
      settingsTitle="Feed Source"
      onRemove={onRemove}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <Rss
          size={13}
          style={{ color: "var(--w-accent)", flexShrink: 0 }}
          aria-hidden="true"
        />

        <span
          className="w-label font-semibold flex-1 truncate"
          style={{ color: "var(--w-ink-2)" }}
        >
          {sourceName}
        </span>

        {/* Refresh button + age */}
        <div className="flex items-center gap-1 shrink-0">
          {ageLabel && (
            <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>
              {ageLabel}
            </span>
          )}
          <button
            onClick={refresh}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={loading}
            aria-label={
              ageLabel ? `Refresh (last updated ${ageLabel})` : "Refresh feed"
            }
            className={`flex items-center justify-center p-0.5 rounded transition-opacity hover:opacity-70 active:opacity-40 ${loading ? "animate-spin" : ""}`}
            style={{
              color: "var(--w-ink-5)",
              background: "none",
              border: "none",
              cursor: "pointer",
            }}
          >
            <ArrowClockwise size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* ── Body — scrollable, no hard dividers ── */}
      <div
        className="flex-1 flex flex-col min-h-0 overflow-y-auto py-1"
        style={{ scrollbarWidth: "none" }}
      >
        {showError && <ErrorState onRetry={refresh} />}

        {showSkeleton && (
          <>{[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} />)}</>
        )}

        {!showSkeleton && !showError && displayItems.map((item, i) => (
          <HeadlineRow
            key={item.link || `${item.title}-${i}`}
            item={item}
            index={i}
          />
        ))}

        {!showSkeleton && !showError && displayItems.length === 0 && !loading && (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="w-caption" style={{ color: "var(--w-ink-5)" }}>No headlines available</p>
          </div>
        )}
      </div>
    </BaseWidget>
  );
};
