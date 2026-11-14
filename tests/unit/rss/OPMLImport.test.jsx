/**
 * Unit tests for OPMLImport.jsx — the one-click OPML file-picker button.
 *
 * The OPMLImport component was reduced to a thin file-picker wrapper: it renders
 * an "Import OPML" button plus a hidden <input type="file"> and forwards the
 * chosen File to `onFileSelected`. Parsing, preview, and feed selection now live
 * in the parent (rss/Settings.jsx).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

const h = React.createElement;

vi.mock('react-bootstrap-icons', function () {
  return {
    FileEarmarkArrowDown: function (p) { return h('span', { 'data-testid': 'icon-opml', ...p }, 'F'); },
  };
});

import { OPMLImport } from '../../../app/widgets/rss/OPMLImport';

function renderOPML(props) {
  const merged = { onFileSelected: vi.fn(), ...props };
  return render(h(OPMLImport, merged));
}

function getFileInput() {
  return document.querySelector('input[type="file"]');
}

function setInputFiles(input, files) {
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  fireEvent.change(input);
}

describe('OPMLImport component', function () {
  beforeEach(function () {
    vi.clearAllMocks();
  });

  it('renders the "Import OPML" button', function () {
    renderOPML();
    expect(screen.getByText('Import OPML')).toBeTruthy();
    expect(screen.getByTestId('icon-opml')).toBeTruthy();
  });

  it('renders a hidden file input with the correct accept', function () {
    renderOPML();
    const input = getFileInput();
    expect(input).toBeTruthy();
    expect(input.accept).toContain('.opml');
    expect(input.accept).toContain('.xml');
  });

  it('calls onFileSelected with the chosen file', function () {
    const onFileSelected = vi.fn();
    renderOPML({ onFileSelected });
    const input = getFileInput();
    const file = new File(['<opml/>'], 'feeds.opml', { type: 'text/xml' });
    setInputFiles(input, [file]);
    expect(onFileSelected).toHaveBeenCalledWith(file);
  });

  it('does not call onFileSelected when no file is chosen', function () {
    const onFileSelected = vi.fn();
    renderOPML({ onFileSelected });
    const input = getFileInput();
    setInputFiles(input, []);
    expect(onFileSelected).not.toHaveBeenCalled();
  });
});
