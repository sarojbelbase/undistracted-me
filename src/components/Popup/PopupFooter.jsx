import React from "react";
import { GridFill } from "react-bootstrap-icons";

/**
 * Popup footer with "Open Dashboard" link.
 */
export const PopupFooter = () => {
  const openDashboard = (e) => {
    e.preventDefault();
    if (typeof chrome !== "undefined" && chrome.tabs?.create) {
      chrome.tabs.create({ url: chrome.runtime.getURL("entries/index.html") });
    }
  };

  return (
    <div className="popup-footer">
      <a href="#" onClick={openDashboard} className="popup-footer__link">
        <GridFill size={10} /> Open Dashboard
      </a>
    </div>
  );
};
