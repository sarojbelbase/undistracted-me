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
import { useRssMulti } from "./useRssMulti";
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
      className="relative px-3 py-2.5 w-full text-left cursor-pointer"
      style={{
        display: "block",
        boxShadow: hovered ? "inset 2px 0 0 var(--w-accent)" : "inset 2px 0 0 transparent",
        background: hovered ? "rgba(var(--w-accent-rgb), 0.04)" : "transparent",
        transition: "background 0.15s ease, box-shadow 0.15s ease",
        outline: "none",
        border: "none",
      }}
    >
      {/* Title — full width minus meta space, 2-line clamp */}
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
          paddingRight: "7rem",
        }}
      >
        {item.title}
      </p>

      {/* Meta — always visible at bottom-right, inline with last title line */}
      {(item.source || time) && (
        <span
          style={{
            position: "absolute",
            right: "12px",
            bottom: "10px",
            display: "flex",
            alignItems: "center",
            gap: "3px",
          }}
        >
          {item.source && (
            <span style={{ fontSize: "0.625rem", fontWeight: 700, color: "var(--w-accent)", opacity: 0.7, letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              {item.source}
            </span>
          )}
          {time && (
            <span style={{ fontSize: "0.625rem", color: "var(--w-ink-5)", whiteSpace: "nowrap" }}>
              {time}
            </span>
          )}
        </span>
      )}
    </button>
  );
};

// ─── Marquee mode — single full-bleed story card ──────────────────────────────

// Inline keyframes injected once
const MARQUEE_STYLES = `
@keyframes rss-card-in {
  from { opacity: 0; transform: scale(0.96); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes rss-text-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes rss-kenburns {
  from { transform: scale(1.08); }
  to   { transform: scale(1.0); }
}
`;
let _stylesInjected = false;
function ensureMarqueeStyles() {
  if (_stylesInjected) return;
  _stylesInjected = true;
  const el = document.createElement("style");
  el.textContent = MARQUEE_STYLES;
  document.head.appendChild(el);
}

const MarqueeCard = ({ item, index, total, progress, onPrev, onNext, onDotClick }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const hasImage = !!item?.image && !imgFailed;
  const time = item?.isoDate ? relativeTime(item.isoDate) : "";

  useEffect(() => { ensureMarqueeStyles(); }, []);

  // Reset img error state when the item changes
  useEffect(() => { setImgFailed(false); }, [item?.image]);

  // ── Gesture (drag to navigate) ────────────────────────────────────────────
  const startX = useRef(null);
  const dragged = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [releasing, setReleasing] = useState(false);

  const handlePointerDown = (e) => {
    // Don't capture gestures that start on interactive children (buttons, links)
    if (e.target.closest("button, a")) return;
    if (e.button !== 0 && e.pointerType !== "touch") return;
    startX.current = e.clientX;
    dragged.current = false;
    setReleasing(false);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    dragged.current = Math.abs(dx) > 6;
    // Rubber-band resistance: diminishing returns past ±60px
    const resistance = (v) => Math.sign(v) * (60 * (1 - Math.exp(-Math.abs(v) / 120)));
    setDragX(dragged.current ? resistance(dx) : 0);
  };

  const handlePointerUp = (e) => {
    if (startX.current === null) return;
    const dx = e.clientX - startX.current;
    startX.current = null;
    setReleasing(true);
    setDragX(0);
    if (Math.abs(dx) > 40) { dx < 0 ? onNext() : onPrev(); }
  };

  const handleClick = (e) => {
    if (e.target.closest("button, a")) return;
    if (dragged.current) return;
    if (item?.link) window.open(item.link, "_blank", "noopener");
  };

  if (!item) return null;

  return (
    <div
      className="absolute inset-0 select-none"
      style={{
        touchAction: "pan-y",
        cursor: "pointer",
        transform: dragX ? `translateX(${dragX}px) rotate(${dragX * 0.012}deg)` : "none",
        transition: releasing ? "transform 0.5s cubic-bezier(0.34, 1.4, 0.64, 1)" : "none",
        animation: "rss-card-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      role="article"
      aria-label={item.title}
    >
      {/* ── Background image / gradient ───────────────────────────────────── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {hasImage ? (
          <img
            src={item.image}
            alt=""
            aria-hidden
            draggable={false}
            onError={() => setImgFailed(true)}
            style={{
              width: "100%", height: "100%",
              objectFit: "cover", objectPosition: "center 20%",
              animation: "rss-kenburns 22s cubic-bezier(0.16, 1, 0.3, 1) both",
              transformOrigin: "center 30%",
            }}
          />
        ) : (
          <>
            {/* Rich accent gradient when no image */}
            <div style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(145deg, var(--w-accent) 0%, color-mix(in srgb, var(--w-accent) 60%, #000) 100%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse 90% 70% at 20% 10%, rgba(255,255,255,0.18) 0%, transparent 65%)",
            }} />
            <div style={{
              position: "absolute", inset: 0,
              background: "radial-gradient(ellipse 60% 50% at 80% 90%, rgba(0,0,0,0.35) 0%, transparent 70%)",
            }} />
          </>
        )}
      </div>

      {/* ── Deep scrim for text legibility ───────────────────────────────── */}
      <div style={{
        position: "absolute", inset: 0,
        background: hasImage
          ? "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 30%, rgba(0,0,0,0.1) 58%, transparent 80%)"
          : "linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 70%)",
      }} />

      {/* ── Top: source pill (left) · time (right) ───────────────────────── */}
      <div style={{
        position: "absolute", top: 10, left: 10, right: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        pointerEvents: "none",
        animation: "rss-text-up 0.45s 0.1s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
        {item.source && (
          <span style={{
            fontSize: "0.5rem",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,0.65)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            background: "rgba(255,255,255,0.1)",
            border: "1px solid rgba(255,255,255,0.12)",
            padding: "3px 7px",
            borderRadius: 999,
          }}>
            {item.source}
          </span>
        )}
        {time && (
          <span style={{
            fontSize: "0.5rem", fontWeight: 500,
            color: "rgba(255,255,255,0.4)",
            marginLeft: "auto",
          }}>
            {time}
          </span>
        )}
      </div>

      {/* ── Bottom: title + dot nav + progress bar ───────────────────────── */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        padding: "0 12px 14px",
        pointerEvents: "none",
        animation: "rss-text-up 0.5s 0.05s cubic-bezier(0.16, 1, 0.3, 1) both",
      }}>
        {/* Dynamic font: bigger for short titles, smaller for long ones */}
        {(() => {
          const words = (item.title || "").split(/\s+/).length;
          let fs = "0.9375rem";
          let clamp = 3;
          if (words <= 6) { fs = "1.375rem"; clamp = 2; }
          else if (words <= 10) { fs = "1.15rem"; clamp = 2; }
          return (
            <p style={{
              fontSize: fs,
              fontWeight: 800,
              lineHeight: 1.22,
              letterSpacing: "-0.022em",
              color: "#fff",
              display: "-webkit-box",
              WebkitLineClamp: clamp,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
              marginBottom: total > 1 ? 12 : 0,
              textShadow: hasImage ? "0 2px 14px rgba(0,0,0,0.65)" : "none",
            }}>
              {item.title}
            </p>
          );
        })()}

        {/* ── Dot nav + arrow buttons row ── */}
        {total > 1 && (
          <div
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              pointerEvents: "auto",
              gap: 6,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ← Prev */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onPrev(); }}
              aria-label="Previous story"
              style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer", color: "#fff", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M7.5 2L3.5 6L7.5 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {/* Pill dots */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {Array.from({ length: Math.min(total, 9) }).map((_, i) => (
                <button
                  key={`dot-${i}`}
                  type="button"
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); onDotClick(i); }}
                  aria-label={`Story ${i + 1} of ${total}`}
                  style={{
                    width: i === index ? 18 : 4,
                    height: 4,
                    borderRadius: 99,
                    background: i === index ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.3)",
                    transition: "width 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.2s",
                    border: "none", padding: 0, cursor: "pointer", flexShrink: 0,
                  }}
                />
              ))}
            </div>

            {/* → Next */}
            <button
              type="button"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onNext(); }}
              aria-label="Next story"
              style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(255,255,255,0.12)",
                backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer", color: "#fff", transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.22)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.12)"; }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M4.5 2L8.5 6L4.5 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Auto-advance progress sliver (absolute bottom edge) ───────────── */}
      {total > 1 && (
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, overflow: "hidden" }}>
          <div style={{
            height: "100%",
            background: "rgba(255,255,255,0.45)",
            width: `${progress}%`,
            transition: "width 0.12s linear",
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
  const isCustomMode = customFeeds.length > 0;

  // Always call both hooks (rules of hooks); pick the active result
  const singleResult = useRss(isCustomMode ? DEFAULT_FEED_ID : feedId);
  const multiResult = useRssMulti(isCustomMode ? customFeeds : []);
  const { items, loading, error, refreshedAt, refresh } = isCustomMode ? multiResult : singleResult;
  const ageLabel = useAgeLabel(refreshedAt);

  // Marquee navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  const displayItems = items.slice(0, isCustomMode ? 30 : 10);
  const showSkeleton = loading && items.length === 0;
  const showError = !!error && !showSkeleton;

  const sourceName = isCustomMode
    ? `${customFeeds.length} sources`
    : (PRESET_FEEDS.find((f) => f.id === feedId)?.label ??
      customFeeds.find((f) => f.url === feedId)?.label ??
      feedId);

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
