/**
 * RSS News Headlines Widget
 *
 * Layout:
 *   ┌──────────────────────────────────┐
 *   │  [RSS icon]  Hacker News    ↻ 2m │  ← header
 *   ├──────────────────────────────────┤
 *   │  AI company raises $500M...      │
 *   │  Hacker News · 3h ago            │
 *   │  ─────────────────────────────── │
 *   │  New tool for terminal...        │
 *   │  Hacker News · 5h ago            │
 *   │  ...up to 5 headlines...         │
 *   └──────────────────────────────────┘
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

const Bone = ({ w, h = "0.75rem" }) => (
  <div
    className="animate-pulse rounded"
    style={{
      width: w,
      height: h,
      backgroundColor: "var(--panel-bg)",
      flexShrink: 0,
    }}
  />
);

// ── Skeleton row ──────────────────────────────────────────────────────────────

const SkeletonRow = ({ isLast }) => (
  <div
    className="px-3 py-3 flex flex-col gap-1.5"
    style={{ borderBottom: isLast ? "none" : "1px solid var(--card-border)" }}
  >
    <Bone w="90%" h="0.8125rem" />
    <Bone w="65%" h="0.8125rem" />
    <Bone w="5rem" h="0.625rem" />
  </div>
);

// ── Headline row ──────────────────────────────────────────────────────────────

const HeadlineRow = ({ item, isLast }) => {
  const [hovered, setHovered] = useState(false);

  const meta = [item.source, item.isoDate ? relativeTime(item.isoDate) : ""]
    .filter(Boolean)
    .join(" · ");

  const handleOpen = () => {
    if (item.link) window.open(item.link, "_blank", "noopener");
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleOpen}
      onKeyDown={(e) => e.key === "Enter" && handleOpen()}
      onMouseDown={(e) => e.stopPropagation()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="px-3 py-3 cursor-pointer flex flex-col gap-1"
      style={{
        borderBottom: isLast ? "none" : "1px solid var(--card-border)",
        background: hovered ? "rgba(var(--w-accent-rgb), 0.05)" : "transparent",
        transition: "background 0.12s ease",
        borderRadius: 8,
        outline: "none",
      }}
    >
      {/* Title — 2-line clamp */}
      <p
        className="w-label leading-snug"
        style={{
          color: "var(--w-ink-2)",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {item.title}
      </p>
      {/* Meta: source · age */}
      {meta && (
        <p className="w-caption truncate" style={{ color: "var(--w-ink-5)" }}>
          {meta}
        </p>
      )}
    </div>
  );
};

// ── Error state ───────────────────────────────────────────────────────────────

const ErrorState = ({ onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-4 text-center">
    <Rss
      size={20}
      style={{ color: "var(--w-ink-5)", opacity: 0.5 }}
      aria-hidden
    />
    <p className="w-muted font-semibold">Couldn't load feed</p>
    <button
      onClick={onRetry}
      onMouseDown={(e) => e.stopPropagation()}
      className="w-caption font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
      style={{
        background: "var(--w-surface-2)",
        color: "var(--w-ink-3)",
        border: "1px solid var(--card-border)",
      }}
    >
      Retry
    </button>
  </div>
);

// ── Widget ────────────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, {
    feedId: DEFAULT_FEED_ID,
  });
  const feedId = settings.feedId ?? DEFAULT_FEED_ID;

  const { items, loading, error, refreshedAt, refresh } = useRss(feedId);
  const ageLabel = useAgeLabel(refreshedAt);

  const sourceName = PRESET_FEEDS.find((f) => f.id === feedId)?.label ?? feedId;
  const displayItems = items.slice(0, 5);
  const showSkeleton = loading && items.length === 0;
  const showError = !!error && !showSkeleton;

  const settingsContent = (onClose) => (
    <Settings
      feedId={feedId}
      onChangeFeedId={(id) => updateSetting("feedId", id)}
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

      {/* ── Body ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Error state */}
        {showError && <ErrorState onRetry={refresh} />}

        {/* Loading skeleton */}
        {showSkeleton && (
          <>
            {[0, 1, 2, 3, 4].map((i) => (
              <SkeletonRow key={i} isLast={i === 4} />
            ))}
          </>
        )}

        {/* Headlines */}
        {!showSkeleton &&
          !showError &&
          displayItems.map((item, i) => (
            <HeadlineRow
              key={item.link || `${item.title}-${i}`}
              item={item}
              isLast={i === displayItems.length - 1}
            />
          ))}

        {/* Empty state (loaded but no items) */}
        {!showSkeleton &&
          !showError &&
          displayItems.length === 0 &&
          !loading && (
            <div className="flex-1 flex items-center justify-center p-4">
              <p className="w-caption" style={{ color: "var(--w-ink-5)" }}>
                No headlines available
              </p>
            </div>
          )}
      </div>
    </BaseWidget>
  );
};
