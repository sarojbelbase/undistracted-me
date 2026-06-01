/**
 * BlockedSites — settings section for managing blocked domains.
 *
 * Features:
 *   - List of blocked domains with countdown timer
 *   - Add domain input with duration presets
 *   - Clear all button
 *
 * Used in the General settings panel.
 */

import React, { useState, useEffect } from 'react';
import { Trash3Fill, PlusLg, ClockFill } from 'react-bootstrap-icons';
import { getBlockedSites, blockSite, clearBlockedSites } from '../../utilities/siteBlocker';
import { ConfirmButton } from '../ui/ConfirmButton';

const SectionLabel = ({ children }) => (
  <p style={{
    fontSize: 10, fontWeight: 700, letterSpacing: '0.09em',
    textTransform: 'uppercase', color: 'var(--w-ink-3)', marginBottom: 8,
  }}>
    {children}
  </p>
);

const TIMER_PRESETS = [
  { label: '30m', mins: 30 },
  { label: '1h', mins: 60 },
  { label: '2h', mins: 120 },
  { label: '4h', mins: 240 },
  { label: '8h', mins: 480 },
];

export const BlockedSites = () => {
  const [sites, setSites] = useState(() => getBlockedSites());
  const [input, setInput] = useState('');
  const [adding, setAdding] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick `now` every second for countdown display
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Refresh site list once on mount
  useEffect(() => {
    setSites(getBlockedSites());
  }, []);

  const handleAdd = async (mins) => {
    const domain = input.trim().toLowerCase();
    if (!domain) return;
    await blockSite(domain, mins);
    setSites(getBlockedSites());
    setInput('');
    setAdding(false);
  };

  const handleClearAll = async () => {
    await clearBlockedSites();
    setSites([]);
  };

  const fmtRemaining = (site) => {
    if (site.infinite) return null; // no countdown for infinite blocks
    if (site.blockedUntil == null) return null;
    const ms = site.blockedUntil - now;
    if (ms <= 0) return 'Expired';
    const m = Math.ceil(ms / 60000);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
    }
    return `${m}m`;
  };

  const hasInput = input.trim().length > 0;
  const siteLabel = sites.length === 1 ? '1 site blocked' : `${sites.length} sites blocked`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* Header */}
      <div>
        <SectionLabel>Blocked Sites</SectionLabel>
        <p style={{ fontSize: 10.5, color: 'var(--w-ink-5)', marginTop: -4, lineHeight: '1.4' }}>
          {sites.length === 0
            ? 'No sites blocked. Use the popup to block distracting sites.'
            : siteLabel}
        </p>
      </div>

      {/* Blocked sites list */}
      {sites.length > 0 && (
        <div style={{
          display: 'flex', flexDirection: 'column',
          borderRadius: 12,
          border: '1px solid var(--card-border)',
          overflow: 'hidden',
        }}>
          {sites.map((site, i) => {
            const isLast = i === sites.length - 1;
            const remaining = fmtRemaining(site);
            return (
              <div
                key={site.domain}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 12px',
                  background: 'var(--panel-bg)',
                  borderBottom: isLast ? 'none' : '1px solid var(--card-border)',
                }}
              >
                <div style={{
                  width: 26, height: 26, borderRadius: 7, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'color-mix(in srgb, var(--w-accent) 12%, transparent)',
                  color: 'var(--w-accent)',
                  fontSize: 12,
                }}>
                  🛡️
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--w-ink-2)' }}>
                    {site.domain}
                  </p>
                </div>
                {remaining && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    fontSize: 10.5, fontWeight: 600,
                    color: remaining === 'Expired'
                      ? 'var(--w-danger)'
                      : 'var(--w-accent)',
                    flexShrink: 0,
                  }}>
                    <ClockFill size={10} />
                    <span>{remaining}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add domain input */}
      {adding ? (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 8,
          padding: 10, borderRadius: 10,
          background: 'var(--panel-bg)',
          border: '1px solid var(--card-border)',
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') { setAdding(false); setInput(''); }
              if (e.key === 'Enter' && hasInput) handleAdd(TIMER_PRESETS[1].mins);
            }}
            placeholder="e.g. twitter.com"
            autoFocus
            style={{
              padding: '7px 10px', borderRadius: 8,
              border: '1px solid var(--card-border)',
              background: 'var(--card-bg)',
              color: 'var(--w-ink-1)',
              fontSize: 11.5, outline: 'none',
              transition: 'border-color 0.15s',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--w-accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--card-border)'; }}
          />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4 }}>
            {TIMER_PRESETS.map((p) => (
              <button
                key={p.mins}
                type="button"
                onClick={() => handleAdd(p.mins)}
                disabled={!hasInput}
                style={{
                  padding: '6px 4px', borderRadius: 7,
                  border: hasInput
                    ? '1px solid color-mix(in srgb, var(--w-accent) 30%, transparent)'
                    : '1px solid transparent',
                  cursor: hasInput ? 'pointer' : 'default',
                  fontSize: 10.5, fontWeight: 600,
                  background: hasInput
                    ? 'color-mix(in srgb, var(--w-accent) 12%, transparent)'
                    : 'rgba(0,0,0,0.04)',
                  color: hasInput ? 'var(--w-accent)' : 'var(--w-ink-5)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  if (!hasInput) return;
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--w-accent) 20%, transparent)';
                }}
                onMouseLeave={(e) => {
                  if (!hasInput) return;
                  e.currentTarget.style.background = 'color-mix(in srgb, var(--w-accent) 12%, transparent)';
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            padding: '8px 0', borderRadius: 10,
            border: '1px dashed var(--card-border)',
            background: 'transparent', cursor: 'pointer',
            fontSize: 11, fontWeight: 600,
            color: 'var(--w-ink-4)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--w-accent)';
            e.currentTarget.style.borderColor = 'var(--w-accent)';
            e.currentTarget.style.background = 'color-mix(in srgb, var(--w-accent) 5%, transparent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--w-ink-4)';
            e.currentTarget.style.borderColor = 'var(--card-border)';
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <PlusLg size={10} /> Add domain
        </button>
      )}

      {/* Clear all — always visible when sites exist */}
      {sites.length > 0 && (
        <div style={{
          display: 'flex', justifyContent: 'center',
          padding: '4px 0',
        }}>
          <ConfirmButton
            onConfirm={handleClearAll}
            label="Clear all blocked sites"
            danger
            style={{
              fontSize: 10.5, fontWeight: 600,
              background: 'none', border: 'none', padding: 0,
              color: 'var(--w-ink-5)',
              cursor: 'pointer',
            }}
          >
            <Trash3Fill size={10} />
            <span style={{ marginLeft: 4 }}>Clear all blocked sites</span>
          </ConfirmButton>
        </div>
      )}
    </div>
  );
};

export default BlockedSites;
