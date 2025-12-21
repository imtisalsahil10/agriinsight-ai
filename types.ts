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

// Disease Detection
export interface DiseaseAnalysis {
  disease: string;
  severity: 'low' | 'medium' | 'high';
  symptoms: string[];
  organicRemedies: string[];
  chemicalRemedies: string[];
  preventionTips: string[];
}

// Soil Health
export interface SoilData {
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
  cropSuitability: string[];
  recommendations: string[];
}

// Irrigation Schedule
export interface IrrigationSchedule {
  cropType: string;
  nextIrrigationDate: string;
  waterAmount: string;
  frequency: string;
  savingTips: string[];
}

// Market Price
export interface CropPrice {
  cropName: string;
  currentPrice: number;
  minPrice: number;
  maxPrice: number;
  trend: 'up' | 'down' | 'stable';
  region: string;
  date: string;
}

// Weather Alerts
export interface WeatherAlert {
  type: 'frost' | 'storm' | 'pest' | 'humidity' | 'wind';
  severity: 'low' | 'medium' | 'high';
  message: string;
  date: string;
  recommendation: string;
}

// Crop Calendar
export interface CropCalendarEntry {
  cropType: string;
  season: string;
  plantingDate: string;
  harvestDate: string;
  tasks: CalendarTask[];
}

export interface CalendarTask {
  date: string;
  task: string;
  priority: 'low' | 'medium' | 'high';
}

// Fertilizer Guide
export interface FertilizerGuide {
  name: string;
  type: 'organic' | 'chemical';
  cropSuitable: string[];
  dosage: string;
  applicationTime: string;
  safetyPrecautions: string[];
  cost: string;
}

// Multi-Location Support
export interface FarmLocation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  cropTypes: string[];
  areaSize: number;
  createdAt: number;
}

// Yield Prediction
export interface YieldPrediction {
  cropType: string;
  expectedYield: number;
  unit: string;
  qualityGrade: string;
  confidence: number;
  factors: YieldFactor[];
}

export interface YieldFactor {
  name: string;
  impact: 'positive' | 'negative' | 'neutral';
  value: string;
}

export type LoadingState = 'idle' | 'loading' | 'analyzing' | 'error';
export type Language = 'en-US' | 'hi-IN';
export type ViewState = 'dashboard' | 'chat' | 'video' | 'disease' | 'soil' | 'irrigation' | 'market' | 'alerts' | 'calendar' | 'fertilizer' | 'locations' | 'yield' | 'settings';