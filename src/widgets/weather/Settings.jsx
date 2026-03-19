import React, { useState, useEffect, useRef } from 'react';

const API_KEY = import.meta.env.VITE_OWM_API_KEY || null;

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
      <span className="w-label">Temperature</span>
      <div className="flex gap-1.5">
        {[{ value: 'metric', label: '°C' }, { value: 'imperial', label: '°F' }].map(({ value, label }) => (
          <button
            key={value}
            onMouseDown={e => e.stopPropagation()}
            onClick={() => onChange('unit', value)}
            className="flex-1 py-1 rounded-lg text-xs font-medium transition-all"
            style={unit === value
              ? { backgroundColor: 'var(--w-accent)', color: 'var(--w-accent-fg)' }
              : { backgroundColor: 'var(--w-surface-2)', color: 'var(--w-ink-4)', border: '1px solid var(--w-border)' }}
          >
            {label}
          </button>
        ))}
      </div>

      <span className="w-label">Set Location</span>
      <div className="relative">
        <input
          type="text"
          placeholder="Type location name"
          value={query}
          onChange={e => handleInput(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 w-44 outline-none focus:border-gray-400 transition-colors"
        />
        {suggestions.length > 0 && (
          <ul className="absolute left-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden">
            {suggestions.map((item, i) => (
              <li
                key={i}
                onClick={() => select(item)}
                className="px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 cursor-pointer truncate"
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
