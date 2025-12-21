import React from 'react';
import { Leaf, CloudRain, Bug, Sprout, TrendingUp, Languages, Droplets, Calendar, Wind, Zap, Map, Beaker } from 'lucide-react';
import { QuickAction } from './types';

export const APP_NAME = "AgriInsight AI";
export const WELCOME_MESSAGE = "Hello! I'm your AI agricultural assistant. I can help you identify crop diseases, manage irrigation, track market prices, predict yields, and much more. How can I help your farm today?";

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'disease',
    label: 'Disease Detection',
    icon: <Leaf className="w-5 h-5" />,
    prompt: "Analyze my crop image for diseases and recommend treatments.",
    color: "text-red-700"
  },
  {
    id: 'soil',
    label: 'Soil Analysis',
    icon: <Sprout className="w-5 h-5" />,
    prompt: "Analyze soil health and recommend improvements for better yields.",
    color: "text-green-700"
  },
  {
    id: 'irrigation',
    label: 'Irrigation Schedule',
    icon: <Droplets className="w-5 h-5" />,
    prompt: "Create an irrigation schedule based on weather and soil conditions.",
    color: "text-blue-700"
  },
  {
    id: 'weather',
    label: 'Weather Forecast',
    icon: <CloudRain className="w-5 h-5" />,
    prompt: "Show me the agricultural weather forecast for the next 7 days.",
    color: "text-cyan-700"
  },
  {
    id: 'pests',
    label: 'Pest Control',
    icon: <Bug className="w-5 h-5" />,
    prompt: "Identify pest threats and recommend organic/chemical treatments.",
    color: "text-amber-700"
  },
  {
    id: 'market',
    label: 'Market Prices',
    icon: <TrendingUp className="w-5 h-5" />,
    prompt: "Show current market prices and trends for crops in my region.",
    color: "text-purple-700"
  },
  {
    id: 'calendar',
    label: 'Crop Calendar',
    icon: <Calendar className="w-5 h-5" />,
    prompt: "Create a seasonal planting and harvesting calendar for my crops.",
    color: "text-indigo-700"
  },
  {
    id: 'alerts',
    label: 'Weather Alerts',
    icon: <Wind className="w-5 h-5" />,
    prompt: "Alert me about severe weather, frost, or pest season warnings.",
    color: "text-orange-700"
  },
  {
    id: 'fertilizer',
    label: 'Fertilizer Guide',
    icon: <Beaker className="w-5 h-5" />,
    prompt: "Find the right fertilizer with dosage and safety information.",
    color: "text-lime-700"
  },
  {
    id: 'yield',
    label: 'Yield Prediction',
    icon: <Zap className="w-5 h-5" />,
    prompt: "Predict my crop yield based on current conditions and history.",
    color: "text-yellow-700"
  },
  {
    id: 'locations',
    label: 'Multi-Farm Manager',
    icon: <Map className="w-5 h-5" />,
    prompt: "Manage multiple farm locations and compare conditions.",
    color: "text-emerald-700"
  }
];