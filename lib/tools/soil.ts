import type { SoilData } from '../../types';
import { toolResult, type ToolResult } from './types';

export interface SoilInput {
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
}

export function analyzeSoil(input: SoilInput): ToolResult<SoilData> {
  const data: SoilData = {
    pH: input.pH,
    nitrogen: input.nitrogen,
    phosphorus: input.phosphorus,
    potassium: input.potassium,
    organicMatter: input.organicMatter,
    cropSuitability: ['Wheat', 'Rice', 'Corn', 'Barley'],
    recommendations: [
      input.nitrogen < 50 ? 'Add nitrogen-rich fertilizer' : 'Nitrogen levels optimal',
      input.pH < 6 ? 'Lime required to increase pH' : 'pH within acceptable range',
      input.organicMatter < 3 ? 'Increase compost and organic matter' : 'Good organic matter content',
      'Apply balanced NPK fertilizer before planting',
    ],
  };
  return toolResult({
    ok: true,
    name: 'analyze_soil',
    source: 'mock',
    demo: true,
    confidence: 0.5,
    summary: `Demo soil note. ${data.recommendations.slice(0, 3).join('. ')}.`,
    inputs: { ...input },
    data,
  });
}
