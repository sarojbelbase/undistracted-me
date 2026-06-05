import React, { useState, useEffect, useRef } from "react";
import { BaseWidget } from "../BaseWidget";
import { BaseSettingsModal } from "../BaseSettingsModal";
import { useWidgetSettings } from "../useWidgetSettings";
import { Popup } from "../../components/ui/Popup";
import { FaviconIcon } from "../../components/ui/FaviconIcon";
import { shorthandFromUrl } from "../../utilities/index";
import { addBookmark as addSharedBookmark } from "../../data/sharedBookmarks";
import { BookmarkSettings } from "./Settings";

export const Widget = ({ id, onRemove }) => {
  const [settings, updateSetting] = useWidgetSettings(id, {
    url: "",
    name: "",
    iconMode: "favicon",
  });
  const [showSettings, setShowSettings] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [bgColor, setBgColor] = useState(null);
  const linkRef = useRef(null);
  const { url, name, iconMode = "favicon" } = settings;

  // Reset / recompute background colour whenever url or iconMode changes
  useEffect(() => {
    if (iconMode === "letter") {
      // Use accent CSS variable — set as string so BaseWidget inlines it.
      // The letter colour uses var(--w-accent-fg) which is guaranteed to contrast.
      setBgColor("var(--w-accent)");
    } else {
      setBgColor(null); // favicon onLoad callback will set it
    }
  }, [url, iconMode, name]);

  const hasUrl = Boolean(url && url !== "https://");
  const displayName = name || (hasUrl ? shorthandFromUrl(url) : "Bookmark");

  const handleSave = (u, n, mode) => {
    updateSetting("url", u);
    updateSetting("name", n);
    updateSetting("iconMode", mode ?? iconMode);
    // Sync to shared bookmark store so the popup sees it
    addSharedBookmark({ url: u, title: n, iconMode: mode ?? iconMode });
    setShowSettings(false);
  };

  // Both the ⋯ menu and the + button open identical BaseSettingsModal
  const settingsContent = (onClose) => (
    <BookmarkSettings
      url={url}
      name={name}
      iconMode={iconMode}
      onSave={(u, n, mode) => {
        handleSave(u, n, mode);
        onClose();
      }}
    />
  );

  return (
    <>
      <BaseWidget
        settingsContent={settingsContent}
        settingsTitle={hasUrl ? "Update Bookmark" : "Add Bookmark"}
        onRemove={onRemove}
        cardStyle={bgColor ? { backgroundColor: bgColor } : {}}
      >
        {hasUrl ? (
          <a
            ref={linkRef}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={displayName}
            className="flex-1 self-stretch flex items-center justify-center outline-none transition-opacity hover:opacity-80 active:opacity-60"
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              if (!linkRef.current) return;
              const r = linkRef.current.getBoundingClientRect();
              setAnchor({
                left: r.left,
                top: r.top,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              });
            }}
            onMouseLeave={() => setAnchor(null)}
          >
            <FaviconIcon
              key={`${url}-${iconMode}`}
              url={url}
              size={40}
              iconMode={iconMode}
              onColor={iconMode === "favicon" ? setBgColor : undefined}
            />
          </a>
        ) : (
          // Empty state — + button, opens same central modal
          <button
            onClick={() => setShowSettings(true)}
            onMouseDown={(e) => e.stopPropagation()}
            aria-label="Add bookmark"
            className="flex-1 self-stretch flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-40"
            style={{ color: "var(--w-ink-4)" }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <rect x="7" y="1" width="2" height="14" rx="1" />
              <rect x="1" y="7" width="14" height="2" rx="1" />
            </svg>
          </button>
        )}

        {/* Hover popup — portalled via Popup, so it escapes overflow:hidden */}
        {anchor && (
          <Popup anchor={anchor} className="px-3 py-2.5 max-w-50">
            <span
              className="text-xs font-semibold leading-snug"
              style={{ color: "var(--w-ink-1)" }}
            >
              Go to {displayName}
            </span>
          </Popup>
        )}
      </BaseWidget>

      {/* + button opens the same modal as ⋯ → Settings */}
      {showSettings && (
        <BaseSettingsModal
          title={hasUrl ? "Update Bookmark" : "Add Bookmark"}
          onClose={() => setShowSettings(false)}
        >
          <div className="px-4 pb-4">
            <BookmarkSettings
              url={url}
              name={name}
              iconMode={iconMode}
              onSave={handleSave}
            />
          </div>
        </BaseSettingsModal>
      )}
    </>
  );
};
