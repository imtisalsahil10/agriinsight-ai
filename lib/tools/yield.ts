import type { YieldPrediction } from '../../types';
import { toolResult, type ToolResult } from './types';

export interface YieldInput {
  cropType: string;
  area: number;
  rainfallDays: number;
  temperature: number;
}

const BASE: Record<string, number> = { wheat: 50, rice: 60, corn: 70 };

export function yieldConfidence(rainfallDays: number, temperature: number): number {
  const rain = Math.max(0, Math.min(30, rainfallDays));
  const tempBonus = temperature > 20 ? 5 : 0;
  return Math.round(75 + (rain / 30) * 10 + tempBonus);
}

export function predictYield(input: YieldInput): ToolResult<YieldPrediction> {
  const cropType = input.cropType.split(',').map((crop) => crop.trim().toLowerCase()).filter(Boolean)[0] || 'wheat';
  const base = BASE[cropType] ?? 50;
  const rainfallFactor = input.rainfallDays / 30;
  const expected = Math.round(base * input.area * (0.5 + rainfallFactor * 0.5));
  const grade = input.rainfallDays > 20 && input.temperature > 20 ? 'A' : 'B';
  const confidence = yieldConfidence(input.rainfallDays, input.temperature);
  const data: YieldPrediction = {
    cropType,
    expectedYield: expected,
    unit: 'quintals',
    qualityGrade: grade,
    confidence,
    factors: [
      { name: 'Rainfall', impact: input.rainfallDays > 20 ? 'positive' : 'negative', value: `${input.rainfallDays} days` },
      { name: 'Temperature', impact: input.temperature > 20 ? 'positive' : 'negative', value: `${input.temperature}°C` },
      { name: 'Soil Quality', impact: 'positive', value: 'Good' },
      { name: 'Crop Variety', impact: 'positive', value: 'High-yield' },
    ],
  };
  return toolResult({
    ok: true,
    name: 'predict_yield',
    source: 'mock',
    demo: true,
    confidence: confidence / 100,
    summary: `Demo yield for ${cropType}: about ${expected} quintals, grade ${grade}. This formula is not a field measurement.`,
    inputs: { ...input },
    data,
  });
}
