import { BaseWidget } from "../BaseWidget";
import { useWidgetSettings } from "../useWidgetSettings";
import { QUOTES } from "../../data/quotes";
import { FACTS } from "../../data/facts";
import { useDailyJoke } from "./useDailyJoke";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { EmojiLaughingFill, LightbulbFill } from "react-bootstrap-icons";

const getDailyIndex = (len) => Math.floor(Date.now() / 86_400_000) % len;

const MODE_OPTIONS = [
  { label: "Wit", value: "quote" },
  { label: "Joke", value: "joke" },
  { label: "Fact", value: "fact" },
];

// ── Wit display (witty / sarcastic quote) ──────────────────────────────────────

const WitDisplay = ({ text, author, category }) => (
  <>
    <div className="flex-1 flex flex-col justify-center min-h-0 relative overflow-hidden">
      {/* decorative large open-quote */}
      <span
        aria-hidden="true"
        className="absolute select-none pointer-events-none"
        style={{
          top: '-0.6rem',
          left: '-0.25rem',
          fontSize: '5.5rem',
          lineHeight: 1,
          fontFamily: 'Georgia, serif',
          fontWeight: 900,
          color: 'var(--w-accent)',
          opacity: 0.1,
          userSelect: 'none',
        }}
      >
        &ldquo;
      </span>
      <p
        style={{
          fontStyle: 'italic',
          color: 'var(--w-ink-2)',
          lineHeight: 1.65,
          fontSize: '0.9375rem',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {text}
      </p>
    </div>

    <div className="flex items-center justify-between shrink-0 gap-2">
      <p
        className="text-xs font-medium truncate"
        style={{ color: 'var(--w-ink-4)', fontStyle: 'italic' }}
      >
        — {author}
      </p>
      <span
        className="text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full shrink-0 tracking-wide"
        style={{
          background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
          color: 'var(--w-accent)',
        }}
      >
        {category}
      </span>
    </div>
  </>
);

// ── Joke display (dad joke from API) ──────────────────────────────────────────

const FALLBACKS = [
  "The joke API is down. Which is itself kind of a joke.",
  "No joke today. The internet is on a coffee break.",
  "Failed to fetch humor. Refresh your browser. And your outlook on life.",
];
const fallback = FALLBACKS[Math.floor(Date.now() / 86_400_000) % FALLBACKS.length];

const JokeDisplay = ({ joke, loading }) => (
  <>
    <div className="flex-1 flex flex-col justify-center gap-3 min-h-0">
      <EmojiLaughingFill
        size={18}
        aria-hidden="true"
        style={{ color: 'var(--w-accent)', opacity: 0.65, flexShrink: 0 }}
      />
      <p
        style={{
          color: loading ? 'var(--w-ink-5)' : 'var(--w-ink-2)',
          lineHeight: 1.65,
          fontSize: '0.9375rem',
          fontStyle: loading ? 'italic' : 'normal',
          transition: 'color 0.2s',
        }}
      >
        {loading ? 'Hold on, fetching today\'s humor...' : (joke ?? fallback)}
      </p>
    </div>

    <div className="flex items-center shrink-0">
      <span
        className="text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
        style={{
          background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
          color: 'var(--w-accent)',
        }}
      >
        Dad Joke™
      </span>
    </div>
  </>
);

// ── Fact display ──────────────────────────────────────────────────────────────

const FactDisplay = ({ text, category }) => (
  <>
    <div className="flex-1 flex flex-col justify-center gap-3 min-h-0">
      <LightbulbFill
        size={18}
        aria-hidden="true"
        style={{ color: 'var(--w-accent)', opacity: 0.65, flexShrink: 0 }}
      />
      <p
        style={{
          color: 'var(--w-ink-2)',
          lineHeight: 1.65,
          fontSize: '0.9375rem',
        }}
      >
        {text}
      </p>
    </div>
    <div className="flex items-center shrink-0">
      <span
        className="text-[0.65rem] font-semibold px-2.5 py-0.5 rounded-full tracking-wide"
        style={{
          background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
          color: 'var(--w-accent)',
        }}
      >
        {category}
      </span>
    </div>
  </>
);

// ── Widget ─────────────────────────────────────────────────────────────────────

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, { mode: 'quote' });
  const mode = settings.mode ?? 'quote';

  const quote = QUOTES[getDailyIndex(QUOTES.length)];
  const fact = FACTS[getDailyIndex(FACTS.length)];
  const { joke, loading } = useDailyJoke();

  const settingsContent = (
    <SegmentedControl
      label="Mode"
      options={MODE_OPTIONS}
      value={mode}
      onChange={(v) => updateSetting('mode', v)}
    />
  );

  let content;
  if (mode === 'joke') {
    content = <JokeDisplay joke={joke} loading={loading} />;
  } else if (mode === 'fact') {
    content = <FactDisplay text={fact.text} category={fact.category} />;
  } else {
    content = <WitDisplay text={quote.text} author={quote.author} category={quote.category} />;
  }

  return (
    <BaseWidget
      className="p-5 flex flex-col justify-between gap-4"
      onRemove={onRemove}
      settingsContent={settingsContent}
      settingsTitle="Daily Mode"
    >
      {content}
    </BaseWidget>
  );
};

