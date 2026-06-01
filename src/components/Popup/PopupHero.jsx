import React from "react";
import { SunriseFill, SunsetFill } from "react-bootstrap-icons";
import { getWeatherIcon } from "../../widgets/weather/utils.jsx";

/**
 * Hero section of the popup — matched to the reference design.
 *
 *   Thu, May 28                      [weather card]
 *   18:45
 *   2083 Jestha 14 BS
 *   end of day, survival documented  [sunset chip]
 */
export const PopupHero = ({
  tm,
  greet,
  en,
  ne,
  weather,
  weatherLoading,
  city,
  isDay,
  sunEvent,
  weatherDesc,
}) => {
  const shortWeekday = en.weekday.slice(0, 3);

  // Compute weather section content outside JSX to avoid nested ternary
  const weatherContent = (() => {
    if (weatherLoading) {
      return (
        <>
          <div className="popup-hero__weather-row">
            <span className="popup-hero__skeleton-icon" />
            <span className="popup-hero__skeleton popup-hero__skeleton--temp" />
          </div>
          <span className="popup-hero__skeleton popup-hero__skeleton--desc" />
          {city && <span className="popup-hero__skeleton popup-hero__skeleton--city" />}
        </>
      );
    }
    if (weather) {
      return (
        <>
          <div className="popup-hero__weather-row">
            {getWeatherIcon(weather.code, weather.isDay ?? isDay ?? true, 20)}
            <span className="popup-hero__temp">{weather.temperature}°</span>
          </div>
          {weatherDesc && <span className="popup-hero__weather-desc">{weatherDesc}</span>}
          {city && <span className="popup-hero__weather-city">{city}</span>}
        </>
      );
    }
    if (city) return <span className="popup-hero__weather-city">{city}</span>;
    return null;
  })();

  return (
    <div className="popup-hero">
      {/* ── Top row: left (date + clock) · right (weather) — same height ── */}
      <div className="popup-hero__top">
        <div className="popup-hero__left">
          <span className="popup-hero__date">
            {shortWeekday}, {en.month} {en.day}{" "}
            <span className="popup-hero__date-bs">&middot; {ne.month} {ne.day}</span>
          </span>
          <span className="popup-hero__clock">{tm}</span>
        </div>

        <div className="popup-hero__weather">
          {weatherContent}
        </div>
      </div>

      {/* ── Bottom row: greeting (left) · sun chip (right) — same height ── */}
      <div className="popup-hero__bottom">
        <div className="popup-hero__greeting">
          <span className="popup-hero__greeting-prefix">{greet.prefix}</span>
          <span className="popup-hero__greeting-label">{greet.label}</span>
        </div>

        {sunEvent && (
          <div className="popup-hero__sun">
            {sunEvent.type === "sunrise" ? (
              <SunriseFill size={11} className="popup-hero__sun-icon--rise" />
            ) : (
              <SunsetFill size={11} className="popup-hero__sun-icon--set" />
            )}
            <span className="popup-hero__sun-label">
              {sunEvent.label} {sunEvent.duration}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
