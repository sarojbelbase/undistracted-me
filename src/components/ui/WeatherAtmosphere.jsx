import React from 'react';

// ── Weather atmosphere CSS animations live in src/styles/_animations.scss ───────

/**
 * Returns wind tier and animation variants based on gust speed (km/h).
 * calm < 20, breezy 20–44, strong 45–64, storm 65+
 */
const windTier = (gust) => {
  if (gust >= 65) return 'storm';
  if (gust >= 45) return 'strong';
  if (gust >= 20) return 'breezy';
  return 'calm';
};

/**
 * Given a base keyframe name and wind tier, returns the most specific
 * animation name that was defined (falls back to base if no variant exists).
 */
const windAnim = (base, tier) => {
  if (tier === 'calm') return base;
  const variant = `${base}-${tier === 'storm' ? 'strong' : tier}`;
  // storm reuses 'strong' variants (more extreme speed/timing, not a new shape)
  return variant;
};

// ── Finer-grain grouping for visuals (independent of quip getConditionGroup) ─
const getAtmosphereGroup = (code) => {
  if (code >= 95) return 'thunder';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if (code >= 51 && code <= 57) return 'drizzle';
  if (code === 45 || code === 48) return 'fog';
  if (code === 3) return 'cloudy';
  if (code === 1 || code === 2) return 'partly_cloudy';
  return 'clear';
};

/** Human-readable label for the atmospheric effect shown in the widget corner */
export const getAtmosphereLabel = (code, isDay) => {
  const group = getAtmosphereGroup(code ?? 0);
  if (group === 'thunder') return 'Thunderstorm';
  if (group === 'snow') return 'Snowfall';
  if (group === 'rain') return 'Rain';
  if (group === 'drizzle') return 'Drizzle';
  if (group === 'fog') return 'Foggy';
  if (group === 'cloudy') return 'Overcast';
  if (group === 'partly_cloudy') return isDay ? 'Partly cloudy' : 'Partly cloudy night';
  return isDay ? 'Sunny' : 'Clear night';
};

const SPEED_MULTIPLIERS = { storm: 2.4, strong: 1.7, breezy: 1.3, calm: 1 };

// ── Per-weather sub-renderers (extracted to module level to keep WeatherAtmosphere simple) ──

function ClearDay({ wrap, faster, dk }) {
  const corona = dk ? 'rgba(255,200,45,.82), rgba(255,155,8,.42)' : 'rgba(230,145,0,.22), rgba(210,110,0,.10)';
  const disc = dk ? 'rgba(255,248,140,1.0), rgba(255,218,70,.72)' : 'rgba(255,195,30,.58), rgba(240,165,0,.28)';
  const rayAlp = dk ? ['.75', '.60', '.60'] : ['.28', '.20', '.20'];
  return (
    <div style={wrap}>
      {/* corona glow */}
      <div style={{
        position: 'absolute', top: -52, right: -52, width: 148, height: 148, borderRadius: '50%',
        background: `radial-gradient(circle, ${corona}, transparent 70%)`,
        animation: `wa-sun ${faster('7s')} ease-in-out infinite`,
      }} />
      {/* bright inner disc */}
      <div style={{
        position: 'absolute', top: -9, right: -9, width: 52, height: 52, borderRadius: '50%',
        background: `radial-gradient(circle, ${disc}, transparent 80%)`,
        animation: `wa-sun ${faster('7s')} ease-in-out infinite 0.6s`,
      }} />
      {/* ray hints via box-shadow dots */}
      <div style={{
        position: 'absolute', top: 13, right: 13, width: 3, height: 3, borderRadius: '50%',
        background: 'transparent',
        boxShadow: `20px -20px 0 0 rgba(220,160,0,${rayAlp[0]}), 28px -8px 0 0 rgba(220,160,0,${rayAlp[1]}), 8px -28px 0 0 rgba(220,160,0,${rayAlp[2]})`,
      }} />
    </div>
  );
}

function ClearNight({ wrap, faster, dk }) {
  // Dark: cool blue-white moon, light-blue stars on dark sky
  // Light: slate-blue moon, darker navy stars to contrast white bg
  const halo = dk ? 'rgba(172,205,255,.65), rgba(128,168,255,.32)' : 'rgba(110,140,210,.18), rgba(80,110,190,.07)';
  const disc = dk ? 'rgba(225,236,255,.90)' : 'rgba(130,155,210,.80)';
  const shadow = dk ? 'inset 10px -6px 0 rgba(4,8,28,.88)' : 'inset 10px -6px 0 rgba(20,30,80,.78)';
  const starC = dk ? 'rgba(208,224,255,.90)' : 'rgba(70,95,160,.55)';
  const starSh = dk
    ? '16px -5px 0 1px rgba(205,220,255,.80), -10px 20px 0 0 rgba(205,220,255,.70), 34px 9px 0 0 rgba(205,220,255,.62), -25px 4px 0 1px rgba(205,220,255,.54), 48px -1px 0 0 rgba(205,220,255,.46), 2px 36px 0 0 rgba(205,220,255,.38), -18px 38px 0 1px rgba(205,220,255,.30)'
    : '16px -5px 0 1px rgba(60,85,150,.40), -10px 20px 0 0 rgba(60,85,150,.32), 34px 9px 0 0 rgba(60,85,150,.28), -25px 4px 0 1px rgba(60,85,150,.22), 48px -1px 0 0 rgba(60,85,150,.18), 2px 36px 0 0 rgba(60,85,150,.14), -18px 38px 0 1px rgba(60,85,150,.12)';
  return (
    <div style={wrap}>
      {/* moonlight halo */}
      <div style={{
        position: 'absolute', top: -22, right: -22, width: 100, height: 100, borderRadius: '50%',
        background: `radial-gradient(circle, ${halo}, transparent 72%)`,
        animation: `wa-moon ${faster('10s')} ease-in-out infinite`,
      }} />
      {/* crescent disc */}
      <div style={{
        position: 'absolute', top: 7, right: 9, width: 38, height: 38, borderRadius: '50%',
        background: disc, boxShadow: shadow,
        animation: `wa-moon ${faster('10s')} ease-in-out infinite`,
      }} />
      {/* star cluster — box-shadow dots, zero animation cost */}
      <div style={{
        position: 'absolute', top: 10, right: 60, width: 2, height: 2, borderRadius: '50%',
        background: starC, boxShadow: starSh,
      }} />
    </div>
  );
}

function PartlyCloudyDay({ wrap, faster, dk, tier }) {
  // Clouds: light grey on dark, darker grey on light
  const cloudA = dk ? 'rgba(200,205,215,.85)' : 'rgba(140,148,170,.34)';
  const cloudB = dk ? 'rgba(190,196,210,.68)' : 'rgba(130,140,162,.22)';
  return (
    <div style={wrap}>
      {/* muted sun behind cloud */}
      <div style={{
        position: 'absolute', top: -38, right: -38, width: 110, height: 110, borderRadius: '50%',
        background: dk
          ? 'radial-gradient(circle, rgba(255,200,45,.88) 0%, rgba(255,155,8,.48) 48%, transparent 72%)'
          : 'radial-gradient(circle, rgba(230,145,0,.16) 0%, rgba(210,110,0,.07) 48%, transparent 72%)',
        animation: `wa-sun ${faster('8s')} ease-in-out infinite`,
      }} />
      <div style={{
        position: 'absolute', top: -3, right: -3, width: 36, height: 36, borderRadius: '50%',
        background: dk
          ? 'radial-gradient(circle, rgba(255,248,140,1.0) 0%, rgba(255,215,60,.78) 55%, transparent 82%)'
          : 'radial-gradient(circle, rgba(255,195,30,.42) 0%, rgba(240,165,0,.20) 55%, transparent 82%)',
        animation: `wa-sun ${faster('8s')} ease-in-out infinite 0.5s`,
      }} />
      {/* drifting cloud blobs */}
      <div style={{
        position: 'absolute', top: -10, right: -14, width: 95, height: 46, borderRadius: '50%',
        background: `radial-gradient(ellipse at center, ${cloudA} 0%, transparent 70%)`,
        animation: `${windAnim('wa-cloud', tier)} ${faster('8s')} ease-in-out infinite`,
      }} />
      <div style={{
        position: 'absolute', top: 12, right: 24, width: 62, height: 30, borderRadius: '50%',
        background: `radial-gradient(ellipse at center, ${cloudB} 0%, transparent 72%)`,
        animation: `${windAnim('wa-cloud', tier)} ${faster('10s')} ease-in-out infinite 1.5s`,
      }} />
    </div>
  );
}

function PartlyCloudyNight({ wrap, faster, dk, tier }) {
  const disc = dk ? 'rgba(220,232,255,.85)' : 'rgba(120,145,205,.78)';
  const shadow = dk ? 'inset 9px -5px 0 rgba(4,8,28,.88)' : 'inset 9px -5px 0 rgba(20,30,80,.78)';
  const starC = dk ? 'rgba(200,218,255,.54)' : 'rgba(65,90,155,.42)';
  const starSh = dk
    ? '14px -4px 0 0 rgba(198,215,255,.38), -8px 16px 0 1px rgba(198,215,255,.28), 28px 6px 0 0 rgba(198,215,255,.22)'
    : '14px -4px 0 0 rgba(55,80,145,.30), -8px 16px 0 1px rgba(55,80,145,.22), 28px 6px 0 0 rgba(55,80,145,.18)';
  // cloud blob: dark on dark sky, medium-grey on light bg
  const cloud = dk
    ? 'radial-gradient(ellipse at 55% 60%, rgba(50,55,70,.58) 0%, rgba(40,45,60,.32) 45%, transparent 72%)'
    : 'radial-gradient(ellipse at 55% 60%, rgba(155,165,185,.50) 0%, rgba(140,150,170,.26) 45%, transparent 72%)';
  return (
    <div style={wrap}>
      {/* soft moon halo */}
      <div style={{
        position: 'absolute', top: -18, right: -18, width: 86, height: 86, borderRadius: '50%',
        background: dk
          ? 'radial-gradient(circle, rgba(155,188,248,.78) 0%, rgba(115,155,240,.40) 52%, transparent 74%)'
          : 'radial-gradient(circle, rgba(90,120,200,.14) 0%, rgba(70,100,185,.06) 52%, transparent 74%)',
        animation: `wa-moon ${faster('10s')} ease-in-out infinite`,
      }} />
      {/* crescent */}
      <div style={{
        position: 'absolute', top: 8, right: 10, width: 32, height: 32, borderRadius: '50%',
        background: disc, boxShadow: shadow,
        animation: `wa-moon ${faster('10s')} ease-in-out infinite`,
      }} />
      {/* sparse stars */}
      <div style={{
        position: 'absolute', top: 12, right: 56, width: 2, height: 2, borderRadius: '50%',
        background: starC, boxShadow: starSh,
      }} />
      {/* cloud blob paints over moon — partial occlusion */}
      <div style={{
        position: 'absolute', top: -8, right: -18, width: 90, height: 45, borderRadius: '50%',
        background: cloud,
        animation: `${windAnim('wa-cloud', tier)} ${faster('9s')} ease-in-out infinite 0.8s`,
      }} />
    </div>
  );
}

function DrizzleWeather({ wrap, faster, dk, tier }) {
  const drops = [
    { r: 14, h: 12, d: '0s', sp: '1.3s', top: -16 },
    { r: 38, h: 10, d: '0.4s', sp: '1.18s', top: -22 },
    { r: 60, h: 13, d: '0.18s', sp: '1.4s', top: -16 },
  ];
  // Drops/wash: light blue on dark, deeper blue on light
  const wash = dk ? 'rgba(155,180,215,.35)' : 'rgba(80,120,195,.12)';
  const dropC = dk ? 'rgba(160,195,238,.95)' : 'rgba(85,130,210,.60)';
  return (
    <div style={wrap}>
      {/* ambient mist wash — static, zero animation cost */}
      <div style={{
        position: 'absolute', top: -16, right: -16, width: 130, height: 80,
        background: `radial-gradient(ellipse at top right, ${wash} 0%, transparent 72%)`,
      }} />
      {drops.map((d) => (
        <div key={d.r} style={{
          position: 'absolute', top: d.top, right: d.r,
          width: 1, height: d.h, borderRadius: 2,
          background: `linear-gradient(to bottom, transparent, ${dropC}, transparent)`,
          animation: `${windAnim('wa-drizzle', tier)} ${faster(d.sp)} linear ${d.d} infinite`,
        }} />
      ))}
    </div>
  );
}

function RainWeather({ wrap, faster, dk, tier }) {
  const drops = [
    { r: 8, h: 18, d: '0s', sp: '0.68s', top: -22 },
    { r: 32, h: 14, d: '0.22s', sp: '0.62s', top: -30 },
    { r: 58, h: 20, d: '0.08s', sp: '0.74s', top: -38 },
    { r: 18, h: 15, d: '0.38s', sp: '0.65s', top: -22 },
    { r: 44, h: 17, d: '0.52s', sp: '0.70s', top: -30 },
  ];
  const wash = dk ? 'rgba(100,140,195,.40)' : 'rgba(65,105,185,.16)';
  const dropC = dk ? 'rgba(148,192,248,1.0)' : 'rgba(70,130,220,.72)';
  return (
    <div style={wrap}>
      {/* ambient rain wash — static */}
      <div style={{
        position: 'absolute', top: -16, right: -16, width: 110, height: 72,
        background: `radial-gradient(ellipse at top right, ${wash} 0%, transparent 70%)`,
      }} />
      {drops.map((d) => (
        <div key={d.r} style={{
          position: 'absolute', top: d.top, right: d.r,
          width: 1.5, height: d.h, borderRadius: 2,
          background: `linear-gradient(to bottom, transparent, ${dropC}, transparent)`,
          animation: `${windAnim('wa-drop', tier)} ${faster(d.sp)} linear ${d.d} infinite`,
        }} />
      ))}
    </div>
  );
}

function SnowWeather({ wrap, faster, dk, tier }) {
  const flakes = [
    { r: 13, sz: 5, d: '0s', sp: '2.2s', top: -10 },
    { r: 32, sz: 4, d: '0.55s', sp: '1.85s', top: -16 },
    { r: 52, sz: 5, d: '0.28s', sp: '2.4s', top: -10 },
    { r: 22, sz: 3, d: '0.82s', sp: '2.0s', top: -16 },
  ];
  // Flakes: near-white on dark, ice-blue on light (white on white = invisible)
  const wash = dk ? 'rgba(200,218,255,.38)' : 'rgba(90,130,215,.10)';
  const flakeC = dk ? 'rgba(235,245,255,1.0)' : 'rgba(95,138,218,.62)';
  return (
    <div style={wrap}>
      {/* cool ambient wash — static */}
      <div style={{
        position: 'absolute', top: -16, right: -16, width: 140, height: 88,
        background: `radial-gradient(ellipse at top right, ${wash} 0%, transparent 72%)`,
      }} />
      {flakes.map((f) => (
        <div key={f.r} style={{
          position: 'absolute', top: f.top, right: f.r,
          width: f.sz, height: f.sz, borderRadius: '50%',
          background: flakeC,
          animation: `${windAnim('wa-flake', tier)} ${faster(f.sp)} ease-in-out ${f.d} infinite`,
        }} />
      ))}
    </div>
  );
}

function FogWeather({ wrap, faster, dk, tier }) {
  // Dark: light grey-blue blobs; Light: deeper slate blobs for contrast
  const [fr, fg, fb] = dk ? [195, 208, 222] : [110, 125, 150];
  const blobs = [
    { top: -28, right: -20, w: 130, h: 68, op: dk ? 0.72 : 0.28, dur: '7s', del: '0s', kf: 'wa-fog-a' },
    { top: -6, right: 12, w: 88, h: 46, op: dk ? 0.55 : 0.2, dur: '9.5s', del: '2.2s', kf: 'wa-fog-b' },
    { top: 18, right: -8, w: 68, h: 36, op: dk ? 0.4 : 0.13, dur: '8s', del: '1.1s', kf: 'wa-fog-a' },
  ];
  return (
    <div style={wrap}>
      {blobs.map((b) => (
        <div key={b.top} style={{
          position: 'absolute', top: b.top, right: b.right,
          width: b.w, height: b.h, borderRadius: '50%',
          background: `radial-gradient(ellipse at 68% 42%, rgba(${fr},${fg},${fb},${b.op}) 0%, rgba(${fr},${fg},${fb},${(b.op * 0.5).toFixed(2)}) 44%, transparent 76%)`,
          animation: `${windAnim(b.kf, tier)} ${faster(b.dur)} ease-in-out ${b.del} infinite`,
        }} />
      ))}
    </div>
  );
}

function ThunderWeather({ wrap, faster, dk, tier }) {
  const drops = [
    { r: 10, h: 20, d: '0s', sp: '0.57s', top: -22 },
    { r: 28, h: 17, d: '0.14s', sp: '0.53s', top: -31 },
    { r: 46, h: 22, d: '0.06s', sp: '0.61s', top: -22 },
    { r: 20, h: 18, d: '0.30s', sp: '0.56s', top: -31 },
  ];
  const wash = dk ? 'rgba(80,100,200,.50)' : 'rgba(55,75,165,.14)';
  const dropC = dk ? 'rgba(178,188,248,1.0)' : 'rgba(70,100,215,.72)';
  const bolt = dk ? 'rgba(235,242,255,1.0)' : 'rgba(55,80,210,.88)';
  const flash = dk ? 'rgba(210,220,255,.35)' : 'rgba(55,80,210,.08)';
  return (
    <div style={wrap}>
      {/* deep indigo wash — static */}
      <div style={{
        position: 'absolute', top: -16, right: -16, width: 100, height: 65,
        background: `radial-gradient(ellipse at top right, ${wash} 0%, transparent 68%)`,
      }} />
      {drops.map((d) => (
        <div key={d.r} style={{
          position: 'absolute', top: d.top, right: d.r,
          width: 2, height: d.h, borderRadius: 2,
          background: `linear-gradient(to bottom, transparent, ${dropC}, transparent)`,
          animation: `${windAnim('wa-drop', tier)} ${faster(d.sp)} linear ${d.d} infinite`,
        }} />
      ))}
      {/* lightning bolt via clip-path polygon */}
      <div style={{
        position: 'absolute', top: 2, right: 14,
        width: 16, height: 30,
        clipPath: 'polygon(65% 0%, 30% 46%, 52% 46%, 18% 100%, 88% 38%, 60% 38%, 92% 0%)',
        background: bolt,
        animation: 'wa-bolt 3.8s ease-in-out 0.6s infinite',
      }} />
      {/* ambient electric fill */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `linear-gradient(135deg, transparent 0%, ${flash} 100%)`,
        animation: 'wa-flash 3.8s ease-in-out infinite',
      }} />
    </div>
  );
}

function CloudyWeather({ wrap, faster, dk, tier }) {
  // Dark: light grey-white blobs on dark surface
  // Light: medium slate-grey blobs with more opacity for contrast on white
  const [cr, cg, cb] = dk ? [200, 208, 225] : [120, 130, 155];
  const scaleOp = dk ? 4 : 1; // dark bg = much more vivid glows
  const blobs = [
    { top: -22, right: -14, w: 108, h: 54, op: 0.24, dur: '8s', del: '0s' },
    { top: 6, right: 24, w: 72, h: 36, op: 0.16, dur: '10s', del: '2s' },
    { top: -8, right: 50, w: 54, h: 27, op: 0.1, dur: '7s', del: '1s' },
  ];
  return (
    <div style={wrap}>
      {blobs.map((b) => (
        <div key={b.top} style={{
          position: 'absolute', top: b.top, right: b.right,
          width: b.w, height: b.h, borderRadius: '50%',
          background: `radial-gradient(ellipse at center, rgba(${cr},${cg},${cb},${Math.min(b.op * scaleOp, 0.88).toFixed(2)}) 0%, transparent 74%)`,
          animation: `${windAnim('wa-cloud', tier)} ${faster(b.dur)} ease-in-out ${b.del} infinite`,
        }} />
      ))}
    </div>
  );
}

// All animations: transform + opacity only (GPU composited, no filter:blur)
export const WeatherAtmosphere = ({ weatherCode, isDay, windGust = 0 }) => {
  const group = getAtmosphereGroup(weatherCode ?? 0);
  const tier = windTier(windGust);

  // Speed multiplier: storm = 2.4×, strong = 1.7×, breezy = 1.3×, calm = 1×
  const speedMul = SPEED_MULTIPLIERS[tier] ?? 1;
  /** Scale a duration string like '8s' by the inverse of speedMul */
  const faster = (dur) => `${(Number.parseFloat(dur) / speedMul).toFixed(2)}s`;

  // Read resolved mode from the data-mode attribute that applyTheme sets on <html>.
  // Defaults to dark so SSR / extension background pages don't flash colours.
  const dk = typeof document === 'undefined' || document.documentElement.dataset.mode !== 'light';

  const wrap = {
    position: 'absolute', inset: '-16px', pointerEvents: 'none',
    overflow: 'hidden', zIndex: 0, borderRadius: '1rem', contain: 'strict',
  };

  if (group === 'clear' && isDay) return <ClearDay wrap={wrap} faster={faster} dk={dk} />;
  if (group === 'clear') return <ClearNight wrap={wrap} faster={faster} dk={dk} />;
  if (group === 'partly_cloudy' && isDay) return <PartlyCloudyDay wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'partly_cloudy') return <PartlyCloudyNight wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'drizzle') return <DrizzleWeather wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'rain') return <RainWeather wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'snow') return <SnowWeather wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'fog') return <FogWeather wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'thunder') return <ThunderWeather wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  if (group === 'cloudy') return <CloudyWeather wrap={wrap} faster={faster} dk={dk} tier={tier} />;
  return null;
};
