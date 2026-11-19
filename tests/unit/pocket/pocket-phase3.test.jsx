/**
 * Unit tests for the Pocket Phase 3 additions: the whole-line code clamp check
 * and the SegmentedControl used by the expanded view's "Group saves by" switch.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { isCodeClamped } from '../../../app/widgets/pocket/previewLines';
import { SegmentedControl } from '../../../app/components/ui/SegmentedControl';

describe('isCodeClamped', () => {
  it('clamps only by line count', () => {
    expect(isCodeClamped('a\nb\nc', 2)).toBe(true);
    expect(isCodeClamped('a\nb', 2)).toBe(false);
  });

  it('never clamps a long single line (it scrolls horizontally instead)', () => {
    expect(isCodeClamped('x'.repeat(500), 4)).toBe(false);
  });

  it('treats empty or missing text as unclamped', () => {
    expect(isCodeClamped('', 4)).toBe(false);
    expect(isCodeClamped(undefined, 4)).toBe(false);
  });
});

describe('SegmentedControl', () => {
  const options = [
    { label: 'Date', value: 'date' },
    { label: 'Website', value: 'website' },
  ];

  it('renders a labelled group with pressed state', () => {
    render(<SegmentedControl inline ariaLabel="Group saves by" options={options} value="date" onChange={() => {}} />);
    expect(screen.getByRole('group', { name: 'Group saves by' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Date' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('button', { name: 'Website' }).getAttribute('aria-pressed')).toBe('false');
  });

  it('calls onChange with the option value', () => {
    const onChange = vi.fn();
    render(<SegmentedControl inline ariaLabel="Group saves by" options={options} value="date" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Website' }));
    expect(onChange).toHaveBeenCalledWith('website');
  });

  it('renders an optional label above the control with pressed state', () => {
    render(<SegmentedControl label="Time Format" options={options} value="date" onChange={() => {}} />);
    expect(screen.getByText('Time Format')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Date' }).getAttribute('aria-pressed')).toBe('true');
  });
});

describe('ItemRow list entries', () => {
  const base = { id: 'x', createdAt: 1, updatedAt: Date.now(), deletedAt: null, folderIds: [], host: 'example.dev', sourceUrl: 'https://example.dev/a', title: 'A page' };
  const code = Array.from({ length: 9 }, (_, i) => `line ${i + 1}`).join('\n');

  it('gives text entries a Copy primary action and clamps code to whole lines', async () => {
    const { ItemRow } = await import('../../../app/widgets/pocket/ItemRow');
    const { container } = render(<ItemRow item={{ ...base, kind: 'code', text: code }} previewLength="medium" />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'More actions' })).toBeTruthy();
    const body = container.querySelector('.pocket-code__body');
    expect(body.className).toContain('pocket-code__body--clamped');
    expect(body.style.getPropertyValue('--pocket-code-lines')).toBe('6');
    expect(screen.getByText('Show all 9 lines')).toBeTruthy();
    expect(container.querySelector('.pocket-code-block__head')).toBeNull();
  });

  it('gives links an Open link primary action and no expand state', async () => {
    const { ItemRow } = await import('../../../app/widgets/pocket/ItemRow');
    const { container } = render(<ItemRow item={{ ...base, kind: 'link', text: 'https://example.dev/a' }} />);
    expect(screen.getByRole('button', { name: 'Open link' })).toBeTruthy();
    expect(container.querySelector('[aria-expanded]')).toBeNull();
  });

  it('keeps the source line to host and age', async () => {
    const { ItemRow } = await import('../../../app/widgets/pocket/ItemRow');
    const { container } = render(<ItemRow item={{ ...base, kind: 'paragraph', text: 'One two three.' }} />);
    const meta = container.querySelector('.pocket-row__meta-text').textContent;
    expect(meta).toContain('example.dev');
    expect(meta).not.toContain('A page');
    expect(meta).not.toContain('Paragraph');
  });
});
