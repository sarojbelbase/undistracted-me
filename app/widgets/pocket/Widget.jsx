import { useEffect, useMemo, useRef, useState } from "react";
import { ListUl, PlusLg } from "react-bootstrap-icons";
import { BaseWidget } from "../BaseWidget";
import { BaseSettingsModal } from "../BaseSettingsModal";
import { Divider } from "../../components/ui/Divider";
import { Button } from "../../components/ui/Button";
import { IconButton } from "../../components/ui/IconButton";
import { EmptyState } from "../../components/ui/EmptyState";
import { SnackbarHost } from "../../components/ui/Snackbar";
import { WidgetHeader } from "../../components/ui/WidgetHeader";
import { ScrollFade } from "../../components/ui/ScrollFade";
import { PocketIcon } from "../../assets/svg/PocketIcon";
import { loadSourceSerif } from "../../utilities/loadSourceSerif";
import { usePocket } from "./usePocket";
import { saveText } from "./save";
import { liveItems } from "./selectors";
import { DEFAULT_WIDGET_ITEMS } from "./constants";
import { EMPTY_STATES } from "../../constants/emptyStates";
import { ItemRow } from "./ItemRow";
import { SkeletonRows } from "./Skeleton";
import { AddDialog } from "./AddDialog";
import { ExpandedView } from "./Expanded/ExpandedView";
import { Settings } from "./Settings";

/**
 * Widget — Pocket's card face. A calm recent-saves list: header (icon, title,
 * count, plus two icon actions — open + add, matching the Expense widget) and
 * the newest N saves as compact uniform rows. Organization, search and grouping
 * live in the expanded view. Paste on the focused card (or anywhere in the
 * expanded view) opens the Add dialog.
 */
export const Widget = ({ id, onRemove }) => {
  const { items, meta, hydrated } = usePocket();
  const prefs = meta?.prefs || {};
  const cardRef = useRef(null);
  const [width, setWidth] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addInitial, setAddInitial] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [highlightId, setHighlightId] = useState(null);

  const prevFirstId = useRef(null);
  const highlightTimer = useRef(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const compact = width > 0 && width < 260;
  const widgetItems = prefs.widgetItems ?? DEFAULT_WIDGET_ITEMS;
  // One linear pass: sort the live items once, then reuse it for both the top-N
  // list and the total count — avoids a second full sort + an un-cached O(n)
  // count on every save (the Pocket library is unbounded).
  const { recent, total, firstId } = useMemo(() => {
    const live = liveItems(items);
    const sorted = live.slice().sort((a, b) => b.updatedAt - a.updatedAt);
    return {
      recent: sorted.slice(0, widgetItems),
      total: live.length,
      firstId: sorted[0]?.id ?? null,
    };
  }, [items, widgetItems]);
  const showEmpty = hydrated && total === 0;

  // New-save highlight: when the newest item id changes, flash the top row.
  useEffect(() => {
    if (firstId && firstId !== prevFirstId.current && prevFirstId.current !== null) {
      setHighlightId(firstId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), 1200);
    }
    prevFirstId.current = firstId;
  }, [firstId]);

  useEffect(() => () => clearTimeout(highlightTimer.current), []);

  // Load the serif face used by paragraph/sentence rows (shared with Notes).
  useEffect(() => {
    loadSourceSerif();
  }, []);

  const openAdd = (initialText = "") => {
    setAddInitial(initialText);
    setAddOpen(true);
  };

  const handlePasteText = (text) => {
    if (!text || !text.trim()) return;
    if (prefs.askOnPaste === false) {
      saveText(text, {
        folderId: prefs.defaultFolderId || undefined,
        skipDuplicates: prefs.skipDuplicates !== false,
      });
    } else {
      openAdd(text);
    }
  };

  const onRootPaste = (e) => {
    const t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    const text = e.clipboardData?.getData("text") || "";
    if (!text.trim()) return;
    e.preventDefault();
    handlePasteText(text);
  };

  // Document-level paste while the expanded view is open (§7).
  useEffect(() => {
    if (!expanded) return undefined;
    const onPaste = (e) => {
      // Ignore pastes into any open dialog (Add / Settings) or a field.
      if (addOpen || settingsOpen) return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const text = e.clipboardData?.getData("text") || "";
      if (!text.trim()) return;
      e.preventDefault();
      handlePasteText(text);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [expanded, addOpen, settingsOpen, prefs.askOnPaste, prefs.skipDuplicates, prefs.defaultFolderId]);

  const header = (
    <WidgetHeader
      className="px-3 pt-2.5 pb-2"
      icon={<PocketIcon size={14} />}
      title="Pocket"
      count={compact ? undefined : total}
      actions={[
        <IconButton key="open" label="Open Pocket" size="sm" onClick={() => setExpanded(true)}>
          <ListUl size={13} />
        </IconButton>,
        <IconButton key="add" label="Add to Pocket" size="sm" accent onClick={() => openAdd()}>
          <PlusLg size={14} />
        </IconButton>,
      ]}
    />
  );

  const empty = (
    <EmptyState
      size="sm"
      icon={<PocketIcon size={18} />}
      title={EMPTY_STATES.pocket.widget.title}
      text={EMPTY_STATES.pocket.widget.text}
      action={
        <Button variant="soft" size="sm" onClick={() => openAdd()}>
          Add or paste
        </Button>
      }
    />
  );

  const body = hydrated ? (
    <div className="pocket-list" role="list">
      {recent.map((it) => (
        <ItemRow
          key={it.id}
          item={it}
          variant="widget"
          isNew={it.id === highlightId}
          onOpen={() => setExpanded(true)}
        />
      ))}
    </div>
  ) : (
    <SkeletonRows count={widgetItems} widget />
  );

  return (
    <BaseWidget
      className="flex flex-col overflow-hidden"
      settingsContent={<Settings />}
      settingsTitle="Pocket"
      modalWidth="w-96"
      onRemove={onRemove}
      cardStyle={{ overflow: "hidden" }}
    >
      <div
        ref={cardRef}
        className={`pocket-root ${compact ? "pocket-root--compact" : ""}`}
        tabIndex={0}
        onPaste={onRootPaste}
        aria-label="Pocket. Paste to add something."
      >
        {header}
        <Divider />
        {showEmpty ? empty : body}
        {!showEmpty && hydrated && <ScrollFade />}
      </div>

      {expanded && (
        <ExpandedView
          onClose={() => setExpanded(false)}
          onOpenSettings={() => setSettingsOpen(true)}
          onAdd={() => openAdd()}
        />
      )}

      {settingsOpen && (
        <BaseSettingsModal title="Pocket" onClose={() => setSettingsOpen(false)} width="w-96">
          <Settings />
        </BaseSettingsModal>
      )}

      {addOpen && <AddDialog initialText={addInitial} onClose={() => setAddOpen(false)} />}

      <SnackbarHost />
    </BaseWidget>
  );
};
