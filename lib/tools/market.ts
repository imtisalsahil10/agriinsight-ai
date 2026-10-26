import type { CropPrice } from '../../types';
import { toolResult, type ToolResult } from './types';

const TABLE: Array<Omit<CropPrice, 'region' | 'date'>> = [
  { cropName: 'Wheat', currentPrice: 2500, minPrice: 2300, maxPrice: 2700, trend: 'up' },
  { cropName: 'Rice', currentPrice: 4200, minPrice: 4000, maxPrice: 4500, trend: 'stable' },
  { cropName: 'Corn', currentPrice: 1800, minPrice: 1700, maxPrice: 1900, trend: 'down' },
  { cropName: 'Cotton', currentPrice: 5500, minPrice: 5300, maxPrice: 5800, trend: 'up' },
];

export function getMarketPrices(region: string, crops: string, now = Date.now()): ToolResult<CropPrice[]> {
  const place = region.trim() || 'Punjab';
  const selected = crops.split(',').map((crop) => crop.trim().toLowerCase()).filter(Boolean);
  const date = new Date(now).toLocaleDateString('en-GB', { timeZone: 'UTC' });
  const rows = (selected.length
    ? TABLE.filter((row) => selected.includes(row.cropName.toLowerCase()))
    : TABLE
  ).map((row) => ({ ...row, region: place, date }));

  return toolResult({
    ok: true,
    name: 'get_market_prices',
    source: 'mock',
    demo: true,
    confidence: 0.4,
    summary: rows.length
      ? `Demo prices for ${place}, not a live mandi quote. ${rows.map((row) => `${row.cropName} ${row.currentPrice}`).join(', ')}.`
      : `No demo row matched those crops for ${place}.`,
    inputs: { region: place, crops },
    data: rows,
  });
}
