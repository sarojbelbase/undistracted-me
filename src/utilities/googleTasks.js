/**
 * Google Tasks REST API v1 wrapper.
 *
 * Uses the shared getGoogleAuthToken() helper — same auth flow as Google
 * Calendar and Contacts, so no extra consent is needed beyond adding the
 * tasks scope to GOOGLE_SCOPES in googleAuth.js.
 *
 * All methods auto-retry once on 401/403 by removing the cached token and
 * re-authenticating silently (non-interactive). 403 covers the case where
 * the cached token predates the tasks scope being added to the manifest.
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

  // 401 = expired token; 403 = stale token missing tasks scope.
  // Remove it and retry once so Chrome fetches a fresh token.
  if ((res.status === 401 || res.status === 403) && !retried) {
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
 * Fetch all task lists for the authenticated user.
 */
export async function fetchGoogleTaskLists() {
  const data = await apiFetch('/users/@me/lists?maxResults=100');
  return data.items ?? [];
}

/**
 * Fetch tasks from ALL of the user's task lists.
 * Returns an array of task objects: { id, title, completed, due, notes, listId }.
 * Falls back to @default if the lists endpoint fails.
 */
export async function fetchGoogleTasks() {
  let lists;
  try {
    lists = await fetchGoogleTaskLists();
  } catch {
    lists = [];
  }
  if (!lists.length) lists = [{ id: '@default' }];

  const results = await Promise.allSettled(
    lists.map(list =>
      apiFetch(`/lists/${list.id}/tasks?showCompleted=true&showAssigned=true&maxResults=100`)
        .then(data => (data.items ?? []).map(item => normalizeTask(item, list.id)))
    )
  );

  const seen = new Set();
  return results
    .filter(r => r.status === 'fulfilled')
    .flatMap(r => r.value)
    .filter(t => !seen.has(t.id) && seen.add(t.id));
}

/**
 * Add a new task to the default list.
 */
export async function addGoogleTask(title) {
  const data = await apiFetch('/lists/@default/tasks', {
    method: 'POST',
    body: JSON.stringify({ title }),
  });
  return normalizeTask(data, '@default');
}

/**
 * Update a task's fields. Uses the task's own listId when available.
 */
export async function updateGoogleTask(taskId, updates, listId = '@default') {
  const data = await apiFetch(`/lists/${listId}/tasks/${taskId}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return normalizeTask(data, listId);
}

/**
 * Mark a task as completed (or uncompleted).
 */
export async function completeGoogleTask(taskId, done, listId = '@default') {
  return updateGoogleTask(taskId, {
    status: done ? 'completed' : 'needsAction',
    completed: done ? new Date().toISOString() : null,
  }, listId);
}

/**
 * Delete a task permanently.
 */
export async function deleteGoogleTask(taskId, listId = '@default') {
  await apiFetch(`/lists/${listId}/tasks/${taskId}`, { method: 'DELETE' });
}

function normalizeTask(raw, listId = '@default') {
  return {
    id: raw.id,
    title: raw.title || '',
    completed: raw.status === 'completed',
    due: raw.due ?? null,
    notes: raw.notes ?? null,
    listId,
  };
}
