import './App.css';
import React from 'react';

import DateToday from './components/DateToday';
import LiveClock from './components/LiveClock';
import NepaliMiti from './components/NepaliMiti';

function App() {
  return (
    <div id="fullscreen">
      <div className="clock-area">
        <NepaliMiti />
        <LiveClock />
        <DateToday />
      </div>
    </div>
  );
}

export default App;
