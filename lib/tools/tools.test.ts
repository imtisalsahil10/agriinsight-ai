import { describe, expect, it } from 'vitest';
import { presentDisease, KVK_LINE } from './disease';
import { generateIrrigationSchedule } from './irrigation';
import { getMarketPrices } from './market';
import { analyzeSoil } from './soil';
import { alertsFromObservation } from './weather';
import { predictYield, yieldConfidence } from './yield';

describe('farm tools', () => {
  it('marks market rows as demo data and relabels the region', () => {
    const result = getMarketPrices('Nashik', 'wheat', Date.UTC(2026, 0, 2));
    expect(result.demo).toBe(true);
    expect(result.source).toBe('mock');
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.region).toBe('Nashik');
    expect(result.data[0]?.currentPrice).toBe(2500);
  });

  it('builds the irrigation formula', () => {
    const result = generateIrrigationSchedule('wheat, rice', Date.UTC(2026, 0, 1));
    expect(result.demo).toBe(true);
    expect(result.data.cropType).toBe('wheat');
    expect(result.data.waterAmount).toBe('5-6 cm');
    expect(result.data.frequency).toBe('Every 7-10 days');
    expect(result.data.nextIrrigationDate).toBe('04/01/2026');
  });

  it('recommends nitrogen when the reading is low', () => {
    const result = analyzeSoil({ pH: 7, nitrogen: 40, phosphorus: 40, potassium: 300, organicMatter: 4 });
    expect(result.demo).toBe(true);
    expect(result.data.recommendations[0]).toBe('Add nitrogen-rich fertilizer');
  });

  it('predicts yield without a random confidence', () => {
    const result = predictYield({ cropType: 'wheat', area: 5, rainfallDays: 25, temperature: 22 });
    expect(result.demo).toBe(true);
    expect(result.data.expectedYield).toBe(229);
    expect(result.data.qualityGrade).toBe('A');
    expect(result.data.confidence).toBe(yieldConfidence(25, 22));
    expect(predictYield({ cropType: 'wheat', area: 5, rainfallDays: 25, temperature: 22 }).data.confidence).toBe(result.data.confidence);
  });

  it('raises frost and wind alerts from an observation', () => {
    const alerts = alertsFromObservation({
      temperatureC: 1,
      humidity: 80,
      windKmh: 45,
      weatherCode: 0,
      tomorrowMinC: 5,
      tomorrowPrecipMm: 0,
    }, Date.UTC(2026, 0, 2));
    expect(alerts.map((alert) => alert.type)).toEqual(['frost', 'wind']);
  });

  it('adds a dose unit and the KVK line when a chemical is named', () => {
    const presented = presentDisease({
      disease: 'Leaf blight',
      severity: 'medium',
      symptoms: ['spots'],
      organicRemedies: ['neem'],
      chemicalRemedies: ['Mancozeb spray'],
      preventionTips: ['rotate crops'],
    });
    expect(presented.chemicalRemedies[0]).toContain('ml or g per litre');
    expect(presented.kvkLine).toBe(KVK_LINE);
    expect(presented.source).toBe('model');
  });
});
