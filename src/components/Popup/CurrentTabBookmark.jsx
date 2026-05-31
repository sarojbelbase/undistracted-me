import React, { useState } from "react";
import { BookmarkPlus, BookmarkCheckFill, SlashCircleFill, XLg } from "react-bootstrap-icons";
import { shorthandFromUrl } from "../../utilities/index";
import { canBlock, blockSite } from "../../utilities/siteBlocker";

const TIMER_PRESETS = [
  { label: '30m', mins: 30 },
  { label: '1h', mins: 60 },
  { label: '2h', mins: 120 },
  { label: '4h', mins: 240 },
  { label: '8h', mins: 480 },
  { label: '∞', mins: -1 },
];

/**
 * Current-tab card — favicon, title, and two icon buttons side by side.
 * Block button opens an inline timer picker; save button bookmarks the tab.
 */
export const CurrentTabBookmark = ({
  curTab,
  isSaved,
  onSave,
  onBlocked,
}) => {
  const [showPicker, setShowPicker] = useState(false);

  if (!curTab) return null;

  const blockable = canBlock(curTab.url);

  const handleBlock = async (mins) => {
    if (!curTab?.url) return;
    await blockSite(curTab.url, mins);
    setShowPicker(false);
    onBlocked?.();

    // Reload the tab so the DNR rule kicks in immediately
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) chrome.tabs.reload(tab.id);
    } catch { /* noop */ }
  };

  return (
    <div className="popup-ctab popup-section">
      <div className="popup-ctab__card">
        {curTab.favIconUrl ? (
          <img
            src={curTab.favIconUrl}
            alt=""
            className="popup-ctab__favicon"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="popup-ctab__favicon-placeholder" />
        )}

        <div className="popup-ctab__info">
          <div className="popup-ctab__title">
            {shorthandFromUrl(curTab.url)}
          </div>
        </div>

        {/* Action buttons — block + save side by side */}
        <div className="popup-ctab__actions">
          {blockable && (
            <button
              onClick={() => setShowPicker(!showPicker)}
              className={`popup-ctab__action-btn${showPicker ? ' popup-ctab__action-btn--active' : ''}`}
              aria-label="Block this site"
              title="Block this site"
            >
              <SlashCircleFill size={14} />
            </button>
          )}

          <button
            onClick={onSave}
            className={`popup-ctab__action-btn${isSaved ? ' popup-ctab__action-btn--saved' : ''}`}
            disabled={isSaved}
            aria-label={isSaved ? "Bookmarked" : "Save bookmark"}
            title={isSaved ? "Bookmarked" : "Save to bookmarks"}
          >
            {isSaved ? (
              <BookmarkCheckFill size={14} />
            ) : (
              <BookmarkPlus size={14} />
            )}
          </button>
        </div>
      </div>

      {/* Timer picker — compact single-row segmented pills */}
      {showPicker && (
        <div className="popup-ctab__timer-row">
          <div className="popup-ctab__timer-segments">
            {TIMER_PRESETS.map((p) => (
              <button
                key={p.mins}
                onClick={() => handleBlock(p.mins)}
                className="popup-ctab__timer-seg"
              >
                {p.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowPicker(false)}
            className="popup-ctab__timer-cancel"
            aria-label="Cancel"
          >
            <XLg size={12} />
          </button>
        </div>
      )}
    </div>
  );
};
