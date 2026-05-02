/**
 * RSS News Widget
 *
 * Two presentation modes:
 *  • Spotlight – full-bleed cinematic card, one story at a time, auto-advances every 20 s.
 *                Swipe left/right (or drag) to navigate manually.
 *                Image feeds: dark-scrim overlay, white typography.
 *                No-image feeds: rich accent-gradient background, white typography.
 *
 *  • Digest   – compact numbered headline list, scrollable, accent left-bar on hover.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { useRss } from "./useRss";
import { useRssMulti } from "./useRssMulti";
import { Settings } from "./Settings";
import { relativeTime, PRESET_FEEDS, DEFAULT_FEED_ID, DEFAULT_ACTIVE_IDS } from "./utils";
import { AUTO_ADVANCE_MS } from "./constants";
import { useAgeLabel } from "../../hooks/useAgeLabel";
import { ExpressiveTitle } from "../../utilities/expressifyText.jsx";
import { Broadcast, ArrowClockwise } from "react-bootstrap-icons";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Bone = ({ w, h = "0.6875rem" }) => (
  <div
    className="animate-pulse rounded"
    style={{ width: w, height: h, backgroundColor: "rgba(0,0,0,0.06)", flexShrink: 0 }}
  />
);

const SkeletonRow = ({ isLast = false }) => (
  <div style={{
    padding: "10px 14px 9px",
    borderBottom: isLast ? "none" : "1px solid rgba(0,0,0,0.052)",
  }}>
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <Bone w="91%" h="0.72rem" />
      <Bone w="65%" h="0.72rem" />
    </div>
    <div style={{ marginTop: 5 }}>
      <Bone w="5rem" h="0.5rem" />
    </div>
  </div>
);

// ─── Brief mode — headline row ────────────────────────────────────────────────

const HeadlineRow = ({ item, isLast = false }) => {
  const time = item.isoDate ? relativeTime(item.isoDate) : "";

  return (
    <button
      type="button"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={() => { if (item.link) window.open(item.link, "_blank", "noopener"); }}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        width: "100%",
        textAlign: "left",
        padding: "10px 12px 10px 14px",
        background: "transparent",
        border: "none",
        borderBottom: isLast ? "none" : "1px solid rgba(0,0,0,0.052)",
        outline: "none",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 0.14s ease",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(0,0,0,0.027)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Source · time */}
        {(item.source || time) && (
          <div style={{ display: "flex", alignItems: "center", gap: 3, marginBottom: 2.5 }}>
            {item.source && (
              <span style={{
                fontSize: "0.5625rem", fontWeight: 700, color: "var(--w-ink-4)",
                letterSpacing: "0.02em", textTransform: "uppercase",
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%",
              }}>
                {item.source}
              </span>
            )}
            {item.source && time && (
              <span style={{ fontSize: "0.4375rem", color: "var(--w-ink-6)", flexShrink: 0, lineHeight: 1, marginTop: 0.5 }}>·</span>
            )}
            {time && (
              <span style={{ fontSize: "0.5625rem", fontWeight: 400, color: "var(--w-ink-5)", whiteSpace: "nowrap", flexShrink: 0 }}>
                {time}
              </span>
            )}
          </div>
        )}
        {/* Title */}
        <p style={{
          fontSize: "0.7875rem", fontWeight: 600, color: "var(--w-ink-1)",
          lineHeight: 1.33,
          letterSpacing: "-0.011em",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {item.title}
        </p>
      </div>
    </button>
  );
};

// ─── Marquee mode — single full-bleed story card ──────────────────────────────

const MarqueeCard = ({ item, index, total, direction, onRefresh, isLoading, onPrev, onNext }) => {
  const [navHovered, setNavHovered] = useState(false);
  const time = item?.isoDate ? relativeTime(item.isoDate) : "";

  // Measure actual card pixel dimensions for the layout engine.
  const cardRef = useRef(null);
  const [area, setArea] = useState({ w: 262, h: 160 });
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      // Reserve: padding (10+14=24) + top-row (~22) + nav-dots (~40) = ~86
      setArea({ w: Math.max(100, width - 24), h: Math.max(60, height - 86) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── Gesture (drag to navigate) ────────────────────────────────────────────
  const startX = useRef(null);
  const dragged = useRef(false);
  const [dragX, setDragX] = useState(0);
  const [releasing, setReleasing] = useState(false);

  const handlePointerDown = (e) => {
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

  if (!item) return null;

  // Direction-aware text drift — background stays static, only text animates
  const textAnim = direction === "prev" ? "rss-text-in-prev" : "rss-text-in-next";

  return (
    <div
      ref={cardRef}
      className="absolute inset-0 select-none"
      style={{
        touchAction: "pan-y",
        cursor: "default",
        transform: dragX ? `translateX(${dragX}px) rotate(${dragX * 0.01}deg)` : "none",
        transition: releasing ? "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)" : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onMouseEnter={() => setNavHovered(true)}
      onMouseLeave={() => setNavHovered(false)}
      role="article"
      aria-label={item.title}
    >
      {/* ── Rich gradient background (text-only, no images) ──────────────── */}
      <div style={{ position: "absolute", inset: 0, overflow: "hidden", borderRadius: "inherit" }}>
        {/* Deep ink base */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(150deg, #0f0f11 0%, #1a1a1f 55%, #0b0b0d 100%)",
        }} />
        {/* Editorial highlight — top-left warm glow */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 100% 65% at 15% 0%, rgba(255,255,255,0.09) 0%, transparent 60%)",
        }} />
        {/* Accent color pulse — driven by CSS var (theme-aware) */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse 70% 45% at 85% 100%, color-mix(in srgb, var(--w-accent) 25%, transparent) 0%, transparent 65%)",
        }} />
      </div>

      {/* ── Full-height flex column: source/time top · title fills below ── */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        padding: "10px 12px 14px",
      }}>

        {/* Top row: source pill · [refresh] · time */}
        <div style={{
          display: "flex", alignItems: "center",
          flexShrink: 0,
          animation: `${textAnim} 0.3s ease-out both`,
        }}>
          {item.source && (
            <span style={{
              fontSize: "0.5rem", fontWeight: 800, letterSpacing: "0.1em",
              textTransform: "uppercase", color: "rgba(255,255,255,0.6)",
              backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.1)",
              padding: "3px 7px", borderRadius: 999,
              flexShrink: 0,
            }}>
              {item.source}
            </span>
          )}

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Refresh button */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onRefresh(); }}
            aria-label="Refresh feed"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
              background: "rgba(255,255,255,0.07)",
              border: "none", cursor: "pointer",
              color: "rgba(255,255,255,0.5)",
              transition: "color 0.2s, background 0.2s",
              animation: isLoading ? "rss-spin 1s linear infinite" : "none",
              marginRight: 4,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.9)";
              e.currentTarget.style.background = "rgba(255,255,255,0.14)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "rgba(255,255,255,0.5)";
              e.currentTarget.style.background = "rgba(255,255,255,0.07)";
            }}
          >
            <ArrowClockwise size={10} aria-hidden="true" />
          </button>

          {/* Timestamp */}
          {time && (
            <span style={{ fontSize: "0.6rem", fontWeight: 600, color: "rgba(255,255,255,0.45)", flexShrink: 0 }}>
              {time}
            </span>
          )}
        </div>

        {/* Title block — fills the remaining space, anchored top */}
        <div style={{
          flex: 1,
          display: "flex", flexDirection: "column", justifyContent: "flex-end",
          animation: `${textAnim} 0.35s 0.06s ease-out both`,
        }}>
          <ExpressiveTitle
            title={item.title || ""}
            areaWidth={area.w}
            areaHeight={area.h}
            hasImage={false}
            marginBottom={total > 1 ? 10 : 0}
            onClick={(e) => { e.stopPropagation(); if (item.link) window.open(item.link, "_blank", "noopener"); }}
          />

          {/* ── Dot nav + arrow buttons row ── */}
          {total > 1 && (
            <div
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, pointerEvents: "auto" }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ← Prev */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onPrev(); }}
                aria-label="Previous story"
                style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer", color: "#fff",
                  opacity: navHovered ? 1 : 0,
                  transition: "opacity 0.25s ease, background 0.15s",
                  pointerEvents: navHovered ? "auto" : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M7.5 2L3.5 6L7.5 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* ── Smooth sliding dot indicator ──
                   All background dots are uniform and static.
                   A single white circle slides via translateX — one animation,
                   Material You easing, GPU-composited, zero jank. */}
              {(() => {
                const DOT = 4;      // background dot diameter
                const IND = 6;      // sliding indicator diameter
                const GAP = 6;      // gap between dots
                const STRIDE = DOT + GAP; // 11px per slot
                const MAX = 5;
                const half = Math.floor(MAX / 2);
                const start = Math.max(0, Math.min(index - half, total - MAX));
                const end = Math.min(total, start + MAX);
                const count = end - start;
                const activeK = index - start; // 0-based position within window
                // Edge dots (hint more content off-screen) get lower opacity
                const dotOpacity = (k) => {
                  const dotIdx = start + k;
                  const isEdge = (dotIdx === start && start > 0) || (dotIdx === end - 1 && end < total);
                  return isEdge ? 0.18 : 0.28;
                };
                return (
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      gap: GAP,
                      // fixed height ensures the absolute indicator never shifts layout
                      height: IND,
                    }}
                  >
                    {/* Static background dots */}
                    {Array.from({ length: count }, (_, k) => (
                      <div
                        key={start + k}
                        style={{
                          width: DOT,
                          height: DOT,
                          borderRadius: '50%',
                          background: `rgba(255,255,255,${dotOpacity(k)})`,
                          flexShrink: 0,
                          // subtle fade when edge dots appear/disappear
                          transition: 'background 0.3s ease',
                        }}
                      />
                    ))}

                    {/* Sliding indicator — single element, single animation */}
                    <div
                      style={{
                        position: 'absolute',
                        width: IND,
                        height: IND,
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.95)',
                        // center on the first dot's center, then slide to active
                        top: '50%',
                        left: (DOT - IND) / 2, // = -1.5 → centers on dot 0
                        transform: `translateY(-50%) translateX(${activeK * STRIDE}px)`,
                        // Smooth slide: Material You standard easing
                        transition: 'transform 0.38s cubic-bezier(0.4, 0, 0.2, 1)',
                        pointerEvents: 'none',
                        // Soft glow — feels tactile without being distracting
                        boxShadow: '0 0 0 2px rgba(255,255,255,0.15)',
                      }}
                    />
                  </div>
                );
              })()}

              {/* → Next */}
              <button
                type="button"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); onNext(); }}
                aria-label="Next story"
                style={{
                  width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.1)",
                  backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  cursor: "pointer", color: "#fff",
                  opacity: navHovered ? 1 : 0,
                  transition: "opacity 0.25s ease, background 0.15s",
                  pointerEvents: navHovered ? "auto" : "none",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.2)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                  <path d="M4.5 2L8.5 6L4.5 10" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
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

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ sourceMode, absolute = false }) => (
  <div className={`flex flex-col items-center justify-center gap-3 p-5 text-center ${absolute ? "absolute inset-0" : "flex-1"}`}>
    <div
      style={{
        width: 40, height: 40, borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(0,0,0,0.04)",
        border: "1px solid rgba(0,0,0,0.07)",
      }}
    >
      <Broadcast size={18} style={{ color: "var(--w-ink-5)", opacity: 0.5 }} aria-hidden />
    </div>
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--w-ink-3)" }}>
        No headlines yet
      </p>
      <p style={{ fontSize: "0.6875rem", color: "var(--w-ink-5)", lineHeight: 1.5, maxWidth: 180 }}>
        {sourceMode === "custom"
          ? "Upload a JSON file with your feed URLs to get started"
          : "Select at least one source from Settings"}
      </p>
    </div>
  </div>
);

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
    // NEW data model: multi-select preset IDs + custom feeds each with `active` flag.
    // Legacy single-feedId settings are migrated below.
    activeFeedIds: DEFAULT_ACTIVE_IDS,
    customFeeds: [],        // [{ label, url, active: boolean }]
    sourceMode: "presets",  // "presets" | "custom" — mutually exclusive
    viewMode: "marquee",
  });

  // Migrate legacy single feedId setting → activeFeedIds
  const rawActive = settings.activeFeedIds;
  let activeFeedIds;
  if (Array.isArray(rawActive) && rawActive.length > 0) {
    activeFeedIds = rawActive;
  } else if (settings.feedId) {
    activeFeedIds = [settings.feedId];
  } else {
    activeFeedIds = DEFAULT_ACTIVE_IDS;
  }

  const customFeeds = (settings.customFeeds ?? []).map((f) =>
    typeof f.active === "boolean" ? f : { ...f, active: true }
  );
  const viewMode = settings.viewMode ?? "marquee";
  const sourceMode = settings.sourceMode ?? (customFeeds.length > 0 ? "custom" : "presets");

  // Mutually exclusive: only use presets OR custom, never both
  const activePresetFeeds = PRESET_FEEDS.filter((p) => activeFeedIds.includes(p.id));
  const activeCustomFeeds = customFeeds.filter((f) => f.active !== false);
  const allActiveFeeds = sourceMode === "custom"
    ? activeCustomFeeds.map((f) => ({ label: f.label, url: f.url }))
    : activePresetFeeds.map((p) => ({ label: p.label, url: p.url }));

  // Legacy hook kept for backward-compat — only used when all else fails
  const legacyFeedId = activeFeedIds[0] ?? DEFAULT_FEED_ID;

  // Always call both hooks (rules of hooks); we always use multiResult now.
  // useRss (single) is kept alive with a stable ID so hook count never changes.
  useRss(legacyFeedId); // stable no-op — result unused
  const multiResult = useRssMulti(allActiveFeeds);
  const { items, loading, error, refreshedAt, refresh } = multiResult;
  const ageLabel = useAgeLabel(refreshedAt);

  // Sync feed config to SW whenever active feeds change
  useEffect(() => {
    if (typeof chrome === "undefined" || !chrome.runtime) return;
    const feeds = allActiveFeeds.map(({ label, url }) => ({ label, url }));
    chrome.runtime.sendMessage({ type: "RSS_CONFIG_SYNC", feeds }).catch(() => { });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(allActiveFeeds)]);

  // Marquee navigation state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [visibleCount, setVisibleCount] = useState(10);
  const [navDirection, setNavDirection] = useState("next"); // for swipe animation
  const sentinelRef = useRef(null);

  // ── Smart item ordering: new items bubble to front of queue ───────────────
  const [orderedItems, setOrderedItems] = useState([]);
  const seenLinksRef = useRef(new Set());

  useEffect(() => {
    if (!items.length) { setOrderedItems([]); return; }
    const seen = seenLinksRef.current;
    if (seen.size === 0) {
      // First load — initialise without any reordering
      setOrderedItems(items);
      items.forEach(it => { if (it.link) seen.add(it.link); });
      return;
    }
    const fresh = items.filter(it => it.link && !seen.has(it.link));
    const existing = items.filter(it => !it.link || seen.has(it.link));
    if (fresh.length > 0) {
      setOrderedItems([...fresh, ...existing]);
      setCurrentIndex(0); // jump to newest
      setNavDirection("next");
    } else {
      setOrderedItems(items);
    }
    items.forEach(it => { if (it.link) seen.add(it.link); });
  }, [items]);

  const displayItems = orderedItems.slice(0, visibleCount);
  const hasMore = orderedItems.length > visibleCount;
  const showSkeleton = loading && orderedItems.length === 0;
  const showError = !!error && !showSkeleton;

  const storyCount = orderedItems.length;
  const feedCount = allActiveFeeds.length;
  const storyWord = storyCount === 1 ? "story" : "stories";
  const feedWord = feedCount === 1 ? "feed" : "feeds";
  let sourceName;
  if (storyCount > 0) {
    sourceName = `${storyCount} ${storyWord} from ${feedCount} ${feedWord}`;
  } else if (feedCount === 1) {
    sourceName = allActiveFeeds[0].label;
  } else {
    sourceName = `${feedCount} feeds`;
  }

  // Reset state when active feeds change
  useEffect(() => {
    setCurrentIndex(0);
    setVisibleCount(10);
    setNavDirection("next");
    seenLinksRef.current = new Set();
    setOrderedItems([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(activeFeedIds), sourceMode]);

  // Clamp index when items load/shrink
  useEffect(() => {
    if (displayItems.length > 0 && currentIndex >= displayItems.length) setCurrentIndex(0);
  }, [displayItems.length, currentIndex]);

  // Auto-advance for Marquee
  useEffect(() => {
    if (viewMode !== "marquee" || displayItems.length <= 1 || showSkeleton || showError) return;
    const timer = setTimeout(() => {
      const next = (currentIndex + 1) % displayItems.length;
      if (currentIndex >= displayItems.length - 2 && hasMore) setVisibleCount((c) => c + 10);
      setNavDirection("next");
      setCurrentIndex(next);
    }, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, viewMode, displayItems.length, showSkeleton, showError, hasMore]);

  const goNext = useCallback(() => {
    setNavDirection("next");
    setCurrentIndex((i) => {
      const next = (i + 1) % displayItems.length;
      if (i >= displayItems.length - 2 && hasMore) setVisibleCount((c) => c + 10);
      return next;
    });
  }, [displayItems.length, hasMore]);

  const goPrev = useCallback(() => {
    setNavDirection("prev");
    setCurrentIndex((i) => (i - 1 + displayItems.length) % displayItems.length);
  }, [displayItems.length]);

  // Brief mode: IntersectionObserver on sentinel to load more
  useEffect(() => {
    if (viewMode !== "brief" || !sentinelRef.current) return;
    const obs = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting && hasMore) setVisibleCount((c) => c + 10); },
      { threshold: 0.1 },
    );
    obs.observe(sentinelRef.current);
    return () => obs.disconnect();
  }, [viewMode, hasMore, visibleCount]);

  const settingsContent = (onClose) => (
    <Settings
      activeFeedIds={activeFeedIds}
      onChangeActiveFeedIds={(v) => updateSetting("activeFeedIds", v)}
      customFeeds={customFeeds}
      onChangeCustomFeeds={(v) => updateSetting("customFeeds", v)}
      sourceMode={sourceMode}
      onChangeSourceMode={(v) => updateSetting("sourceMode", v)}
      viewMode={viewMode}
      onChangeViewMode={(v) => updateSetting("viewMode", v)}
      onClose={onClose}
    />
  );

  // ── Spotlight mode ──────────────────────────────────────────────────────────
  if (viewMode === "marquee") {
    return (
      <BaseWidget
        className="relative overflow-hidden"
        settingsContent={settingsContent}
        settingsTitle="News Feed"
        modalWidth="w-96"
        onRemove={onRemove}
      >
        {showSkeleton && <MarqueeSkeleton />}
        {showError && <ErrorState onRetry={refresh} absolute />}
        {!showSkeleton && !showError && displayItems.length > 0 && (
          <MarqueeCard
            key={`${currentIndex}-${navDirection}`}
            item={displayItems[currentIndex]}
            index={currentIndex}
            total={displayItems.length}
            direction={navDirection}
            onRefresh={refresh}
            isLoading={loading}
            onNext={goNext}
            onPrev={goPrev}
          />
        )}
        {!showSkeleton && !showError && displayItems.length === 0 && !loading && (
          <EmptyState sourceMode={sourceMode} absolute />
        )}
      </BaseWidget>
    );
  }

  // ── Digest mode ──────────────────────────────────────────────────────────────
  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsContent={settingsContent}
      settingsTitle="News Feed" modalWidth="w-96" onRemove={onRemove}
    >
      {/* Header */}
      <div
        className="flex items-center gap-1.5 px-3 pt-2.5 pb-2 shrink-0"
        style={{ borderBottom: "1px solid var(--card-border)" }}
      >
        <Broadcast size={13} style={{ color: "var(--w-accent)", flexShrink: 0 }} aria-hidden="true" />
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
        className="flex-1 flex flex-col min-h-0 overflow-y-auto"
        style={{ scrollbarWidth: "none" }}
      >
        {showError && <ErrorState onRetry={refresh} />}

        {showSkeleton && (
          <>{[0, 1, 2, 3, 4, 5].map((i) => <SkeletonRow key={i} isLast={i === 5} />)}</>
        )}

        {!showSkeleton && !showError && displayItems.map((item, i) => (
          <HeadlineRow
            key={item.link || `${item.title}-${i}`}
            item={item}
            isLast={i === displayItems.length - 1 && !hasMore}
          />
        ))}

        {/* Sentinel — triggers next batch when scrolled into view */}
        {!showSkeleton && !showError && hasMore && (
          <div ref={sentinelRef} style={{ height: 1, flexShrink: 0 }} aria-hidden="true" />
        )}

        {!showSkeleton && !showError && displayItems.length === 0 && !loading && (
          <EmptyState sourceMode={sourceMode} />
        )}
      </div>
    </BaseWidget>
  );
};
