/**
 * Google Tasks REST API v1 wrapper.
 *
 * Uses the shared getGoogleAuthToken() helper — same auth flow as Google
 * Calendar and Contacts, so no extra consent is needed beyond adding the
 * tasks scope to GOOGLE_SCOPES in googleAuth.js.
 *
 * All methods auto-retry once on 401 by removing the cached token and
 * re-authenticating silently (non-interactive).
 */
import { getGoogleAuthToken, removeGoogleAuthToken } from './googleAuth';

const BASE = 'https://tasks.googleapis.com/tasks/v1';

async function apiFetch(path, options = {}, retried = false) {
  let token;
  try {
    token = await getGoogleAuthToken(false);
  } catch {
    throw new Error('Not authenticated with Google');
  }

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (res.status === 401 && !retried) {
    await removeGoogleAuthToken(token);
    return apiFetch(path, options, true);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Google Tasks API error: ${body.error?.message || res.status}`);
  }

  // DELETE returns 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

/**
 * Fetch tasks from the user's default task list.
 * Returns an array of task objects: { id, title, status, due, notes, completed }.
 */
export async function fetchGoogleTasks() {
  const data = await apiFetch('/lists/@default/tasks?showCompleted=true&maxResults=100');
  return (data.items ?? []).map(normalizeTask);
}

/**
 * Add a new task to the default list.
 */
export async function addGoogleTask(title) {
  const data = await apiFetch('/lists/@default/tasks', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return normalizeTask(data);
}

/**
 * Update a task's title.
 */
export async function updateGoogleTask(taskId, updates) {
  const data = await apiFetch(`/lists/@default/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return normalizeTask(data);
}

/**
 * Mark a task as completed (or uncompleted).
 */
export async function completeGoogleTask(taskId, done) {
  return updateGoogleTask(taskId, {
    status: done ? 'completed' : 'needsAction',
    completed: done ? new Date().toISOString() : null,
  });
}

/**
 * Delete a task permanently.
 */
export async function deleteGoogleTask(taskId) {
  await apiFetch(`/lists/@default/tasks/${taskId}`, { method: 'DELETE' });
}

function normalizeTask(raw) {
  return {
    id: raw.id,
    title: raw.title || '',
    completed: raw.status === 'completed',
    due: raw.due ?? null,
    notes: raw.notes ?? null,
  };
}
