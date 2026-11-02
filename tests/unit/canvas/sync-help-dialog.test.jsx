/**
 * Tests for src/components/ui/SyncHelpDialog.jsx
 *
 * Verifies the "what to do next" dialog renders its steps, actions, and maps a
 * raw GitHub 403 scope error to a friendly, human-readable summary.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SyncHelpDialog } from '../../../src/components/ui/SyncHelpDialog';

const noop = () => {};

describe('SyncHelpDialog', () => {
  it('renders the three steps and all three actions', () => {
    render(
      <SyncHelpDialog onClose={noop} onReconnect={noop} onOpenSettings={noop} />,
    );

    // Actions
    expect(screen.getByText('Reconnect GitHub')).toBeTruthy();
    expect(screen.getByText('Open developer settings')).toBeTruthy();
    expect(screen.getByText('Not now')).toBeTruthy();

    // Steps
    expect(screen.getByText('Create an OAuth App, not a GitHub App')).toBeTruthy();
    expect(screen.getByText(/Read and write your gists/)).toBeTruthy();
  });

  it('maps a 403 scope error to a friendly summary', () => {
    render(
      <SyncHelpDialog
        onClose={noop}
        onReconnect={noop}
        onOpenSettings={noop}
        reason="Failed to create gist (403): Resource not accessible by OAuth"
      />,
    );

    expect(screen.getByText(/didn't grant the .gist. permission/)).toBeTruthy();
  });

  it('maps a GitHub App "integration" error to the OAuth App fix', () => {
    render(
      <SyncHelpDialog
        onClose={noop}
        onReconnect={noop}
        onOpenSettings={noop}
        reason="Failed to create gist (403): Resource not accessible by integration"
      />,
    );

    expect(screen.getByText(/GitHub App instead of an OAuth App/)).toBeTruthy();
  });

  it('announces the summary to assistive tech (role=alert)', () => {
    render(
      <SyncHelpDialog
        onClose={noop}
        onReconnect={noop}
        onOpenSettings={noop}
        reason="Failed to create gist (403): Resource not accessible by OAuth"
      />,
    );

    expect(screen.getByRole('alert')).toBeTruthy();
  });
});
