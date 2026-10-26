import React, { useState } from 'react';
import { AlertTriangle, Loader2, Cloud, Wind, Snowflake, Bug } from 'lucide-react';
import { getWeatherAlert } from '../lib/tools/weather';
import { WeatherAlert } from '../types';

interface WeatherAlertsProps {
  language: 'en-US' | 'hi-IN';
}

const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  const handleFetch = () => {
    if (!navigator.geolocation) return;
    setLoading(true);
    navigator.geolocation.getCurrentPosition(async (position) => {
      const result = await getWeatherAlert(position.coords.latitude, position.coords.longitude);
      setAlerts(result.data.alerts);
      setFetched(true);
      setLoading(false);
    }, () => setLoading(false));
  };

  const getIcon = (type: string) => {
    switch(type) {
      case 'frost': return <Snowflake className="w-5 h-5" />;
      case 'storm': return <Cloud className="w-5 h-5" />;
      case 'wind': return <Wind className="w-5 h-5" />;
      case 'pest': return <Bug className="w-5 h-5" />;
      default: return <AlertTriangle className="w-5 h-5" />;
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in">
      <div className="bg-gradient-to-r from-orange-600 to-orange-800 rounded-3xl p-8 text-white">
        <div className="flex items-center mb-3">
          <AlertTriangle className="w-8 h-8 mr-3" />
          <h1 className="text-3xl font-bold">{isHindi ? "मौसम सचेतनी" : "Weather Alerts"}</h1>
        </div>
        <p className="text-orange-100">{isHindi ? "Open-Meteo से ठंढ, बारिश और तेज़ हवा की चेतावनी" : "Frost, rain, and high-wind alerts from Open-Meteo"}</p>
      </div>

      <button
        onClick={handleFetch}
        disabled={loading}
        className="w-full px-6 py-3 bg-orange-600 text-white rounded-xl hover:bg-orange-700 disabled:bg-gray-400 font-medium"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
            {isHindi ? "लोड हो रहा है..." : "Loading..."}
          </>
        ) : (
          isHindi ? "चेतावनी प्राप्त करें" : "Fetch Alerts"
        )}
      </button>

      {fetched && alerts.length === 0 && !loading && (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {isHindi ? "इस रीडिंग में ठंढ, भारी बारिश या तेज़ हवा नहीं है। स्रोत: Open-Meteo।" : "No frost, heavy rain, or high wind in this reading. Source: Open-Meteo."}
        </p>
      )}

      {alerts.length > 0 && (
        <div className="space-y-3">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`p-4 rounded-xl border-l-4 ${
                alert.severity === 'high'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-500'
                  : alert.severity === 'medium'
                  ? 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-500'
                  : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center">
                  <div className={`${alert.severity === 'high' ? 'text-red-600' : 'text-yellow-600'}`}>
                    {getIcon(alert.type)}
                  </div>
                  <div className="ml-3">
                    <h3 className="font-bold capitalize">{alert.type}</h3>
                    <p className="text-xs text-gray-500">{alert.date}</p>
                  </div>
                </div>
                <span className={`text-xs font-bold px-2 py-1 rounded ${
                  alert.severity === 'high' ? 'bg-red-200 text-red-800' : 'bg-yellow-200 text-yellow-800'
                }`}>
                  {alert.severity.toUpperCase()}
                </span>
              </div>
              <p className="text-sm mb-2">{alert.message}</p>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">
                {isHindi ? "अनुशंसा:" : "Recommendation:"} {alert.recommendation}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WeatherAlerts;
