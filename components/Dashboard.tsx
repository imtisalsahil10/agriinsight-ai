import React, { useEffect, useState } from 'react';
import { QUICK_ACTIONS } from '../constants';
import { Sun, Droplets, Wind, ArrowRight, Activity, MapPin, Loader2, Cloud, CloudRain, Snowflake, RefreshCw } from 'lucide-react';
import { getWeather } from '../services/geminiService';
import { WeatherData, CachedWeatherData } from '../types';

interface DashboardProps {
  onQuickAction: (prompt: string) => void;
  onNavigate?: (view: string) => void;
  language: 'en-US' | 'hi-IN';
}

const WEATHER_CACHE_KEY = 'agriinsight_weather_cache';
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour in milliseconds

const Dashboard: React.FC<DashboardProps> = ({ onQuickAction, onNavigate, language }) => {
  const isHindi = language === 'hi-IN';
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Load cached weather data on mount
  useEffect(() => {
    const cachedData = localStorage.getItem(WEATHER_CACHE_KEY);
    if (cachedData) {
      try {
        const parsed: CachedWeatherData = JSON.parse(cachedData);
        const now = Date.now();
        
        // Check if cache is still valid (less than 1 hour old)
        if (now - parsed.timestamp < CACHE_DURATION) {
          setWeather(parsed.data);
        } else {
          // Cache expired, remove it
          localStorage.removeItem(WEATHER_CACHE_KEY);
        }
      } catch (err) {
        console.error("Failed to parse cached weather", err);
        localStorage.removeItem(WEATHER_CACHE_KEY);
      }
    }
  }, []);

  const fetchWeatherData = () => {
    // Check if geolocation is supported
    if (!navigator.geolocation) {
      setLocationError(isHindi ? "स्थान सेवा समर्थित नहीं" : "Geolocation not supported");
      return;
    }

    setLoadingWeather(true);
    setLocationError(null);

    // Get position with timeout
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const data = await getWeather(position.coords.latitude, position.coords.longitude);
          setWeather(data);
          
          // Cache the weather data with timestamp and location
          const cacheData: CachedWeatherData = {
            data,
            timestamp: Date.now(),
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          };
          localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cacheData));
        } catch (err) {
          console.error("Failed to fetch weather", err);
          setLocationError(isHindi ? "मौसम अनुपलब्ध" : "Weather unavailable");
        } finally {
          setLoadingWeather(false);
        }
      },
      (error) => {
        console.error("Geolocation error", error);
        // Provide specific error messages
        let errorMsg = "Location access denied";
        if (error.code === 1) {
          errorMsg = isHindi ? "स्थान अनुमति अस्वीकृत" : "Location permission denied";
        } else if (error.code === 2) {
          errorMsg = isHindi ? "स्थान अनुपलब्ध" : "Location unavailable";
        } else if (error.code === 3) {
          errorMsg = isHindi ? "स्थान अनुरोध समय समाप्त" : "Location request timed out";
        }
        setLocationError(errorMsg);
        setLoadingWeather(false);
      },
      {
        timeout: 10000,
        enableHighAccuracy: false
      }
    );
  };

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
          <div className="flex items-center gap-2">
            {weather && (
              <span className="text-xs text-gray-400 dark:text-slate-400 flex items-center">
                <MapPin className="w-3 h-3 mr-1" />
                {weather.location}
              </span>
            )}
            <button
              onClick={fetchWeatherData}
              disabled={loadingWeather}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-agri-600 hover:bg-agri-700 disabled:bg-gray-400 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingWeather ? 'animate-spin' : ''}`} />
              {loadingWeather ? (isHindi ? 'लोड हो रहा...' : 'Loading...') : (isHindi ? 'अपडेट करें' : 'Fetch')}
            </button>
          </div>
        </div>

        {loadingWeather ? (
          <div className="flex justify-center items-center h-20 text-gray-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>{isHindi ? 'स्थानीय पूर्वानुमान लोड हो रहा है...' : 'Loading local forecast...'}</span>
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
          <div className="flex flex-col justify-center items-center h-20 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-700/50 rounded-xl">
            {locationError ? (
              <span className="text-red-500 dark:text-red-400">{locationError}</span>
            ) : (
              <span className="text-sm">{isHindi ? 'मौसम डेटा प्राप्त करने के लिए "अपडेट करें" पर क्लिक करें' : 'Click "Fetch" to get weather data'}</span>
            )}
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
              onClick={() => {
                if (onNavigate && ['disease', 'soil', 'irrigation', 'market', 'alerts', 'calendar', 'fertilizer', 'locations', 'yield'].includes(action.id)) {
                  onNavigate(action.id);
                } else {
                  onQuickAction(action.prompt);
                }
              }}
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