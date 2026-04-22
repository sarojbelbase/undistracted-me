import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { GeoAlt, XCircleFill } from 'react-bootstrap-icons';
import { SegmentedControl } from '../../components/ui/SegmentedControl';
import { SettingsInput } from '../../components/ui/SettingsInput';
import { useLocationStore } from '../../store/useLocationStore';

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const UNIT_OPTIONS = [
  { label: '°C', value: 'metric' },
  { label: '°F', value: 'imperial' },
];

const STYLE_OPTIONS = [
  { label: 'Simple', value: 'simple' },
  { label: 'Expressive', value: 'expressive' },
];

export const Settings = ({ location, onChange, locationDenied, unit = 'metric', style = 'simple' }) => { // style: 'simple' | 'expressive'
  const [query, setQuery] = useState(location?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const [focused, setFocused] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const debounceRef = useRef(null);
  const inputWrapRef = useRef(null);
  const userLat = useLocationStore(s => s.lat);
  const userLon = useLocationStore(s => s.lon);

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
      fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(val)}&count=20&language=en&format=json`)
        .then(r => r.json())
        .then(res => {
          const results = res.results || [];
          if (userLat != null && userLon != null) {
            results.sort((a, b) =>
              haversineKm(userLat, userLon, a.latitude, a.longitude) -
              haversineKm(userLat, userLon, b.latitude, b.longitude)
            );
          }
          setSuggestions(results);
        })
        .catch(() => setSuggestions([]));
    }, 350);
  };

  const select = (item) => {
    const name = [item.name, item.admin1, item.country].filter(Boolean).join(', ');
    setQuery(name);
    setSuggestions([]);
    setFocused(false);
    onChange('location', { name, lat: item.latitude, lon: item.longitude });
  };

  const clearLocation = () => {
    setQuery('');
    setSuggestions([]);
    onChange('location', null);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Display style ── */}
      <SegmentedControl
        label="Display"
        options={STYLE_OPTIONS}
        value={style}
        onChange={(v) => onChange('style', v)}
      />

      {/* ── Temperature unit ── */}
      <SegmentedControl
        label="Temperature"
        options={UNIT_OPTIONS}
        value={unit}
        onChange={(v) => onChange('unit', v)}
      />

      {/* ── Location ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="w-label">Location</span>
          {import.meta.env.VITE_DEBUG_MODE === 'true' && (
            <span className="text-[10px] font-mono" style={{ color: 'var(--w-ink-4)' }}>
              {userLat != null && userLon != null
                ? `${userLat.toFixed(2)}, ${userLon.toFixed(2)}`
                : '-, -'}
            </span>
          )}
        </div>

        <SettingsInput
          id="weather-location"
          name="weather-location"
          wrapperRef={inputWrapRef}
          icon={<GeoAlt size={13} />}
          type="text"
          placeholder="Search city…"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => setFocused(true)}
          suffix={
            query ? (
              <button
                onClick={clearLocation}
                className="shrink-0 transition-opacity hover:opacity-60 cursor-pointer"
                style={{ color: 'var(--w-ink-5)', background: 'none', border: 'none', padding: 0, lineHeight: 0 }}
                aria-label="Clear location"
              >
                <XCircleFill size={12} />
              </button>
            ) : null
          }
        />

        {/* Helper text */}
        <p className="text-[11px] leading-snug" style={{ color: 'var(--w-ink-4)' }}>
          {(() => {
            if (location) return `Showing weather for ${location.name}`;
            if (locationDenied) return 'Location access denied — search above to set manually';
            return 'Using your current location';
          })()}
        </p>
      </div>

      {/* Suggestions rendered as a portal to escape modal overflow clipping */}
      {suggestions.length > 0 && createPortal(
        <ul
          className="rounded-xl shadow-xl overflow-hidden py-1"
          style={{ ...dropdownStyle, background: 'var(--card-bg)', backdropFilter: 'var(--card-blur)', WebkitBackdropFilter: 'var(--card-blur)', border: '1px solid var(--card-border)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
        >
          {suggestions.map((item, i) => {
            const name = [item.name, item.admin1, item.country].filter(Boolean).join(', ');
            return (
              <li key={item.id ?? name}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); select(item); }}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-xs cursor-pointer transition-colors hover:bg-[rgba(0,0,0,0.05)]"
                  style={{ color: 'var(--w-ink-2)', background: 'none', border: 'none', textAlign: 'left' }}
                >
                  <GeoAlt size={11} style={{ color: 'var(--w-ink-4)', flexShrink: 0 }} />
                  <span className="truncate">{name}</span>
                </button>
              </li>
            );
          })}
        </ul>,
        document.body
      )}

    </div>
  );
};

