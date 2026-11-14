/**
 * Unit tests for src/utilities/noteText.js (pure note-text helpers)
 */

import { describe, it, expect } from 'vitest';
import {
  splitNote,
  mergeNote,
  noteLabel,
  migrateNotes,
  makeNoteId,
} from '../../../src/utilities/noteText';

describe('splitNote', () => {
  it('splits title and body on the first newline', () => {
    expect(splitNote('Title\nbody line')).toEqual({ titleLine: 'Title', bodyText: 'body line' });
  });

  it('returns an empty body when there is no newline', () => {
    expect(splitNote('Just a title')).toEqual({ titleLine: 'Just a title', bodyText: '' });
  });

  it('treats undefined as an empty note', () => {
    expect(splitNote()).toEqual({ titleLine: '', bodyText: '' });
  });
});

describe('mergeNote', () => {
  it('joins title and body with a newline', () => {
    expect(mergeNote('Title', 'body')).toBe('Title\nbody');
  });

  it('omits the newline when body is empty', () => {
    expect(mergeNote('Title', '')).toBe('Title');
  });
});

describe('noteLabel', () => {
  it('uses the title when present', () => {
    expect(noteLabel('Meeting notes\nsome body')).toBe('Meeting notes');
  });

  it('uses a body snippet when there is no title', () => {
    expect(noteLabel('\nA body with no title')).toBe('A body with no title');
  });

  it('falls back to "Untitled note" when empty', () => {
    expect(noteLabel('')).toBe('Untitled note');
    expect(noteLabel('   ')).toBe('Untitled note');
  });

  it('flattens and truncates a long body-only note', () => {
    const label = noteLabel('\n' + 'word '.repeat(500));
    expect(label.length).toBeLessThanOrEqual(80);
    expect(label).not.toMatch(/\n/);
  });
});

describe('migrateNotes', () => {
  it('migrates strings to { id, text, updatedAt } objects', () => {
    const out = migrateNotes(['hello', 'world']);
    expect(out).toHaveLength(2);
    out.forEach((n) => {
      expect(typeof n.id).toBe('string');
      expect(typeof n.text).toBe('string');
      expect(typeof n.updatedAt).toBe('number');
    });
  });

  it('keeps existing ids and text for already-migrated notes', () => {
    const out = migrateNotes([{ id: 'abc', text: 'hi', updatedAt: 123 }]);
    expect(out).toEqual([{ id: 'abc', text: 'hi', updatedAt: 123 }]);
  });

  it('fills in a missing id for object notes', () => {
    const out = migrateNotes([{ text: 'no id' }]);
    expect(out[0].text).toBe('no id');
    expect(typeof out[0].id).toBe('string');
  });

  it('returns an empty array for non-array input', () => {
    expect(migrateNotes(null)).toEqual([]);
    expect(migrateNotes('nope')).toEqual([]);
  });
});

describe('makeNoteId', () => {
  it('returns unique, non-empty ids', () => {
    const a = makeNoteId();
    const b = makeNoteId();
    expect(a).toBeTruthy();
    expect(b).toBeTruthy();
    expect(a).not.toBe(b);
  });
});
