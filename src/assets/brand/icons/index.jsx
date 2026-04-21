/**
 * Brand icons — single source of truth for all third-party service logos.
 *
 * Each component accepts an optional `size` prop (default 18).
 * Import from here everywhere — never inline brand SVGs in component files.
 *
 * Usage:
 *   import { GoogleIcon, SpotifyIcon, SoundCloudIcon } from '../../assets/brand/icons';
 */

import React from 'react';

// ─── Google ───────────────────────────────────────────────────────────────────
// The official multicolour "G" mark. Renders the paths only — pair with a
// white/light background container for best visibility on dark surfaces.

export const GoogleIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#FFC107" d="M43.6 20H24v8h11.3c-1.1 5.4-5.9 9-11.3 9-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.7 1.1 7.8 2.9L37.4 9.4C33.8 6.1 29.1 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c11 0 20-8 20-20 0-1.3-.1-2.7-.4-4z" />
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.5 16 19 13 24 13c3 0 5.7 1.1 7.8 2.9L37.4 9.4C33.8 6.1 29.1 4 24 4c-7.9 0-14.8 4.3-18.7 10.7z" />
    <path fill="#4CAF50" d="M24 44c5 0 9.6-1.9 13-5l-6-5.2C29.2 35.6 26.7 36 24 36c-5.3 0-10.1-3.5-11.3-8.8l-6.5 5C9.2 39.6 16 44 24 44z" />
    <path fill="#1976D2" d="M43.6 20H24v8h11.3c-.5 2.4-1.8 4.5-3.6 6l6 5.2C41 35.5 44 30.1 44 24c0-1.3-.1-2.7-.4-4z" />
  </svg>
);

// ─── Spotify ──────────────────────────────────────────────────────────────────
// Full Spotify logomark: green circle + white wave arcs (official brand).

export const SpotifyIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <circle cx="12" cy="12" r="12" fill="#1DB954" />
    <path
      fill="white"
      d="M17.9 10.9C14.7 9 9.35 8.8 6.3 9.75c-.5.15-1-.15-1.15-.6-.15-.5.15-1 .6-1.15 3.55-1.05 9.4-.85 13.1 1.35.45.25.6.85.35 1.3-.25.35-.85.5-1.3.25zm-.1 2.8c-.25.35-.7.5-1.05.25-2.7-1.65-6.8-2.15-9.95-1.15-.4.1-.85-.1-.95-.5-.1-.4.1-.85.5-.95 3.65-1.1 8.15-.55 11.25 1.35.3.15.45.65.2 1zm-1.2 2.75c-.2.3-.55.4-.85.2-2.35-1.45-5.3-1.75-8.8-.95-.35.1-.65-.15-.75-.45-.1-.35.15-.65.45-.75 3.8-.85 7.1-.5 9.7 1.1.3.15.4.55.25.85z"
    />
  </svg>
);

// ─── SoundCloud ───────────────────────────────────────────────────────────────
// SoundCloud brand colour (#FF5500) square with a white music note.
// Keeps the same rounded-square container pattern as SpotifyIcon.

export const SoundCloudIcon = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <rect width="24" height="24" rx="5" fill="#FF5500" />
    {/* music note — centred in the square */}
    <path
      fill="white"
      d="M15 6.5v8.08A3 3 0 1 1 13 12V8.27l-5 1.11V15a3 3 0 1 1-2-2.83V8.5a1 1 0 0 1 .78-.976l7-1.556A1 1 0 0 1 15 6.5z"
    />
  </svg>
);
