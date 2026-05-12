import React, { useState, useEffect, useRef } from "react";
import { useShallow } from "zustand/react/shallow";
import { BaseWidget } from "../BaseWidget";
import config from "./config";
import { useWidgetSettings } from "../useWidgetSettings";
import { Settings } from "./Settings";
import { GeoAlt } from "react-bootstrap-icons";
import {
  getWeatherIcon,
  fetchOpenMeteo,
  parseWeather,
  parseForecast,
  readWeatherCache,
  writeWeatherCache,
  fetchAQI,
  parseAQI,
  getAQILevel,
} from "./utils.jsx";
import { useLocationStore } from "../../store/useLocationStore";
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
  return (
    <>
      <button
        ref={ref}
        type="button"
        aria-label={`+${i}h: ${pop}%`}
        style={{
          width: "5px",
          height: `${Math.max(2, Math.round((pop / 100) * 16))}px`,
          borderRadius: "1.5px",
          backgroundColor: isActive ? "var(--w-ink-3)" : "var(--panel-bg)",
          opacity: isActive ? Math.max(0.2, pop / 100) : 1,
          cursor: "default",
          border: "none",
          padding: 0,
          outline: "none",
          display: "block",
          flexShrink: 0,
        }}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      />
      {anchor && (
        <Popup anchor={anchor} preferAbove className="px-2.5 py-1">
          <span
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "var(--w-ink-2)",
              whiteSpace: "nowrap",
            }}
          >
            {`+${i}h: ${pop}%`}
          </span>
        </Popup>
      )}
    </>
  );
};

const PrecipBars = ({ popSlots, eventHour }) => (
  <div
    className="flex items-end gap-px mt-2"
    style={{ height: "18px" }}
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

const ErrorState = () => (
  <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center">
    <GeoAlt size={22} style={{ color: "var(--w-ink-4)", opacity: 0.65 }} />
    <p className="w-muted font-semibold">Couldn&apos;t load weather</p>
    <p className="w-caption leading-relaxed">
      Open{" "}
      <span className="font-semibold" style={{ color: "var(--w-ink-3)" }}>
        Settings
      </span>{" "}
      to check your location.
    </p>
  </div>
);

// ── Minimal mode — inspired by Apple Weather widget ───────────────────────────
// Layout: icon + condition at top · hero temperature in the middle · city + AQI at bottom.
// Typography does the heavy lifting; no accent colours, no decorations.
const MinimalView = ({ weather, cityShort, unitLabel, aqi, showAQI }) => (
  <div className="weather-minimal flex flex-col w-full h-full">
    {/* Row 1 — icon + condition */}
    <div className="flex items-center gap-1.5 opacity-90">
      {getWeatherIcon(weather.code, weather.isDay, 24)}
      <span className="weather-minimal__condition">
        {weather.description}
      </span>
    </div>

    {/* Spacer */}
    <div style={{ flex: 1 }} />

    {/* Row 2 — hero temperature */}
    <div
      aria-label={`${weather.temperature} degrees ${unitLabel === "C" ? "Celsius" : "Fahrenheit"}`}
      className="weather-minimal__temp"
    >
      {weather.temperature}°
    </div>

    {/* Spacer */}
    <div style={{ flex: 1 }} />

    {/* Row 3 — city (left) + AQI badge (right) */}
    <div className="weather-minimal__meta">
      {cityShort ? (
        <div className="weather-minimal__city">{cityShort}</div>
      ) : (
        <div className="weather-minimal__unit">
          {unitLabel === "C" ? "°C" : "°F"}
        </div>
      )}
      {/* AQI badge — only shown when data is available and feature is enabled */}
      {showAQI && aqi?.value != null && (
        <AQIBadge value={aqi.value} pm25={aqi.pm25} />
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
        onMouseEnter={() => setAnchor(ref.current?.getBoundingClientRect() ?? null)}
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
          <div
            style={{ marginTop: "0.12em" }}
          >
            <AQIBadgeExtended aqi={aqi} aqiLevel={aqiLevel} />
          </div>
        )}
      </div>

      <div style={{ flex: 1 }} />

      {/* ── BOTTOM-RIGHT: condition + quip ── */}
      <div
        className="flex flex-col items-end"
        style={{
          position: "relative",
          zIndex: 1,
          letterSpacing: 0,
          paddingBottom: "2px",
        }}
      >
        {forecast && (
          <div
            data-testid="weather-condition-row"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
            }}
          >
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
            <span
              style={{
                fontSize: "0.55rem",
                fontWeight: 600,
                color: "var(--w-ink-5)",
                lineHeight: 1.5,
              }}
            >
              {getForecastLabel(forecast)}
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
  );
};

function getWeatherContent({
  locationDenied,
  location,
  error,
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
}) {
  if (locationDenied && !location) return <LocationDeniedState />;
  if (error) return <ErrorState />;
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
  });
  const { location, unit, showAQI = true } = settings;
  // Normalise legacy 'simple' value to 'minimal'
  const style =
    settings.style === "simple" ? "minimal" : (settings.style ?? "minimal");
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [aqi, setAqi] = useState(null);
  const [error, setError] = useState(null);
  const [locationDenied, setLocationDenied] = useState(false);
  const [atmoAnchor, setAtmoAnchor] = useState(null);

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

  useEffect(() => {
    let mounted = true;
    setError(null);

    // ── Instant pre-population from cache ──────────────────────────────────
    // Eliminates the skeleton on every subsequent new-tab open.
    // The background fetch below still runs if data is stale (> 30 min).
    // Auto-location key includes actual coords so the cache naturally misses
    // when the user switches VPNs or upgrades from the Kathmandu fallback.
    let cacheKey;
    if (location) {
      cacheKey = `${location.lat},${location.lon}`;
    } else if (geoLat === null || geoLat === undefined) {
      cacheKey = "auto";
    } else {
      cacheKey = `geo:${geoLat},${geoLon}`;
    }
    const cached = readWeatherCache(cacheKey, unit);
    if (cached?.weather) {
      setWeather(cached.weather);
      setForecast(cached.forecast);
      if (cached.aqi) setAqi(cached.aqi);
    } else {
      setWeather(null);
      setForecast(null);

      // ── SW background-cache hydration ──────────────────────────────────
      // If the service worker pre-fetched data (always metric), use it for
      // instant display while the live fetch runs. Only applies to auto-location
      // metric mode — manual locations and imperial aren't covered by the SW cache.
      if (!location && unit === 'metric' && geoLat != null) {
        chrome?.storage?.local?.get?.('weather_sw_cache').then((result) => {
          if (!mounted) return;
          const sw = result?.weather_sw_cache;
          if (!sw) return;
          if (Date.now() - sw.fetchedAt > 30 * 60_000) return; // older than 30 min
          // Accept if coords are within ~1 km (0.01°)
          if (Math.abs(sw.lat - geoLat) > 0.01 || Math.abs(sw.lon - geoLon) > 0.01) return;
          setWeather(parseWeather(sw.data, geoCity || ''));
          setForecast(parseForecast(sw.data));
          if (sw.aqiData) setAqi(parseAQI(sw.aqiData));
        }).catch(() => { });
      }
    }

    const load = async () => {
      try {
        let lat,
          lon,
          resolvedCity = "";

        if (location) {
          ({ lat, lon } = location);
          // Only the first segment before a comma:
          // "Jāwalākhel, Bagmati Province, Nepal" → "Jāwalākhel"
          resolvedCity = location.name?.split(",")[0]?.trim() || "";
        } else {
          // Use coordinates from the centralized location store.
          // source='default' means both GPS and IP geo failed — treat as denied.
          if (geoSource === "default" || geoLat == null) {
            setLocationDenied(geoSource === "default");
            return;
          }
          lat = geoLat;
          lon = geoLon;
          resolvedCity = geoCity || "";
          setLocationDenied(false);
        }

        // Fetch weather + AQI in parallel; AQI failure is non-fatal
        const [data, aqiData] = await Promise.all([
          fetchOpenMeteo(lat, lon, unit),
          fetchAQI(lat, lon).catch(() => null),
        ]);

        if (!mounted) return;
        const current = parseWeather(data, resolvedCity);
        setWeather(current);

        const fc = parseForecast(data);
        setForecast(fc);

        const parsedAQI = aqiData ? parseAQI(aqiData) : null;
        setAqi(parsedAQI);

        // Persist fresh result (including AQI) so next tab open is instant
        writeWeatherCache(current, fc, parsedAQI, cacheKey, unit);
      } catch (e) {
        if (mounted) setError(e.message);
      }
    };

    // Skip network if cache is fresh (< 30 min old); still schedule the interval
    if (!cached?.fresh) load();
    const timerId = setInterval(load, 30 * 60_000);
    return () => { mounted = false; clearInterval(timerId); };
  }, [location, unit, geoLat, geoLon, geoSource, geoCity]);

  const settingsContent = (
    <Settings
      location={location}
      onChange={updateSetting}
      locationDenied={locationDenied}
      unit={unit}
      style={style}
      showAQI={showAQI}
    />
  );

  const unitLabel = unit === "imperial" ? "F" : "C";

  const quip = getWeatherQuip(forecast, weather, {
    windGust: weather?.windGust ?? 0,
  });

  // City displayed as first comma-segment (safe when weather exists)
  const cityShort = weather?.city?.split(",")?.[0]?.trim() || "";
  const content = getWeatherContent({
    locationDenied,
    location,
    error,
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
