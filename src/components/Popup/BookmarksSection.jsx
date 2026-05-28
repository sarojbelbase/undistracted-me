import React, { useState, useCallback } from "react";
import { TrashFill } from "react-bootstrap-icons";
import { shorthandFromUrl } from "../../utilities/index";

/**
 * Shared bookmarks list. Syncs across popup and canvas dashboard via
 * the sharedBookmarks store. Each row shows favicon, title, and a trash
 * icon (visible on hover). Clicking the trash asks "Sure?" before deleting.
 */
export const BookmarksSection = ({ bookmarks, onRemove }) => {
    const [confirmingUrl, setConfirmingUrl] = useState(null);

    const handleRemove = useCallback(
        (e, url) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirmingUrl === url) {
                onRemove(url);
                setConfirmingUrl(null);
            } else {
                setConfirmingUrl(url);
            }
        },
        [confirmingUrl, onRemove],
    );

    const handleMouseLeave = useCallback(() => {
        setConfirmingUrl(null);
    }, []);

    if (!bookmarks || bookmarks.length === 0) return null;

    return (
        <div className="popup-bookmarks popup-section">
            <div className="popup-bookmarks__heading">Bookmarks</div>
            <div className="popup-bookmarks__list">
                {bookmarks.map((bm) => (
                    <a
                        key={bm.url}
                        href={bm.url}
                        target="_blank"
                        rel="noreferrer"
                        className="popup-bookmarks__item"
                        onMouseLeave={
                            bm.url === confirmingUrl
                                ? handleMouseLeave
                                : undefined
                        }
                    >
                        <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32`}
                            alt=""
                            className="popup-bookmarks__favicon"
                            onError={(e) => {
                                e.currentTarget.style.display = "none";
                            }}
                        />
                        <span className="popup-bookmarks__title">
                            {bm.title || shorthandFromUrl(bm.url)}
                        </span>
                        <button
                            onClick={(e) => handleRemove(e, bm.url)}
                            className={`popup-bookmarks__remove${confirmingUrl === bm.url ? " popup-bookmarks__remove--confirming" : ""}`}
                            aria-label={
                                confirmingUrl === bm.url
                                    ? "Confirm remove"
                                    : "Remove bookmark"
                            }
                        >
                            {confirmingUrl === bm.url ? (
                                <span className="popup-bookmarks__confirm">
                                    Sure?
                                </span>
                            ) : (
                                <TrashFill size={10} />
                            )}
                        </button>
                    </a>
                ))}
            </div>
        </div>
    );
};
