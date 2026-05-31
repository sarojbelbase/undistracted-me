import React, { useState, useEffect, useCallback } from "react";
import { XLg } from "react-bootstrap-icons";
import { getBlockedSites, unblockSite } from "../../utilities/siteBlocker";
import { shorthandFromUrl } from "../../utilities/index";

/**
 * Blocked sites section — shows blocked domains as clean pills with favicon + countdown.
 * Block action lives in CurrentTabBookmark (icon next to save button).
 */
export const BlockedSitesSection = () => {
  const [sites, setSites] = useState(() => getBlockedSites());
  const [now, setNow] = useState(Date.now());

  // Only tick `now` for countdown display — do NOT call getBlockedSites()
  // every second because it destructively writes back to localStorage,
  // which would wipe out infinite-block entries (blockedUntil === null).
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Periodically refresh to prune expired timed blocks (every 30s).
  // Does NOT run every second — avoids the destructive write race condition.
  useEffect(() => {
    const t = setInterval(() => {
      setSites(getBlockedSites());
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const handleUnblock = useCallback(async (domain) => {
    try {
      await unblockSite(domain);
      setSites(getBlockedSites());
    } catch (err) {
      console.error('[BlockedSitesSection] unblock failed:', err);
    }
  }, []);

  if (sites.length === 0) return null;

  const fmtTime = (site) => {
    if (!site) return '';
    if (site.infinite) return '∞';
    if (site.blockedUntil == null) return '';
    const ms = site.blockedUntil - now;
    if (ms <= 0) return 'done';
    const m = Math.ceil(ms / 60000);
    if (m >= 60) {
      const h = Math.floor(m / 60);
      const rm = m % 60;
      return rm > 0 ? `${h}h ${rm}m` : `${h}h`;
    }
    return `${m}m`;
  };

  return (
    <div className="popup-blocked popup-section">
      <div className="popup-blocked__header">Blocked</div>
      <div className="chips">
        {sites.map((site) => {
          const name = shorthandFromUrl("https://" + site.domain);
          return (
            <a
              key={site.domain}
              href={`https://${site.domain}`}
              target="_blank"
              rel="noreferrer"
              className={`chip chip--blocked chip--clickable${site.infinite ? ' chip--infinite' : ''}`}
            >
              <img
                src={`https://www.google.com/s2/favicons?domain=${site.domain}&sz=32`}
                alt=""
                className="chip__icon"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
              <span className="chip__label">{name}</span>
              <span className="chip__value">{fmtTime(site)}</span>
              {site.infinite && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleUnblock(site.domain);
                  }}
                  className="chip__unblock"
                  aria-label="Unblock"
                  title="Remove block"
                >
                  <XLg size={10} />
                </button>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
};
