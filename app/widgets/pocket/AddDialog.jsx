import { useEffect, useRef, useState } from "react";
import { Modal } from "../../components/ui/Modal";
import { Button } from "../../components/ui/Button";
import { PillButton } from "../../components/ui/PillButton";
import { Select } from "../../components/ui/Select";
import { AddDialogHeader } from "../../components/ui/AddDialogHeader";
import { PocketIcon } from "../../assets/svg/PocketIcon";
import { usePocket } from "./usePocket";
import { saveText } from "./save";
import { classifyKind } from "./utils";
import { liveFolders } from "./selectors";
import { CHAR_COUNTER_THRESHOLD, KINDS, KIND_META, MAX_TEXT_LENGTH } from "./constants";

const MAX_ROWS = 6;

/**
 * AddDialog — the "Add to Pocket" dialog (Modal). Opened by the card/expanded
 * "Add" button and by paste. Follows the UnifiedAddDialog header/footer pattern.
 * On small screens it becomes a bottom sheet via CSS.
 */
export function AddDialog({ initialText = "", onClose }) {
  const { folders, meta } = usePocket();
  const prefs = meta?.prefs || {};
  const fromPaste = (initialText || "").trim().length > 0;

  const [text, setText] = useState(initialText || "");
  const [kind, setKind] = useState(() => classifyKind(initialText || "", {}));
  const [kindTouched, setKindTouched] = useState(false);
  const [folderId, setFolderId] = useState(prefs.defaultFolderId || "");
  const taRef = useRef(null);

  const canSave = text.trim().length > 0;

  // Auto-grow the textarea up to MAX_ROWS lines.
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, MAX_ROWS * 24)}px`;
  }, [text]);

  const save = () => {
    if (!canSave) return;
    saveText(text, {
      kind: kindTouched ? kind : undefined, // auto-classify until the user picks a type
      folderId,
      skipDuplicates: prefs.skipDuplicates !== false,
      kindLocked: kindTouched,
    });
    onClose();
  };

  const title = fromPaste ? "Save Pasted Text?" : "Add to Pocket";
  const subtitle = fromPaste
    ? `Pocket found ${initialText.length} characters.`
    : "Save a link or text snippet to read later.";
  const showCounter = text.length > CHAR_COUNTER_THRESHOLD;

  return (
    <Modal onClose={onClose} className="pocket-add-modal" ariaLabel={title}>
      {/* Header — shared with every Add/Edit dialog (see AddDialogHeader) */}
      <AddDialogHeader
        icon={<PocketIcon size={15} color="var(--w-accent-fg)" strokeWidth={1.4} />}
        title={title}
        subtitle={subtitle}
        onClose={onClose}
      />

      {/* Body */}
      <div className="pocket-add__body">
        <div className="flex flex-col gap-1.5">
          <span className="w-label" style={{ color: "var(--w-ink-3)" }}>Text or Link</span>
          <textarea
            ref={taRef}
            autoFocus
            value={text}
            onChange={(e) => {
              const v = e.target.value;
              setText(v);
              // Keep the auto-detected type in sync until the user picks one.
              if (!kindTouched) setKind(classifyKind(v, {}));
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                save();
              }
            }}
            placeholder="Paste or type something to save"
            aria-label="Text or Link"
            className="pocket-add__textarea"
            rows={3}
          />
          {showCounter && (
            <span className="w-caption" style={{ color: "var(--w-ink-4)", textAlign: "right" }}>
              {text.length} / {MAX_TEXT_LENGTH}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="w-label" style={{ color: "var(--w-ink-3)" }}>Save As</span>
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <PillButton
                key={k}
                active={kind === k}
                tinted
                onClick={() => {
                  setKind(k);
                  setKindTouched(true);
                }}
              >
                {KIND_META[k].singular}
              </PillButton>
            ))}
          </div>
          {!kindTouched && (
            <span className="w-caption" style={{ color: "var(--w-ink-4)" }}>
              Detected automatically. Change it if it’s wrong.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="w-label" style={{ color: "var(--w-ink-3)" }}>Folder (Optional)</span>
          <Select value={folderId} onChange={(e) => setFolderId(e.target.value)} aria-label="Folder">
            <option value="">No folder</option>
            {liveFolders(folders)
              .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
              .map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
          </Select>
        </div>
      </div>

      {/* Footer */}
      <div className="pocket-add__footer">
        <Button variant="ghost" size="md" onClick={onClose} style={{ flex: 1 }}>
          Cancel
        </Button>
        <Button variant="primary" size="md" disabled={!canSave} onClick={save} style={{ flex: 2 }}>
          Save to Pocket
        </Button>
      </div>
    </Modal>
  );
}
