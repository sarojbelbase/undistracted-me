/**
 * GET /pp-and-tos
 *
 * Serves the Privacy Policy and Terms of Service for Undistracted Me as a
 * self-contained HTML page. No external assets except Google Fonts (loaded
 * via a <link> so it degrades gracefully offline). No JS required.
 */

const LAST_UPDATED = 'April 21, 2026';
const CONTACT_EMAIL = 'hey@sarojbelbase.com.np';
const WEBSITE = 'https://undistractedme.sarojbelbase.com.np';

const html = /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Privacy Policy and Terms of Service for Undistracted Me — a focus-oriented new tab extension." />
  <title>Privacy Policy &amp; Terms of Service — Undistracted Me</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Inter+Tight:wght@600;700;800&display=swap" rel="stylesheet" />
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:         #080a0f;
      --surface:    #0d1017;
      --surface2:   #111520;
      --border:     rgba(255,255,255,0.07);
      --border-acc: rgba(99,102,241,0.40);
      --text-hi:    rgba(255,255,255,0.93);
      --text-md:    rgba(255,255,255,0.65);
      --text-lo:    rgba(255,255,255,0.38);
      --accent:     #6366f1;
      --accent-dim: rgba(99,102,241,0.12);
      --accent-glow:rgba(99,102,241,0.06);
      --green:      #34d399;
      --amber:      #fbbf24;
      --radius-lg:  18px;
      --radius-md:  12px;
      --radius-sm:  8px;
    }

    html { scroll-behavior: smooth; }

    body {
      background: var(--bg);
      color: var(--text-md);
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      font-size: 15px;
      line-height: 1.75;
      -webkit-font-smoothing: antialiased;
      min-height: 100vh;
    }

    /* ── Background grain ───────────────────────────────────────────── */
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background-image:
        radial-gradient(ellipse 80% 60% at 50% -10%, rgba(99,102,241,0.12) 0%, transparent 70%),
        radial-gradient(ellipse 50% 40% at 80% 90%, rgba(52,211,153,0.06) 0%, transparent 60%);
      pointer-events: none;
      z-index: 0;
    }

    /* ── Layout ─────────────────────────────────────────────────────── */
    .wrapper {
      position: relative;
      z-index: 1;
      max-width: 780px;
      margin: 0 auto;
      padding: 0 24px 120px;
    }

    /* ── Header ─────────────────────────────────────────────────────── */
    .site-header {
      padding: 64px 0 56px;
      border-bottom: 1px solid var(--border);
      margin-bottom: 56px;
    }

    .logo-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 28px;
    }

    .logo-icon {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 0 1px rgba(99,102,241,0.3), 0 8px 24px rgba(99,102,241,0.20);
      flex-shrink: 0;
    }

    .logo-name {
      font-family: 'Inter Tight', sans-serif;
      font-weight: 700;
      font-size: 17px;
      color: var(--text-hi);
      letter-spacing: -0.01em;
    }

    .page-eyebrow {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 12px;
    }

    h1.page-title {
      font-family: 'Inter Tight', sans-serif;
      font-weight: 800;
      font-size: clamp(28px, 5vw, 40px);
      line-height: 1.15;
      letter-spacing: -0.03em;
      color: var(--text-hi);
      margin-bottom: 14px;
    }

    .page-subtitle {
      font-size: 15px;
      color: var(--text-md);
      max-width: 540px;
      line-height: 1.7;
    }

    .meta-row {
      display: flex;
      align-items: center;
      flex-wrap: wrap;
      gap: 8px 20px;
      margin-top: 24px;
    }

    .meta-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      font-weight: 500;
      color: var(--text-lo);
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 12px;
    }

    .meta-pill svg { flex-shrink: 0; }

    /* ── Table of contents ──────────────────────────────────────────── */
    .toc {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 24px 28px;
      margin-bottom: 56px;
    }

    .toc-title {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      color: var(--text-lo);
      margin-bottom: 14px;
    }

    .toc-list {
      list-style: none;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4px 24px;
    }

    @media (max-width: 540px) {
      .toc-list { grid-template-columns: 1fr; }
    }

    .toc-list a {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13.5px;
      font-weight: 500;
      color: var(--text-md);
      text-decoration: none;
      padding: 5px 0;
      transition: color 0.15s;
    }

    .toc-list a:hover { color: var(--accent); }

    .toc-num {
      font-size: 11px;
      font-weight: 700;
      color: var(--accent);
      background: var(--accent-dim);
      border-radius: 5px;
      padding: 1px 6px;
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    /* ── Section blocks ─────────────────────────────────────────────── */
    .section {
      margin-bottom: 56px;
      scroll-margin-top: 24px;
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 10.5px;
      font-weight: 700;
      letter-spacing: 0.10em;
      text-transform: uppercase;
      color: var(--accent);
      background: var(--accent-dim);
      border: 1px solid var(--border-acc);
      border-radius: 6px;
      padding: 3px 9px;
      margin-bottom: 12px;
    }

    h2.section-title {
      font-family: 'Inter Tight', sans-serif;
      font-weight: 700;
      font-size: clamp(20px, 3vw, 26px);
      letter-spacing: -0.02em;
      color: var(--text-hi);
      margin-bottom: 8px;
      line-height: 1.25;
    }

    .section-desc {
      font-size: 14px;
      color: var(--text-lo);
      margin-bottom: 24px;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border);
    }

    h3 {
      font-family: 'Inter Tight', sans-serif;
      font-weight: 600;
      font-size: 15px;
      color: var(--text-hi);
      letter-spacing: -0.01em;
      margin: 28px 0 8px;
    }

    p { margin-bottom: 14px; }
    p:last-child { margin-bottom: 0; }

    a {
      color: var(--accent);
      text-decoration: none;
    }
    a:hover { text-decoration: underline; }

    /* ── Info cards / callouts ──────────────────────────────────────── */
    .card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      padding: 18px 22px;
      margin: 18px 0;
    }

    .card.card-accent {
      background: var(--accent-glow);
      border-color: var(--border-acc);
    }

    .card.card-green {
      background: rgba(52,211,153,0.05);
      border-color: rgba(52,211,153,0.18);
    }

    .card.card-amber {
      background: rgba(251,191,36,0.05);
      border-color: rgba(251,191,36,0.18);
    }

    .card-label {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin-bottom: 8px;
    }

    .card-label.green { color: var(--green); }
    .card-label.amber { color: var(--amber); }
    .card-label.accent { color: var(--accent); }

    /* ── Data table ─────────────────────────────────────────────────── */
    .data-table-wrap {
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
      margin: 18px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
    }

    thead th {
      background: var(--surface2);
      color: var(--text-lo);
      font-weight: 600;
      font-size: 11px;
      letter-spacing: 0.07em;
      text-transform: uppercase;
      text-align: left;
      padding: 10px 16px;
      border-bottom: 1px solid var(--border);
    }

    tbody tr { border-bottom: 1px solid var(--border); }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(255,255,255,0.018); }

    tbody td {
      padding: 11px 16px;
      color: var(--text-md);
      vertical-align: top;
    }

    tbody td:first-child {
      color: var(--text-hi);
      font-weight: 500;
      white-space: nowrap;
    }

    .badge-yes {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--green);
      background: rgba(52,211,153,0.10);
      border-radius: 4px;
      padding: 1px 7px;
    }

    .badge-no {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-lo);
      background: rgba(255,255,255,0.05);
      border-radius: 4px;
      padding: 1px 7px;
    }

    /* ── List styles ────────────────────────────────────────────────── */
    ul.styled, ol.styled {
      margin: 10px 0 14px 0;
      padding-left: 0;
      list-style: none;
      display: flex;
      flex-direction: column;
      gap: 7px;
    }

    ul.styled li, ol.styled li {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      font-size: 14.5px;
      color: var(--text-md);
    }

    ul.styled li::before {
      content: '';
      width: 5px;
      height: 5px;
      border-radius: 50%;
      background: var(--accent);
      margin-top: 8px;
      flex-shrink: 0;
    }

    ol.styled { counter-reset: li; }
    ol.styled li { counter-increment: li; }
    ol.styled li::before {
      content: counter(li);
      font-size: 10.5px;
      font-weight: 700;
      color: var(--accent);
      background: var(--accent-dim);
      border-radius: 5px;
      padding: 1px 6px;
      margin-top: 3px;
      flex-shrink: 0;
      font-variant-numeric: tabular-nums;
    }

    /* ── Divider ────────────────────────────────────────────────────── */
    .divider {
      border: none;
      border-top: 1px solid var(--border);
      margin: 56px 0;
    }

    /* ── Footer ─────────────────────────────────────────────────────── */
    .site-footer {
      padding: 40px 0 0;
      border-top: 1px solid var(--border);
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .footer-copy {
      font-size: 13px;
      color: var(--text-lo);
    }

    .footer-links {
      display: flex;
      gap: 20px;
    }

    .footer-links a {
      font-size: 13px;
      color: var(--text-lo);
      transition: color 0.15s;
    }
    .footer-links a:hover { color: var(--text-md); text-decoration: none; }

    /* ── Section label divider ──────────────────────────────────────── */
    .part-header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 48px;
    }
    .part-header-line { flex: 1; height: 1px; background: var(--border); }
    .part-header-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
      color: var(--text-lo);
      white-space: nowrap;
    }

    @media (max-width: 600px) {
      .wrapper { padding: 0 16px 80px; }
      .site-header { padding: 40px 0 40px; }
      tbody td:first-child { white-space: normal; }
    }
  </style>
</head>
<body>
<div class="wrapper">

  <!-- ── Header ─────────────────────────────────────────────────────── -->
  <header class="site-header">
    <div class="logo-row">
      <div class="logo-icon" aria-hidden="true">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <circle cx="10" cy="10" r="7" stroke="white" stroke-width="1.6"/>
          <path d="M10 6v4l2.5 2.5" stroke="white" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
      <span class="logo-name">Undistracted Me</span>
    </div>
    <p class="page-eyebrow">Legal</p>
    <h1 class="page-title">Privacy Policy &amp;<br>Terms of Service</h1>
    <p class="page-subtitle">
      This document explains exactly what data Undistracted Me collects, how it
      is used, and the terms under which you may use the extension and website.
      We have written it to be human-readable, not lawyer-readable.
    </p>
    <div class="meta-row">
      <span class="meta-pill">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1" y="2" width="10" height="9" rx="2" stroke="currentColor" stroke-width="1.2"/><path d="M4 1v2M8 1v2M1 5h10" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        Last updated: ${LAST_UPDATED}
      </span>
      <span class="meta-pill">
        <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1a5 5 0 1 0 0 10A5 5 0 0 0 6 1z" stroke="currentColor" stroke-width="1.2"/><path d="M6 4v3l2 1" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
        Effective immediately
      </span>
    </div>
  </header>

  <!-- ── Table of contents ──────────────────────────────────────────── -->
  <nav class="toc" aria-label="Table of contents">
    <p class="toc-title">Contents</p>
    <ul class="toc-list">
      <li><a href="#what-we-collect"><span class="toc-num">1</span> What We Collect</a></li>
      <li><a href="#third-party"><span class="toc-num">2</span> Third-Party Services</a></li>
      <li><a href="#google"><span class="toc-num">3</span> Google Integration</a></li>
      <li><a href="#spotify"><span class="toc-num">4</span> Spotify Integration</a></li>
      <li><a href="#storage"><span class="toc-num">5</span> Data Storage</a></li>
      <li><a href="#permissions"><span class="toc-num">6</span> Browser Permissions</a></li>
      <li><a href="#children"><span class="toc-num">7</span> Children &amp; Contact</a></li>
      <li><a href="#tos"><span class="toc-num">8</span> Terms of Service</a></li>
    </ul>
  </nav>

  <!-- ════════════════════════════════════════════════════════════════ -->
  <!--  PRIVACY POLICY                                                 -->
  <!-- ════════════════════════════════════════════════════════════════ -->

  <div class="part-header">
    <div class="part-header-line"></div>
    <span class="part-header-label">Part I — Privacy Policy</span>
    <div class="part-header-line"></div>
  </div>

  <!-- §1 What we collect -->
  <section class="section" id="what-we-collect">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M6 4v4M4 6h4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
      Section 1
    </span>
    <h2 class="section-title">What We Collect</h2>
    <p class="section-desc">Undistracted Me is designed to keep your data on your device.</p>

    <div class="card card-green">
      <p class="card-label green">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5l3 3 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        The short version
      </p>
      <p>
        We do <strong style="color:rgba(255,255,255,0.85)">not</strong> operate a user database. We do
        <strong style="color:rgba(255,255,255,0.85)">not</strong> collect your name, email, or any
        personally identifiable information on our own servers. We do
        <strong style="color:rgba(255,255,255,0.85)">not</strong> track your browsing history. All widget
        configuration stays in your browser's local storage.
      </p>
    </div>

    <h3>Data that stays on your device</h3>
    <ul class="styled">
      <li>Widget layout, sizes, and positions.</li>
      <li>Widget-specific settings (clock timezones, weather city, stock tickers, etc.).</li>
      <li>Focus Mode preferences (background choice, enabled widgets, panel settings).</li>
      <li>Nepali calendar preferences and display language.</li>
      <li>Any notes you write in the Notes widget.</li>
      <li>Pomodoro and timer history.</li>
    </ul>

    <h3>Data passed through our Vercel proxy</h3>
    <p>
      Some API calls are routed through our backend at
      <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">undistractedme.sarojbelbase.com.np</code>
      so that secret API keys are never embedded in the extension bundle. These calls are:
    </p>
    <ul class="styled">
      <li><strong>Unsplash photos</strong> — a random background photo is fetched. No personal data is sent. The response is a photo URL.</li>
      <li><strong>Google token exchange (Firefox only)</strong> — the OAuth authorisation code is exchanged for tokens server-side so the <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">client_secret</code> never leaves our server. The token is returned to your browser immediately and not stored by us.</li>
      <li><strong>Favicon proxy</strong> — a website domain name is sent to fetch its icon. No session or identity data is included.</li>
    </ul>
    <p>
      Our proxy does not log user-identifiable information. Standard web-server access logs
      (IP address, timestamp, HTTP method) may be retained for up to 30 days by our hosting
      provider (Vercel) for security and abuse-prevention purposes.
    </p>

    <h3>Geolocation</h3>
    <p>
      The Weather widget can optionally use your location to show local weather. The browser
      prompts you for permission before any coordinates are read. Coordinates are sent
      directly to <a href="https://open-meteo.com" target="_blank" rel="noopener noreferrer">Open-Meteo</a>
      (a privacy-respecting, open-source weather service) and are never stored or sent to us.
      If you decline, you can enter a city name manually.
    </p>
    <p>
      As a last resort when neither browser geolocation nor a manual city is available,
      the extension may call a public IP-based geolocation service (freeipapi.com or ipapi.co
      in website mode). Only your IP address is sent; no personal identifier is stored.
    </p>
  </section>

  <!-- §2 Third-party services -->
  <section class="section" id="third-party">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/><path d="M4 6h4M6 4l2 2-2 2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Section 2
    </span>
    <h2 class="section-title">Third-Party Services</h2>
    <p class="section-desc">
      The following external services are contacted when you use specific features.
      No service is contacted until you enable or use the corresponding feature.
    </p>

    <div class="data-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Service</th>
            <th>Purpose</th>
            <th>PII sent?</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>api.open-meteo.com</td>
            <td>Weather data — no API key, open source</td>
            <td><span class="badge-no">None</span></td>
          </tr>
          <tr>
            <td>geocoding-api.open-meteo.com</td>
            <td>City name → coordinates lookup</td>
            <td><span class="badge-no">None</span></td>
          </tr>
          <tr>
            <td>nominatim.openstreetmap.org</td>
            <td>Reverse geocoding (coordinates → city name)</td>
            <td><span class="badge-no">IP only</span></td>
          </tr>
          <tr>
            <td>freeipapi.com</td>
            <td>IP-based location fallback</td>
            <td><span class="badge-no">IP only</span></td>
          </tr>
          <tr>
            <td>ipapi.co</td>
            <td>IP-based location (website mode only)</td>
            <td><span class="badge-no">IP only</span></td>
          </tr>
          <tr>
            <td>nepalipaisa.com</td>
            <td>Nepali stock company list</td>
            <td><span class="badge-no">None</span></td>
          </tr>
          <tr>
            <td>www.merolagani.com</td>
            <td>Nepali stock chart data</td>
            <td><span class="badge-no">None</span></td>
          </tr>
          <tr>
            <td>api.spotify.com</td>
            <td>Spotify playback control &amp; now-playing</td>
            <td><span class="badge-yes">OAuth token</span></td>
          </tr>
          <tr>
            <td>accounts.spotify.com</td>
            <td>Spotify OAuth authentication</td>
            <td><span class="badge-yes">Credentials</span></td>
          </tr>
          <tr>
            <td>www.googleapis.com</td>
            <td>Google Calendar events (read-only)</td>
            <td><span class="badge-yes">OAuth token</span></td>
          </tr>
          <tr>
            <td>tasks.googleapis.com</td>
            <td>Google Tasks — read, create, update, delete</td>
            <td><span class="badge-yes">OAuth token</span></td>
          </tr>
          <tr>
            <td>people.googleapis.com</td>
            <td>Google Contacts search (read-only)</td>
            <td><span class="badge-yes">OAuth token</span></td>
          </tr>
          <tr>
            <td>www.googleapis.com/drive</td>
            <td>Drive file search — metadata only, read-only</td>
            <td><span class="badge-yes">OAuth token</span></td>
          </tr>
          <tr>
            <td>oauth2.googleapis.com</td>
            <td>Google token endpoint (Firefox — via our server)</td>
            <td><span class="badge-yes">Via server</span></td>
          </tr>
          <tr>
            <td>undistractedme.sarojbelbase.com.np</td>
            <td>Our Vercel proxy (photos, favicon, FF token exchange)</td>
            <td><span class="badge-yes">API key</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="card card-amber">
      <p class="card-label amber">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2L1.5 11h11L7 2z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 6v2.5M7 10.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Note on OAuth tokens
      </p>
      <p>
        When you connect Google or Spotify, an OAuth access token is issued by the respective
        service and stored in your browser's local storage (or session storage in website mode).
        This token is sent with each API call to authenticate you — it is never sent to our
        servers except during the Firefox Google token exchange, where it is forwarded
        immediately to your browser without being persisted.
      </p>
    </div>
  </section>

  <!-- §3 Google integration -->
  <section class="section" id="google">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/></svg>
      Section 3
    </span>
    <h2 class="section-title">Google Integration</h2>
    <p class="section-desc">
      Undistracted Me can optionally connect to your Google account. No Google feature is
      active until you explicitly sign in.
    </p>

    <h3>Permissions requested</h3>
    <div class="data-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Scope</th>
            <th>Used by</th>
            <th>Access level</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>userinfo.profile</td>
            <td>Display your name and avatar</td>
            <td><span class="badge-no">Read only</span></td>
          </tr>
          <tr>
            <td>userinfo.email</td>
            <td>Identify which account is connected</td>
            <td><span class="badge-no">Read only</span></td>
          </tr>
          <tr>
            <td>calendar.readonly</td>
            <td>Google Calendar widget — upcoming events</td>
            <td><span class="badge-no">Read only</span></td>
          </tr>
          <tr>
            <td>contacts.readonly</td>
            <td>Contact search in the events panel</td>
            <td><span class="badge-no">Read only</span></td>
          </tr>
          <tr>
            <td>drive.metadata.readonly</td>
            <td>Drive file search in Focus Mode search bar</td>
            <td><span class="badge-no">Read only</span></td>
          </tr>
          <tr>
            <td>tasks</td>
            <td>Tasks panel — view, create, complete, delete tasks</td>
            <td><span class="badge-yes">Read &amp; Write</span></td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>What we do with Google Tasks</h3>
    <ul class="styled">
      <li>Read tasks from your <em>default</em> task list only (up to 100 tasks, including completed).</li>
      <li>Create new tasks in that same default list.</li>
      <li>Update a task's title when you double-click to edit it.</li>
      <li>Mark a task completed or un-completed via the checkbox.</li>
      <li>Permanently delete a task when you click the trash icon.</li>
    </ul>

    <div class="card card-green">
      <p class="card-label green">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M2.5 7.5l3 3 6-6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        What we do NOT do
      </p>
      <ul class="styled" style="margin:0">
        <li>Access any task list other than your default list.</li>
        <li>Read task notes, sub-tasks, or due dates beyond what the API returns.</li>
        <li>Sync, cache, or transmit your task data to any server — it exists only in React memory while the tab is open.</li>
      </ul>
    </div>

    <h3>Data Protection for Sensitive Data</h3>
    <p>
      We protect your sensitive Google user data (Calendar events, Contacts, Tasks, and Drive metadata) by ensuring it never leaves your device. We do not operate any database or remote storage servers. Your data is securely stored purely locally on your device within your browser's sandboxed <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">chrome.storage.local</code> or <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">localStorage</code> environment, which is accessible only by the extension itself. We employ encryption in transit (HTTPS) for all direct API calls between your browser and Google's servers.
    </p>

    <h3>Data Retention and Deletion</h3>
    <p>
      We retain your Google user data locally only for as long as your account remains connected to the extension. We provide an explicit <strong>"Disconnect"</strong> mechanism in the extension's Account Settings panel. The moment you click Disconnect, all cached Google user data, profile information, and authentication tokens are immediately and permanently deleted from your local storage. Furthermore, uninstalling the extension prompts the browser to automatically delete all associated local storage data.
    </p>

    <h3>Revoking access</h3>
    <p>
      In addition to disconnecting within the extension, you can revoke the extension's permissions entirely at any time from
      <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">myaccount.google.com/permissions</a>.
      Revoking access does not delete any data from Google's servers — it only removes
      our application's ability to read or interact with your Google data.
    </p>

    <h3>Chrome vs. Firefox auth path</h3>
    <p>
      On <strong style="color:rgba(255,255,255,0.8)">Chrome</strong>, authentication uses
      <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">chrome.identity.getAuthToken()</code>
      — token management is handled entirely by the browser. No client secret is needed.
    </p>
    <p>
      On <strong style="color:rgba(255,255,255,0.8)">Firefox</strong>, a PKCE OAuth flow is used.
      The authorisation code is exchanged for tokens via our Vercel endpoint, which injects
      the <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">client_secret</code>
      server-side. The secret is never present in the extension bundle.
    </p>
  </section>

  <!-- §4 Spotify -->
  <section class="section" id="spotify">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/></svg>
      Section 4
    </span>
    <h2 class="section-title">Spotify Integration</h2>
    <p class="section-desc">The Spotify widget is entirely opt-in and requires explicit sign-in.</p>

    <p>
      Spotify authentication uses the standard PKCE flow. Only the
      <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">client_id</code>
      and a locally-generated <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">code_verifier</code>
      are sent — no client secret is involved. Token exchange goes directly to
      <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">accounts.spotify.com/api/token</code>
      and never through our servers.
    </p>
    <ul class="styled">
      <li>Tokens are stored in <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">chrome.storage.local</code> (extension) or <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">sessionStorage</code> (website mode — cleared when the tab is closed).</li>
      <li>The extension reads your currently playing track and controls playback (play, pause, next, previous, seek).</li>
      <li>No listening history or personal data is collected by us.</li>
    </ul>

    <h3>Browser media sessions (SoundCloud &amp; others)</h3>
    <p>
      A content script is injected into SoundCloud pages
      (<code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">*://*.soundcloud.com/*</code>) only.
      It polls <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">navigator.mediaSession</code>
      for track metadata and sends it to the background service worker so it can be displayed
      in the Focus Mode media panel. No data is sent to any external server. The content
      script does not modify the SoundCloud page.
    </p>
  </section>

  <!-- §5 Storage -->
  <section class="section" id="storage">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><rect x="1" y="1" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.4"/></svg>
      Section 5
    </span>
    <h2 class="section-title">Data Storage</h2>
    <p class="section-desc">All user data is stored locally in your browser.</p>

    <div class="data-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Storage type</th>
            <th>What is stored</th>
            <th>When cleared</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>chrome.storage.local</td>
            <td>Widget settings, Spotify tokens, Google Calendar cache, OAuth connected flags</td>
            <td>Extension uninstall</td>
          </tr>
          <tr>
            <td>localStorage</td>
            <td>UI preferences, theme, widget layout, search history, Zustand state</td>
            <td>Manual clear / uninstall</td>
          </tr>
          <tr>
            <td>sessionStorage (website only)</td>
            <td>Google and Spotify OAuth tokens — scoped to tab session</td>
            <td>Tab close</td>
          </tr>
        </tbody>
      </table>
    </div>

    <h3>Security Measures</h3>
    <ul class="styled">
      <li><strong>Storage Isolation:</strong> Sensitive data (like Google events and contacts) is sandboxed in <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">chrome.storage.local</code>, which cannot be accessed by other websites. Less sensitive UI preferences use standard <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">localStorage</code>.</li>
      <li><strong>Web Mode Security:</strong> When using the web version, OAuth tokens are strictly stored in <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">sessionStorage</code>, guaranteeing they are permanently wiped from your browser the moment you close the tab.</li>
      <li><strong>API Key Obfuscation:</strong> We employ build-time cryptographic obfuscation for internal API keys (like the Google OAuth client ID) to prevent automated scrapers from extracting them from the codebase.</li>
    </ul>

    <p>
      No data is synced to the cloud via <code style="font-family:monospace;font-size:13px;color:rgba(255,255,255,0.7)">chrome.storage.sync</code>.
      Data does not leave your device except for the API calls described in Section 2.
    </p>
  </section>

  <!-- §6 Permissions -->
  <section class="section" id="permissions">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/></svg>
      Section 6
    </span>
    <h2 class="section-title">Browser Permissions</h2>
    <p class="section-desc">
      Undistracted Me declares only the permissions necessary for its features.
    </p>

    <div class="data-table-wrap">
      <table>
        <thead>
          <tr>
            <th>Permission</th>
            <th>Why it is needed</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>identity</td>
            <td>Google OAuth (<code style="font-family:monospace;font-size:13px">getAuthToken</code>) and Spotify PKCE (<code style="font-family:monospace;font-size:13px">launchWebAuthFlow</code>)</td>
          </tr>
          <tr>
            <td>storage</td>
            <td>Widget configuration, Spotify tokens, Google Calendar event cache</td>
          </tr>
          <tr>
            <td>geolocation</td>
            <td>Weather widget auto-location — browser prompts user before coordinates are read</td>
          </tr>
          <tr>
            <td>topSites</td>
            <td>Quick Access widget shows the user's most-visited sites — data is displayed inline only</td>
          </tr>
          <tr>
            <td>tabs</td>
            <td>(a) Check if a new-tab page is active before showing a look-away notification; (b) route media playback commands to the SoundCloud content script</td>
          </tr>
          <tr>
            <td>notifications</td>
            <td>Google Calendar event reminders, Pomodoro timer completion, look-away break alerts</td>
          </tr>
          <tr>
            <td>alarms</td>
            <td>Minute-level periodic alarm for event reminders and look-away timer — required because MV3 service workers do not persist</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>

  <!-- §7 Children & contact -->
  <section class="section" id="children">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.4"/></svg>
      Section 7
    </span>
    <h2 class="section-title">Children, Changes &amp; Contact</h2>
    <p class="section-desc"></p>

    <h3>Children's privacy</h3>
    <p>
      Undistracted Me is not directed at children under the age of 13. We do not
      knowingly collect personal information from children. If you believe a child has
      provided personal information, please contact us and we will remove it.
    </p>

    <h3>Changes to this policy</h3>
    <p>
      We may update this policy when we add new features that affect data handling. The
      "Last updated" date at the top will change. Significant changes will be noted in the
      extension's changelog.
    </p>

    <h3>Contact</h3>
    <p>
      Questions, concerns, or data requests: <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a><br>
      Website: <a href="${WEBSITE}" target="_blank" rel="noopener noreferrer">${WEBSITE}</a>
    </p>
  </section>

  <hr class="divider" />

  <!-- ════════════════════════════════════════════════════════════════ -->
  <!--  TERMS OF SERVICE                                               -->
  <!-- ════════════════════════════════════════════════════════════════ -->

  <div class="part-header">
    <div class="part-header-line"></div>
    <span class="part-header-label">Part II — Terms of Service</span>
    <div class="part-header-line"></div>
  </div>

  <section class="section" id="tos">
    <span class="section-badge">
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M3 2h6a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z" stroke="currentColor" stroke-width="1.4"/><path d="M4 5h4M4 7.5h2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>
      Section 8
    </span>
    <h2 class="section-title">Terms of Service</h2>
    <p class="section-desc">
      By installing or using Undistracted Me, you agree to these terms.
    </p>

    <h3>1. Use of the extension</h3>
    <p>
      Undistracted Me is provided free of charge for personal, non-commercial use. You may
      not reverse-engineer, redistribute, or create derivative works that misrepresent their
      origin as official Undistracted Me releases.
    </p>

    <h3>2. Third-party accounts</h3>
    <p>
      Features that connect to Google or Spotify are governed by those services' own terms:
    </p>
    <ul class="styled">
      <li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google Terms of Service</a></li>
      <li><a href="https://www.spotify.com/legal/end-user-agreement/" target="_blank" rel="noopener noreferrer">Spotify Terms of Use</a></li>
    </ul>
    <p>
      You are responsible for complying with the terms of any third-party service you
      connect to through the extension.
    </p>

    <h3>3. No warranty</h3>
    <p>
      Undistracted Me is provided "as is" without warranty of any kind. We do not guarantee
      uninterrupted availability, accuracy of third-party data (weather, stock prices, etc.),
      or compatibility with future browser versions.
    </p>

    <h3>4. Limitation of liability</h3>
    <p>
      To the maximum extent permitted by law, we shall not be liable for any indirect,
      incidental, special, or consequential damages arising from your use of the extension,
      including but not limited to data loss, service interruptions, or reliance on displayed
      information.
    </p>

    <h3>5. Acceptable use</h3>
    <p>You agree not to:</p>
    <ul class="styled">
      <li>Use the extension to automate requests in a way that violates any third-party service's terms.</li>
      <li>Attempt to extract, scrape, or abuse the proxy API endpoints for purposes other than personal extension use.</li>
      <li>Misrepresent the extension's functionality in reviews or publications.</li>
    </ul>

    <h3>6. Open source</h3>
    <p>
      The source code is publicly available. Community contributions are welcome under the
      terms of the project's licence. Using the source code in your own project must comply
      with that licence.
    </p>

    <h3>7. Changes to terms</h3>
    <p>
      We may revise these terms at any time. Continued use of the extension after changes
      are posted constitutes acceptance of the updated terms.
    </p>

    <h3>8. Governing law</h3>
    <p>
      These terms are governed by the laws of Nepal. Disputes shall be resolved in the
      courts of Kathmandu, Nepal.
    </p>

    <div class="card card-accent" style="margin-top:28px">
      <p class="card-label accent">
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="6" stroke="currentColor" stroke-width="1.4"/><path d="M7 5v4M7 3.5v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
        Questions?
      </p>
      <p>
        If you have questions about these terms or the privacy policy, reach out at
        <a href="mailto:${CONTACT_EMAIL}">${CONTACT_EMAIL}</a>. We aim to respond within 3 business days.
      </p>
    </div>
  </section>

  <!-- ── Footer ─────────────────────────────────────────────────────── -->
  <footer class="site-footer">
    <p class="footer-copy">
      &copy; ${new Date().getFullYear()} Undistracted Me &mdash; Saroj Belbase
    </p>
    <nav class="footer-links" aria-label="Footer links">
      <a href="${WEBSITE}" target="_blank" rel="noopener noreferrer">Website</a>
      <a href="mailto:${CONTACT_EMAIL}">Contact</a>
      <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Revoke Google access</a>
    </nav>
  </footer>

</div>
</body>
</html>`;

export default function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).end();
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=3600');
  res.setHeader('X-Frame-Options', 'DENY');

  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(html);
}
