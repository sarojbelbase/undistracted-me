import React, { useEffect } from 'react';
import { X, Settings as SettingsIcon, Download } from 'lucide-react';
import { availableWidgets } from '../widgets';
import useStore from '../store';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { addWidget, removeWidget, settings, exportSettings } = useStore();

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const menuButton = document.getElementById('menu-button');
      if (isOpen && sidebar && !sidebar.contains(e.target as Node) &&
        menuButton && !menuButton.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const handleAddWidget = (type: string) => {
    const widget = availableWidgets.find((w) => w.type === type);
    if (!widget) return;

    addWidget({
      id: `${type}-${Date.now()}`,
      type,
      position: { x: 0, y: 0 },
      size: widget.defaultSize || { w: 2, h: 2 }, // Default size if not specified
      settings: widget.defaultSettings,
    });
  };

  const handleExportSettings = () => {
    const jsonString = exportSettings();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'undistracted-me-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div
      id="sidebar"
      className={`fixed right-0 top-0 h-full w-80 bg-white shadow-lg transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
    >
      <div className="p-4 border-b">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Widgets</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 h-[calc(100%-8rem)] overflow-y-auto">
        {/* Active Widgets */}
        {settings.widgets.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Widgets</h3>
            {settings.widgets.map((widget) => {
              const widgetDef = availableWidgets.find(w => w.type === widget.type);
              if (!widgetDef) return null;

              return (
                <div key={widget.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-600">{widgetDef.icon}</span>
                    <span>{widgetDef.title}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {/* Add settings handler */ }}
                      className="p-1.5 hover:bg-gray-200 rounded-full"
                    >
                      <SettingsIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeWidget(widget.id)}
                      className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded-full"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Available Widgets */}
        <div>
          <h3 className="text-sm font-medium text-gray-500 mb-2">Add New Widget</h3>
          {availableWidgets.map((widget) => (
            <button
              key={widget.type}
              onClick={() => handleAddWidget(widget.type)}
              className="w-full p-4 mb-2 flex items-center bg-gray-50 hover:bg-gray-100 rounded-lg"
            >
              <span className="mr-3">{widget.icon}</span>
              <span>{widget.title}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Export Settings Button */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
        <button
          onClick={handleExportSettings}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 hover:bg-gray-200 rounded-lg"
        >
          <Download className="w-4 h-4" />
          <span>Export Settings</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;