import { Select } from '../../components/ui/Select';
import { DataTransfer } from '../../components/ui/DataTransfer';
import {
  SettingsSection,
  SettingsField,
  SettingsToggleRow,
} from '../../components/ui/SettingsSection';
import { snackbar } from '../../components/ui/Snackbar';
import { usePocket } from './usePocket';
import { clearAll, exportJson, importJson, updatePrefs } from './pocketStore';
import { liveFolders, storageSize, totalCount, formatBytes } from './selectors';
import { FOLDER_COLOR_MAP } from './constants';

/**
 * Settings: the Pocket settings body, rendered inside BaseSettingsModal (from
 * the ⋯ menu and the expanded header gear). All prefs live in pocket:meta
 * (chrome.storage.local) so the service worker can read them: not
 * useWidgetSettings. Changes apply right away.
 */
export function Settings() {
  const { items, folders, meta } = usePocket();
  const prefs = meta?.prefs || {};

  const set = (key, value) => updatePrefs({ [key]: value });
  const saved = totalCount(items);

  const download = (filename, text, type) => {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const doExport = () => download('pocket.json', exportJson(), 'application/json');

  const doSample = () => {
    const now = Date.now();
    const day = 86400000;
    const sample = {
      schema: 1,
      items: [
        {
          id: 'sample-link',
          kind: 'link',
          text: 'https://developer.mozilla.org',
          title: 'MDN Web Docs',
          host: 'developer.mozilla.org',
          sourceUrl: 'https://developer.mozilla.org',
          favicon: '',
          folderIds: [],
          createdAt: now - day,
          updatedAt: now - day,
          deletedAt: null,
        },
        {
          id: 'sample-note',
          kind: 'paragraph',
          text: 'An idea worth keeping: the best way to stay focused is to make distractions one tap further away.',
          title: '',
          host: 'example.com',
          sourceUrl: '',
          favicon: '',
          folderIds: [],
          createdAt: now - 2 * day,
          updatedAt: now - 2 * day,
          deletedAt: null,
        },
        {
          id: 'sample-code',
          kind: 'code',
          text: 'const focus = () => undistract();',
          title: '',
          host: '',
          sourceUrl: '',
          favicon: '',
          folderIds: [],
          createdAt: now - 3 * day,
          updatedAt: now - 3 * day,
          deletedAt: null,
        },
      ],
      folders: [],
      updatedAt: now,
    };
    download('sample_pocket.json', JSON.stringify(sample, null, 2), 'application/json');
  };

  const onImport = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const res = importJson(reader.result);
      if (res.error) {
        snackbar("That file isn't a Pocket export. Choose a file you exported from Pocket.");
      } else {
        snackbar(`Imported ${res.added} saves.`);
      }
    };
    reader.onerror = () => snackbar("Couldn't read that file.");
    reader.readAsText(file);
  };

  return (
    <div className="flex flex-col gap-5 p-1">
      <SettingsSection title="Display">
        <SettingsToggleRow
          label="Show Site Icons"
          checked={prefs.showSiteIcons !== false}
          onChange={(v) => set('showSiteIcons', v)}
          ariaLabel="Show site icons"
        />
        <SettingsToggleRow
          label="Wrap Long Code Lines"
          checked={!!prefs.wrapCode}
          onChange={(v) => set('wrapCode', v)}
          ariaLabel="Wrap long code lines"
        />
      </SettingsSection>

      <SettingsSection title="Saving">
        <SettingsField label="Save New Items To">
          <Select
            value={prefs.defaultFolderId || ''}
            onChange={(v) => set('defaultFolderId', v || null)}
            ariaLabel="Save new items to"
            options={[
              { value: '', label: 'No folder' },
              ...liveFolders(folders)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((f) => ({ value: f.id, label: f.name, color: FOLDER_COLOR_MAP[f.color] })),
            ]}
          />
        </SettingsField>
      </SettingsSection>

      <div style={{ height: 1, background: 'var(--w-divider)' }} />

      <DataTransfer
        title="Data"
        importLabel="Import JSON"
        exportLabel="Export JSON"
        accept="application/json,.json"
        onImport={onImport}
        onExport={doExport}
        note="Export a backup to move your saves between devices, or import a Pocket export to restore them."
        sampleLabel="Sample JSON"
        onSample={doSample}
        clearLabel="Delete all saves"
        onClear={() => clearAll()}
        caption={`${saved} saves · ${formatBytes(storageSize(items, folders))} used on this device`}
      />
    </div>
  );
}
