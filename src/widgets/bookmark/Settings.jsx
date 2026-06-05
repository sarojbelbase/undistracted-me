import { useState } from "react";
import { SettingsInput } from "../../components/ui/SettingsInput";
import { TooltipBtn } from "../../components/ui/TooltipBtn";
import { SegmentedControl } from "../../components/ui/SegmentedControl";
import { RefreshIcon } from "../../assets/svg/RefreshIcon";
import { FaviconIcon } from "../../components/ui/FaviconIcon";
import { faviconCache, getHostname } from "../../utilities/favicon";
import { shorthandFromUrl } from "../../utilities/index";
import { normalizeUrl } from "./utils";

export const ICON_MODE_OPTIONS = [
  { label: "Favicon", value: "favicon" },
  { label: "Letter", value: "letter" },
];

export const BookmarkSettings = ({
  url,
  name,
  iconMode: initialIconMode = "favicon",
  onSave,
}) => {
  const stripProtocol = (u) => (u || "").replace(/^https?:\/\//, "");
  const isEditing = Boolean(url && url !== "https://");

  const [path, setPath] = useState(() => stripProtocol(url));
  const [localName, setLocalName] = useState(name || "");
  const [iconMode, setIconMode] = useState(initialIconMode);
  const [previewKey, setPreviewKey] = useState(0);

  const fullUrl = path.trim() ? `https://${path.trim()}` : "";
  const derivedName = path.trim() ? shorthandFromUrl(fullUrl) : "";
  const previewHostname = fullUrl ? getHostname(fullUrl) : "";

  const handleBlur = () => {
    if (!localName.trim() && path.trim()) {
      try {
        setLocalName(shorthandFromUrl(fullUrl));
      } catch { }
    }
  };

  const handleRefresh = () => {
    if (previewHostname) faviconCache.delete(previewHostname);
    setPreviewKey((k) => k + 1);
  };

  const canSave = Boolean(path.trim());

  const handleSave = () => {
    if (!canSave) return;
    const u = normalizeUrl(fullUrl);
    const n = localName.trim() || shorthandFromUrl(u);
    onSave(u, n, iconMode);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Live icon preview */}
      {fullUrl && (
        <div className="bm-settings-preview">
          <div className="bm-settings-preview__icon">
            <FaviconIcon
              key={`preview-${fullUrl}-${iconMode}-${previewKey}`}
              url={fullUrl}
              size={36}
              iconMode={iconMode}
            />
          </div>
          <div className="bm-settings-preview__info">
            <div className="bm-settings-preview__name">
              {localName || derivedName || previewHostname}
            </div>
            <div className="bm-settings-preview__hostname">
              {previewHostname}
            </div>
          </div>
          <TooltipBtn
            type="button"
            onClick={handleRefresh}
            className="bm-refresh-btn"
            tooltip="Refresh icon"
          >
            <RefreshIcon />
          </TooltipBtn>
        </div>
      )}

      {/* Icon style */}
      <SegmentedControl
        label="Icon style"
        options={ICON_MODE_OPTIONS}
        value={iconMode}
        onChange={setIconMode}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bm-url" className="w-label">
          URL
        </label>
        <SettingsInput
          id="bm-url"
          name="bm-url"
          autoFocus
          prefix="https://"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder="buymemomo.com/sarojbelbase"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="bm-name" className="w-label">
          Name
        </label>
        <SettingsInput
          id="bm-name"
          name="bm-name"
          placeholder={derivedName || "Buy Me Momo"}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={!canSave}
        className="bm-save-btn"
      >
        {isEditing ? "Update Bookmark" : "Add Bookmark"}
      </button>
    </div>
  );
};
