import React from 'react';
import { Leaf, CloudRain, Bug, Sprout, TrendingUp, Languages } from 'lucide-react';
import { QuickAction } from './types';

export const APP_NAME = "AgriInsight AI";
export const WELCOME_MESSAGE = "Hello! I'm your AI agricultural assistant. I can help you identify crop diseases from photos, check weather impacts, suggest pesticides, or analyze market trends. How can I help your farm today?";

export const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'disease',
    label: 'Identify Disease',
    icon: <Leaf className="w-5 h-5" />,
    prompt: "I suspect my crops have a disease. Can I upload a photo for you to analyze, or describe the symptoms?",
    color: "bg-red-100 text-red-700 hover:bg-red-200"
  },
  {
    id: 'weather',
    label: 'Weather Forecast',
    icon: <CloudRain className="w-5 h-5" />,
    prompt: "What is the agricultural weather forecast for the next 7 days in my region? Please include rainfall and humidity predictions.",
    color: "bg-blue-100 text-blue-700 hover:bg-blue-200"
  },
  {
    id: 'pests',
    label: 'Pest Control',
    icon: <Bug className="w-5 h-5" />,
    prompt: "What are the common pests affecting corn and soybeans right now, and what are the recommended organic and chemical treatments?",
    color: "bg-amber-100 text-amber-700 hover:bg-amber-200"
  },
  {
    id: 'soil',
    label: 'Soil Health',
    icon: <Sprout className="w-5 h-5" />,
    prompt: "How can I improve my soil nitrogen levels naturally for the upcoming planting season?",
    color: "bg-agri-100 text-agri-700 hover:bg-agri-200"
  },
  {
    id: 'market',
    label: 'Market Trends',
    icon: <TrendingUp className="w-5 h-5" />,
    prompt: "What are the current market trends and price projections for wheat and corn?",
    color: "bg-purple-100 text-purple-700 hover:bg-purple-200"
  },
  {
    id: 'translate',
    label: 'Translator',
    icon: <Languages className="w-5 h-5" />,
    prompt: "Translate the following agricultural text to Hindi (or English if already in Hindi): [PASTE_TEXT_HERE]",
    color: "bg-teal-100 text-teal-700 hover:bg-teal-200"
  }
];