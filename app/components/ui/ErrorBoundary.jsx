import { Component } from 'react';

/**
 * ErrorBoundary: catches render errors in a subtree so one crashing component
 * can't blank its parent (e.g. a single widget throwing must not empty the whole
 * grid). Preact's compat layer supports `getDerivedStateFromError` +
 * `componentDidCatch`, so this works in both the extension and web builds.
 *
 * Usage:
 *   <ErrorBoundary fallback={<Fallback />}>
 *     <Risky />
 *   </ErrorBoundary>
 *
 * `fallback` may be a node, or a function `(error, reset) => node`. `reset`
 * clears the error state and re-mounts the children.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // Log for diagnostics: production builds keep console.error for real
    // runtime errors (only console.log/warn/debug are stripped).
    console.error('[ErrorBoundary]', error, info?.componentStack ?? '');
  }

  reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (error == null) return this.props.children;
    const { fallback } = this.props;
    if (typeof fallback === 'function') return fallback(error, this.reset);
    return fallback ?? null;
  }
}

/**
 * Compact fallback for a single widget cell: quiet, centered, with a reset
 * affordance so the user isn't stuck with a dead card after a transient error.
 */
export const WidgetErrorFallback = ({ reset }) => (
  <div
    className="w-full h-full flex flex-col items-center justify-center gap-1.5 p-3 select-none"
    style={{ minHeight: 64, color: 'var(--w-ink-4)' }}
  >
    <span style={{ fontSize: 11, fontWeight: 600, textAlign: 'center' }}>
      This widget hit an error
    </span>
    <button
      type="button"
      onClick={reset}
      style={{ fontSize: 11, fontWeight: 600, color: 'var(--w-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
    >
      Reset
    </button>
  </div>
);
