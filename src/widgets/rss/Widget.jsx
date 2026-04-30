/**
 * RSS News Widget
 *
 * Two presentation modes:
 *  • Marquee – full-bleed cinematic card, one story at a time, auto-advances every 20 s.
 *              Swipe left/right (or drag) to navigate manually.
 *              Image feeds: dark-scrim overlay, white typography.
 *              No-image feeds: rich accent-gradient background, white typography.
 *
 *  • Brief   – compact numbered headline list, scrollable, accent left-bar on hover.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { useRss } from "./useRss";
import { Settings } from "./Settings";
import { relativeTime, PRESET_FEEDS, DEFAULT_FEED_ID } from "./utils";
import { AUTO_ADVANCE_MS } from "./constants";
import { useAgeLabel } from "../../hooks/useAgeLabel";
import { Rss, ArrowClockwise } from "react-bootstrap-icons";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Bone = ({ w, h = "0.6875rem" }) => (
  <div
    className="animate-pulse rounded"
    style={{ width: w, height: h, backgroundColor: "rgba(0,0,0,0.06)", flexShrink: 0 }}
  />
);

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

// ─── Brief mode — headline row ────────────────────────────────────────────────

const HeadlineRow = ({ item }) => {
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
      className="flex flex-col px-3 py-2.5 w-full text-left cursor-pointer gap-0.5"
      style={{
        boxShadow: hovered ? "inset 2px 0 0 var(--w-accent)" : "inset 2px 0 0 transparent",
        background: hovered ? "rgba(var(--w-accent-rgb), 0.04)" : "transparent",
        transition: "background 0.15s ease, box-shadow 0.15s ease",
        outline: "none",
        border: "none",
      }}
    >
      {/* Title — wraps naturally */}
      <p
        style={{
          fontSize: "0.78125rem",
          fontWeight: 600,
          color: "var(--w-ink-1)",
          lineHeight: 1.375,
        }}
      >
        {item.title}
      </p>

      {/* Meta: source + time — right-aligned */}
      <div className="flex items-center justify-end gap-1.5">
        {item.source && (
          <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--w-accent)", opacity: 0.7, letterSpacing: "0.02em" }}>
            {item.source}
          </span>
        )}
        {time && (
          <span style={{ fontSize: "0.625rem", color: "var(--w-ink-5)" }}>{time}</span>
        )}
      </div>
    </button>
  );
};

// ─── Marquee mode — single full-bleed story card ──────────────────────────────

const MarqueeCard = ({ item, index, total, progress, onPrev, onNext, onDotClick }) => {
  const hasImage = !!item?.image;
  const time = item?.isoDate ? relativeTime(item.isoDate) : "";

  // Swipe / drag gesture
  const startX = useRef(null);
  const dragged = useRef(false);
  const [dragX, setDragX] = useState(0);

  const handlePointerDown = (e) => {
    if (e.button !== 0 && e.pointerType !== "touch") return;
    startX.current = e.clientX;
    dragged.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    dragged.current = Math.abs(dx) > 8;
    setDragX(dragged.current ? dx : 0);
  };

  const handlePointerUp = (e) => {
    const dx = e.clientX - (startX.current ?? e.clientX);
    startX.current = null;
    setDragX(0);
    if (Math.abs(dx) > 44) { dx < 0 ? onNext() : onPrev(); }
  };

  const handleClick = () => {
    if (dragged.current) return;
    if (item?.link) window.open(item.link, "_blank", "noopener");
  };

  if (!item) return null;

  return (
    <div
      className="absolute inset-0 select-none animate-fade-in"
      style={{
        touchAction: "pan-y",
        transform: dragX ? `translateX(${dragX * 0.28}px)` : "none",
        transition: dragX ? "none" : "transform 0.22s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
        cursor: "pointer",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      role="article"
      aria-label={item.title}
    >
      {/* ── Background ─────────────────────────────────────────────────────── */}
      {hasImage ? (
        <img
          src={item.image}
          alt=""
          aria-hidden
          draggable={false}
          style={{
            position: "absolute", inset: 0,
            width: "100%", height: "100%",
            objectFit: "cover", objectPosition: "center 20%",
          }}
        />
      ) : (
        <>
          <div style={{ position: "absolute", inset: 0, background: "var(--w-accent)" }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(145deg, rgba(255,255,255,0.14) 0%, rgba(0,0,0,0.52) 100%)",
          }} />
          <div style={{
            position: "absolute", inset: 0,
            background: "radial-gradient(ellipse 80% 60% at 30% 20%, rgba(255,255,255,0.1) 0%, transparent 70%)",
          }} />
        </>
      )}

      {/* ── Scrim overlay ──────────────────────────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        background: hasImage
          ? "linear-gradient(to top, rgba(0,0,0,0.86) 0%, rgba(0,0,0,0.28) 48%, rgba(0,0,0,0.06) 75%)"
          : "linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 65%)",
      }} />

      {/* ── Top meta: source · age ─────────────────────────────────────────── */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        padding: "9px 11px 0",
        display: "flex", alignItems: "center", gap: 4,
        pointerEvents: "none",
      }}>
        {item.source && (
          <span style={{
            fontSize: "0.5625rem", fontWeight: 800,
            letterSpacing: "0.07em", textTransform: "uppercase",
            color: hasImage ? "rgba(255,255,255,0.52)" : "rgba(255,255,255,0.72)",
          }}>
            {item.source}
          </span>
        )}
        {item.source && time && (
          <span style={{ fontSize: "0.5rem", color: "rgba(255,255,255,0.3)", lineHeight: 1 }}>·</span>
        )}
        {time && (
          <span style={{
            fontSize: "0.5625rem", fontWeight: 500,
            color: hasImage ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.58)",
          }}>
            {time}
          </span>
        )}
      </div>

      {/* ── Bottom: title + dot nav ────────────────────────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 11px 10px",
        pointerEvents: "none",
      }}>
        <p style={{
          fontSize: "0.9375rem",
          fontWeight: 800,
          lineHeight: 1.26,
          letterSpacing: "-0.018em",
          color: "#fff",
          display: "-webkit-box",
          WebkitLineClamp: 3,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
          marginBottom: total > 1 ? 8 : 0,
          textShadow: hasImage ? "0 1px 8px rgba(0,0,0,0.55)" : "none",
        }}>
          {item.title}
        </p>

        {/* Dot indicators */}
        {total > 1 && (
          <div
            style={{ display: "flex", alignItems: "center", gap: 3, justifyContent: "center", pointerEvents: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            {Array.from({ length: Math.min(total, 8) }).map((_, i) => (
              <button
                key={i}
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onDotClick(i); }}
                aria-label={`Story ${i + 1} of ${total}`}
                style={{
                  width: i === index ? 14 : 4,
                  height: 3,
                  borderRadius: 2,
                  background: i === index ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.28)",
                  transition: "width 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s ease",
                  border: "none",
                  padding: 0,
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── 20 s countdown progress bar — absolute bottom edge ───────────── */}
      {total > 1 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2 }}>
          <div style={{
            height: "100%",
            background: "rgba(255,255,255,0.38)",
            width: `${progress}%`,
            transition: "width 0.15s linear",
            borderRadius: "0 1px 1px 0",
          }} />
        </div>
      )}
    </div>
  );
};

// ─── Marquee skeleton ─────────────────────────────────────────────────────────

const MarqueeSkeleton = () => (
  <div className="absolute inset-0 animate-pulse" style={{ background: "var(--w-surface-2)" }}>
    <div style={{ position: "absolute", top: 10, left: 11, display: "flex", gap: 4 }}>
      <div className="rounded" style={{ width: 48, height: 8, background: "rgba(0,0,0,0.09)" }} />
      <div className="rounded" style={{ width: 28, height: 8, background: "rgba(0,0,0,0.06)" }} />
    </div>
    <div style={{ position: "absolute", bottom: 18, left: 11, right: 11 }}>
      <div className="rounded mb-2" style={{ height: 14, width: "92%", background: "rgba(0,0,0,0.1)" }} />
      <div className="rounded mb-2" style={{ height: 14, width: "78%", background: "rgba(0,0,0,0.08)" }} />
      <div className="rounded" style={{ height: 14, width: "40%", background: "rgba(0,0,0,0.05)" }} />
    </div>
  </div>
);

// ─── Error state ──────────────────────────────────────────────────────────────

const ErrorState = ({ onRetry, absolute = false }) => (
  <div className={`flex flex-col items-center justify-center gap-2 p-4 text-center ${absolute ? "absolute inset-0" : "flex-1"}`}>
    <Rss size={20} style={{ color: "var(--w-ink-5)", opacity: 0.5 }} aria-hidden />
    <p className="w-muted font-semibold">Couldn't load feed</p>
    <button
      onClick={onRetry}
      onMouseDown={(e) => e.stopPropagation()}
      className="w-caption font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-70"
      style={{ background: "var(--w-surface-2)", color: "var(--w-ink-3)", border: "1px solid rgba(0,0,0,0.1)", cursor: "pointer" }}
    >
      Retry
    </button>
  </div>
);

// ─── Widget ───────────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, {
    feedId: DEFAULT_FEED_ID,
    customFeeds: [],
    viewMode: "marquee",
  });

  const feedId = settings.feedId ?? DEFAULT_FEED_ID;
  const customFeeds = settings.customFeeds ?? [];
  const viewMode = settings.viewMode ?? "marquee";

  const { items, loading, error, refreshedAt, refresh } = useRss(feedId);
  const ageLabel = useAgeLabel(refreshedAt);

  // Marquee navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const displayItems = items.slice(0, 10);
  const showSkeleton = loading && items.length === 0;
  const showError = !!error && !showSkeleton;

  const sourceName =
    PRESET_FEEDS.find((f) => f.id === feedId)?.label ??
    customFeeds.find((f) => f.url === feedId)?.label ??
    feedId;

  // Reset index when feed changes
  useEffect(() => { setCurrentIndex(0); }, [feedId]);

  // Clamp index when items load/shrink
  useEffect(() => {
    if (displayItems.length > 0 && currentIndex >= displayItems.length) setCurrentIndex(0);
  }, [displayItems.length, currentIndex]);

  // Auto-advance + progress bar for Marquee mode
  useEffect(() => {
    if (viewMode !== "marquee" || displayItems.length <= 1 || showSkeleton || showError) {
      setProgress(0);
      return;
    }
    setProgress(0);
    const start = Date.now();
    let advanced = false;

    const timer = setInterval(() => {
      if (advanced) return;
      const pct = Math.min(100, ((Date.now() - start) / AUTO_ADVANCE_MS) * 100);
      setProgress(pct);
      if (pct >= 100) {
        advanced = true;
        setCurrentIndex((prev) => (prev + 1) % displayItems.length);
      }
    }, 120);

    return () => clearInterval(timer);
  }, [currentIndex, viewMode, displayItems.length, showSkeleton, showError]);

  const goNext = useCallback(
    () => setCurrentIndex((i) => (i + 1) % displayItems.length),
    [displayItems.length],
  );
  const goPrev = useCallback(
    () => setCurrentIndex((i) => (i - 1 + displayItems.length) % displayItems.length),
    [displayItems.length],
  );

  const settingsContent = (onClose) => (
    <Settings
      feedId={feedId}
      onChangeFeedId={(v) => updateSetting("feedId", v)}
      customFeeds={customFeeds}
      onChangeCustomFeeds={(v) => updateSetting("customFeeds", v)}
      viewMode={viewMode}
      onChangeViewMode={(v) => updateSetting("viewMode", v)}
      onClose={onClose}
    />
  );

  // ── Marquee mode ────────────────────────────────────────────────────────────
  if (viewMode === "marquee") {
    return (
      <BaseWidget
        className="relative overflow-hidden"
        settingsContent={settingsContent}
        settingsTitle="News Feed"
        onRemove={onRemove}
      >
        {showSkeleton && <MarqueeSkeleton />}
        {showError && <ErrorState onRetry={refresh} absolute />}
        {!showSkeleton && !showError && displayItems.length > 0 && (
          <MarqueeCard
            key={currentIndex}
            item={displayItems[currentIndex]}
            index={currentIndex}
            total={displayItems.length}
            progress={progress}
            onNext={goNext}
            onPrev={goPrev}
            onDotClick={setCurrentIndex}
          />
        )}
        {!showSkeleton && !showError && displayItems.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="w-caption" style={{ color: "var(--w-ink-5)" }}>No headlines</p>
          </div>
        )}
      </BaseWidget>
    );
  }

  // ── Brief mode ──────────────────────────────────────────────────────────────
  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsContent={settingsContent}
      settingsTitle="News Feed"
      onRemove={onRemove}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <Rss size={13} style={{ color: "var(--w-accent)", flexShrink: 0 }} aria-hidden="true" />
        <span className="w-label font-semibold flex-1 truncate" style={{ color: "var(--w-ink-2)" }}>
          {sourceName}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {ageLabel && (
            <span className="w-caption" style={{ color: "var(--w-ink-5)" }}>{ageLabel}</span>
          )}
          <button
            onClick={refresh}
            onMouseDown={(e) => e.stopPropagation()}
            disabled={loading}
            aria-label={ageLabel ? `Refresh (last updated ${ageLabel})` : "Refresh feed"}
            className={`flex items-center justify-center p-0.5 rounded transition-opacity hover:opacity-70 active:opacity-40 ${loading ? "animate-spin" : ""}`}
            style={{ color: "var(--w-ink-5)", background: "none", border: "none", cursor: "pointer" }}
          >
            <ArrowClockwise size={12} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Body */}
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
