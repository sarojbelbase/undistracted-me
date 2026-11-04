/**
 * SyncTransport — the swappable cross-device sync backend.
 *
 * Dependency-injection seam: `syncEngine.js` and `notesSync.js` depend ONLY on
 * this interface, never on a concrete service. To switch backends (Google Drive
 * → Dropbox → anything), change this file's internals only — the callers, their
 * merge logic, and the UI all keep calling the same methods.
 *
 * Current implementation: Google Drive `appDataFolder` (hidden, per-app), using
 * the app's existing Google OAuth (`scope: drive.appdata`).
 *
 * Interface:
 *   isAvailable() / isConnected() / connect() / disconnect() / getProfile() / getUrl()
 *   readConfig() / writeConfig(payload)
 *   readNote(fileId) / writeNote(payload, fileId) / deleteNote(fileId)
 */

import {
  getGoogleAuthToken,
  getGoogleUserProfile,
  isGoogleAuthAvailable,
} from "./googleAuth";

/** Schema version of the config payload — shared with syncEngine. */
export const SYNC_SCHEMA_VERSION = 3;

const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD = "https://www.googleapis.com/upload/drive/v3/files";

const CONFIG_FILENAME = "undistracted-me-sync.json";
const NOTE_FILENAME_PREFIX = "undistracted-me-note-";
const MIME_JSON = "application/json";

const CONNECTED_FLAG = "drive_sync_connected";

// ── low-level helpers ──────────────────────────────────────────────────────────

/** A valid Google access token, or null. */
async function token() {
  try {
    return await getGoogleAuthToken(false);
  } catch {
    return null;
  }
}

async function authHeaders() {
  const t = await getGoogleAuthToken(false);
  return { Authorization: `Bearer ${t}` };
}

/** Find the first file in appDataFolder matching `name` (or null). */
async function findFile(name) {
  const t = await token();
  if (!t) return null;
  const q = name ? `name='${name}'` : undefined;
  let url = `${DRIVE_API}/files?spaces=appDataFolder&pageSize=1`;
  if (q) url += `&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } });
  if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
  const data = await res.json();
  return data.files?.[0] ?? null;
}

/** Raw file content as text, or null on 404. */
async function getFileContent(fileId) {
  const t = await token();
  if (!t) return null;
  const res = await fetch(`${DRIVE_API}/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${t}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Drive read failed (${res.status})`);
  return res.text();
}

/** Create a file in appDataFolder; returns its id. */
async function createFile(name, content, mimeType) {
  const t = await getGoogleAuthToken(false);
  const boundary = `um${Date.now()}${Math.random().toString(36).slice(2)}`;
  const meta = JSON.stringify({ name, parents: ["appDataFolder"], mimeType });
  const body =
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${meta}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n` +
    `${content}\r\n--${boundary}--`;
  const res = await fetch(`${DRIVE_UPLOAD}?uploadType=multipart`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${t}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body,
  });
  if (!res.ok) {
    const b = await res.json().catch(() => ({}));
    throw new Error(
      `Drive create failed (${res.status}): ${b.error?.message || res.statusText}`,
    );
  }
  const data = await res.json();
  return data.id;
}

/** Overwrite a file's content; returns the file id. */
async function updateFileContent(fileId, content, mimeType) {
  const t = await getGoogleAuthToken(false);
  const res = await fetch(`${DRIVE_UPLOAD}/${fileId}?uploadType=media`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${t}`, "Content-Type": mimeType },
    body: content,
  });
  if (!res.ok) throw new Error(`Drive update failed (${res.status})`);
  return fileId;
}

/** Best-effort delete of a file. */
async function deleteFile(fileId) {
  const t = await token();
  if (!t) return;
  await fetch(`${DRIVE_API}/files/${fileId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${t}` },
  });
}

// ── public transport interface ────────────────────────────────────────────────

export const syncTransport = {
  isAvailable: () => isGoogleAuthAvailable(),

  isConnected: () => {
    try {
      return localStorage.getItem(CONNECTED_FLAG) === "1";
    } catch {
      return false;
    }
  },

  /** Interactive connect — prompts for the Drive scope, then marks connected. */
  connect: async () => {
    await getGoogleAuthToken(true);
    syncTransport.setConnected(true);
    return getGoogleUserProfile();
  },

  /** Set/clear the connected flag (used by the Google store after OAuth). */
  setConnected: (flag) => {
    try {
      if (flag) localStorage.setItem(CONNECTED_FLAG, "1");
      else localStorage.removeItem(CONNECTED_FLAG);
    } catch {
      /* ignore */
    }
  },

  disconnect: async () => {
    try {
      localStorage.removeItem(CONNECTED_FLAG);
    } catch {
      /* ignore */
    }
  },

  getProfile: () => getGoogleUserProfile(),

  /** Drive's appDataFolder is hidden — there is no browsable link. */
  getUrl: async () => null,

  /**
   * Read the config payload. Resolves to the parsed JSON object, `{ notFound:
   * true }` when no config file exists, or null when disconnected/unreadable.
   */
  readConfig: async () => {
    if (!(await token())) return null;
    try {
      const file = await findFile(CONFIG_FILENAME);
      if (!file) return { notFound: true };
      const content = await getFileContent(file.id);
      if (content == null) return { notFound: true };
      return JSON.parse(content);
    } catch {
      return null;
    }
  },

  /** Persist the full config payload (create-or-update by deterministic name). */
  writeConfig: async (payload) => {
    const content = JSON.stringify(payload);
    const file = await findFile(CONFIG_FILENAME);
    if (!file) await createFile(CONFIG_FILENAME, content, MIME_JSON);
    else await updateFileContent(file.id, content, MIME_JSON);
  },

  /** Read a note payload (raw parsed JSON), or null. */
  readNote: async (fileId) => {
    if (!fileId) return null;
    try {
      const content = await getFileContent(fileId);
      return content == null ? null : JSON.parse(content);
    } catch {
      return null;
    }
  },

  /** Create-or-update a note payload; returns the file id. */
  writeNote: async (payload, existingFileId) => {
    const name = `${NOTE_FILENAME_PREFIX}${payload.id}.json`;
    const content = JSON.stringify(payload);
    if (existingFileId) {
      return updateFileContent(existingFileId, content, MIME_JSON);
    }
    return createFile(name, content, MIME_JSON);
  },

  deleteNote: async (fileId) => {
    if (fileId) await deleteFile(fileId).catch(() => {});
  },
};

export default syncTransport;
