import { useState, useEffect, useRef } from 'react';
import { SegmentedControl } from '../../components/ui/SegmentedControl';

const API_KEY = import.meta.env.VITE_OWM_API_KEY || null;

const UNIT_OPTIONS = [
  { label: '°C', value: 'metric' },
  { label: '°F', value: 'imperial' },
];

export const Settings = ({ location, onChange, locationDenied, unit = 'metric' }) => {
  const [query, setQuery] = useState(location?.name || '');
  const [suggestions, setSuggestions] = useState([]);
  const debounceRef = useRef(null);

  useEffect(() => {
    setQuery(location?.name || '');
  }, [location]);

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
    onChange('location', { name, lat: item.lat, lon: item.lon });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Unit toggle */}
      <SegmentedControl
        label="Temperature"
        options={UNIT_OPTIONS}
        value={unit}
        onChange={(v) => onChange('unit', v)}
      />

      <span className="w-label">Set Location</span>
      <div className="relative">
        <input
          type="text"
          placeholder="Type location name"
          value={query}
          onChange={e => handleInput(e.target.value)}
          className="text-sm rounded-lg px-2 py-1.5 w-44 outline-none transition-colors"
          style={{ border: '1px solid var(--w-border)', backgroundColor: 'var(--w-surface)', color: 'var(--w-ink-1)' }}
        />
        {suggestions.length > 0 && (
          <ul className="absolute left-0 top-full mt-1 w-44 rounded-lg shadow-lg z-30 overflow-hidden" style={{ backgroundColor: 'var(--w-surface)', border: '1px solid var(--w-border)' }}>
            {suggestions.map((item, i) => (
              <li
                key={i}
                onClick={() => select(item)}
                className="px-2 py-1.5 text-xs cursor-pointer truncate transition-colors"
                style={{ color: 'var(--w-ink-2)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--w-surface-2)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
              >
                {[item.name, item.state, item.country].filter(Boolean).join(', ')}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
