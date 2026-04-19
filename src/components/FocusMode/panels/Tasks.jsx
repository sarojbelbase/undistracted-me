/**
 * Tasks panel — Google Tasks integration for Focus Mode.
 *
 * States:
 *   • Collapsed pill — shows remaining count, springs open on click.
 *   • Expanded panel — full task manager with connect flow, refresh,
 *     inline editing, and completed section.
 *
 * The Google sign-in flow lives entirely here — no separate settings step.
 */
import React, { useState, useRef, useEffect } from 'react';
import { FOCUS_THEME } from '../theme';
import { IntegrationRow } from '../../ui/IntegrationRow';

const t = FOCUS_THEME;

// ─── Design tokens ────────────────────────────────────────────────────────────

const PANEL_BG = 'rgba(8,9,13,0.88)';
const PILL_BG = 'rgba(0,0,0,0.45)';
const INPUT_BG = 'rgba(255,255,255,0.06)';
const HOVER_BG = 'rgba(255,255,255,0.055)';
const SECTION_BORDER = '1px solid rgba(255,255,255,0.07)';
const OUTER_BORDER = '1px solid rgba(255,255,255,0.10)';
const DIM = 'rgba(255,255,255,0.32)';
const MED = 'rgba(255,255,255,0.70)';
const BRIGHT = 'rgba(255,255,255,0.95)';
const ACCENT = 'var(--w-accent)';
const ACCENT_FG = 'var(--w-accent-fg)';

// ─── Icons ────────────────────────────────────────────────────────────────────

const IconClose = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const IconRefresh = ({ spinning }) => (
  <svg
    width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true"
    style={{ transition: 'transform 0.6s ease', transform: spinning ? 'rotate(360deg)' : 'none' }}
  >
    <path
      d="M12.5 7A5.5 5.5 0 1 1 9.5 2.14"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"
    />
    <path d="M9.5 1v3.5H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M2 3.5h10M5.5 3.5V2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1M11.5 3.5l-.8 8a.5.5 0 01-.5.5H3.8a.5.5 0 01-.5-.5l-.8-8"
      stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"
    />
  </svg>
);

const IconGoogle = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

// ─── Checkbox ─────────────────────────────────────────────────────────────────

const Checkbox = ({ checked, onChange }) => (
  <label style={{ display: 'flex', alignItems: 'center', flexShrink: 0, cursor: 'pointer', lineHeight: 0 }}>
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      style={{ position: 'absolute', opacity: 0, width: 0, height: 0, pointerEvents: 'none' }}
    />
    <svg width="17" height="17" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <rect
        x="1" y="1" width="16" height="16" rx="4.5"
        stroke={checked ? ACCENT : 'rgba(255,255,255,0.22)'}
        strokeWidth="1.5"
        fill={checked ? ACCENT : 'transparent'}
        style={{ transition: 'stroke 0.15s, fill 0.15s' }}
      />
      {checked && (
        <path
          d="M5 9l3 3 5-5"
          stroke={ACCENT_FG}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  </label>
);

// ─── Task row ─────────────────────────────────────────────────────────────────

const TaskRow = ({ task, onToggle, onEdit, onDelete }) => {
  const [hovered, setHovered] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(task.title);
  const inputRef = useRef(null);

  useEffect(() => { setDraft(task.title); }, [task.title]);

  const commitEdit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed && trimmed !== task.title) onEdit(task.id, trimmed);
    else setDraft(task.title);
  };

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        padding: '7px 14px',
        background: hovered ? HOVER_BG : 'transparent',
        transition: 'background 0.10s',
        listStyle: 'none',
      }}
    >
      <Checkbox checked={task.completed} onChange={() => onToggle(task.id)} />

      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') { setEditing(false); setDraft(task.title); }
          }}
          style={{
            flex: 1,
            background: 'rgba(255,255,255,0.09)',
            border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 5,
            color: BRIGHT,
            fontSize: 12.5,
            padding: '2px 7px',
            outline: 'none',
            minWidth: 0,
          }}
        />
      ) : (
        <span
          role="button"
          tabIndex={task.completed ? -1 : 0}
          onDoubleClick={() => !task.completed && setEditing(true)}
          onKeyDown={e => { if ((e.key === 'Enter' || e.key === 'F2') && !task.completed) setEditing(true); }}
          title={task.completed ? undefined : 'Double-click or press Enter to edit'}
          style={{
            flex: 1,
            fontSize: 12.5,
            lineHeight: '1.45',
            color: task.completed ? DIM : MED,
            textDecoration: task.completed ? 'line-through' : 'none',
            textDecorationColor: 'rgba(255,255,255,0.18)',
            transition: 'color 0.15s',
            userSelect: 'none',
            cursor: task.completed ? 'default' : 'text',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {task.title}
        </span>
      )}

      <button
        onClick={() => onDelete(task.id)}
        aria-label={`Delete task`}
        style={{
          flexShrink: 0,
          width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'none', border: 'none',
          borderRadius: 5,
          cursor: 'pointer',
          color: 'rgba(255,255,255,0.55)',
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.12s',
          padding: 0,
        }}
      >
        <IconTrash />
      </button>
    </li>
  );
};

// ─── Add task input ───────────────────────────────────────────────────────────

const AddTaskInput = ({ onAdd }) => {
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);

  const commit = () => {
    if (value.trim()) { onAdd(value.trim()); setValue(''); }
  };

  return (
    <div style={{ padding: '8px 10px 10px', borderTop: SECTION_BORDER }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '6px 10px',
          borderRadius: 9,
          background: INPUT_BG,
          border: focused
            ? '1px solid rgba(255,255,255,0.18)'
            : '1px solid rgba(255,255,255,0.07)',
          transition: 'border-color 0.15s',
        }}
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true" style={{ flexShrink: 0, opacity: 0.3 }}>
          <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        <input
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="New task…"
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            color: BRIGHT,
            fontSize: 12.5,
            outline: 'none',
            minWidth: 0,
          }}
        />
        {value.trim() && (
          <button
            onClick={commit}
            style={{
              flexShrink: 0,
              background: ACCENT,
              color: ACCENT_FG,
              border: 'none',
              borderRadius: 6,
              padding: '2px 9px',
              fontSize: 11,
              fontWeight: 700,
              cursor: 'pointer',
              letterSpacing: '0.02em',
            }}
          >
            Add
          </button>
        )}
      </div>
    </div>
  );
};

// ─── Dark CSS-var context for IntegrationRow inside the dark panel ───────────

const darkVars = {
  '--w-ink-1': 'rgba(255,255,255,0.92)',
  '--w-ink-4': 'rgba(255,255,255,0.55)',
  '--w-ink-5': 'rgba(255,255,255,0.40)',
  '--w-ink-6': 'rgba(255,255,255,0.30)',
  '--w-accent': '#818cf8',
  '--w-accent-fg': '#ffffff',
};

// ─── Pill label ───────────────────────────────────────────────────────────────

function pillLabel(remaining, loading) {
  if (loading) return '…';
  if (remaining === 0) return 'All done';
  return `${remaining} task${remaining === 1 ? '' : 's'}`;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const TasksPanel = ({ tasks, loading, gtasksConnected, onConnect, connecting, add, toggle, edit, remove, reload }) => {
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const panelRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await reload();
    setTimeout(() => setRefreshing(false), 500);
  };

  const pending = tasks.filter(tt => !tt.completed);
  const completed = tasks.filter(tt => tt.completed);
  const remaining = pending.length;
  const allDone = !loading && gtasksConnected && pending.length === 0 && completed.length > 0;

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>

      {/* ── Expanded panel ───────────────────────────────────────────── */}
      {open && (
        <div
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: 0,
            width: 300,
            maxHeight: 440,
            borderRadius: 14,
            background: PANEL_BG,
            backdropFilter: 'blur(32px) saturate(180%)',
            WebkitBackdropFilter: 'blur(32px) saturate(180%)',
            border: OUTER_BORDER,
            boxShadow: '0 16px 56px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.07)',
            display: 'flex',
            flexDirection: 'column',
            animation: 'panelCardIn 0.22s cubic-bezier(0.16,1,0.3,1) both',
            overflow: 'hidden',
          }}
        >
          {/* ── Header ── */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '11px 12px 10px',
              borderBottom: SECTION_BORDER,
            }}
          >
            <span style={{ flex: 1, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: t.label }}>
              Tasks
            </span>

            {gtasksConnected && !loading && tasks.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: '1px 7px',
                  borderRadius: 99,
                  background: remaining > 0 ? 'rgba(255,255,255,0.09)' : 'rgba(74,222,128,0.14)',
                  color: remaining > 0 ? MED : 'rgba(74,222,128,0.9)',
                  letterSpacing: '0.02em',
                }}
              >
                {remaining > 0 ? `${remaining} left` : '✓ done'}
              </span>
            )}

            {gtasksConnected && (
              <button
                onClick={handleRefresh}
                aria-label="Refresh tasks"
                disabled={refreshing || loading}
                style={{
                  width: 26, height: 26,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'none', border: 'none', borderRadius: 6,
                  cursor: refreshing || loading ? 'default' : 'pointer',
                  color: DIM, padding: 0, transition: 'color 0.15s',
                }}
                onMouseEnter={e => { if (!refreshing && !loading) e.currentTarget.style.color = MED; }}
                onMouseLeave={e => { e.currentTarget.style.color = DIM; }}
              >
                <IconRefresh spinning={refreshing || loading} />
              </button>
            )}

            <button
              onClick={() => setOpen(false)}
              aria-label="Close tasks"
              style={{
                width: 26, height: 26,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'none', border: 'none', borderRadius: 6,
                cursor: 'pointer', color: DIM, padding: 0, transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = MED; }}
              onMouseLeave={e => { e.currentTarget.style.color = DIM; }}
            >
              <IconClose />
            </button>
          </div>

          {/* ── Body ── */}
          {gtasksConnected ? (
            <>
              <ul style={{ flex: 1, overflowY: 'auto', margin: 0, padding: '4px 0', listStyle: 'none' }}>
                {loading && (
                  <li style={{ padding: '24px 0', textAlign: 'center', color: DIM, fontSize: 12 }}>
                    Loading…
                  </li>
                )}

                {!loading && tasks.length === 0 && (
                  <li style={{ padding: '24px 0', textAlign: 'center', color: DIM, fontSize: 12 }}>
                    No tasks yet — add one below.
                  </li>
                )}

                {!loading && pending.map(task => (
                  <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={edit} onDelete={remove} />
                ))}

                {!loading && completed.length > 0 && (
                  <>
                    <li aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px 4px', listStyle: 'none' }}>
                      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: DIM }}>
                        Completed
                      </span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                      <span style={{ fontSize: 9.5, color: DIM }}>{completed.length}</span>
                    </li>
                    {completed.map(task => (
                      <TaskRow key={task.id} task={task} onToggle={toggle} onEdit={edit} onDelete={remove} />
                    ))}
                  </>
                )}
              </ul>

              <AddTaskInput onAdd={add} />
            </>
          ) : (
            <div style={{ padding: '20px 16px 18px', ...darkVars }}>
              <IntegrationRow
                icon={<IconGoogle />}
                label="Google Tasks"
                connected={false}
                loading={connecting}
                description="Sign in to see and manage your tasks."
                privacyLabel="Read-only data · nothing stored on servers"
                connectLabel="Connect Google"
                onConnect={onConnect}
                onDisconnect={() => { }}
              />
            </div>
          )}
        </div>
      )}

      {/* ── Collapsed pill ───────────────────────────────────────────── */}
      <button
        onClick={() => setOpen(v => !v)}
        aria-label="Toggle tasks panel"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '7px 13px',
          borderRadius: 999,
          background: PILL_BG,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: allDone
            ? '1px solid rgba(74,222,128,0.30)'
            : '1px solid rgba(255,255,255,0.13)',
          color: BRIGHT,
          fontSize: 12,
          fontWeight: 500,
          cursor: 'pointer',
          boxShadow: '0 2px 18px rgba(0,0,0,0.40)',
          transition: 'border-color 0.3s',
          whiteSpace: 'nowrap',
          letterSpacing: '0.01em',
        }}
      >
        {allDone ? (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="6" fill="rgba(74,222,128,0.20)" stroke="rgba(74,222,128,0.70)" strokeWidth="1.2" />
            <path d="M4.5 7l2 2 3-3" stroke="rgba(74,222,128,1)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="6" stroke="rgba(255,255,255,0.35)" strokeWidth="1.2" />
            <path d="M4.5 7l2 2 3-3" stroke="rgba(255,255,255,0.65)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}

        <span style={{ color: allDone ? 'rgba(74,222,128,0.90)' : MED }}>
          {pillLabel(remaining, loading)}
        </span>

        <svg
          width="9" height="9" viewBox="0 0 10 10" fill="none" aria-hidden="true"
          style={{
            opacity: 0.38,
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        >
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};
