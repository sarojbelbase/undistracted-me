import { useState } from "react";
import {
  PlusLg,
  HourglassSplit,
  CalendarEvent,
} from "react-bootstrap-icons";
import { ListPanel, ListPanelRow } from "../../components/ui/ListPanel";
import { AddCountdown } from "./AddCountdown";
import {
  getNextOccurrence,
  formatCountdown,
  formatSince,
  formatTargetDate,
  humanizeDuration,
} from "./utils";
import { fmt12, calcDuration } from "../events/utils";

export const CountdownSettings = ({
  custom,
  pinned,
  upcomingEvents,
  onAddCustom,
  onRemoveCustom,
  onPin,
  onClose,
}) => {
  const [showAdd, setShowAdd] = useState(false);

  return (
    <>
      {/* ── Custom Countdowns ── */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="cdn-section-label">My Countdowns</p>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 font-semibold rounded-lg whitespace-nowrap cursor-pointer transition-opacity hover:opacity-85 text-[11px] px-3 py-1.5"
            style={{ background: 'var(--w-accent)', color: 'var(--w-accent-fg)' }}
          >
            <PlusLg size={9} />
            Add Countdown
          </button>
        </div>

        <ListPanel
          items={custom}
          className="mb-4"
          emptyState={
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'var(--panel-bg)', border: '1px solid var(--card-border)' }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)' }}>
                <HourglassSplit size={14} style={{ color: 'var(--w-accent)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold" style={{ color: 'var(--w-ink-2)' }}>Nothing to track yet</p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--w-ink-4)' }}>
                  Tap <strong style={{ color: 'var(--w-ink-2)' }}>+ Add Countdown</strong> to count down to events or track time since milestones.
                </p>
              </div>
            </div>
          }
          renderItem={(cd) => {
            const isSince = cd.mode === "since";
            const next = isSince
              ? new Date(`${cd.targetDate}T${cd.targetTime || "00:00"}`)
              : getNextOccurrence(cd);
            const { days, hours, minutes: mins } = isSince
              ? formatSince(next)
              : formatCountdown(next);
            const isPinned = pinned?.type === "custom" && pinned?.id === cd.id;
            const isPast = !isSince && next < new Date() && cd.repeat === "none";

            const cdLabel = (() => {
              if (isPast) return "Past";
              return humanizeDuration(days, hours, mins, isSince ? 'past' : 'future');
            })();

            const metaParts = [];
            if (isPinned) metaParts.push({ text: 'Pinned', accent: true });
            metaParts.push({ text: formatTargetDate(next) });
            if (isSince) metaParts.push({ text: 'Since' });
            if (!isSince && cd.repeat !== "none") metaParts.push({ text: cd.repeat });

            return (
              <ListPanelRow
                key={cd.id}
                title={cd.title}
                meta={metaParts}
                label={cdLabel}
                onDelete={() => onRemoveCustom(cd.id)}
                deleteLabel={`Remove ${cd.title}`}
                onClick={() => { onPin({ type: "custom", id: cd.id }); onClose?.(); }}
                style={{ opacity: isPast ? 0.4 : 1 }}
              />
            );
          }}
        />
      </div>

      {/* Divider */}
      <div className="cdn-divider" />

      {/* ── From Calendar Events ── */}
      <div>
        <p className="cdn-section-label mb-3">
          From Calendar
        </p>

        <ListPanel
          items={upcomingEvents}
          maxItems={8}
          emptyState={
            <div className="cdn-empty-state">
              <div className="cdn-empty-state__icon-circle cdn-empty-state__icon-circle--small">
                <CalendarEvent size={18} style={{ color: "var(--w-accent)", opacity: 0.75 }} />
              </div>
              <p className="w-body font-semibold mb-1">No upcoming events</p>
              <p className="w-muted leading-relaxed" style={{ maxWidth: "180px" }}>
                Add events in the Events widget and pin them here as countdowns.
              </p>
            </div>
          }
          renderItem={(ev) => {
            const isPinned = pinned?.type === "event" && pinned?.eventId === ev.id;
            const evDate = new Date(`${ev.startDate}T${ev.startTime || "00:00"}`);
            const { days: evDays, hours: evHours, minutes: evMins } = formatCountdown(evDate);
            const evLabel = humanizeDuration(evDays, evHours, evMins, 'future');
            const evStartLabel = fmt12(ev.startTime);
            const evDuration = calcDuration(ev.startTime, ev.endTime, ev.startDate, ev.endDate);

            const metaParts = [];
            if (isPinned) metaParts.push({ text: 'Pinned', accent: true });
            if (evStartLabel) metaParts.push({ text: evStartLabel });
            if (evDuration) metaParts.push({ text: evDuration });

            return (
              <ListPanelRow
                key={ev.id}
                title={ev.title}
                meta={metaParts}
                label={evLabel}
                onClick={() => { onPin({ type: "event", eventId: ev.id }); onClose?.(); }}
              />
            );
          }}
        />
      </div>

      {showAdd && (
        <AddCountdown
          onSave={(cd) => {
            onAddCustom(cd);
            onPin({ type: "custom", id: cd.id });
            onClose?.();
          }}
          onClose={() => setShowAdd(false)}
        />
      )}
    </>
  );
};
