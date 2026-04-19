import { useEffect, useImperativeHandle, forwardRef, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const SOURCE_SERIF_HREF = 'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;1,8..60,400&display=swap';
const loadSourceSerif = () => {
  if (document.querySelector(`link[href="${SOURCE_SERIF_HREF}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = SOURCE_SERIF_HREF;
  document.head.appendChild(link);
};

import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { CheckListPlugin } from '@lexical/react/LexicalCheckListPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $convertToMarkdownString, $convertFromMarkdownString, TRANSFORMERS, CHECK_LIST } from '@lexical/markdown';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListNode, ListItemNode } from '@lexical/list';
import { CodeNode, CodeHighlightNode } from '@lexical/code';
import { LinkNode, TOGGLE_LINK_COMMAND, $isLinkNode } from '@lexical/link';
import { $getRoot, $getSelection, $isRangeSelection } from 'lexical';

// ── Ctrl+K link editor ────────────────────────────────────────────────────────
function LinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);

  const openLinkInput = useCallback(() => {
    const sel = globalThis.getSelection?.();
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (rect) setPos({ top: rect.bottom + 6, left: Math.max(8, rect.left) });
    let prefill = '';
    editor.getEditorState().read(() => {
      const lexSel = $getSelection();
      if ($isRangeSelection(lexSel)) {
        const node = lexSel.anchor.getNode();
        const parent = node.getParent();
        if ($isLinkNode(parent)) prefill = parent.getURL();
      }
    });
    setUrl(prefill);
    setVisible(true);
    setTimeout(() => inputRef.current?.focus(), 40);
  }, [editor]);

  useEffect(() => {
    const keyHandler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        openLinkInput();
      }
    };
    const clickHandler = (e) => {
      const anchor = e.target.closest('a[href]');
      if (!anchor) return;
      e.preventDefault();
      const href = anchor.getAttribute('href');
      if (href) globalThis.open(href, '_blank', 'noopener,noreferrer');
    };
    return editor.registerRootListener((root, prev) => {
      prev?.removeEventListener('keydown', keyHandler);
      prev?.removeEventListener('click', clickHandler);
      root?.addEventListener('keydown', keyHandler);
      root?.addEventListener('click', clickHandler);
    });
  }, [editor, openLinkInput]);

  const apply = useCallback(() => {
    setVisible(false);
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, url.trim() || null);
    editor.focus();
  }, [editor, url]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); apply(); }
    if (e.key === 'Escape') { setVisible(false); editor.focus(); }
  }, [apply, editor]);

  const handleBlur = useCallback(() => {
    setTimeout(() => setVisible(false), 120);
  }, []);

  if (!visible) return null;
  return createPortal(
    <dialog
      open
      aria-label="Link editor"
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000,
        display: 'flex', alignItems: 'center', gap: 6, margin: 0,
        background: 'var(--w-surface)', border: '1px solid var(--w-border)',
        borderRadius: 8, boxShadow: 'var(--modal-shadow)', padding: '5px 10px',
      }}
    >
      <input
        ref={inputRef}
        id="lex-link-url"
        name="lex-link-url"
        value={url}
        onChange={e => setUrl(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder="Paste URL and press Enter"
        style={{
          border: 'none', outline: 'none', background: 'transparent',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '0.8rem', color: 'var(--w-ink-1)', width: 220,
        }}
      />
      {url.trim() && (
        <button
          type="button"
          onClick={apply}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: 'var(--w-accent)', fontSize: '0.75rem', fontWeight: 600,
            padding: '0 2px', flexShrink: 0,
          }}
        >
          Apply
        </button>
      )}
    </dialog>,
    document.body,
  );
}

// ── Sync external value → editor (e.g. when user switches notes) ─────────────
function ValueSyncPlugin({ value, lastSentRef, onReady }) {
  const [editor] = useLexicalComposerContext();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      // Load initial content
      editor.update(() => {
        $convertFromMarkdownString(value ?? '', MY_TRANSFORMERS);
      });
      onReady?.(editor);
      return;
    }
    // Only re-init when the value came from OUTSIDE (note switch),
    // not from our own typing (lastSentRef tracks what we just emitted).
    if (value !== lastSentRef.current) {
      lastSentRef.current = value;
      editor.update(() => {
        $convertFromMarkdownString(value ?? '', MY_TRANSFORMERS);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return null;
}

// ── Expose imperative focus() to parent via ref ───────────────────────────────
function RefPlugin({ editorRef }) {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);
  return null;
}

// ── Theme: maps Lexical node classes → our CSS class names ───────────────────
const theme = {
  heading: {
    h1: 'lex-h1',
    h2: 'lex-h2',
    h3: 'lex-h3',
  },
  paragraph: 'lex-p',
  quote: 'lex-blockquote',
  list: {
    ul: 'lex-ul',
    ol: 'lex-ol',
    listitem: 'lex-li',
    listitemChecked: 'lex-li-checked',
    listitemUnchecked: 'lex-li-unchecked',
    nested: { listitem: 'lex-nested-li' },
  },
  code: 'lex-code-block',
  codeHighlight: {},
  text: {
    bold: 'lex-bold',
    italic: 'lex-italic',
    strikethrough: 'lex-strike',
    underline: 'lex-underline',
    code: 'lex-inline-code',
  },
  link: 'lex-link',
};

const NODES = [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode, CodeHighlightNode, LinkNode];

// CHECK_LIST is missing from TRANSFORMERS in @lexical/markdown v0.43 — add it first
const MY_TRANSFORMERS = [CHECK_LIST, ...TRANSFORMERS];

// ── Main component ────────────────────────────────────────────────────────────
// Props:
//   value       — raw markdown string (controlled)
//   onChange    — called with new markdown string on every edit
//   placeholder — placeholder text
//   className   — applied to the ContentEditable element
//   style       — applied to the ContentEditable element
//   autoFocus   — boolean
const LexicalEditor = forwardRef(function LexicalEditor(
  { value, onChange, placeholder, className, style, autoFocus },
  ref,
) {
  const editorInstanceRef = useRef(null);
  // Shared ref: tracks the last markdown value we sent out, so ValueSyncPlugin
  // can skip re-syncing when it's our own edit (not an external note switch).
  const lastSentRef = useRef(value);

  // Load Source Serif 4 on first mount — deferred so it doesn't block initial page load.
  useEffect(() => { loadSourceSerif(); }, []);

  // Expose focus() to parent
  useImperativeHandle(ref, () => ({
    focus() {
      editorInstanceRef.current?.focus();
    },
  }), []);

  const handleChange = useCallback((editorState) => {
    editorState.read(() => {
      const md = $convertToMarkdownString(MY_TRANSFORMERS);
      // Mark this value as "sent by us" before calling onChange, so
      // ValueSyncPlugin won't re-init the editor when the prop comes back.
      lastSentRef.current = md;
      if ($getRoot().getChildrenSize() === 1) {
        const firstChild = $getRoot().getFirstChild();
        if (firstChild?.getTextContent() === '') {
          lastSentRef.current = '';
          onChange?.('');
          return;
        }
      }
      onChange?.(md);
    });
  }, [onChange]);

  const initialConfig = {
    namespace: 'notes',
    theme,
    nodes: NODES,
    onError: (err) => console.warn('[LexicalEditor]', err),
    // Don't set editorState here — ValueSyncPlugin handles it
    editorState: null,
  };

  // Extract only the padding values so we can mirror them onto the placeholder.
  // Padding lives on the ContentEditable; placeholder is absolutely positioned
  // inside the same wrapper, so it needs matching insets to align with line 1.
  const {
    padding, paddingTop, paddingRight, paddingBottom, paddingLeft,
  } = style ?? {};
  const placeholderPadding = Object.fromEntries(
    Object.entries({ padding, paddingTop, paddingRight, paddingBottom, paddingLeft })
      .filter(([, v]) => v !== undefined)
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              autoFocus={autoFocus}
              className={className}
              style={style}
              dir="ltr"
            />
          }
          placeholder={
            <div className="lex-placeholder" aria-hidden style={placeholderPadding}>
              {placeholder ?? 'Write something\u2026'}
            </div>
          }
          ErrorBoundary={({ children }) => children}
        />
        <ListPlugin />
        <CheckListPlugin />
        <LinkPlugin />
        <LinkEditorPlugin />
        <HistoryPlugin />
        <MarkdownShortcutPlugin transformers={MY_TRANSFORMERS} />
        <OnChangePlugin onChange={handleChange} ignoreSelectionChange />
        <ValueSyncPlugin value={value} lastSentRef={lastSentRef} onReady={(e) => { editorInstanceRef.current = e; }} />
        <RefPlugin editorRef={editorInstanceRef} />
      </div>
    </LexicalComposer>
  );
});

export default LexicalEditor;
