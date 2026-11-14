// ── Theme init (blocks FOUC — must execute before React mount) ──────────────
import "../themeInit";
import "../App.css";
import "../styles/main.scss";
import { createRoot } from "react-dom/client";
import { PopupApp } from "./PopupApp";

const root = createRoot(document.getElementById("popup-root"));
root.render(<PopupApp />);
