import React, { useEffect, useRef, useState } from 'react';
import { QUICK_ACTIONS } from '../constants';
import { ArrowRight, Cloud, CloudRain, Droplets, MapPin, RefreshCw, Snowflake, Sun, Wind } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import { Callout, PageFrame, Panel, SecondaryButton } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { loadFarm } from '../lib/farm/store';
import { getWeatherAlert } from '../lib/tools/weather';
import { WeatherData, CachedWeatherData, type Language } from '../types';

interface DashboardProps {
  onQuickAction: (prompt: string) => void;
  onNavigate?: (view: string) => void;
  onAsk?: (text: string) => void;
  language: Language;
}

const WEATHER_CACHE_KEY = 'agriinsight_weather_cache';
const CACHE_DURATION = 60 * 60 * 1000;

const Dashboard: React.FC<DashboardProps> = ({ onQuickAction, onNavigate, onAsk, language }) => {
  const hi = language === 'hi-IN';
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const weatherRef = useRef<WeatherData | null>(null);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  const farm = loadFarm();

  useEffect(() => {
    const cachedData = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!cachedData) return;
    try {
      const parsed: CachedWeatherData = JSON.parse(cachedData);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        weatherRef.current = parsed.data;
        setWeather(parsed.data);
      } else {
        localStorage.removeItem(WEATHER_CACHE_KEY);
      }
    } catch {
      localStorage.removeItem(WEATHER_CACHE_KEY);
    }
  }, []);

  const fetchWeatherData = async (): Promise<{ ok: boolean; summary: string }> => {
    if (!navigator.geolocation) {
      const summary = hi ? 'स्थान सेवा समर्थित नहीं।' : 'Geolocation is not supported.';
      setLocationError(summary);
      return { ok: false, summary };
    }
    if (running.current) return { ok: false, summary: hi ? 'मौसम पहले से लोड हो रहा है।' : 'Weather is already loading.' };
    running.current = true;
    setLoadingWeather(true);
    setLocationError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
      });
      const result = await getWeatherAlert(position.coords.latitude, position.coords.longitude);
      if (!result.ok) {
        setLocationError(result.summary);
        return { ok: false, summary: result.summary };
      }
      const data = result.data.weather;
      weatherRef.current = data;
      setWeather(data);
      summaryRef.current = result.summary;
      const cacheData: CachedWeatherData = {
        data,
        timestamp: Date.now(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(cacheData));
      return { ok: true, summary: result.summary };
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? Number((error as GeolocationPositionError).code) : 0;
      const summary = code === 1
        ? (hi ? 'स्थान की अनुमति नहीं मिली।' : 'Location permission was denied.')
        : code === 3
          ? (hi ? 'स्थान अनुरोध का समय समाप्त।' : 'The location request timed out.')
          : (hi ? 'मौसम अभी उपलब्ध नहीं।' : 'Weather is unavailable right now.');
      setLocationError(summary);
      return { ok: false, summary };
    } finally {
      running.current = false;
      setLoadingWeather(false);
    }
  };

  usePageAssistant({
    view: 'dashboard',
    language,
    explain: () => explainView('dashboard', language),
    read: () => summaryRef.current ?? (weatherRef.current ? `${weatherRef.current.condition}, ${weatherRef.current.temp}°C` : farm.lastSummary || null),
    apply: () => undefined,
    missing: () => [],
    run: fetchWeatherData,
  });

  const icon = (condition: string) => {
    const name = condition.toLowerCase();
    if (name.includes('rain') || name.includes('drizzle')) return <CloudRain className="h-5 w-5 text-sky-600" />;
    if (name.includes('cloud')) return <Cloud className="h-5 w-5 text-slate-500" />;
    if (name.includes('snow')) return <Snowflake className="h-5 w-5 text-sky-500" />;
    return <Sun className="h-5 w-5 text-amber-500" />;
  };

  const suggestions = hi
    ? ['मिट्टी विश्लेषण खोलो', 'गेहूं का बाजार भाव दिखाओ', 'इस पेज को समझाओ']
    : ['Open soil analysis', 'Show me the market price for wheat', 'Explain how this feature works'];

  return (
    <PageFrame
      icon={<Sun className="h-5 w-5" />}
      title={hi ? 'डैशबोर्ड' : 'Dashboard'}
      description={hi
        ? 'उपकरण, सेव किए नोट, और मौसम जब आप उसे लाते हैं।'
        : 'Tools, saved notes, and weather when you fetch it.'}
    >
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-white">{hi ? 'आज का मौसम' : "Today's weather"}</h2>
            <p className="text-xs text-slate-500">Open-Meteo</p>
          </div>
          <SecondaryButton onClick={() => { void fetchWeatherData(); }} disabled={loadingWeather}>
            <RefreshCw className={`h-4 w-4 ${loadingWeather ? 'animate-spin' : ''}`} />
            {loadingWeather ? (hi ? 'लोड हो रहा है' : 'Loading') : (hi ? 'मौसम लाएँ' : 'Fetch weather')}
          </SecondaryButton>
        </div>
        {weather ? (
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
              <div className="flex items-center gap-2 text-sm text-slate-500">{icon(weather.condition)}{weather.condition}</div>
              <p className="mt-1 text-2xl font-semibold">{weather.temp}°C</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
              <Droplets className="h-4 w-4 text-sky-600" />
              <p className="mt-1 text-lg font-semibold">{weather.humidity}%</p>
              <p className="text-xs text-slate-500">{hi ? 'नमी' : 'Humidity'}</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-900">
              <Wind className="h-4 w-4 text-slate-500" />
              <p className="mt-1 text-lg font-semibold">{weather.wind}</p>
              <p className="text-xs text-slate-500">km/h</p>
            </div>
          </div>
        ) : (
          <p className="mt-4 text-sm text-slate-500">{locationError || (hi ? 'मौसम लाने के लिए बटन दबाएँ।' : 'Fetch weather to see a live reading.')}</p>
        )}
        {weather && (
          <p className="mt-3 flex items-center text-xs text-slate-500"><MapPin className="mr-1 h-3 w-3" />{weather.location}</p>
        )}
      </Panel>

      {(farm.location || farm.crops.length > 0 || farm.lastSummary || farm.notes.length > 0) && (
        <Panel>
          <h2 className="text-base font-semibold">{hi ? 'खेत' : 'Farm'}</h2>
          <div className="mt-2 space-y-1 text-sm text-slate-600 dark:text-slate-300">
            {farm.location && <p>{farm.location}</p>}
            {farm.crops.length > 0 && <p>{farm.crops.join(', ')}</p>}
            {typeof farm.areaHectares === 'number' && <p>{farm.areaHectares} ha</p>}
          </div>
          {farm.lastSummary && <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{farm.lastSummary}</p>}
          {farm.notes.length > 0 && (
            <ul className="mt-3 space-y-2">
              {farm.notes.slice(-3).reverse().map((note) => (
                <li key={note.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">{note.text}</li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{hi ? 'उपकरण' : 'Tools'}</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              type="button"
              onClick={() => {
                if (onNavigate && ['disease', 'soil', 'irrigation', 'market', 'alerts', 'calendar', 'fertilizer', 'locations', 'yield'].includes(action.id)) {
                  onNavigate(action.id);
                } else {
                  onQuickAction(action.prompt);
                }
              }}
              className="surface flex items-start gap-3 p-4 text-left transition-shadow hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri-700"
            >
              <span className="mt-0.5 text-agri-800 dark:text-agri-200">{action.icon}</span>
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 dark:text-white">{action.label}</span>
                <span className="mt-1 flex items-center text-xs font-medium text-agri-800 dark:text-agri-200">{hi ? 'खोलें' : 'Open'} <ArrowRight className="ml-1 h-3 w-3" /></span>
              </span>
            </button>
          ))}
        </div>
      </div>

      <Panel>
        <h2 className="text-sm font-semibold">{hi ? 'सहायक से कहें' : 'Ask the assistant'}</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((suggestion) => (
            <button key={suggestion} type="button" className="btn-secondary min-h-9 px-3 text-sm" onClick={() => onAsk?.(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      </Panel>
      {locationError && weather && <Callout tone="warning">{locationError}</Callout>}
    </PageFrame>
  );
};

export default Dashboard;
