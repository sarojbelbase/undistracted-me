import React from 'react';
import useStore from '../store';

const Popup = () => {
  const { settings, exportSettings, importSettings } = useStore();

  const handleExport = () => {
    const jsonString = exportSettings();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modern-new-tab-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      importSettings(content);
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-80 p-4">
      <h1 className="text-xl font-bold mb-4">Settings</h1>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Theme Color
          </label>
          <select
            value={settings.theme.accentColor}
            onChange={(e) => useStore.setState({
              settings: {
                ...settings,
                theme: { ...settings.theme, accentColor: e.target.value }
              }
            })}
            className="w-full p-2 border rounded"
          >
            <option value="#141414">Dark Gray</option>
            <option value="#6366F1">Indigo</option>
            <option value="#8B5CF6">Purple</option>
            <option value="#EC4899">Pink</option>
            <option value="#10B981">Green</option>
            <option value="#F59E0B">Orange</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={handleExport}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Export Settings
          </button>
          
          <label className="w-full py-2 px-4 bg-gray-600 text-white rounded hover:bg-gray-700 text-center cursor-pointer">
            Import Settings
            <input
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />
          </label>
        </div>
      </div>
    </div>
  );
};

export default Popup;