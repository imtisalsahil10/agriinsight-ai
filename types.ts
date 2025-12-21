export interface Source {
  title: string;
  uri: string;
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  content: string;
  image?: string; // base64 string
  sources?: Source[];
  timestamp: number;
}

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
  description?: string;
}

export interface WeatherData {
  temp: string;
  humidity: string;
  wind: string;
  condition: string;
  location: string;
}

export interface CachedWeatherData {
  data: WeatherData;
  timestamp: number;
  latitude: number;
  longitude: number;
}

export interface UserProfile {
  name: string;
  type: 'user' | 'guest';
  email?: string;
}

export type LoadingState = 'idle' | 'loading' | 'analyzing' | 'error';
export type Language = 'en-US' | 'hi-IN';
export type ViewState = 'dashboard' | 'chat' | 'video' | 'settings';