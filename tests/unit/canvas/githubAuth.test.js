/**
 * Unit tests for src/utilities/githubAuth.js — gist discovery + schema version.
 *
 * Covers the multi-device fix: a second device must discover the *existing* sync
 * gist (matched on description + filename) instead of creating a new one.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  findSyncGist,
  ensureGist,
  GIST_DESCRIPTION,
  GIST_FILENAME,
  GIST_SCHEMA_VERSION,
} from '../../../src/utilities/githubAuth';

const GISTS_API = 'https://api.github.com/gists';

function json(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
    headers: { get: () => null },
  };
}

const syncGist = (id, createdAt = '2024-01-01T00:00:00Z') => ({
  id,
  description: GIST_DESCRIPTION,
  created_at: createdAt,
  files: { [GIST_FILENAME]: { content: '{}' } },
});

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ─── findSyncGist (pure) ────────────────────────────────────────────────────

describe('findSyncGist', () => {
  it('returns the id of the matching sync gist', () => {
    const id = findSyncGist([
      { id: 'a', description: 'something else', files: {} },
      syncGist('gist-x'),
    ]);
    expect(id).toBe('gist-x');
  });

  it('prefers the oldest when duplicates exist', () => {
    const id = findSyncGist([
      syncGist('newer', '2025-01-01T00:00:00Z'),
      syncGist('older', '2023-01-01T00:00:00Z'),
    ]);
    expect(id).toBe('older');
  });

  it('ignores gists with the right description but wrong filename', () => {
    const id = findSyncGist([
      { id: 'note', description: GIST_DESCRIPTION, files: { 'other.json': {} } },
    ]);
    expect(id).toBeNull();
  });

  it('returns null when nothing matches', () => {
    expect(findSyncGist([])).toBeNull();
    expect(findSyncGist([{ id: 'x', description: 'nope', files: {} }])).toBeNull();
  });
});

// ─── ensureGist (fetch) ─────────────────────────────────────────────────────

describe('ensureGist', () => {
  it('reuses a cached gist id when it is still valid', async () => {
    localStorage.setItem('github_gist_id', 'gist-cached');
    const fetchMock = vi.fn(async () => json({ id: 'gist-cached' }, 200));
    vi.stubGlobal('fetch', fetchMock);

    const id = await ensureGist('token');

    expect(id).toBe('gist-cached');
    // Only the verify GET was issued — no listing, no create.
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe(`${GISTS_API}/gist-cached`);
  });

  it('discovers an existing gist from another device', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      const u = String(url);
      if (u.startsWith(`${GISTS_API}?`) || u === GISTS_API) {
        // list response — one matching gist
        return json([syncGist('gist-existing')]);
      }
      return json({}, 404);
    }));

    const id = await ensureGist('token');

    expect(id).toBe('gist-existing');
    expect(localStorage.getItem('github_gist_id')).toBe('gist-existing');
  });

  it('creates a new gist when none exists', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = String(url);
      const method = (opts.method || 'GET').toUpperCase();
      if (method === 'POST' && u === GISTS_API) {
        return json({ id: 'gist-new' }, 201);
      }
      // list returns empty
      return json([]);
    }));

    const id = await ensureGist('token');

    expect(id).toBe('gist-new');
    expect(localStorage.getItem('github_gist_id')).toBe('gist-new');
  });

  it('creates a gist stamped with the current schema version', async () => {
    let createdBody = null;
    vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
      const u = String(url);
      const method = (opts.method || 'GET').toUpperCase();
      if (method === 'POST' && u === GISTS_API) {
        createdBody = JSON.parse(opts.body);
        return json({ id: 'gist-new' }, 201);
      }
      return json([]);
    }));

    await ensureGist('token');

    expect(createdBody.files[GIST_FILENAME].content).toContain(`"v":${GIST_SCHEMA_VERSION}`);
    expect(createdBody.public).toBe(false);
  });
});
