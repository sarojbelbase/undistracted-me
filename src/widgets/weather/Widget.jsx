import React, { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { BaseWidget } from "../BaseWidget";
import config from "./config";
import { useWidgetSettings } from "../useWidgetSettings";
import { Settings } from "./Settings";
import { GeoAlt, SunriseFill, SunsetFill } from "react-bootstrap-icons";

import { getSunTimes } from "../../utilities/sunTime";

// ── Solar event logic ─────────────────────────────────────────────────────────
/**
 * Returns the single *next* solar event for the given coordinates:
 *  - Before today's sunrise  → today's sunrise, label "sunrise"
 *  - Daytime (between events) → today's sunset,  label "sunset"
 *  - Past today's sunset      → tomorrow's sunrise, label "tmr"
 */
function getNextSunEvent(lat, lon) {
  const now = new Date();
  const today = getSunTimes(lat, lon, now);
  if (!today) return null;
  if (now < today.sunrise) {
    return { time: today.sunrise, label: "sunrise", isSunrise: true };
  }
  if (now < today.sunset) {
    return { time: today.sunset, label: "sunset", isSunrise: false };
  }
  const tmrDate = new Date(now);
  tmrDate.setDate(tmrDate.getDate() + 1);
  const tmr = getSunTimes(lat, lon, tmrDate);
  if (!tmr) return null;
  return { time: tmr.sunrise, label: "tmr", isSunrise: true };
}
import {
  getWeatherIcon,
  getAQILevel,
} from "./utils.jsx";
import { useLocationStore } from "../../store/useLocationStore";
import { useWeather } from "../../hooks/useWeather";
import { getWeatherQuip } from "../../data/weatherQuips";
import {
  WeatherAtmosphere,
  getAtmosphereLabel,
} from "../../components/ui/WeatherAtmosphere.jsx";
import { Popup } from "../../components/ui/Popup.jsx";

// ── Skeleton blocks ───────────────────────────────────────────────────────────

const Bone = ({ width, height, className = "" }) => (
  <div
    className={`animate-pulse rounded ${className}`}
    style={{ width, height, backgroundColor: "var(--panel-bg)", flexShrink: 0 }}
  />
);

const ExpressiveSkeleton = () => (
  <div
    className="flex flex-col w-full h-full min-w-0 justify-center"
    style={{ gap: "0.4rem" }}
  >
    <Bone width="7rem" height="1.4rem" />
    <Bone width="5.5rem" height="1.1rem" />
    <Bone width="4.5rem" height="1.1rem" />
    <Bone width="6rem" height="1.1rem" className="mt-1" />
    <Bone width="9rem" height="0.75rem" className="mt-1" />
  </div>
);

const MinimalSkeleton = () => (
  <div className="flex flex-col w-full h-full animate-pulse">
    <div className="flex items-center gap-2.5">
      <Bone width="2rem" height="2rem" className="rounded-lg" />
      <Bone width="6rem" height="0.95rem" />
    </div>
    <div style={{ flex: 1 }} />
    <Bone width="6.5rem" height="4rem" className="rounded-xl" />
    <div style={{ flex: 1 }} />
    <Bone width="4.5rem" height="1.4rem" className="rounded-lg" />
  </div>
);

// ── Sunrise / Sunset strip ────────────────────────────────────────────────────
const fmtSunTime = (d) =>
  d
    .toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

const SunriseSunset = ({ sunTimes }) => {
  if (!sunTimes) return null;
  return (
    <div
      aria-label={`Sunrise ${fmtSunTime(sunTimes.sunrise)}, sunset ${fmtSunTime(sunTimes.sunset)}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45em",
        flexShrink: 0,
      }}
    >
      <span
        aria-hidden
        style={{ display: "flex", alignItems: "center", gap: "0.22em" }}
      >
        <SunriseFill size={8} style={{ color: "#f59e0b", flexShrink: 0 }} />
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 600,
            color: "var(--w-ink-4)",
            lineHeight: 1,
          }}
        >
          {fmtSunTime(sunTimes.sunrise)}
        </span>
      </span>
      <span
        aria-hidden
        style={{ fontSize: "0.5rem", color: "var(--w-ink-5)", lineHeight: 1 }}
      >
        ·
      </span>
      <span
        aria-hidden
        style={{ display: "flex", alignItems: "center", gap: "0.22em" }}
      >
        <SunsetFill size={8} style={{ color: "#8b5cf6", flexShrink: 0 }} />
        <span
          style={{
            fontSize: "0.62rem",
            fontWeight: 600,
            color: "var(--w-ink-4)",
            lineHeight: 1,
          }}
        >
          {fmtSunTime(sunTimes.sunset)}
        </span>
      </span>
    </div>
  );
};

// ── AQI breathing-dot badge ──────────────────────────────────────────────────
/**
 * A pulsing coloured dot + AQI number that reveals a popup with the level
 * label and PM2.5 reading on hover. Used in both Minimal and Expressive views.
 */
const AQIBadge = ({ value, pm25 }) => {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const level = getAQILevel(value);
  if (!level || value == null) return null;

  return (
    <>
      <div
        ref={ref}
        role="img"
        aria-label={`Air quality: ${level.label}, AQI ${value}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.28em",
          cursor: "default",
          flexShrink: 0,
          userSelect: "none",
        }}
        onMouseEnter={() =>
          setAnchor(ref.current?.getBoundingClientRect() ?? null)
        }
        onMouseLeave={() => setAnchor(null)}
      >
        {/* Breathing dot — colour encodes severity at a glance */}
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: level.color,
            flexShrink: 0,
            animation: "aqi-breathe 2.8s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "0.65rem",
            fontWeight: 700,
            color: "var(--w-ink-3)",
            lineHeight: 1,
          }}
        >
          {value}
        </span>
      </div>

      {/* Hover popup — shows level label + PM2.5 */}
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1.5">
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: level.color,
              whiteSpace: "nowrap",
            }}
          >
            {level.label}
          </div>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--w-ink-4)",
              marginTop: "1px",
              whiteSpace: "nowrap",
            }}
          >
            AQI {value}
            {pm25 != null ? ` · PM2.5 ${pm25} μg/m³` : ""}
          </div>
        </Popup>
      )}
    </>
  );
};

// ── Precipitation probability mini-bar chart ──────────────────────────────────
/**
 * Shows the hourly pop% array that caused a clearing/incoming forecast decision.
 * Active bars (before the event hour) fade proportionally to their pop value;
 * bars after the event are flat — making the transition visually obvious.
 */
const PrecipBarItem = ({ pop, i, isActive }) => {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const show = () => setAnchor(ref.current?.getBoundingClientRect() ?? null);
  const hide = () => setAnchor(null);
  const barHeight = `${Math.max(2, Math.round((pop / 100) * 16))}px`;
  const barOpacity = isActive ? Math.max(0.2, pop / 100) : 1;
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`+${i}h: ${pop}%`}
        className={`wthr-precip-bar ${isActive ? "wthr-precip-bar--active" : "wthr-precip-bar--inactive"}`}
        style={{ height: barHeight, opacity: barOpacity }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      />
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span className="wthr-precip-popup__text">
            {`+${i}h: ${pop}%`}
          </span>
        </Popup>
      )}
    </>
  );
};

const PrecipBars = ({ popSlots, eventHour }) => (
  <div
    className="wthr-precip-bars"
    aria-label="Hourly precipitation probability"
  >
    {popSlots.map((pop, i) => (
      <PrecipBarItem
        key={`${i}-${pop}`}
        pop={pop}
        i={i}
        isActive={i < eventHour}
      />
    ))}
    <span
      style={{
        fontSize: "0.6rem",
        color: "var(--w-ink-5)",
        marginLeft: "4px",
        lineHeight: 1,
        alignSelf: "flex-end",
        whiteSpace: "nowrap",
      }}
    >
      now → +{popSlots.length - 1}h
    </span>
  </div>
);

// ── Forecast duration label ────────────────────────────────────────────────────
function getForecastLabel(forecast) {
  const h = forecast.hours;
  const hourUnit = h === 1 ? "hour" : "hours";
  if (forecast.type === "clearing" || forecast.type === "incoming")
    return `in ${h} ${hourUnit}`;
  return `for next ${h} ${hourUnit}`;
}

// ── Widget state views (error / empty) ───────────────────────────────────────
const LocationDeniedState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
    <GeoAlt size={22} style={{ color: "var(--w-ink-4)", opacity: 0.65 }} />
    <p className="w-muted font-semibold">Location needed</p>
    <p className="w-caption leading-relaxed">
      Open{" "}
      <span className="font-semibold" style={{ color: "var(--w-ink-3)" }}>
        Settings
      </span>{" "}
      to search for your city.
    </p>
  </div>
);

const ErrorState = ({ onRetry }) => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
    <GeoAlt size={22} style={{ color: "var(--w-ink-4)", opacity: 0.65 }} />
    <p className="w-muted font-semibold">Couldn&apos;t load weather</p>
    <p className="w-caption leading-relaxed">
      Check your connection or location.
    </p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="mt-1 text-xs font-semibold px-3 py-1.5 rounded-full transition-opacity hover:opacity-75"
        style={{
          background: "color-mix(in srgb, var(--w-accent) 14%, transparent)",
          color: "var(--w-accent)",
        }}
      >
        Try again
      </button>
    )}
  </div>
);

// ── Minimal-mode AQI chip — dot + level label, hover for number + PM2.5 ──────
const MinimalAQIChip = ({ value, pm25 }) => {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  const level = getAQILevel(value);
  if (!level || value == null) return null;
  return (
    <>
      <div
        ref={ref}
        role="img"
        aria-label={`Air quality: ${level.label}, AQI ${value}`}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.25em",
          cursor: "default",
          userSelect: "none",
          flexShrink: 0,
        }}
        onMouseEnter={() =>
          setAnchor(ref.current?.getBoundingClientRect() ?? null)
        }
        onMouseLeave={() => setAnchor(null)}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 6,
            height: 6,
            borderRadius: "50%",
            backgroundColor: level.color,
            flexShrink: 0,
            animation: "aqi-breathe 2.8s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "0.7rem",
            fontWeight: 600,
            color: level.color,
            lineHeight: 1,
          }}
        >
          {level.label}
        </span>
      </div>
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1.5">
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: level.color,
              whiteSpace: "nowrap",
            }}
          >
            {level.label}
          </div>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--w-ink-4)",
              marginTop: "1px",
              whiteSpace: "nowrap",
            }}
          >
            AQI {value}
            {pm25 != null ? ` · PM2.5 ${pm25} μg/m³` : ""}
          </div>
        </Popup>
      )}
    </>
  );
};
// ── Minimal mode — Apple Weather-style ───────────────────────────────────────
// Layout: condition at top · hero temp centred · bottom row (city+AQI left / sun event right)
const MinimalView = ({
  weather,
  cityShort,
  unitLabel,
  aqi,
  showAQI,
  sunEvent,
  showSunTimes,
}) => (
  <div className="weather-minimal flex flex-col w-full h-full">
    {/* Row 1 — icon + condition (left) · AQI (right) */}
    <div
      className="flex items-center gap-1.5"
      style={{ justifyContent: "space-between" }}
    >
      <div
        className="flex items-center gap-1.5 opacity-90"
        style={{ minWidth: 0 }}
      >
        {getWeatherIcon(weather.code, weather.isDay, 24)}
        <span className="weather-minimal__condition">
          {weather.description}
        </span>
      </div>
      {showAQI && aqi?.value != null && (
        <MinimalAQIChip value={aqi.value} pm25={aqi.pm25} />
      )}
    </div>

    {/* Centre zone — hero temperature, vertically centred */}
    <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
      <div
        aria-label={`${weather.temperature} degrees ${unitLabel === "C" ? "Celsius" : "Fahrenheit"}`}
        className="weather-minimal__temp"
      >
        {weather.temperature}°
      </div>
    </div>

    {/* Bottom row — city (left) · sun event (right) */}
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "space-between",
        gap: "0.5em",
      }}
    >
      {/* Left: city name */}
      <div style={{ minWidth: 0, flex: 1 }}>
        {cityShort ? (
          <div className="weather-minimal__city">{cityShort}</div>
        ) : (
          <div className="weather-minimal__unit">
            {unitLabel === "C" ? "°C" : "°F"}
          </div>
        )}
      </div>

      {/* Right: next solar event — time on top, label below */}
      {showSunTimes && sunEvent && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            flexShrink: 0,
            gap: "0.18em",
          }}
        >
          <div
            aria-label={`${sunEvent.label} at ${fmtSunTime(sunEvent.time)}`}
            style={{ display: "flex", alignItems: "center", gap: "0.22em" }}
          >
            {sunEvent.isSunrise ? (
              <SunriseFill
                size={10}
                style={{ color: "rgba(245,158,11,0.9)", flexShrink: 0 }}
              />
            ) : (
              <SunsetFill
                size={10}
                style={{ color: "rgba(139,92,246,0.9)", flexShrink: 0 }}
              />
            )}
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 700,
                color: "var(--w-ink-2)",
                lineHeight: 1,
              }}
            >
              {fmtSunTime(sunEvent.time)}
            </span>
          </div>
          <span
            aria-hidden
            style={{
              fontSize: "0.58rem",
              fontWeight: 500,
              color: "var(--w-ink-4)",
              lineHeight: 1,
            }}
          >
            {sunEvent.label}
          </span>
        </div>
      )}
    </div>
  </div>
);

const AQIBadgeExtended = ({ aqi, aqiLevel }) => {
  const ref = useRef(null);
  const [anchor, setAnchor] = useState(null);
  return (
    <>
      <div
        ref={ref}
        onMouseEnter={() =>
          setAnchor(ref.current?.getBoundingClientRect() ?? null)
        }
        onMouseLeave={() => setAnchor(null)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.3em",
          cursor: "default",
          userSelect: "none",
        }}
      >
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: 5,
            height: 5,
            borderRadius: "50%",
            backgroundColor: aqiLevel.color,
            flexShrink: 0,
            animation: "aqi-breathe 2.8s ease-in-out infinite",
          }}
        />
        <span
          style={{
            fontSize: "0.78rem",
            fontWeight: 700,
            color: aqiLevel.color,
            lineHeight: 1,
          }}
        >
          {aqi.value}
        </span>
        <span
          style={{
            fontSize: "0.68rem",
            fontWeight: 500,
            color: "var(--w-ink-5)",
            lineHeight: 1,
          }}
        >
          {aqiLevel.label}
        </span>
      </div>
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1.5">
          <div
            style={{
              fontSize: "0.72rem",
              fontWeight: 700,
              color: aqiLevel.color,
              whiteSpace: "nowrap",
            }}
          >
            {aqiLevel.label}
          </div>
          <div
            style={{
              fontSize: "0.65rem",
              fontWeight: 500,
              color: "var(--w-ink-4)",
              marginTop: "1px",
              whiteSpace: "nowrap",
            }}
          >
            AQI {aqi.value}
            {aqi.pm25 != null ? ` · PM2.5 ${aqi.pm25} μg/m³` : ""}
          </div>
        </Popup>
      )}
    </>
  );
};

const ExpressiveView = ({
  weather,
  forecast,
  unitLabel,
  quip,
  cityShort,
  atmoAnchor,
  setAtmoAnchor,
  aqi,
  showAQI,
  sunEvent,
  showSunTimes,
}) => {
  // Pre-compute level so JSX below only calls getAQILevel once
  const aqiLevel =
    showAQI && aqi?.value != null ? getAQILevel(aqi.value) : null;
  return (
    <div
      className="flex flex-col w-full h-full min-w-0 relative"
      style={{ letterSpacing: "-0.01em" }}
    >
      <WeatherAtmosphere
        weatherCode={weather.code}
        isDay={weather.isDay}
        windGust={weather.windGust ?? 0}
      />
      <div
        role="none"
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          width: 64,
          height: 64,
          zIndex: 2,
          cursor: "default",
        }}
        onMouseEnter={(e) =>
          setAtmoAnchor(e.currentTarget.getBoundingClientRect())
        }
        onMouseLeave={() => setAtmoAnchor(null)}
      />
      {atmoAnchor && (
        <Popup
          anchor={atmoAnchor}
          preferAbove={false}
          className="px-2.5 py-1.5"
        >
          <span
            style={{
              fontSize: "0.72rem",
              fontWeight: 600,
              color: "var(--w-ink-3)",
              whiteSpace: "nowrap",
            }}
          >
            {getAtmosphereLabel(weather.code, weather.isDay)}
          </span>
        </Popup>
      )}

      {/* ── TOP-LEFT: temperature block ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          gap: "0.18em",
          fontSize: "1.42rem",
          lineHeight: 1.08,
        }}
      >
        <div>
          <span style={{ fontWeight: 800, color: "var(--w-accent)" }}>
            {weather.temperature}°{unitLabel}
          </span>
          <span
            style={{
              fontWeight: 400,
              color: "var(--w-ink-4)",
              marginLeft: "0.4em",
            }}
          >
            now
          </span>
        </div>
        {/* Second line: city takes priority; falls back to feels-like when no location is available */}
        {cityShort ? (
          <div>
            <span style={{ fontWeight: 400, color: "var(--w-ink-4)" }}>
              in{" "}
            </span>
            <span
              data-testid="weather-city"
              style={{ fontWeight: 800, color: "var(--w-ink-1)" }}
            >
              {cityShort}
            </span>
          </div>
        ) : (
          weather.feelsLike != null && (
            <div>
              <span
                style={{
                  fontWeight: 400,
                  color: "var(--w-ink-4)",
                  fontSize: "1.1rem",
                }}
              >
                feels like{" "}
              </span>
              <span
                style={{
                  fontWeight: 700,
                  color: "var(--w-accent)",
                  fontSize: "1.1rem",
                }}
              >
                {weather.feelsLike}°{unitLabel}
              </span>
            </div>
          )
        )}
        {/* Third line: AQI — dot (colour = severity) + number + level label */}
        {aqiLevel && (
          <div style={{ marginTop: "0.12em" }}>
            <AQIBadgeExtended aqi={aqi} aqiLevel={aqiLevel} />
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* ── BOTTOM ROW: sunrise/sunset (left) + forecast+quip (right) ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: "2px",
        }}
      >
        {showSunTimes && sunEvent && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "0.16em",
              flexShrink: 0,
            }}
          >
            <div
              aria-label={`${sunEvent.label} at ${fmtSunTime(sunEvent.time)}`}
              style={{ display: "flex", alignItems: "center", gap: "0.2em" }}
            >
              {sunEvent.isSunrise ? (
                <SunriseFill
                  size={8}
                  style={{ color: "rgba(245,158,11,0.9)", flexShrink: 0 }}
                />
              ) : (
                <SunsetFill
                  size={8}
                  style={{ color: "rgba(139,92,246,0.9)", flexShrink: 0 }}
                />
              )}
              <span
                style={{
                  fontSize: "0.62rem",
                  fontWeight: 600,
                  color: "var(--w-ink-4)",
                  lineHeight: 1,
                }}
              >
                {fmtSunTime(sunEvent.time)}
              </span>
            </div>
            <span
              aria-hidden
              style={{
                fontSize: "0.52rem",
                fontWeight: 500,
                color: "var(--w-ink-5)",
                lineHeight: 1,
              }}
            >
              {sunEvent.label}
            </span>
          </div>
        )}
        <div
          className="flex flex-col items-end"
          style={{ marginLeft: "auto", letterSpacing: 0 }}
        >
          {forecast && (
            <div
              data-testid="weather-condition-row"
              style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "baseline",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontSize: "0.55rem",
                  fontWeight: 600,
                  color: "var(--w-ink-5)",
                  lineHeight: 1.5,
                }}
              >
                ({getForecastLabel(forecast)})
              </span>
              <span
                style={{
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  color: "var(--w-accent)",
                  textTransform: "capitalize",
                  lineHeight: 1.2,
                }}
              >
                {forecast.type === "clearing"
                  ? "clearing up"
                  : forecast.description}
              </span>
            </div>
          )}
          {quip && (
            <div
              data-testid="weather-quip"
              style={{
                fontSize: "0.70rem",
                fontWeight: 600,
                color: "var(--w-ink-4)",
                lineHeight: 1.3,
                textAlign: "right",
                marginTop: "0.18em",
              }}
            >
              {quip}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getWeatherContent({
  locationDenied,
  location,
  error,
  onRetry,
  weather,
  style,
  unitLabel,
  quip,
  cityShort,
  atmoAnchor,
  setAtmoAnchor,
  forecast,
  aqi,
  showAQI,
  sunTimes,
  sunEvent,
  showSunTimes,
}) {
  if (locationDenied && !location) return <LocationDeniedState />;
  if (error) return <ErrorState onRetry={onRetry} />;
  if (style === "expressive") {
    if (!weather) return <ExpressiveSkeleton />;
    return (
      <ExpressiveView
        weather={weather}
        forecast={forecast}
        unitLabel={unitLabel}
        quip={quip}
        cityShort={cityShort}
        atmoAnchor={atmoAnchor}
        setAtmoAnchor={setAtmoAnchor}
        aqi={aqi}
        showAQI={showAQI}
        sunEvent={sunEvent}
        showSunTimes={showSunTimes}
      />
    );
  }
  // 'minimal' (and legacy 'simple') — Apple Weather-style layout
  if (!weather) return <MinimalSkeleton />;
  return (
    <MinimalView
      weather={weather}
      cityShort={cityShort}
      unitLabel={unitLabel}
      aqi={aqi}
      showAQI={showAQI}
      sunEvent={sunEvent}
      showSunTimes={showSunTimes}
    />
  );
}

// ── Widget ────────────────────────────────────────────────────────────────────

export const Widget = ({ id = "weather", onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, {
    location: null,
    unit: "metric",
    style: "minimal",
    showAQI: true,
    showSunTimes: true,
  });
  const { location, unit, showAQI = true, showSunTimes = true } = settings;
  // Normalise legacy 'simple' value to 'minimal'
  const style =
    settings.style === "simple" ? "minimal" : (settings.style ?? "minimal");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [error, setError] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [atmoAnchor, setAtmoAnchor] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Read auto-location from the centralized location store.
  // When the store updates (e.g. VPN switch), geoLat/geoLon change and
  // the effect below re-runs, fetching fresh weather for the new position.
  const { geoLat, geoLon, geoCity, geoSource } = useLocationStore(
    useShallow((s) => ({
      geoLat: s.lat,
      geoLon: s.lon,
      geoCity: s.city,
      geoSource: s.source,
    })),
  );

  // Resolve coords: manual location → geo store
  const resolvedLat = location?.lat ?? (geoSource !== "default" && geoLat != null ? geoLat : null);
  const resolvedLon = location?.lon ?? (geoSource !== "default" && geoLon != null ? geoLon : null);
  const resolvedCity = location
    ? (location.name?.split(",")[0]?.trim() || "")
    : (geoCity || "");

  // Shared weather hook — covers SW cache → localStorage → direct fetch waterfall
  const {
    weather: hookWeather,
    forecast: hookForecast,
    aqi: hookAqi,
    loading: hookLoading,
  } = useWeather({
    lat: resolvedLat,
    lon: resolvedLon,
    unit,
    cityName: resolvedCity,
    full: true,
  });

  // Sync hook output to widget state (allows the rest of the widget to read from
  // weather/forecast/aqi as before without changing any rendering code).
  useEffect(() => { setWeather(hookWeather); }, [hookWeather]);
  useEffect(() => { setForecast(hookForecast); }, [hookForecast]);
  useEffect(() => { setAqi(hookAqi); }, [hookAqi]);

  // Location-denied detection
  useEffect(() => {
    if (!location && (geoSource === "default" || geoLat == null)) {
      setLocationDenied(geoSource === "default");
      setWeather(null);
      setForecast(null);
      setAqi(null);
    } else {
      setLocationDenied(false);
    }
  }, [location, geoLat, geoSource]);

  // Map loading state
  useEffect(() => {
    if (!hookLoading) setError(null);
  }, [hookLoading]);

  const settingsContent = (
    <Settings
      location={location}
      onChange={updateSetting}
      locationDenied={locationDenied}
      unit={unit}
      style={style}
      showAQI={showAQI}
      showSunTimes={showSunTimes}
    />
  );

  const unitLabel = unit === "imperial" ? "F" : "C";

  const quip = getWeatherQuip(forecast, weather, {
    windGust: weather?.windGust ?? 0,
  });

  // City displayed as first comma-segment (safe when weather exists)
  const cityShort = weather?.city?.split(",")?.[0]?.trim() || "";

  // Sunrise/sunset — computed locally (no API needed) from available coords
  const sunLat = location?.lat ?? geoLat;
  const sunLon = location?.lon ?? geoLon;
  const sunTimes =
    sunLat != null && sunLon != null ? getSunTimes(sunLat, sunLon) : null;
  const sunEvent =
    showSunTimes && sunLat != null && sunLon != null
      ? getNextSunEvent(sunLat, sunLon)
      : null;

  const content = getWeatherContent({
    locationDenied,
    location,
    error,
    onRetry: () => {
      setError(null);
      setRefreshKey((k) => k + 1);
    },
    weather,
    style,
    unitLabel,
    quip,
    cityShort,
    atmoAnchor,
    setAtmoAnchor,
    forecast,
    aqi,
    showAQI,
    sunTimes,
    sunEvent,
    showSunTimes,
  });

  return (
    <BaseWidget
      className="p-4 flex flex-col"
      settingsTitle={config.title}
      settingsContent={settingsContent}
      onRemove={onRemove}
    >
      {content}
    </BaseWidget>
  );
};
