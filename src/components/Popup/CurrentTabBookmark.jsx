import React from "react";
import { BookmarkPlus } from "react-bootstrap-icons";
import { shorthandFromUrl } from "../../utilities/index";

/**
 * Current-tab bookmark card. Shows the active browser tab with a "Save" button
 * that adds it to shared bookmarks, or a "Saved ✓" indicator if already saved.
 */
export const CurrentTabBookmark = ({
  curTab,
  tabSaved,
  tabAlreadySaved,
  onSave,
}) => {
  if (!curTab) return null;

  const isSaved = tabSaved || tabAlreadySaved;

  return (
    <div className="popup-ctab popup-section">
      <div className={`popup-ctab__card${isSaved ? " popup-ctab__card--saved" : ""}`}>
        {curTab.favIconUrl ? (
          <img
            src={curTab.favIconUrl}
            alt=""
            className="popup-ctab__favicon"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        ) : (
          <div className="popup-ctab__favicon-placeholder" />
        )}

        <div className="popup-ctab__info">
          <div className="popup-ctab__title">
            {curTab.title || shorthandFromUrl(curTab.url)}
          </div>
          <div className="popup-ctab__host">{shorthandFromUrl(curTab.url)}</div>
        </div>

        {isSaved ? (
          <span className="popup-ctab__saved">Saved ✓</span>
        ) : (
          <button onClick={onSave} className="popup-ctab__save-btn">
            <BookmarkPlus size={11} /> Save
          </button>
        )}
      </div>
    </div>
  );
};
