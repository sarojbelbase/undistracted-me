/**
 * Google Drive search utility.
 * Uses drive.metadata.readonly scope — only file names/links, no content access.
 * Auth is handled by googleAuth.js (Chrome seamless / Firefox PKCE).
 *
 * Called with interactive=false so it silently returns [] if the user has not
 * yet granted the Drive scope (e.g. signed in before Drive was added). The
 * search bar simply skips the Drive section in that case.
 */
import { getGoogleAuthToken, removeGoogleAuthToken } from './googleAuth';

const DRIVE_API = 'https://www.googleapis.com/drive/v3/files';

/**
 * Search Drive files by name. Returns up to 5 matches with id, name, mimeType,
 * and webViewLink. Returns [] on auth failure or network error.
 *
 * @param {string} query
 * @returns {Promise<Array<{id:string, name:string, mimeType:string, webViewLink:string}>>}
 */
export async function searchDriveFiles(query) {
  if (!query?.trim()) return [];

  let token;
  try {
    // Non-interactive: if Drive scope not yet granted, fails silently.
    token = await getGoogleAuthToken(false);
  } catch {
    return [];
  }
  if (!token) return [];

  try {
    // Escape backslashes and single quotes to avoid breaking the Drive query syntax.
    const safe = query.replaceAll('\\', String.raw`\\`).replaceAll("'", String.raw`\'`);
    const params = new URLSearchParams({
      q: `name contains '${safe}' and trashed = false`,
      fields: 'files(id,name,mimeType,webViewLink)',
      orderBy: 'recency desc',
      pageSize: '5',
    });
    const res = await fetch(`${DRIVE_API}?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(3000),
    });
    if (res.status === 401) {
      removeGoogleAuthToken(token);
      return [];
    }
    if (!res.ok) return [];
    const data = await res.json();
    return data.files || [];
  } catch {
    return [];
  }
}
