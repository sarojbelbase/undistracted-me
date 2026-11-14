import { useState, useEffect, useRef, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { WIDGET_SETTINGS_DEFAULTS } from "../../constants/defaults.js";
import { QUOTES } from "../../data/quotes";
import { FACTS } from "../../data/facts";
import { useDailyJoke } from "./useDailyJoke";
import { ExpressiveTitle } from "../../utilities/expressifyText.jsx";
import { DailysSettings, MODE_OPTIONS } from "./Settings";
import { useSwipeToNavigate } from "../../hooks/useSwipeToNavigate";

const getDailyIndex = (len) => Math.floor(Date.now() / 86_400_000) % len;

const CarouselNav = ({ mode, onSelect }) => {
  const index = Math.max(
    0,
    MODE_OPTIONS.findIndex((m) => m.value === mode),
  );

  return (
    <div
      aria-label="Mode navigation"
      className="dailys-nav"
    >
      {MODE_OPTIONS.map((m, k) => (
        <button
          key={m.value}
          onClick={(e) => {
            e.stopPropagation();
            onSelect(m.value);
          }}
          aria-label={`Switch to ${m.label}`}
          title={`Switch to ${m.label}`}
          className={`dailys-nav__dot ${k === index ? "dailys-nav__dot--active" : "dailys-nav__dot--inactive"}`}
        />
      ))}
    </div>
  );
};

const AdaptiveText = ({ text, fontFamily, fontWeight, textLineHeight }) => {
  const containerRef = useRef(null);
  const [area, setArea] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setArea({ w: width, h: height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "flex-start",
        overflow: "hidden",
      }}
    >
      {area.w > 0 && area.h > 0 ? (
        <ExpressiveTitle
          title={text}
          areaWidth={area.w}
          areaHeight={area.h}
          onClick={() => { }}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          textLineHeight={textLineHeight}
        />
      ) : null}
    </div>
  );
};

const CarouselCard = ({ item, mode, onNext, onPrev, onSelect }) => {
  const { dragX, releasing, handlers } = useSwipeToNavigate({ onNext, onPrev });

  return (
    <div
      className="absolute inset-0 select-none flex flex-col p-4 dailys-card"
      style={{
        transform: dragX
          ? `translateX(${dragX}px) rotate(${dragX * 0.01}deg)`
          : "none",
        transition: releasing
          ? "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)"
          : "none",
      }}
      onPointerDown={handlers.onPointerDown}
      onPointerMove={handlers.onPointerMove}
      onPointerUp={handlers.onPointerUp}
    >
      <div className="dailys-text-area">
        <AdaptiveText
          text={item.text}
          fontFamily='"Google Sans", ui-sans-serif, sans-serif'
          fontWeight={600}
          textLineHeight={1.15}
        />
      </div>

      <div className="dailys-footer">
        <span className="dailys-badge">
          {mode?.charAt(0).toUpperCase() + mode?.slice(1)}
        </span>
        {item.author && (
          <div className="dailys-author">
            <div className="dailys-author__bar" />
            <span className="truncate dailys-author__name">
              {item.author}
            </span>
          </div>
        )}
        <div className="ml-auto shrink-0">
          <CarouselNav mode={mode} onSelect={onSelect} />
        </div>
      </div>
    </div>
  );
};

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, WIDGET_SETTINGS_DEFAULTS.dailys);
  // Sanitize the mode: fall back to "quote" for anything other than the three
  // known modes (corrupted/legacy settings could hold an arbitrary string).
  const rawMode = settings.mode ?? "quote";
  const mode = ["quote", "joke", "fact"].includes(rawMode) ? rawMode : "quote";
  const autoSlide = settings.autoSlide ?? true;

  const { joke, loading } = useDailyJoke();
  const quote = QUOTES[getDailyIndex(QUOTES.length)];
  const fact = FACTS[getDailyIndex(FACTS.length)];

  const FALLBACKS = [
    "The joke API is down. Which is itself kind of a joke.",
    "No joke today. The internet is on a coffee break.",
    "Failed to fetch humor. Refresh your browser.",
  ];
  const jokeFallback = FALLBACKS[getDailyIndex(FALLBACKS.length)];

  let item;
  if (mode === "joke") {
    item = {
      text: loading
        ? "Hold on, fetching today's humor..."
        : (joke ?? jokeFallback),
      meta: null,
    };
  } else if (mode === "fact") {
    item = { ...fact, meta: fact.category };
  } else {
    item = { ...quote, meta: quote.category };
  }

  const onNext = useCallback(() => {
    const idx = MODE_OPTIONS.findIndex((m) => m.value === mode);
    const nextMode = MODE_OPTIONS[(idx + 1) % MODE_OPTIONS.length].value;
    updateSetting("mode", nextMode);
  }, [mode, updateSetting]);

  const onPrev = useCallback(() => {
    const idx = MODE_OPTIONS.findIndex((m) => m.value === mode);
    const prevMode =
      MODE_OPTIONS[(idx - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length].value;
    updateSetting("mode", prevMode);
  }, [mode, updateSetting]);

  useEffect(() => {
    if (!autoSlide) return;
    const timer = setInterval(onNext, 30_000);
    return () => clearInterval(timer);
  }, [onNext, autoSlide]);

  const settingsContent = (
    <DailysSettings
      mode={mode}
      autoSlide={autoSlide}
      onChange={(key, val) => updateSetting(key, val)}
    />
  );

  return (
    <BaseWidget
      className="relative overflow-hidden"
      onRemove={onRemove}
      settingsContent={settingsContent}
      settingsTitle="Daily Mode"
    >
      <CarouselCard
        item={item}
        mode={mode}
        onNext={onNext}
        onPrev={onPrev}
        onSelect={(m) => updateSetting("mode", m)}
      />
    </BaseWidget>
  );
};
