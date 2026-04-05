import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GeoAlt, XCircleFill } from 'react-bootstrap-icons';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

const API_KEY = import.meta.env.VITE_OWM_API_KEY || null;

const UNIT_OPTIONS = [
  { label: '°C', value: 'metric' },
  { label: '°F', value: 'imperial' },
];

export const Settings = ({ location, onChange, locationDenied, unit = 'metric' }) => {
  const [query, setQuery] = useState(location?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const debounceRef = useRef(null);
  const inputWrapRef = useRef(null);

  useEffect(() => {
    setQuery(location?.name || '');
  }, [location]);

  // Position the portal dropdown to sit below the input
  useEffect(() => {
    if (!focused || !inputWrapRef.current) return;
    const r = inputWrapRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: r.bottom + 6,
      left: r.left,
      width: r.width,
      zIndex: 9999,
    });
  }, [focused, suggestions]);

  // Close on outside click
  useEffect(() => {
    if (!focused) return;
    const handler = (e) => {
      if (inputWrapRef.current && !inputWrapRef.current.contains(e.target)) {
        setSuggestions([]);
        setFocused(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [focused]);

  const handleInput = (val) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(() => {
      fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(val)}&limit=5&appid=${API_KEY}`)
        .then(r => r.json())
        .then(results => setSuggestions(results || []))
        .catch(() => setSuggestions([]));
    }, 350);
  };

  const select = (item) => {
    const name = [item.name, item.state, item.country].filter(Boolean).join(', ');
    setQuery(name);
    setSuggestions([]);
    setFocused(false);
    onChange('location', { name, lat: item.lat, lon: item.lon });
  };

  const clearLocation = () => {
    setQuery('');
    setSuggestions([]);
    onChange('location', null);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Temperature unit ── */}
      <SegmentedControl
        label="Temperature"
        options={UNIT_OPTIONS}
        value={unit}
        onChange={(v) => onChange('unit', v)}
      />

      {/* ── Location ── */}
      <div className="flex flex-col gap-2">
        <span className="w-label">Location</span>

        <div
          ref={inputWrapRef}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            width: '100%',
            boxSizing: 'border-box',
            borderRadius: '12px',
            padding: '0 12px',
            height: '40px',
            backgroundColor: 'var(--w-surface-2)',
          }}
        >
          <GeoAlt size={13} style={{ color: 'var(--w-ink-5)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search city…"
            value={query}
            onChange={e => handleInput(e.target.value)}
            onFocus={() => setFocused(true)}
            style={{
              flex: 1,
              minWidth: 0,
              fontSize: '12px',
              background: 'transparent',
              outline: 'none',
              border: 'none',
              color: 'var(--w-ink-1)',
              caretColor: 'var(--w-accent)',
            }}
          />
          {query && (
            <button
              onClick={clearLocation}
              className="shrink-0 transition-opacity hover:opacity-60 cursor-pointer"
              style={{ color: 'var(--w-ink-5)', background: 'none', border: 'none', padding: 0, lineHeight: 0 }}
              aria-label="Clear location"
            >
              <XCircleFill size={12} />
            </button>
          )}
        </div>

        {/* Helper text */}
        <p className="text-[11px] leading-snug" style={{ color: 'var(--w-ink-5)' }}>
          {location
            ? `Showing weather for ${location.name}`
            : locationDenied
              ? 'Location access denied — search above to set manually'
              : 'Using your current location'}
        </p>
      </div>

      {/* Suggestions rendered as a portal to escape modal overflow clipping */}
      {suggestions.length > 0 && createPortal(
        <ul
          className="rounded-xl shadow-xl overflow-hidden py-1"
          style={{ ...dropdownStyle, backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}
        >
          {suggestions.map((item, i) => {
            const name = [item.name, item.state, item.country].filter(Boolean).join(', ');
            return (
              <li
                key={i}
                onMouseDown={(e) => { e.preventDefault(); select(item); }}
                className="flex items-center gap-2 px-3 py-2.5 text-xs cursor-pointer transition-colors hover:bg-[var(--w-surface-2)]"
                style={{ color: 'var(--w-ink-2)' }}
              >
                <GeoAlt size={11} style={{ color: 'var(--w-ink-5)', flexShrink: 0 }} />
                <span className="truncate">{name}</span>
              </li>
            );
          })}
        </ul>,
        document.body
      )}

    </div>
  );
};

