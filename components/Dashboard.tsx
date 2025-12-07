import React, { useEffect, useState } from 'react';
import { QUICK_ACTIONS } from '../constants';
import { Sun, Droplets, Wind, ArrowRight, Activity, MapPin, Loader2, Cloud, CloudRain, Snowflake } from 'lucide-react';
import { getWeather } from '../services/geminiService';
import { WeatherData } from '../types';

interface DashboardProps {
  onQuickAction: (prompt: string) => void;
  language: 'en-US' | 'hi-IN';
}

const Dashboard: React.FC<DashboardProps> = ({ onQuickAction, language }) => {
  const isHindi = language === 'hi-IN';
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(true);
  const [locationError, setLocationError] = useState<string | null>(null);

  useEffect(() => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setLocationError("Geolocation not supported");
      setLoadingWeather(false);
      return;
    }

    // Get position
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await getWeather(position.coords.latitude, position.coords.longitude);
          setWeather(data);
        } catch (err) {
          console.error("Failed to fetch weather", err);
          setLocationError("Weather unavailable");
        } finally {
          setLoadingWeather(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        setLocationError("Location access denied");
        setLoadingWeather(false);
      }
    );
  }, []);

  // Helper to choose weather icon
  const getWeatherIcon = (condition: string) => {
    const c = condition.toLowerCase();
    if (c.includes('rain') || c.includes('drizzle')) return <CloudRain className="w-5 h-5 text-blue-500 mr-2" />;
    if (c.includes('cloud')) return <Cloud className="w-5 h-5 text-gray-500 mr-2" />;
    if (c.includes('snow')) return <Snowflake className="w-5 h-5 text-cyan-500 mr-2" />;
    return <Sun className="w-5 h-5 text-orange-500 mr-2" />;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-agri-600 to-agri-800 rounded-3xl p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        {/* Decorative Circles */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-white opacity-10 rounded-full"></div>

        <div className="relative z-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            {isHindi ? "नमस्ते, किसान!" : "Hello, Farmer!"}
          </h1>
          <p className="text-agri-100 text-lg max-w-2xl leading-relaxed">
            {isHindi 
              ? "मैं आपकी फसल की उपज बढ़ाने में कैसे मदद कर सकता हूँ? नीचे दिए गए विकल्पों में से चुनें या मुझसे पूछें।"
              : "How can I help improve your crop yield today? Select an option below or ask me anything about your farm."}
          </p>
        </div>
      </div>

      {/* Weather Summary Card */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-gray-100 dark:border-slate-700 shadow-sm min-h-[140px] transition-colors">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800 dark:text-white flex items-center">
            {loadingWeather ? (
               <Loader2 className="w-5 h-5 text-orange-500 mr-2 animate-spin" />
            ) : weather ? (
               getWeatherIcon(weather.condition)
            ) : (
               <Sun className="w-5 h-5 text-orange-500 mr-2" />
            )}
            {isHindi ? "आज का मौसम" : "Today's Weather"}
          </h2>
          {weather && (
            <span className="text-xs text-gray-400 dark:text-slate-400 flex items-center">
              <MapPin className="w-3 h-3 mr-1" />
              {weather.location}
            </span>
          )}
        </div>

        {loadingWeather ? (
          <div className="flex justify-center items-center h-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Loading local forecast...</span>
          </div>
        ) : weather ? (
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 dark:bg-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{weather.temp}°C</span>
              <span className="text-xs text-blue-500 dark:text-blue-300 font-medium whitespace-nowrap">{weather.condition}</span>
            </div>
            <div className="bg-indigo-50 dark:bg-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Droplets className="w-6 h-6 text-indigo-500 dark:text-indigo-400 mb-1" />
              <span className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{weather.humidity}%</span>
              <span className="text-xs text-indigo-500 dark:text-indigo-300">Humidity</span>
            </div>
            <div className="bg-slate-50 dark:bg-slate-700 p-4 rounded-xl flex flex-col items-center justify-center text-center">
              <Wind className="w-6 h-6 text-slate-500 dark:text-slate-400 mb-1" />
              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{weather.wind} km/h</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">Wind</span>
            </div>
          </div>
        ) : (
          <div className="flex justify-center items-center h-20 text-red-400 bg-red-50 dark:bg-red-900/30 rounded-xl">
             <span>{locationError || "Unable to load weather data"}</span>
          </div>
        )}
      </div>

      {/* Quick Actions Grid */}
      <div>
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center">
          <Activity className="w-5 h-5 text-agri-600 mr-2" />
          {isHindi ? "त्वरित कार्रवाई" : "Quick Actions"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => onQuickAction(action.prompt)}
              className="group flex flex-col items-start p-5 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-2xl shadow-sm hover:shadow-md hover:border-agri-200 dark:hover:border-agri-600 transition-all text-left"
            >
              <div className={`p-3 rounded-xl mb-3 ${action.color.replace('text-', 'bg-').replace('100', '50')} dark:bg-opacity-20`}>
                <div className={`${action.color} bg-transparent dark:text-opacity-90`}>
                  {action.icon}
                </div>
              </div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 group-hover:text-agri-700 dark:group-hover:text-agri-400 transition-colors">
                {action.label}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                {isHindi ? "क्लिक करें जानकारी के लिए..." : action.prompt}
              </p>
              <div className="mt-auto pt-4 flex items-center text-xs font-bold text-agri-600 dark:text-agri-400 opacity-0 group-hover:opacity-100 transition-opacity">
                {isHindi ? "अभी पूछें" : "Ask Now"} <ArrowRight className="w-3 h-3 ml-1" />
              </div>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
};

export default Dashboard;