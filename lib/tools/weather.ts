import type { WeatherAlert, WeatherData } from '../../types';
import { toolResult, type ToolResult } from './types';

export interface WeatherObservation {
  temperatureC: number;
  humidity: number;
  windKmh: number;
  weatherCode: number;
  tomorrowMinC: number;
  tomorrowPrecipMm: number;
}

export interface WeatherPayload {
  weather: WeatherData;
  alerts: WeatherAlert[];
}

export function conditionLabel(code: number): string {
  if (code === 0) return 'Clear';
  if (code <= 3) return 'Cloudy';
  if (code === 45 || code === 48) return 'Fog';
  if (code >= 71 && code <= 77) return 'Snow';
  if (code >= 95) return 'Thunderstorm';
  if (code >= 51) return 'Rain';
  return 'Unknown';
}

export function alertsFromObservation(obs: WeatherObservation, now = Date.now()): WeatherAlert[] {
  const today = new Date(now).toLocaleDateString('en-GB', { timeZone: 'UTC' });
  const alerts: WeatherAlert[] = [];
  if (obs.temperatureC <= 2 || obs.tomorrowMinC <= 2) {
    alerts.push({
      type: 'frost',
      severity: 'high',
      message: 'Temperature is at or below 2°C',
      date: today,
      recommendation: 'Cover young plants and water the soil before nightfall',
    });
  }
  const rainyCode = (obs.weatherCode >= 51 && obs.weatherCode <= 67) || obs.weatherCode >= 80;
  if (rainyCode || obs.tomorrowPrecipMm > 1) {
    alerts.push({
      type: 'storm',
      severity: obs.tomorrowPrecipMm > 10 || obs.weatherCode >= 95 ? 'high' : 'medium',
      message: obs.tomorrowPrecipMm > 1 ? 'Rain is expected' : 'Rain is falling now',
      date: today,
      recommendation: 'Delay spray work and check field drainage',
    });
  }
  if (obs.windKmh > 40) {
    alerts.push({
      type: 'wind',
      severity: 'high',
      message: `Wind is ${Math.round(obs.windKmh)} km/h`,
      date: today,
      recommendation: 'Skip spraying and secure light covers',
    });
  }
  return alerts;
}

function asWeather(obs: WeatherObservation, latitude: number, longitude: number): WeatherData {
  return {
    temp: `${Math.round(obs.temperatureC)}°C`,
    humidity: `${Math.round(obs.humidity)}%`,
    wind: `${Math.round(obs.windKmh)} km/h`,
    condition: conditionLabel(obs.weatherCode),
    location: `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`,
  };
}

interface OpenMeteoCurrent {
  temperature_2m?: number;
  relative_humidity_2m?: number;
  wind_speed_10m?: number;
  weather_code?: number;
}

interface OpenMeteoBody {
  current?: OpenMeteoCurrent;
  daily?: { temperature_2m_min?: number[]; precipitation_sum?: number[] };
}

export async function getWeatherAlert(latitude: number, longitude: number, now = Date.now()): Promise<ToolResult<WeatherPayload>> {
  const inputs = { latitude, longitude };
  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', String(latitude));
  url.searchParams.set('longitude', String(longitude));
  url.searchParams.set('current', 'temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code');
  url.searchParams.set('daily', 'temperature_2m_min,precipitation_sum');
  url.searchParams.set('forecast_days', '2');
  url.searchParams.set('timezone', 'auto');

  const response = await fetch(url);
  if (!response.ok) {
    return toolResult({
      ok: false,
      name: 'get_weather_alert',
      source: 'open-meteo',
      demo: false,
      confidence: 0,
      summary: 'Weather is unavailable right now.',
      inputs,
      data: { weather: { temp: '--', humidity: '--', wind: '--', condition: 'Unavailable', location: 'Open-Meteo' }, alerts: [] },
    });
  }

  const body = await response.json() as OpenMeteoBody;
  const current = body.current ?? {};
  const obs: WeatherObservation = {
    temperatureC: current.temperature_2m ?? 0,
    humidity: current.relative_humidity_2m ?? 0,
    windKmh: current.wind_speed_10m ?? 0,
    weatherCode: current.weather_code ?? 0,
    tomorrowMinC: body.daily?.temperature_2m_min?.[1] ?? body.daily?.temperature_2m_min?.[0] ?? 0,
    tomorrowPrecipMm: body.daily?.precipitation_sum?.[1] ?? 0,
  };
  const weather = asWeather(obs, latitude, longitude);
  const alerts = alertsFromObservation(obs, now);
  const summary = alerts.length
    ? `${weather.condition}, ${weather.temp}. ${alerts.map((alert) => alert.message).join('. ')}.`
    : `${weather.condition}, ${weather.temp}, humidity ${weather.humidity}, wind ${weather.wind}. No frost, heavy rain, or high wind in this reading.`;

  return toolResult({
    ok: true,
    name: 'get_weather_alert',
    source: 'open-meteo',
    demo: false,
    confidence: 0.9,
    summary,
    inputs,
    data: { weather, alerts },
  });
}
