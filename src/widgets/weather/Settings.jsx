import React, { useState, useEffect, useRef } from 'react';

const API_KEY = import.meta.env.VITE_OWM_API_KEY || null;

export const Settings = ({ location, onChange, locationDenied }) => {
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
