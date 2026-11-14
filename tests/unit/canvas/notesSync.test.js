/**
 * Unit tests for app/utilities/notesSync.js (per-note file sync)
 *
 * syncEngine and syncTransport are mocked so the tests exercise notesSync's own
 * logic: index maintenance, note file CRUD, and last-write-wins reconcile.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => {
  return {
    hooks: [],
    pushKey: vi.fn(),
    isSyncEnabled: vi.fn(() => true),
    noteFiles: {},
    nextFileId: 1,
  };
});

vi.mock('../../../app/utilities/syncEngineFacade', () => ({
  default: {
    isSyncEnabled: () => mocks.isSyncEnabled(),
    registerSyncHook: (fn) => {
      mocks.hooks.push(fn);
      return () => {};
    },
    pushKey: (...args) => mocks.pushKey(...args),
  },
}));

vi.mock('../../../app/utilities/syncTransport', () => {
  const transport = {
    isConnected: () => true,
    readNote: async (fileId) => (mocks.noteFiles[fileId] ? { ...mocks.noteFiles[fileId] } : null),
    writeNote: async (payload, existingFileId) => {
      const id = existingFileId || `file-${mocks.nextFileId++}`;
      mocks.noteFiles[id] = payload;
      return id;
    },
    deleteNote: async (fileId) => {
      delete mocks.noteFiles[fileId];
    },
  };
  return { syncTransport: transport, default: transport };
});

import notesSync from '../../../app/utilities/notesSync';
import { STORAGE_KEYS } from '../../../app/constants/storageKeys';

const NOTES_KEY = STORAGE_KEYS.widgetSettings('notes');

function noteJson(id, title, body, updatedAt) {
  return JSON.stringify({ v: 1, id, title, body, updatedAt });
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
  mocks.noteFiles = {};
  mocks.nextFileId = 1;
  mocks.pushKey.mockClear();
  mocks.isSyncEnabled.mockReturnValue(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('syncNotes — push', () => {
  it('creates a note file for a local note with no fileId', async () => {
    seedNotes([{ id: 'n1', text: 'Hello\nWorld', updatedAt: 100 }]);
    seedIndex({ n1: { fileId: null, label: 'Hello', updatedAt: 0 } });

    await runSync();

    // A file was created with the note content.
    const fileIds = Object.keys(mocks.noteFiles);
    expect(fileIds).toHaveLength(1);
    expect(mocks.noteFiles[fileIds[0]]).toMatchObject({ id: 'n1', title: 'Hello', body: 'World', updatedAt: 100 });

    // The index now points to the file id.
    const index = readIndex();
    expect(index.n1.fileId).toBe(fileIds[0]);
    expect(index.n1.label).toBe('Hello');

    // The index was pushed to the config.
    expect(mocks.pushKey).toHaveBeenCalledWith(STORAGE_KEYS.NOTES_INDEX);
  });

  it('does not create a file for an empty note', async () => {
    seedNotes([{ id: 'n1', text: '', updatedAt: 100 }]);
    seedIndex({});

    await runSync();

    expect(Object.keys(mocks.noteFiles)).toHaveLength(0);
    expect(mocks.pushKey).not.toHaveBeenCalled();
  });
});

describe('syncNotes — pull', () => {
  it('pulls a newer remote version over the local note', async () => {
    seedNotes([{ id: 'n1', text: 'Old title\nOld body', updatedAt: 100 }]);
    seedIndex({ n1: { fileId: 'file-remote', label: 'New title', updatedAt: 200 } });

    // Simulate the remote file holding the newer content.
    mocks.noteFiles['file-remote'] = JSON.parse(noteJson('n1', 'New title', 'New body', 200));

    await runSync();

    const notes = readNotes();
    expect(notes[0].text).toBe('New title\nNew body');
    expect(notes[0].updatedAt).toBe(200);
  });

  it('keeps the local note when it is newer than remote', async () => {
    seedNotes([{ id: 'n1', text: 'My newer note', updatedAt: 300 }]);
    seedIndex({ n1: { fileId: 'file-remote', label: 'Old', updatedAt: 200 } });
    mocks.noteFiles['file-remote'] = JSON.parse(noteJson('n1', 'Old', 'body', 200));

    await runSync();

    const notes = readNotes();
    expect(notes[0].text).toBe('My newer note');
    expect(mocks.noteFiles['file-remote'].title).toBe('My newer note'); // pushed over remote
  });

  it('pulls a remote-only note into local notes', async () => {
    seedNotes([]);
    seedIndex({ nX: { fileId: 'file-x', label: 'Remote note', updatedAt: 500 } });
    mocks.noteFiles['file-x'] = JSON.parse(noteJson('nX', 'Remote note', 'body', 500));

    await runSync();

    const notes = readNotes();
    expect(notes).toHaveLength(1);
    expect(notes[0].id).toBe('nX');
    expect(notes[0].text).toBe('Remote note\nbody');
  });
});

describe('local edit hooks', () => {
  it('onNoteChanged updates the index label without a fileId', () => {
    seedIndex({});
    notesSync.onNoteChanged('n1', 'Brand new title');

    expect(readIndex().n1).toMatchObject({ fileId: null, label: 'Brand new title' });
    expect(mocks.pushKey).not.toHaveBeenCalled(); // no network on edit
  });

  it('onNoteChanged preserves the fileId and last-synced time', () => {
    seedIndex({ n1: { fileId: 'file-1', label: 'Old', updatedAt: 42 } });
    notesSync.onNoteChanged('n1', 'New label');

    expect(readIndex().n1).toMatchObject({ fileId: 'file-1', label: 'New label', updatedAt: 42 });
  });

  it('onNoteDeleted removes the index entry, tombstones, and pushes', () => {
    seedIndex({ n1: { fileId: 'file-1', label: 'X', updatedAt: 42 } });

    notesSync.onNoteDeleted('n1');

    expect(readIndex().n1).toBeUndefined();
    expect(mocks.pushKey).toHaveBeenCalledWith(STORAGE_KEYS.NOTES_INDEX);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES_DELETED)).n1).toBeTruthy();
  });
});
