/**
 * Search engine definitions — shared between the Focus Mode Search Bar
 * and the Canvas Command Palette.
 */
import React from 'react';

export const ENGINES = [
  {
    id: 'google', label: 'Google',
    url: 'https://www.google.com/search?q=',
    suggest: 'https://suggestqueries.google.com/complete/search?client=chrome&q=',
  },
  {
    id: 'ddg', label: 'DuckDuckGo',
    url: 'https://duckduckgo.com/?q=',
    suggest: 'https://ac.duckduckgo.com/ac/?q=',
  },
  {
    id: 'youtube', label: 'YouTube',
    url: 'https://www.youtube.com/results?search_query=',
    suggest: 'https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=',
  },
  {
    id: 'perplexity', label: 'Perplexity',
    url: 'https://www.perplexity.ai/search?q=',
    suggest: null,
  },
];

export const SEARCH_ENGINE_KEY = 'fm_search_engine';

/** Cycle to the next engine and persist. Returns the new engine id. */
export function cycleEngine(currentId) {
  const idx = ENGINES.findIndex(e => e.id === currentId);
  const next = ENGINES[(idx + 1) % ENGINES.length];
  localStorage.setItem(SEARCH_ENGINE_KEY, next.id);
  return next.id;
}

/** Returns navigable URL if query looks like a URL, else null. */
export function detectUrl(q) {
  const s = q.trim();
  if (!s || s.includes(' ')) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}/.test(s)) return `https://${s}`;
  return null;
}

export const EngineIcon = ({ id, size = 14 }) => {
  const icons = {
    google: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
    ddg: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="12" fill="#DE5833" />
        <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="white">D</text>
      </svg>
    ),
    youtube: (
      <svg width={size} height={size} viewBox="0 0 24 24">
        <rect width="24" height="24" rx="5" fill="#FF0000" />
        <polygon points="9.5,7.5 18,12 9.5,16.5" fill="white" />
      </svg>
    ),
    perplexity: (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#20B2AA" />
        <line x1="12" y1="5" x2="12" y2="19" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="5" y1="12" x2="19" y2="12" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
        <line x1="7.2" y1="7.2" x2="16.8" y2="16.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16.8" y1="7.2" x2="7.2" y2="16.8" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  };
  return icons[id] ?? null;
};
