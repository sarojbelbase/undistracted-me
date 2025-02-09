import React, { useEffect, useState } from 'react';
import { Cloud, CloudRain, Loader, Sun } from 'lucide-react';
import Widget from '../components/Widget';
import { WidgetProps } from '../types/widgets';

interface WeatherData {
  temperature: number;
  condition: string;
}

const WeatherWidget: React.FC<WidgetProps> = ({ settings }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setWeather({
        temperature: 21,
        condition: 'Cloudy'
      });
      setLoading(false);
    }, 1000);
  }, []);

  const getWeatherIcon = () => {
    if (loading) return <Loader className="w-24 h-24 animate-ring" />;
    switch (weather?.condition.toLowerCase()) {
      case 'sunny':
        return <Sun className="w-24 h-24" />;
      case 'rainy':
        return <CloudRain className="w-24 h-24" />;
      default:
        return <Cloud className="w-24 h-24" />;
    }
  };

  return (

    <Widget>
      <div className="flex flex-col items-center justify-center h-full space-y-3">
        <div className="flex justify-between items-center gap-2">
          <span className="text-xl font-bold">{weather?.condition}</span>
          <span className="text-xl font-bold text-gray-600">{weather?.temperature}°C</span>
        </div>
        <span>{getWeatherIcon()}</span>
      </div>
    </Widget>
  );
};
export default WeatherWidget;