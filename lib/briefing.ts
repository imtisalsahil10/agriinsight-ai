import { loadFarm } from './farm/store';
import { generateIrrigationSchedule } from './tools/irrigation';
import { getMarketPrices } from './tools/market';
import type { ToolResult } from './tools/types';
import { getWeatherAlert } from './tools/weather';

const CHAR_BUDGET = 450;

export async function buildMorningBriefing(now = Date.now()): Promise<{ script: string; cards: ToolResult[] }> {
  const farm = loadFarm();
  const cards: ToolResult[] = [];
  const lines: string[] = ['Good morning.'];
  if (farm.location) lines.push(`Farm: ${farm.location}.`);

  if (typeof farm.latitude === 'number' && typeof farm.longitude === 'number') {
    const weather = await getWeatherAlert(farm.latitude, farm.longitude, now);
    cards.push(weather);
    lines.push(weather.summary);
  } else {
    lines.push('Set your farm location to include weather.');
  }

  const crop = farm.crops[0] || 'wheat';
  const irrigation = generateIrrigationSchedule(crop, now);
  const market = getMarketPrices(farm.location || 'Punjab', crop, now);
  cards.push(irrigation, market);
  lines.push(irrigation.summary, market.summary);

  let script = lines.join(' ');
  if (script.length > CHAR_BUDGET) {
    script = `${script.slice(0, CHAR_BUDGET).trim()}… Want more detail?`;
  }
  return { script, cards };
}
