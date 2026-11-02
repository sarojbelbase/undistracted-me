/**
 * Unit tests for src/utilities/notesSync.js (per-note private gist sync)
 *
 * syncEngine and githubAuth are mocked so the tests exercise notesSync's own
 * logic: index maintenance, note gist CRUD, and last-write-wins reconcile.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    hooks: [],
    pushKey: vi.fn(),
    isSyncEnabled: vi.fn(() => true),
    getToken: vi.fn(async () => 'token-abc'),
  };
});

vi.mock('../../../src/utilities/syncEngine', () => ({
  default: {
    isSyncEnabled: () => mocks.isSyncEnabled(),
    registerSyncHook: (fn) => {
      mocks.hooks.push(fn);
      return () => {};
    },
    pushKey: (...args) => mocks.pushKey(...args),
  },
}));

vi.mock('../../../src/utilities/githubAuth', () => ({
  getToken: () => mocks.getToken(),
  GITHUB_USER_AGENT: 'undistracted-me',
}));

import notesSync, { NOTE_GIST_FILENAME } from '../../../src/utilities/notesSync';
import { STORAGE_KEYS } from '../../../src/constants/storageKeys';

const GISTS_API = 'https://api.github.com/gists';
const NOTES_KEY = STORAGE_KEYS.widgetSettings('notes');

// In-memory note gists keyed by gist id → note payload.
let noteGists;
let nextGistId;

function noteJson(id, title, body, updatedAt) {
  return JSON.stringify({ v: 1, id, title, body, updatedAt });
}

function stubFetch() {
  noteGists = {};
  nextGistId = 1;
  vi.stubGlobal('fetch', vi.fn(async (url, opts = {}) => {
    const u = String(url);
    const method = (opts.method || 'GET').toUpperCase();

    // POST /gists — create a note gist
    if (u === GISTS_API && method === 'POST') {
      const body = JSON.parse(opts.body);
      const content = body.files[NOTE_GIST_FILENAME].content;
      const id = `gist-${nextGistId++}`;
      noteGists[id] = JSON.parse(content);
      return { ok: true, status: 201, json: async () => ({ id }) };
    }

    // /gists/:id — PATCH / GET / DELETE
    const match = u.match(/^https:\/\/api\.github\.com\/gists\/(.+)$/);
    if (match) {
      const gistId = match[1];
      if (method === 'PATCH') {
        const body = JSON.parse(opts.body);
        const content = body.files[NOTE_GIST_FILENAME].content;
        noteGists[gistId] = JSON.parse(content);
        return { ok: true, status: 200, json: async () => ({ id: gistId }) };
      }
      if (method === 'DELETE') {
        delete noteGists[gistId];
        return { ok: true, status: 204, json: async () => ({}) };
      }
      if (method === 'GET') {
        const note = noteGists[gistId];
        if (!note) return { ok: false, status: 404, json: async () => ({ message: 'Not Found' }) };
        return { ok: true, status: 200, json: async () => ({ id: gistId, files: { [NOTE_GIST_FILENAME]: { content: JSON.stringify(note) } } }) };
      }
    }

    return { ok: false, status: 404, json: async () => ({}) };
  }));
}

function seedNotes(notes) {
  localStorage.setItem(NOTES_KEY, JSON.stringify({ notes, idx: 0 }));
}

function seedIndex(index) {
  localStorage.setItem(STORAGE_KEYS.NOTES_INDEX, JSON.stringify(index));
}

function readNotes() {
  return JSON.parse(localStorage.getItem(NOTES_KEY)).notes;
}

function readIndex() {
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES_INDEX));
}

function runSync() {
  return mocks.hooks[0]();
}

beforeEach(() => {
  localStorage.clear();
  mocks.pushKey.mockClear();
  mocks.isSyncEnabled.mockReturnValue(true);
  mocks.getToken.mockResolvedValue('token-abc');
  stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('syncNotes — push', () => {
  it('creates a private note gist for a local note with no gistId', async () => {
    seedNotes([{ id: 'n1', text: 'Hello\nWorld', updatedAt: 100 }]);
    seedIndex({ n1: { gistId: null, label: 'Hello', updatedAt: 0 } });

    await runSync();

    // A gist was created with the note content + description.
    const gistIds = Object.keys(noteGists);
    expect(gistIds).toHaveLength(1);
    expect(noteGists[gistIds[0]]).toMatchObject({ id: 'n1', title: 'Hello', body: 'World', updatedAt: 100 });

    // The index now points to the gist id.
    const index = readIndex();
    expect(index.n1.gistId).toBe(gistIds[0]);
    expect(index.n1.label).toBe('Hello');

    // The index was pushed to the config gist.
    expect(mocks.pushKey).toHaveBeenCalledWith(STORAGE_KEYS.NOTES_INDEX);
  });

  it('does not create a gist for an empty note', async () => {
    seedNotes([{ id: 'n1', text: '', updatedAt: 100 }]);
    seedIndex({});

    await runSync();

    expect(Object.keys(noteGists)).toHaveLength(0);
    expect(mocks.pushKey).not.toHaveBeenCalled();
  });
});

describe('syncNotes — pull', () => {
  it('pulls a newer remote version over the local note', async () => {
    seedNotes([{ id: 'n1', text: 'Old title\nOld body', updatedAt: 100 }]);
    seedIndex({ n1: { gistId: 'gist-remote', label: 'New title', updatedAt: 200 } });

    // Simulate the remote gist holding the newer content.
    noteGists['gist-remote'] = JSON.parse(noteJson('n1', 'New title', 'New body', 200));

    await runSync();

    const notes = readNotes();
    expect(notes[0].text).toBe('New title\nNew body');
    expect(notes[0].updatedAt).toBe(200);
  });

  it('keeps the local note when it is newer than remote', async () => {
    seedNotes([{ id: 'n1', text: 'My newer note', updatedAt: 300 }]);
    seedIndex({ n1: { gistId: 'gist-remote', label: 'Old', updatedAt: 200 } });
    noteGists['gist-remote'] = JSON.parse(noteJson('n1', 'Old', 'body', 200));

    await runSync();

    const notes = readNotes();
    expect(notes[0].text).toBe('My newer note');
    expect(noteGists['gist-remote'].title).toBe('My newer note'); // pushed over remote
  });

  it('pulls a remote-only note into local notes', async () => {
    seedNotes([]);
    seedIndex({ nX: { gistId: 'gist-x', label: 'Remote note', updatedAt: 500 } });
    noteGists['gist-x'] = JSON.parse(noteJson('nX', 'Remote note', 'body', 500));

    await runSync();

    const notes = readNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('nX');
    expect(notes[0].text).toBe('Remote note\nbody');
  });
});

describe('local edit hooks', () => {
  it('onNoteChanged updates the index label without a gistId', () => {
    seedIndex({});
    notesSync.onNoteChanged('n1', 'Brand new title');

    expect(readIndex().n1).toMatchObject({ gistId: null, label: 'Brand new title' });
    expect(mocks.pushKey).not.toHaveBeenCalled(); // no network on edit
  });

  it('onNoteChanged preserves the gistId and last-synced time', () => {
    seedIndex({ n1: { gistId: 'gist-1', label: 'Old', updatedAt: 42 } });
    notesSync.onNoteChanged('n1', 'New label');

    expect(readIndex().n1).toMatchObject({ gistId: 'gist-1', label: 'New label', updatedAt: 42 });
  });

  it('onNoteDeleted removes the index entry, tombstones, and pushes', () => {
    seedIndex({ n1: { gistId: 'gist-1', label: 'X', updatedAt: 42 } });

    notesSync.onNoteDeleted('n1');

    expect(readIndex().n1).toBeUndefined();
    expect(mocks.pushKey).toHaveBeenCalledWith(STORAGE_KEYS.NOTES_INDEX);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES_DELETED)).n1).toBeTruthy();
  });
});
