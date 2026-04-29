/**
 * RSS Feed Settings panel — rendered inside BaseWidget's settings modal.
 *
 * Props:
 *   feedId          – currently selected preset id
 *   onChangeFeedId  – (id: string) => void
 *   onClose         – () => void  (injected by BaseWidget)
 */

import { PRESET_FEEDS } from "./utils";

export const Settings = ({ feedId, onChangeFeedId, onClose }) => {
  const handleSelect = (id) => {
    onChangeFeedId(id);
    onClose?.();
  };

  return (
    <>
      {/* Section label */}
      <span className="w-label">Source</span>

      {/* Preset pill buttons */}
      <div className="flex flex-wrap gap-2 mt-3">
        {PRESET_FEEDS.map((preset) => {
          const isSelected = feedId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handleSelect(preset.id)}
              onMouseDown={(e) => e.stopPropagation()}
              className="px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity hover:opacity-80 cursor-pointer"
              style={
                isSelected
                  ? {
                      background: "var(--w-accent)",
                      color: "var(--w-accent-fg)",
                      border: "1px solid transparent",
                    }
                  : {
                      background: "transparent",
                      color: "var(--w-ink-3)",
                      border: "1px solid var(--card-border)",
                    }
              }
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      {/* Helper text */}
      <p
        className="text-[11px] mt-4 leading-snug"
        style={{ color: "var(--w-ink-5)" }}
      >
        Headlines refresh every 15 minutes and are cached locally.
      </p>
    </>
  );
};
