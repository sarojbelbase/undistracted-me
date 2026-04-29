import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import {
  Search,
  MoonStarsFill,
  PlusLg,
  SunFill,
  MoonFill,
  CircleHalf,
  EyeFill,
  GearFill,
  PersonFill,
} from "react-bootstrap-icons";
import { Modal } from "../ui/Modal";
import { Input } from "../ui/Input";
import { focusShortcut } from "../../hooks/useFocusMode";
import { useSettingsStore } from "../../store/useSettingsStore";
import { useUIStore } from "../../store/useUIStore";

// ─── Command registry factory ─────────────────────────────────────────────────
// We accept callback props for actions that require App-level state changes
// (focus mode, catalog, look-away, settings). Store actions are called directly
// via store.getState() so they never become stale inside the static registry.

const buildCommandGroups = ({
  onOpenFocusMode,
  onOpenCatalog,
  onPreviewLookAway,
  onOpenSettings,
}) => [
  {
    group: "Navigation",
    items: [
      {
        id: "focus_mode",
        label: "Open Focus Mode",
        shortcut: focusShortcut,
        icon: MoonStarsFill,
        keywords: ["focus", "zen", "cinema", "fullscreen"],
        action: () => onOpenFocusMode?.(),
      },
      {
        id: "add_widget",
        label: "Add Widget",
        icon: PlusLg,
        keywords: ["add", "new", "widget", "catalog"],
        action: () => onOpenCatalog?.(),
      },
    ],
  },
  {
    group: "Appearance",
    items: [
      {
        id: "light_mode",
        label: "Light Mode",
        icon: SunFill,
        action: () => useSettingsStore.getState().setMode("light"),
      },
      {
        id: "dark_mode",
        label: "Dark Mode",
        icon: MoonFill,
        action: () => useSettingsStore.getState().setMode("dark"),
      },
      {
        id: "auto_theme",
        label: "Auto Theme (sunrise/sunset)",
        icon: CircleHalf,
        action: () => useSettingsStore.getState().setMode("auto"),
      },
    ],
  },
  {
    group: "Tools",
    items: [
      {
        id: "eye_break",
        label: "Preview Eye Break",
        icon: EyeFill,
        keywords: ["lookaway", "break", "rest", "eyes"],
        action: () => onPreviewLookAway?.(),
      },
      {
        id: "open_settings",
        label: "Open Settings",
        icon: GearFill,
        keywords: ["settings", "preferences", "configure"],
        action: () => onOpenSettings?.(),
      },
      {
        id: "accounts",
        label: "Accounts & Integrations",
        icon: PersonFill,
        keywords: ["google", "spotify", "connect", "account", "login"],
        action: () => useUIStore.getState().openAccountsDialog(),
      },
    ],
  },
];

// ─── CommandPalette component ─────────────────────────────────────────────────

/**
 * Command Palette — opened by Cmd+K / Ctrl+K via useCommandPalette hook.
 *
 * Props:
 *   onClose           — required; called after command runs or ESC pressed
 *   onOpenFocusMode   — opens focus mode overlay in App
 *   onOpenCatalog     — opens widget catalog in App
 *   onPreviewLookAway — triggers look-away eye-break preview in App
 *   onOpenSettings    — opens settings panel in App
 */
export function CommandPalette({
  onClose,
  onOpenFocusMode,
  onOpenCatalog,
  onPreviewLookAway,
  onOpenSettings,
}) {
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Reset active index whenever the search query changes
  useEffect(() => {
    setActiveIdx(0);
  }, [query]);

  // Build command groups (stable ref — callbacks from App are stable useCallback refs)
  const commandGroups = useMemo(
    () =>
      buildCommandGroups({
        onOpenFocusMode,
        onOpenCatalog,
        onPreviewLookAway,
        onOpenSettings,
      }),
    [onOpenFocusMode, onOpenCatalog, onPreviewLookAway, onOpenSettings],
  );

  // Filter groups/items against the current query
  const filteredGroups = useMemo(() => {
    if (!query.trim()) return commandGroups;
    const q = query.toLowerCase();
    return commandGroups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.keywords?.some((kw) => kw.includes(q)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [query, commandGroups]);

  // Flat ordered list used for arrow-key navigation
  const flatItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups],
  );

  // Flat-index lookup map so group renders can stay simple
  const itemIndexMap = useMemo(() => {
    const map = new Map();
    flatItems.forEach((item, i) => map.set(item.id, i));
    return map;
  }, [flatItems]);

  const runCommand = useCallback(
    (item) => {
      item.action();
      onClose();
    },
    [onClose],
  );

  const handleKeyDown = useCallback(
    (e) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIdx((i) =>
          flatItems.length === 0 ? 0 : (i + 1) % flatItems.length,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIdx((i) =>
          flatItems.length === 0
            ? 0
            : (i - 1 + flatItems.length) % flatItems.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        const item = flatItems[activeIdx];
        if (item) runCommand(item);
      }
    },
    [flatItems, activeIdx, runCommand],
  );

  return (
    <Modal
      onClose={onClose}
      ariaLabel="Command palette"
      style={{
        width: 560,
        maxWidth: "calc(100vw - 32px)",
        alignSelf: "flex-start",
        marginTop: "14vh",
        background: "var(--modal-bg)",
        backdropFilter: "none",
        WebkitBackdropFilter: "none",
      }}
    >
      {/* ── Search row ─────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          borderBottom: "1px solid var(--card-border)",
          minHeight: 48,
        }}
      >
        <Search
          size={15}
          aria-hidden="true"
          style={{ color: "var(--w-ink-4)", flexShrink: 0 }}
        />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search commands…"
          aria-label="Search commands"
          autoComplete="off"
          spellCheck={false}
        />
        <kbd
          aria-hidden="true"
          style={{
            fontSize: 11,
            color: "var(--w-ink-5)",
            border: "1px solid var(--card-border)",
            borderRadius: 6,
            padding: "2px 6px",
            flexShrink: 0,
            fontFamily: "inherit",
            lineHeight: "1.4",
          }}
        >
          esc
        </kbd>
      </div>

      {/* ── Results list ───────────────────────────────────────────────────── */}
      <div
        role="listbox"
        aria-label="Commands"
        style={{ maxHeight: 340, overflowY: "auto", padding: "4px 0 6px" }}
      >
        {filteredGroups.map((group) => (
          <div key={group.group}>
            {/* Group label */}
            <div
              aria-hidden="true"
              style={{
                padding: "10px 14px 4px",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--w-ink-5)",
              }}
            >
              {group.group}
            </div>

            {/* Command rows */}
            {group.items.map((item) => {
              const idx = itemIndexMap.get(item.id);
              const isActive = idx === activeIdx;
              const Icon = item.icon;

              return (
                <div
                  key={item.id}
                  role="option"
                  aria-selected={isActive}
                  onClick={() => runCommand(item)}
                  onMouseEnter={() => setActiveIdx(idx)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "8px 14px",
                    margin: "1px 8px",
                    borderRadius: 8,
                    cursor: "pointer",
                    background: isActive
                      ? "rgba(var(--w-accent-rgb), 0.10)"
                      : "transparent",
                    transition: "background 0.1s ease",
                  }}
                >
                  {/* Icon container */}
                  <div
                    aria-hidden="true"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: "var(--w-surface-2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon
                      size={15}
                      style={{
                        color: isActive ? "var(--w-accent)" : "var(--w-ink-3)",
                      }}
                    />
                  </div>

                  {/* Label */}
                  <span
                    style={{
                      flex: 1,
                      fontSize: 14,
                      color: isActive ? "var(--w-accent)" : "var(--w-ink-1)",
                    }}
                  >
                    {item.label}
                  </span>

                  {/* Shortcut badge (optional) */}
                  {item.shortcut && (
                    <kbd
                      aria-label={`Shortcut: ${item.shortcut}`}
                      style={{
                        fontSize: 11,
                        color: "var(--w-ink-5)",
                        border: "1px solid var(--card-border)",
                        borderRadius: 6,
                        padding: "2px 6px",
                        fontFamily: "inherit",
                        lineHeight: "1.4",
                        flexShrink: 0,
                      }}
                    >
                      {item.shortcut}
                    </kbd>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty state */}
        {flatItems.length === 0 && (
          <div
            style={{
              padding: "28px 14px",
              textAlign: "center",
              fontSize: 13,
              color: "var(--w-ink-4)",
            }}
          >
            No commands match &ldquo;{query}&rdquo;
          </div>
        )}
      </div>
    </Modal>
  );
}
