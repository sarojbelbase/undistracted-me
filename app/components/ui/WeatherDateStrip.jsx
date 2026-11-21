/**
 * WeatherDateStrip: reusable "weather · date" strip used in the center of
 * Focus Mode's top zone and Note Mode's top bar.
 *
 * Presentational: receives `weather` (from useFocusWeather) and `dateParts`
 * (from getGregorianDateParts / getBikramSambatDateParts) as props so it stays
 * decoupled from where those values originate.
 *
 * `dark` switches between Focus Mode's dark-glass ink tokens and the canvas
 * theme-aware ink tokens. `showYear` appends the year (Focus Mode only).
 * `compact` sizes the strip for tight top bars (Note Mode).
 */

import { getWeatherIcon } from '../../widgets/weather/utils.jsx';

export const WeatherDateStrip = ({
  weather,
  dateParts,
  showWeather = true,
  showDate = true,
  showYear = false,
  dark = false,
  compact = false,
}) => {
  const tempColor = dark ? 'var(--fm-ink-2)' : 'var(--w-ink-1)';
  const dotColor = dark ? 'var(--fm-ink-4)' : 'var(--w-ink-4)';
  const dateColor = dark ? 'var(--fm-ink-2)' : 'var(--w-ink-1)';
  const yearColor = dark ? 'var(--fm-ink-3)' : 'var(--w-ink-3)';

  const tempFont = compact ? '0.8125rem' : 15;
  const dateFont = compact ? '0.8125rem' : 15;
  const dotFont = compact ? '0.75rem' : 14;
  const yearFont = compact ? '0.625rem' : 13;
  const iconSize = compact ? 12 : 14;

  const hasWeather = showWeather && !!weather;
  const hasDate = showDate && !!dateParts;

  if (!hasWeather && !hasDate) return null;

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}>
      {hasWeather && (
        <>
          <span
            style={{
              filter: dark ? 'brightness(0) invert(1)' : 'none',
              opacity: 0.65,
              display: 'flex',
              alignItems: 'center',
              marginRight: 6,
            }}
          >
            {getWeatherIcon(weather.code, weather.isDay, iconSize)}
          </span>
          <span style={{ fontSize: tempFont, fontWeight: 600, color: tempColor, letterSpacing: '-0.01em' }}>
            {weather.temperature}°{weather.unit === 'imperial' ? 'F' : 'C'}
          </span>
        </>
      )}
      {hasWeather && hasDate && (
        <span style={{ fontSize: dotFont, color: dotColor, marginInline: 4 }}>·</span>
      )}
      {hasDate && (
        <>
          <span style={{ fontSize: dateFont, fontWeight: 700, letterSpacing: '0.01em', color: dateColor }}>
            {dateParts.dow}, {dateParts.month} {dateParts.day}
          </span>
          {showYear && (
            <span
              className="fm-topbar-year"
              style={{ fontSize: yearFont, fontWeight: 600, color: yearColor, marginLeft: 7 }}
            >
              {dateParts.year}
            </span>
          )}
        </>
      )}
    </span>
  );
};
