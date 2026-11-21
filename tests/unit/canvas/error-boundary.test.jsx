/**
 * Unit tests for the ErrorBoundary + WidgetErrorFallback.
 *
 * React logs the caught error via console.error even when a boundary handles it,
 * so each test silences console.error and restores it in afterEach.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, WidgetErrorFallback } from '../../../app/components/ui/ErrorBoundary';

const Bomb = ({ shouldThrow = true }) => {
  if (shouldThrow) throw new Error('boom');
  return <div>ok</div>;
};

describe('ErrorBoundary', () => {
  let consoleSpy;

  beforeEach(() => {
    consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <div>child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('child')).toBeInTheDocument();
    expect(screen.queryByText('fallback')).not.toBeInTheDocument();
  });

  it('renders a node fallback when a child throws', () => {
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText('fallback')).toBeInTheDocument();
  });

  it('supports a function fallback receiving the error and a reset callback', () => {
    render(
      <ErrorBoundary fallback={(error, reset) => (
        <button type="button" onClick={reset}>{error.message}</button>
      )}>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: 'boom' })).toBeInTheDocument();
  });

  it('isolates the error: a sibling outside the boundary is unaffected', () => {
    render(
      <div>
        <ErrorBoundary fallback={<div>widget fallback</div>}>
          <Bomb />
        </ErrorBoundary>
        <div>sibling still renders</div>
      </div>,
    );
    expect(screen.getByText('widget fallback')).toBeInTheDocument();
    expect(screen.getByText('sibling still renders')).toBeInTheDocument();
  });

  it('renders nothing when no fallback is provided', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.queryByText('boom')).not.toBeInTheDocument();
  });
});

describe('WidgetErrorFallback', () => {
  it('shows a message and a Reset button that calls reset', () => {
    const reset = vi.fn();
    render(<WidgetErrorFallback reset={reset} />);
    expect(screen.getByText('This widget hit an error')).toBeInTheDocument();
    screen.getByRole('button', { name: 'Reset' }).click();
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
