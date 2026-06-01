/**
 * Unit tests for OPMLImport.jsx — the collapsible OPML import panel.
 *
 * Covers: collapsed/expanded states, File/Paste mode toggle, parse success
 * preview, error display, feed selection (checkboxes, select all, deselect),
 * already-existing feeds, invalid URL warnings, import action, cancel reset.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// ── Mocks ────────────────────────────────────────────────────────────────────

// Use createElement to avoid oxc JSX parser issues with emoji/special chars
const h = React.createElement;

// mockParseOPML must be hoisted above vi.mock factories to avoid TDZ
const { mockParseOPML } = vi.hoisted(() => ({ mockParseOPML: vi.fn() }));

vi.mock('react-bootstrap-icons', function () {
  return {
    Upload: function (p) { return h('span', { 'data-testid': 'icon-upload', ...p }, 'U'); },
    FileEarmarkArrowDown: function (p) { return h('span', { 'data-testid': 'icon-opml', ...p }, 'F'); },
    Clipboard: function (p) { return h('span', { 'data-testid': 'icon-clipboard', ...p }, 'C'); },
    ExclamationTriangle: function (p) { return h('span', { 'data-testid': 'icon-warn', ...p }, 'W'); },
  };
});

vi.mock('../../../src/components/ui/SegmentedControl', function () {
  return {
    SegmentedControl: function (_a) {
      const options = _a.options, value = _a.value, onChange = _a.onChange;
      const btns = options.map(function (opt) {
        return h('button', {
          key: opt.value,
          'data-testid': 'seg-option-' + opt.value,
          'data-selected': String(opt.value === value),
          onClick: function () { onChange(opt.value); },
        }, opt.label);
      });
      return h('div', { 'data-testid': 'segmented-control' }, btns);
    },
  };
});

vi.mock('../../../src/widgets/rss/opmlParser', function () {
  return { parseOPML: mockParseOPML };
});

import { OPMLImport } from '../../../src/widgets/rss/OPMLImport';

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_PROPS = { customFeeds: [], onChangeCustomFeeds: vi.fn() };

function renderOPML(props) {
  const merged = { ...DEFAULT_PROPS, ...props };
  return render(h(OPMLImport, merged));
}

const validOPMLResult = {
  feeds: [
    { label: 'Example Blog', url: 'https://example.com/feed', active: true, valid: true },
    { label: 'News Site', url: 'https://news.site/rss', active: true, valid: true },
  ],
  error: null,
};

const mixedOPMLResult = {
  feeds: [
    { label: 'Good Feed', url: 'https://good.com/feed', active: true, valid: true },
    { label: 'Bad URL Feed', url: 'not-a-valid-url', active: true, valid: false },
    { label: 'FTP Feed', url: 'ftp://old.com/feed', active: true, valid: false },
  ],
  error: null,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('OPMLImport component', function () {
  beforeEach(function () {
    vi.clearAllMocks();
    mockParseOPML.mockReturnValue({ feeds: [], error: 'Not parsed yet' });
  });

  // ── Collapsed / expanded ─────────────────────────────────────────────────

  it('renders collapsed "Import OPML" button initially', function () {
    renderOPML();
    expect(screen.getByText('Import OPML')).toBeTruthy();
    expect(screen.getByTestId('icon-opml')).toBeTruthy();
  });

  it('does not show panel when collapsed', function () {
    renderOPML();
    expect(screen.queryByText('Cancel')).toBeFalsy();
  });

  it('expands on click', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    expect(screen.getByText('Cancel')).toBeTruthy();
    expect(screen.getByTestId('segmented-control')).toBeTruthy();
  });

  it('collapses when Cancel is clicked', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Cancel')).toBeFalsy();
  });

  // ── File / Paste mode ────────────────────────────────────────────────────

  it('defaults to File mode', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    const fileBtn = screen.getByTestId('seg-option-file');
    expect(fileBtn.dataset.selected).toBe('true');
  });

  it('switches to Paste mode', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    expect(screen.getByPlaceholderText('Paste OPML XML content here...')).toBeTruthy();
  });

  it('switches back to File mode', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.click(screen.getByTestId('seg-option-file'));
    expect(screen.queryByPlaceholderText('Paste OPML XML content here...')).toBeFalsy();
  });

  // ── Parse button states ──────────────────────────────────────────────────

  it('disables Parse button when textarea is empty', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    const btn = screen.getByText('Parse OPML').closest('button');
    expect(btn.disabled).toBe(true);
  });

  it('enables Parse button when textarea has content', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml><body><outline xmlUrl="https://test.com"/></body></opml>'
    );
    const btn = screen.getByText('Parse OPML').closest('button');
    expect(btn.disabled).toBe(false);
  });

  // ── Parse: success preview ───────────────────────────────────────────────

  it('shows feed preview after successful parse', async function () {
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));

    await waitFor(function () {
      expect(screen.getByText('2 feeds found')).toBeTruthy();
    });
    expect(screen.getByText('Example Blog')).toBeTruthy();
    expect(screen.getByText('News Site')).toBeTruthy();
    expect(screen.getByText('Import 2 feeds')).toBeTruthy();
  });

  it('pre-selects all feeds by default', async function () {
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));

    await waitFor(function () {
      const cbs = document.querySelectorAll('input[type="checkbox"]');
      expect(cbs.length).toBe(2);
      cbs.forEach(function (cb) { expect(cb.checked).toBe(true); });
    });
  });

  // ── Select all / deselect all ─────────────────────────────────────────────

  it('shows Deselect all when all selected', async function () {
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () {
      expect(screen.getByText('Deselect all')).toBeTruthy();
    });
  });

  it('Deselect all unchecks and shows Select all', async function () {
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () { screen.getByText('Deselect all'); });

    await userEvent.click(screen.getByText('Deselect all'));
    await waitFor(function () {
      expect(screen.getByText('Select all')).toBeTruthy();
      expect(screen.getByText('Import 0 feeds')).toBeTruthy();
    });

    await userEvent.click(screen.getByText('Select all'));
    await waitFor(function () {
      expect(screen.getByText('Deselect all')).toBeTruthy();
      expect(screen.getByText('Import 2 feeds')).toBeTruthy();
    });
  });

  // ── Already-existing feeds ───────────────────────────────────────────────

  it('marks already-existing feeds with already added', async function () {
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML({
      customFeeds: [{ label: 'Example Blog', url: 'https://example.com/feed', active: true }],
    });
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () {
      expect(screen.getByText('already added')).toBeTruthy();
    });
  });

  // ── Invalid URLs ─────────────────────────────────────────────────────────

  it('shows warning icons for invalid URLs', async function () {
    mockParseOPML.mockReturnValue(mixedOPMLResult);
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () {
      const warnings = screen.getAllByTestId('icon-warn');
      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  // ── Error state ──────────────────────────────────────────────────────────

  it('shows error message when parse fails', async function () {
    mockParseOPML.mockReturnValue({ feeds: [], error: 'Invalid OPML — mismatched tag' });
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      'not xml'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () {
      expect(screen.getByText('Import failed')).toBeTruthy();
      expect(screen.getByText('Invalid OPML — mismatched tag')).toBeTruthy();
    });
  });

  // ── Import action ────────────────────────────────────────────────────────

  it('calls onChangeCustomFeeds with merged feeds', async function () {
    const onChange = vi.fn();
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML({ onChangeCustomFeeds: onChange });

    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () { screen.getByText('Import 2 feeds'); });
    await userEvent.click(screen.getByText('Import 2 feeds'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newFeeds = onChange.mock.calls[0][0];
    expect(newFeeds.length).toBe(2);
    expect(newFeeds[0].label).toBe('Example Blog');
  });

  it('skips duplicate URLs when importing', async function () {
    const onChange = vi.fn();
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML({
      customFeeds: [{ label: 'Example Blog', url: 'https://example.com/feed', active: true }],
      onChangeCustomFeeds: onChange,
    });

    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () { screen.getByText(/Import .* feeds/); });
    await userEvent.click(screen.getByText(/Import .* feeds/));

    const newFeeds = onChange.mock.calls[0][0];
    expect(newFeeds.length).toBe(2);
    expect(newFeeds[1].url).toBe('https://news.site/rss');
  });

  it('skips invalid URLs during import', async function () {
    const onChange = vi.fn();
    mockParseOPML.mockReturnValue(mixedOPMLResult);
    renderOPML({ onChangeCustomFeeds: onChange });

    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () { screen.getByText(/Import .* feeds/); });

    await userEvent.click(screen.getByText('Deselect all'));
    const cbs = document.querySelectorAll('input[type="checkbox"]');
    await userEvent.click(cbs[0]); // Good Feed
    await userEvent.click(screen.getByText('Import 1 feed'));

    expect(onChange).toHaveBeenCalledTimes(1);
    const newFeeds = onChange.mock.calls[0][0];
    expect(newFeeds.length).toBe(1);
    expect(newFeeds[0].url).toBe('https://good.com/feed');
  });

  // ── Import button disabled ──────────────────────────────────────────────

  it('disables import button when no feeds selected', async function () {
    mockParseOPML.mockReturnValue(validOPMLResult);
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () { screen.getByText('Deselect all'); });
    await userEvent.click(screen.getByText('Deselect all'));

    await waitFor(function () {
      const btn = screen.getByText('Import 0 feeds').closest('button');
      expect(btn.disabled).toBe(true);
    });
  });

  // ── File input ──────────────────────────────────────────────────────────

  it('has hidden file input with correct accept', async function () {
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    const input = document.querySelector('input[type="file"]');
    expect(input).toBeTruthy();
    expect(input.accept).toContain('.opml');
    expect(input.accept).toContain('.xml');
  });

  // ── Singular text ───────────────────────────────────────────────────────

  it('shows singular text for 1 feed', async function () {
    mockParseOPML.mockReturnValue({
      feeds: [{ label: 'Only Feed', url: 'https://only.com/feed', active: true, valid: true }],
      error: null,
    });
    renderOPML();
    await userEvent.click(screen.getByText('Import OPML'));
    await userEvent.click(screen.getByTestId('seg-option-paste'));
    await userEvent.type(
      screen.getByPlaceholderText('Paste OPML XML content here...'),
      '<opml>...</opml>'
    );
    await userEvent.click(screen.getByText('Parse OPML'));
    await waitFor(function () {
      expect(screen.getByText('1 feed found')).toBeTruthy();
      expect(screen.getByText('Import 1 feed')).toBeTruthy();
    });
  });
});
