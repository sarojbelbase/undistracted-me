import { useEffect, useImperativeHandle, forwardRef, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '../../components/ui/Input';

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
import { $getRoot, $getSelection, $isRangeSelection, $createRangeSelection, $setSelection, $getNodeByKey } from 'lexical';

// ── Ctrl+K link editor ────────────────────────────────────────────────────────
function LinkEditorPlugin() {
  const [editor] = useLexicalComposerContext();
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedText, setSelectedText] = useState('');
  const [linkText, setLinkText] = useState('');
  const savedSelectionRef = useRef(null);
  const savedLinkKeyRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const inputRef = useRef(null);

  const close = useCallback(() => {
    setVisible(false);
    editor.focus();
  }, [editor]);

  const openLinkInput = useCallback(() => {
    const sel = globalThis.getSelection?.();
    const rect = sel?.rangeCount ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (rect) setPos({ top: rect.bottom + 8, left: Math.max(8, rect.left) });
    let prefill = '';
    let text = '';
    editor.getEditorState().read(() => {
      const lexSel = $getSelection();
      if ($isRangeSelection(lexSel)) {
        text = lexSel.getTextContent();
        const node = lexSel.anchor.getNode();
        const parent = node.getParent();
        if ($isLinkNode(parent)) {
          prefill = parent.getURL();
          savedLinkKeyRef.current = parent.getKey();
        } else {
          savedLinkKeyRef.current = null;
        }
        // Clone the selection keys/offsets so we can restore it on apply
        savedSelectionRef.current = {
          anchor: { key: lexSel.anchor.key, offset: lexSel.anchor.offset, type: lexSel.anchor.type },
          focus: { key: lexSel.focus.key, offset: lexSel.focus.offset, type: lexSel.focus.type },
        };
      }
    });
    setSelectedText(text);
    setLinkText(text);
    setUrl(prefill);
    setVisible(true);
  }, [editor]);

  // Intercept Escape in capture phase — stops it reaching parent Modal's keydown listener
  useEffect(() => {
    if (!visible) return;
    const handler = (e) => {
      if (e.key === 'Escape') e.stopPropagation();
    };
    document.addEventListener('keydown', handler, true);
    return () => document.removeEventListener('keydown', handler, true);
  }, [visible]);

  // Call showModal() as soon as the dialog element mounts — focus link text first
  const dialogRefCallback = useCallback((node) => {
    if (!node) return;
    node.showModal();
    setTimeout(() => {
      const inputs = node.querySelectorAll('input');
      // If there's a link text field (first input), focus it; else focus URL (only input)
      (inputs[0] ?? null)?.focus();
    }, 40);
  }, []);

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
    const trimmedUrl = url.trim();
    const trimmedText = linkText.trim() || selectedText;
    const linkKey = savedLinkKeyRef.current;
    const saved = savedSelectionRef.current;

    if (linkKey) {
      // Editing an existing link — directly mutate the LinkNode (avoids TOGGLE fighting insertText)
      editor.update(() => {
        const linkNode = $getNodeByKey(linkKey);
        if (!$isLinkNode(linkNode)) return;
        if (trimmedText !== selectedText) {
          const firstChild = linkNode.getFirstChild();
          if (firstChild) firstChild.setTextContent(trimmedText);
        }
        if (trimmedUrl) {
          linkNode.setURL(trimmedUrl);
        } else {
          // No URL → unwrap link, keep text
          linkNode.insertBefore(linkNode.getFirstChild().cloneNode());
          linkNode.remove();
        }
      });
      editor.focus();
      return;
    }

    // New link: restore selection, optionally replace text, then TOGGLE_LINK_COMMAND
    editor.update(() => {
      if (!saved) return;
      const sel = $createRangeSelection();
      sel.anchor.set(saved.anchor.key, saved.anchor.offset, saved.anchor.type);
      sel.focus.set(saved.focus.key, saved.focus.offset, saved.focus.type);
      $setSelection(sel);

      if (trimmedText !== selectedText) {
        const isBackward = saved.focus.offset < saved.anchor.offset
          && saved.focus.key === saved.anchor.key;
        const startKey = isBackward ? saved.focus.key : saved.anchor.key;
        const startOffset = isBackward ? saved.focus.offset : saved.anchor.offset;
        sel.insertText(trimmedText);
        const newSel = $createRangeSelection();
        newSel.anchor.set(startKey, startOffset, 'text');
        newSel.focus.set(startKey, startOffset + trimmedText.length, 'text');
        $setSelection(newSel);
      }
    }, {
      discrete: true,
      onUpdate: () => {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, trimmedUrl || null);
        editor.focus();
      },
    });
  }, [editor, url, linkText, selectedText]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); apply(); }
  }, [apply]);

  // Native dialog cancel fires on Escape — prevent default close, use our close()
  const handleCancel = useCallback((e) => {
    e.preventDefault();
    close();
  }, [close]);

  // Backdrop click: when showModal is active, clicking outside fires on the <dialog> element
  const handleDialogClick = useCallback((e) => {
    if (e.target.tagName === 'DIALOG') close();
  }, [close]);

  if (!visible) return null;

  const fieldStyle = {
    display: 'flex', flexDirection: 'column', gap: 5,
  };
  const labelStyle = {
    fontSize: '0.68rem', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    color: 'var(--w-ink-5)',
  };
  const inputWrapStyle = {
    display: 'flex', alignItems: 'center',
    background: 'var(--w-surface-2)',
    border: '1px solid var(--w-border)',
    borderRadius: 8, padding: '0 10px',
    height: 36,
  };

  return createPortal(
    <dialog
      ref={dialogRefCallback}
      aria-label="Link editor"
      onCancel={handleCancel}
      onClick={handleDialogClick}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed', top: pos.top, left: pos.left, zIndex: 10000,
        margin: 0, padding: '14px 14px 12px',
        background: 'var(--w-surface)', border: '1px solid var(--w-border)',
        borderRadius: 12, boxShadow: 'var(--modal-shadow)',
        width: 320,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}
    >
      {/* ── Header ── */}
      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--w-ink-2)' }}>
        {selectedText ? 'Edit link' : 'Insert link'}
      </div>

      {/* ── Link text field ── */}
      {selectedText && (
        <div style={fieldStyle}>
          <label htmlFor="lex-link-text" style={labelStyle}>Link text</label>
          <div style={inputWrapStyle}>
            <Input
              id="lex-link-text"
              value={linkText}
              onChange={e => setLinkText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={selectedText}
              style={{ fontSize: '0.82rem' }}
            />
          </div>
        </div>
      )}

      {/* ── URL field ── */}
      <div style={fieldStyle}>
        <label htmlFor="lex-link-url" style={labelStyle}>URL</label>
        <div style={inputWrapStyle}>
          <Input
            ref={inputRef}
            id="lex-link-url"
            name="lex-link-url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="https://"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
              fontSize: '0.8rem',
            }}
          />
        </div>
      </div>

      {/* ── Actions ── */}
      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
        <button
          type="button"
          onClick={close}
          style={{
            flex: 1, height: 34, border: '1px solid var(--w-border)',
            background: 'transparent', color: 'var(--w-ink-3)',
            fontSize: '0.8rem', fontWeight: 500, borderRadius: 8,
            cursor: 'pointer', transition: 'background 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--w-surface-2)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={url.trim() ? apply : undefined}
          style={{
            flex: 2, height: 34, border: 'none',
            background: url.trim() ? 'var(--w-accent)' : 'var(--w-surface-2)',
            color: url.trim() ? 'var(--w-accent-fg)' : 'var(--w-ink-5)',
            fontSize: '0.8rem', fontWeight: 600, borderRadius: 8,
            cursor: url.trim() ? 'pointer' : 'default',
            transition: 'background 0.15s, color 0.15s',
          }}
        >
          Apply link
        </button>
      </div>
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
