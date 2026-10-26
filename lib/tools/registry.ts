import type { FunctionDeclaration } from '@google/genai';
import { z } from 'zod';
import { analyzeDiseaseFromImage } from '../../services/geminiService';
import { loadFarm } from '../farm/store';
import { logToolDuration } from '../voice/metrics';
import { diagnoseCropDisease } from './disease';
import { remind, saveNote, setFarmProfile } from './farmTools';
import { generateIrrigationSchedule } from './irrigation';
import { getMarketPrices } from './market';
import { analyzeSoil } from './soil';
import type { ToolResult } from './types';
import { getWeatherAlert } from './weather';
import { predictYield } from './yield';

let pendingLeaf: string | null = null;

export function rememberLeafImage(dataUrl: string | null): void {
  pendingLeaf = dataUrl;
}

const numberArg = z.coerce.number().finite();

const schemas = {
  get_weather_alert: z.object({ latitude: numberArg, longitude: numberArg }),
  get_market_prices: z.object({ region: z.string().optional(), crops: z.string().optional() }),
  generate_irrigation_schedule: z.object({ crop: z.string().optional() }),
  analyze_soil: z.object({
    pH: numberArg,
    nitrogen: numberArg,
    phosphorus: numberArg,
    potassium: numberArg,
    organicMatter: numberArg,
  }),
  predict_yield: z.object({
    cropType: z.string().optional(),
    area: numberArg,
    rainfallDays: numberArg,
    temperature: numberArg,
  }),
  diagnose_crop_disease: z.object({}),
  save_farm_note: z.object({ text: z.string() }),
  set_reminder: z.object({ text: z.string(), when: z.string().optional() }),
  set_farm_profile: z.object({
    location: z.string().optional(),
    crops: z.array(z.string()).optional(),
    areaHectares: numberArg.optional(),
    soil: z.string().optional(),
    latitude: numberArg.optional(),
    longitude: numberArg.optional(),
  }),
};

function schema(properties: Record<string, unknown>, required: string[]): Record<string, unknown> {
  return { type: 'object', properties, required };
}

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'get_weather_alert',
    description: 'Current weather and frost, rain, or wind alerts from Open-Meteo. Use the farm coordinates when known.',
    parametersJsonSchema: schema({
      latitude: { type: 'number' },
      longitude: { type: 'number' },
    }, ['latitude', 'longitude']),
  },
  {
    name: 'get_market_prices',
    description: 'Demo crop prices. Always tell the farmer these are demo data, not a live mandi quote.',
    parametersJsonSchema: schema({
      region: { type: 'string' },
      crops: { type: 'string', description: 'Comma-separated crop names' },
    }, []),
  },
  {
    name: 'generate_irrigation_schedule',
    description: 'A demo irrigation formula. Say that it is demo data, not a sensor reading.',
    parametersJsonSchema: schema({ crop: { type: 'string' } }, []),
  },
  {
    name: 'analyze_soil',
    description: 'Demo soil recommendations from numbers the farmer provides. Say that it is demo data.',
    parametersJsonSchema: schema({
      pH: { type: 'number' },
      nitrogen: { type: 'number' },
      phosphorus: { type: 'number' },
      potassium: { type: 'number' },
      organicMatter: { type: 'number' },
    }, ['pH', 'nitrogen', 'phosphorus', 'potassium', 'organicMatter']),
  },
  {
    name: 'predict_yield',
    description: 'Demo yield formula. Say that it is demo data, not a measured harvest.',
    parametersJsonSchema: schema({
      cropType: { type: 'string' },
      area: { type: 'number' },
      rainfallDays: { type: 'number' },
      temperature: { type: 'number' },
    }, ['area', 'rainfallDays', 'temperature']),
  },
  {
    name: 'diagnose_crop_disease',
    description: 'Diagnose the leaf photo the farmer just captured. If there is no photo, ask them to open the leaf camera.',
    parametersJsonSchema: schema({}, []),
  },
  {
    name: 'save_farm_note',
    description: 'Save a short note on this device.',
    parametersJsonSchema: schema({ text: { type: 'string' } }, ['text']),
  },
  {
    name: 'set_reminder',
    description: 'Save a reminder on this device. It only notifies while the page is open. when is an ISO date-time.',
    parametersJsonSchema: schema({ text: { type: 'string' }, when: { type: 'string' } }, ['text']),
  },
  {
    name: 'set_farm_profile',
    description: 'Save the farmer location, crops, area, or soil on this device.',
    parametersJsonSchema: schema({
      location: { type: 'string' },
      crops: { type: 'array', items: { type: 'string' } },
      areaHectares: { type: 'number' },
      soil: { type: 'string' },
      latitude: { type: 'number' },
      longitude: { type: 'number' },
    }, []),
  },
];

function invalid(name: string, inputs: Record<string, unknown>): ToolResult {
  return {
    ok: false,
    name,
    source: 'device',
    demo: false,
    confidence: 0,
    summary: 'Those details were not usable. Ask the farmer for the missing numbers.',
    inputs,
    data: null,
  };
}

export async function runTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  const started = Date.now();
  const result = await execute(name, args);
  logToolDuration(name, Date.now() - started);
  return result;
}

async function execute(name: string, args: Record<string, unknown>): Promise<ToolResult> {
  switch (name) {
    case 'get_weather_alert': {
      const parsed = schemas.get_weather_alert.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return getWeatherAlert(parsed.data.latitude, parsed.data.longitude);
    }
    case 'get_market_prices': {
      const parsed = schemas.get_market_prices.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      const place = parsed.data.region || loadFarm().location || 'Punjab';
      return getMarketPrices(place, parsed.data.crops ?? '');
    }
    case 'generate_irrigation_schedule': {
      const parsed = schemas.generate_irrigation_schedule.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return generateIrrigationSchedule(parsed.data.crop || loadFarm().crops[0] || 'wheat');
    }
    case 'analyze_soil': {
      const parsed = schemas.analyze_soil.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return analyzeSoil(parsed.data);
    }
    case 'predict_yield': {
      const parsed = schemas.predict_yield.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return predictYield({
        cropType: parsed.data.cropType || loadFarm().crops[0] || 'wheat',
        area: parsed.data.area,
        rainfallDays: parsed.data.rainfallDays,
        temperature: parsed.data.temperature,
      });
    }
    case 'diagnose_crop_disease':
      return diagnoseCropDisease(pendingLeaf, analyzeDiseaseFromImage);
    case 'save_farm_note': {
      const parsed = schemas.save_farm_note.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return saveNote(parsed.data.text);
    }
    case 'set_reminder': {
      const parsed = schemas.set_reminder.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return remind(parsed.data.text, parsed.data.when ?? '');
    }
    case 'set_farm_profile': {
      const parsed = schemas.set_farm_profile.safeParse(args);
      if (!parsed.success) return invalid(name, args);
      return setFarmProfile(parsed.data);
    }
    default:
      return invalid(name, args);
  }
}
