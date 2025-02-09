import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Grid from './components/Grid';
import Sidebar from './components/Sidebar';
import useStore from './store';
import { renderWidget } from './widgets';

const App: React.FC = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { settings } = useStore();

  return (
    <div className="relative h-screen bg-gray-600">
      <div className="p-4">
        <Grid
          widgets={settings.widgets}
          renderWidget={(widget, props) => renderWidget(widget, props)}
        />
      </div>
      <button
        id="menu-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="fixed right-4 top-4 p-2 bg-white rounded-xl shadow-lg hover:bg-gray-50 z-50"
      >
        <Menu className="w-6 h-6" />
      </button>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
    </div>
  );
};

export default App;