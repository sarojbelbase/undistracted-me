import { useState, useEffect, useRef, useCallback } from "react";
import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { QUOTES } from "../../data/quotes";
import { FACTS } from "../../data/facts";
import { useDailyJoke } from "./useDailyJoke";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { ExpressiveTitle } from "../../utilities/expressifyText.jsx";

const getDailyIndex = (len) => Math.floor(Date.now() / 86_400_000) % len;

const MODE_OPTIONS = [
  { label: "Wit", value: "quote" },
  { label: "Joke", value: "joke" },
  { label: "Fact", value: "fact" },
];

const CarouselNav = ({ mode, onSelect }) => {
  const index = Math.max(0, MODE_OPTIONS.findIndex(m => m.value === mode));

  return (
    <div aria-label="Mode navigation" style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
      {MODE_OPTIONS.map((m, k) => (
        <button
          key={m.value}
          onClick={(e) => { e.stopPropagation(); onSelect(m.value); }}
          aria-label={`Switch to ${m.label}`}
          title={`Switch to ${m.label}`}
          style={{
            padding: 0,
            border: 'none',
            height: 4,
            width: k === index ? 12 : 4,
            borderRadius: 999,
            background: 'var(--w-ink-1)',
            opacity: k === index ? 0.8 : 0.25,
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        />
      ))}
    </div>
  );
};

const AdaptiveText = ({ text }) => {
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
    <div ref={containerRef} style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}>
      {area.w > 0 && area.h > 0 ? (
        <ExpressiveTitle
          title={text}
          areaWidth={area.w}
          areaHeight={area.h}
          onClick={() => { }}
        />
      ) : null}
    </div>
  );
};

const CarouselCard = ({ item, mode, onNext, onPrev, onSelect }) => {
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

  return (
    <div
      className="absolute inset-0 select-none flex flex-col p-5"
      style={{
        touchAction: "pan-y",
        cursor: "default",
        transform: dragX ? `translateX(${dragX}px) rotate(${dragX * 0.01}deg)` : "none",
        transition: releasing ? "transform 0.45s cubic-bezier(0.34, 1.4, 0.64, 1)" : "none",
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="flex-1 flex flex-col justify-center min-h-0 relative overflow-hidden pb-3">
        <div style={{ position: 'relative', zIndex: 1, width: '100%', flex: 1, minHeight: 0 }}>
          <AdaptiveText text={item.text} />
        </div>
        {item.author && (
          <div className="flex items-center gap-2 mt-3 pl-0.5">
            <div style={{ width: '14px', height: '1.5px', background: 'var(--w-accent)', opacity: 0.6, borderRadius: '2px' }} />
            <span
              className="truncate"
              style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                color: 'var(--w-ink-2)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase'
              }}
            >
              {item.author}
            </span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between shrink-0 pt-2">
        <span
          className="text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
          style={{
            background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
            color: 'var(--w-accent)',
          }}
        >
          {mode?.charAt(0).toUpperCase() + mode?.slice(1)}
        </span>
        <CarouselNav mode={mode} onSelect={onSelect} />
      </div>
    </div>
  );
};

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { mode: 'quote' });
  const mode = settings.mode ?? 'quote';

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
  if (mode === 'joke') {
    item = { text: loading ? "Hold on, fetching today's humor..." : (joke ?? jokeFallback), meta: null };
  } else if (mode === 'fact') {
    item = { ...fact, meta: fact.category };
  } else {
    item = { ...quote, meta: quote.category };
  }

  const onNext = useCallback(() => {
    const idx = MODE_OPTIONS.findIndex(m => m.value === mode);
    const nextMode = MODE_OPTIONS[(idx + 1) % MODE_OPTIONS.length].value;
    updateSetting('mode', nextMode);
  }, [mode, updateSetting]);

  const onPrev = useCallback(() => {
    const idx = MODE_OPTIONS.findIndex(m => m.value === mode);
    const prevMode = MODE_OPTIONS[(idx - 1 + MODE_OPTIONS.length) % MODE_OPTIONS.length].value;
    updateSetting('mode', prevMode);
  }, [mode, updateSetting]);

  const settingsContent = (
    <SegmentedControl
      label="Mode"
      options={MODE_OPTIONS}
      value={mode}
      onChange={(v) => updateSetting('mode', v)}
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
        onSelect={(m) => updateSetting('mode', m)}
      />
    </BaseWidget>
  );
};

