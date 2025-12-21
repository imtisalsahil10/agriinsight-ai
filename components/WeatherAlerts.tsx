import React, { useState } from 'react';
import { AlertTriangle, Loader2, Cloud, Wind, Snowflake, Bug } from 'lucide-react';
import { WeatherAlert } from '../types';

interface WeatherAlertsProps {
  language: 'en-US' | 'hi-IN';
}

const WeatherAlerts: React.FC<WeatherAlertsProps> = ({ language }) => {
  const isHindi = language === 'hi-IN';
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);

  const mockAlerts: WeatherAlert[] = [
    { type: 'frost', severity: 'high', message: 'Frost warning expected next 3 days', date: new Date().toLocaleDateString(), recommendation: 'Cover crops, use irrigation' },
    { type: 'storm', severity: 'medium', message: 'Heavy rain expected in 2 days', date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString(), recommendation: 'Harvest mature crops, secure loose items' },
    { type: 'pest', severity: 'high', message: 'Pest season approaching', date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString(), recommendation: 'Apply preventive pesticides' },
  ];

  const handleFetch = async () => {
    setLoading(true);
    setTimeout(() => {
      setAlerts(mockAlerts);
      setLoading(false);
    }, 1000);
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
        <p className="text-orange-100">{isHindi ? "गंभीर मौसम, ठंढ और कीट चेतावनी प्राप्त करें" : "Get alerts for severe weather, frost, and pest threats"}</p>
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
