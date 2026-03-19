/** Collect all localStorage entries into a plain object, values parsed back to JS types. */
const collectAll = () => {
  const data = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const raw = localStorage.getItem(key);
    try { data[key] = JSON.parse(raw); }
    catch { data[key] = raw; }
  }
  return data;
};

/** Download a .json file containing all widget settings and layout. */
export const exportSettings = () => {
  const payload = { undistracted_me: collectAll(), exported_at: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `undistracted-me-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/** Parse a JSON string and restore all settings, then reload. */
export const importSettings = (jsonString) => {
  let parsed;
  try { parsed = JSON.parse(jsonString); }
  catch { throw new Error('File is not valid JSON.'); }
  const data = parsed?.undistracted_me ?? parsed;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid settings file — expected a JSON object.');
  }
  localStorage.clear();
  for (const [key, val] of Object.entries(data)) {
    localStorage.setItem(key, typeof val === 'string' ? val : JSON.stringify(val));
  }
  window.location.reload();
};

/** Open a file-picker for the user to choose a .json file, then import it. */
export const importFromFile = (onError) => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      importSettings(text);
    } catch (err) {
      onError?.(err.message || 'Import failed.');
    }
  };
  input.click();
};

/** Clear every localStorage key and reload. */
export const resetSettings = () => {
  localStorage.clear();
  window.location.reload();
};
