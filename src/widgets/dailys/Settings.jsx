import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { Toggle } from "../../components/ui/Toggle";

export const MODE_OPTIONS = [
  { label: "Quote", value: "quote" },
  { label: "Joke", value: "joke" },
  { label: "Fact", value: "fact" },
];

export const DailysSettings = ({ mode, autoSlide, onChange }) => (
  <div className="flex flex-col gap-4">
    <SegmentedControl
      label="Mode"
      options={MODE_OPTIONS}
      value={mode}
      onChange={(v) => onChange("mode", v)}
    />
    <div style={{ height: 1, background: 'rgba(0,0,0,0.1)', marginTop: -4, marginBottom: -4 }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
      <div>
        <span className="w-label">Auto-slide</span>
        <p style={{
          fontSize: '10.5px', color: 'var(--w-ink-5)',
          marginTop: -4, lineHeight: 1.4,
        }}>
          Cycles through quote, joke, and fact every 30 seconds
        </p>
      </div>
      <Toggle
        checked={autoSlide}
        onChange={(v) => onChange("autoSlide", v)}
      />
    </div>
  </div>
);
