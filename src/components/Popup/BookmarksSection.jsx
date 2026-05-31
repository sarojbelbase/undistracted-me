import React, { useState, useCallback } from "react";
import { TrashFill } from "react-bootstrap-icons";
import { shorthandFromUrl } from "../../utilities/index";

/**
 * Shared bookmarks list — compact inline chips with hover-to-delete.
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
            <div className="chips">
                {bookmarks.map((bm) => {
                    const isConfirming = confirmingUrl === bm.url;
                    return (
                        <a
                            key={bm.url}
                            href={bm.url}
                            target="_blank"
                            rel="noreferrer"
                            className={`chip chip--clickable${isConfirming ? ' chip--outlined' : ''}`}
                            onMouseLeave={isConfirming ? handleMouseLeave : undefined}
                        >
                            <img
                                src={`https://www.google.com/s2/favicons?domain=${new URL(bm.url).hostname}&sz=32`}
                                alt=""
                                className="chip__icon"
                                onError={(e) => { e.currentTarget.style.display = "none"; }}
                            />
                            <span className="chip__label">
                                {shorthandFromUrl(bm.url)}
                            </span>
                            <button
                                onClick={(e) => handleRemove(e, bm.url)}
                                className={`popup-bookmarks__remove${isConfirming ? " popup-bookmarks__remove--confirming" : ""}`}
                                aria-label={isConfirming ? "Confirm remove" : "Remove bookmark"}
                            >
                                {isConfirming ? (
                                    <span className="popup-bookmarks__confirm">Sure?</span>
                                ) : (
                                    <TrashFill size={10} />
                                )}
                            </button>
                        </a>
                    );
                })}
            </div>
        </div>
    );
};
