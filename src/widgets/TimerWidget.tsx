import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { WidgetProps } from '../types/widgets';
import Widget from '../components/Widget';

const TimerWidget: React.FC<WidgetProps> = ({ settings }) => {
  const [timeLeft, setTimeLeft] = useState(settings.duration);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const reset = () => {
    setTimeLeft(settings.duration);
    setIsRunning(false);
  };

  const toggleTimer = () => {
    setIsRunning(!isRunning);
  };

  return (
    <Widget>
      <div className="h-full">
        <h2 className="text-lg font-semibold mb-4">Timer</h2>

        <div className="text-center">
          <div className="text-7xl my-5">
            {formatTime(timeLeft)}
          </div>

          <div className="flex justify-center gap-2">
            <button
              onClick={toggleTimer}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7" />}
            </button>
            <button
              onClick={reset}
              className="p-2 rounded-full hover:bg-gray-100"
            >
              <RotateCcw className="w-7 h-7" />
            </button>
          </div>
        </div>
      </div>
    </Widget>
  );
};

export default TimerWidget;