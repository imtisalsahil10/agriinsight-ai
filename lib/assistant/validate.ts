import type { FieldPatch } from './types';

export interface SoilFields {
  pH: number;
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  organicMatter: number;
}

export interface YieldFields {
  cropType: string;
  area: number;
  rainfallDays: number;
  temperature: number;
}

export function finite(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function applySoil(current: SoilFields, patch: FieldPatch): SoilFields {
  return {
    pH: patch.pH ?? current.pH,
    nitrogen: patch.nitrogen ?? current.nitrogen,
    phosphorus: patch.phosphorus ?? current.phosphorus,
    potassium: patch.potassium ?? current.potassium,
    organicMatter: patch.organicMatter ?? current.organicMatter,
  };
}

export function soilMissing(input: SoilFields): string[] {
  const missing: string[] = [];
  if (!finite(input.pH) || input.pH < 0 || input.pH > 14) missing.push('pH between 0 and 14');
  if (!finite(input.nitrogen) || input.nitrogen < 0) missing.push('nitrogen');
  if (!finite(input.phosphorus) || input.phosphorus < 0) missing.push('phosphorus');
  if (!finite(input.potassium) || input.potassium < 0) missing.push('potassium');
  if (!finite(input.organicMatter) || input.organicMatter < 0) missing.push('organic matter');
  return missing;
}

export function applyYield(current: YieldFields, patch: FieldPatch): YieldFields {
  return {
    cropType: patch.crop ?? current.cropType,
    area: patch.area ?? current.area,
    rainfallDays: patch.rainfallDays ?? current.rainfallDays,
    temperature: patch.temperature ?? current.temperature,
  };
}

export function yieldMissing(input: YieldFields): string[] {
  const missing: string[] = [];
  if (!input.cropType.trim()) missing.push('a crop');
  if (!finite(input.area) || input.area <= 0) missing.push('area in hectares');
  if (!finite(input.rainfallDays) || input.rainfallDays < 0 || input.rainfallDays > 30) missing.push('rainfall days from 0 to 30');
  if (!finite(input.temperature)) missing.push('temperature');
  return missing;
}

export function textMissing(value: string, label: string): string[] {
  return value.trim() ? [] : [label];
}
