/**
 * Changelog for the /changelogs page — thin wrapper over the single source of
 * truth at `changelog/index.js`. This file only adds the image resolution that
 * Astro's asset pipeline needs (the shared data is intentionally text-only so
 * the extension and the release script can import it too).
 *
 * Add a release in `changelog/index.js`; attach its screenshot here by version.
 */

import {
  origin as originData,
  releases,
  latestVersion,
} from "../../../changelog/index.js";

import v1Hero from "../assets/changelog/v1-hero.png";
import v3Dashboard from "../assets/changelog/v3-dashboard.png";
import v3Focus from "../assets/changelog/v3-focus.png";
import focusMode from "../assets/screenshots/focus_mode.webp";
import canvasMode from "../assets/screenshots/canvas_mode.webp";
import stockNepse from "../assets/screenshots/stock_nepse.webp";

const IMAGES = {
  "v4.0.2": {
    image: { src: stockNepse, alt: "The Stock widget showing a NEPSE watchlist.", caption: "Stocks, now with an International tab." },
  },
  "v4.0.0": {
    images: [
      { src: v3Dashboard, alt: "An early build of the dashboard during the rewrite.", caption: "Dashboard, mid-rewrite" },
      { src: v3Focus, alt: "An early build of Focus Mode during the rewrite.", caption: "Focus Mode, mid-rewrite" },
      { src: focusMode, alt: "Focus Mode: a full-screen cinematic clock.", caption: "Focus Mode, shipped" },
      { src: canvasMode, alt: "The dashboard canvas with widgets.", caption: "Dashboard, shipped" },
    ],
  },
};

export const origin = {
  ...originData,
  image: { src: v1Hero, alt: "The original 2020 Undistracted Me new tab with the Nepali calendar.", caption: "The first build, May 2020." },
};

export const changelog = releases.map((r) => ({
  ...r,
  ...(IMAGES[r.version] ?? {}),
}));

export { latestVersion };
