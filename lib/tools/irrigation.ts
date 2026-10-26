import type { IrrigationSchedule } from '../../types';
import { toolResult, type ToolResult } from './types';

export function primaryCrop(input: string): string {
  const parts = input.split(',').map((item) => item.trim()).filter(Boolean);
  return parts[0] || 'custom crop';
}

export function generateIrrigationSchedule(crop: string, now = Date.now()): ToolResult<IrrigationSchedule> {
  const cropType = primaryCrop(crop);
  const schedule: IrrigationSchedule = {
    cropType,
    nextIrrigationDate: new Date(now + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { timeZone: 'UTC' }),
    waterAmount: '5-6 cm',
    frequency: 'Every 7-10 days',
    savingTips: [
      'Use drip irrigation to save 40% water',
      'Water early morning to reduce evaporation',
      'Mulch soil to retain moisture',
      'Monitor soil moisture before each irrigation',
    ],
  };
  return toolResult({
    ok: true,
    name: 'generate_irrigation_schedule',
    source: 'mock',
    demo: true,
    confidence: crop.trim() ? 0.45 : 0.3,
    summary: `Demo schedule for ${cropType}: next watering ${schedule.nextIrrigationDate}, ${schedule.waterAmount}, ${schedule.frequency}. This is a formula, not a soil-moisture reading.`,
    inputs: { crop },
    data: schedule,
  });
}
