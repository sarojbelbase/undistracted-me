import { useEffect, useImperativeHandle, forwardRef, useCallback, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Input } from '../../components/ui/Input';
// Editor styles are scoped to the notes widget's lazy chunk so the dashboard's
// global CSS (and the popup/blocked pages) don't carry WYSIWYG rules.
import '../../styles/_lexical.scss';

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

// ── Ctrl+Shift+K link editor ──────────────────────────────────────────────────
// Ctrl+K is reserved by browsers (focus search bar), so we use Ctrl+Shift+K
// instead — same convention as Notion, Google Docs, and Slack.
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
    const hasSelection = sel && !sel.isCollapsed;
    const rect = hasSelection ? sel.getRangeAt(0).getBoundingClientRect() : null;
    if (rect) {
      setPos({ top: rect.bottom + 8, left: Math.max(8, rect.left) });
    } else {
      setPos({ center: true });
    }
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
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'K') {
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

  return createPortal(
    <dialog
      ref={dialogRefCallback}
      aria-label="Link editor"
      onCancel={handleCancel}
      onClick={handleDialogClick}
      onKeyDown={handleKeyDown}
      className="lex-link-dialog"
      style={pos.center
        ? { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
        : { top: pos.top, left: pos.left }
      }
    >
      <div className="lex-link-dialog-header">
        {selectedText ? 'Edit link' : 'Insert link'}
      </div>

      {selectedText && (
        <div className="lex-link-dialog-field">
          <label htmlFor="lex-link-text" className="lex-link-dialog-label">Link text</label>
          <div className="lex-link-dialog-input-wrap">
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

      <div className="lex-link-dialog-field">
        <label htmlFor="lex-link-url" className="lex-link-dialog-label">URL</label>
        <div className="lex-link-dialog-input-wrap">
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

      <div className="lex-link-dialog-actions">
        <button type="button" onClick={close} className="lex-link-dialog-cancel-btn">
          Cancel
        </button>
        <button
          type="button"
          onClick={url.trim() ? apply : undefined}
          disabled={!url.trim()}
          className="lex-link-dialog-apply-btn"
        >
          Apply link
        </button>
      </div>
    </dialog>,
    document.body,
  );
}

// ── Load initial content into the editor (mount only) ─────────────────────────
//
// Note switching is handled by remounting the whole editor (the parent passes a
// `key` derived from the note id), so there is no need to re-sync `value` on
// subsequent renders. Re-syncing here caused a feedback loop: Lexical fires
// onChange synchronously while React re-renders asynchronously, so under fast
// typing the incoming `value` lagged behind the just-emitted markdown and the
// editor kept re-initialising between two states, blocking the main thread.
function ValueSyncPlugin({ value, onReady }) {
  const [editor] = useLexicalComposerContext();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!isFirstMount.current) return;
    isFirstMount.current = false;
    editor.update(() => {
      $convertFromMarkdownString(value ?? '', MY_TRANSFORMERS);
    });
    onReady?.(editor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

// onError + initial config hoisted to module scope so their identity is stable
// across renders — rebuilding initialConfig every render would make
// LexicalComposer re-create the editor on each render.
const onLexError = (err) => console.warn('[LexicalEditor]', err);

const INITIAL_CONFIG = {
  namespace: 'notes',
  theme,
  nodes: NODES,
  onError: onLexError,
  // Don't set editorState here — ValueSyncPlugin handles it
  editorState: null,
};

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

  // Derive mode modifier (e.g. "lex-content--modal") from className so the
  // placeholder inherits the same font-size/line-height as the editor.
  const modeClass = className?.split(' ').find(c => c.startsWith('lex-content--')) ?? '';

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
      if ($getRoot().getChildrenSize() === 1) {
        const firstChild = $getRoot().getFirstChild();
        if (firstChild?.getTextContent() === '') {
          onChange?.('');
          return;
        }
      }
      onChange?.(md);
    });
  }, [onChange]);

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
    <LexicalComposer initialConfig={INITIAL_CONFIG}>
      <div className="notes-lexical-shell">
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
            <div className={`lex-placeholder${modeClass ? ` ${modeClass}` : ''}`} aria-hidden style={placeholderPadding}>
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
        <ValueSyncPlugin value={value} onReady={(e) => { editorInstanceRef.current = e; }} />
      </div>
    </LexicalComposer>
  );
});

export default LexicalEditor;
