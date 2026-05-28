import React from "react";
import { shorthandFromUrl } from "../../utilities/index";
import { FaviconIcon } from "../ui/FaviconIcon";

/**
 * Quick links grid — up to 6 top sites from chrome.topSites.
 */
export const QuickLinksSection = ({ topSites }) => {
  if (!topSites || topSites.length === 0) return null;

  return (
    <div className="popup-quick-links">
      <div className="popup-quick-links__heading">Quick Links</div>
      <div className="popup-quick-links__grid">
        {topSites.map((site) => (
          <a
            key={site.url}
            href={site.url}
            target="_blank"
            rel="noreferrer"
            title={site.title}
            className="popup-quick-links__link"
          >
            <div className="popup-quick-links__tile">
              <FaviconIcon url={site.url} size={20} />
            </div>
            <span className="popup-quick-links__label">
              {shorthandFromUrl(site.url)}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
};
