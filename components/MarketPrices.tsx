import React, { useRef, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, Minus, TrendingUp } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import DemoBadge from './voice/DemoBadge';
import { EmptyState, Field, PageFrame, Panel, PrimaryButton, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { textMissing } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import { getMarketPrices } from '../lib/tools/market';
import type { CropPrice, Language } from '../types';

const MarketPrices: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [region, setRegion] = useState('Punjab');
  const [cropFilters, setCropFilters] = useState('');
  const [prices, setPrices] = useState<CropPrice[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const regionRef = useRef(region);
  const cropRef = useRef(cropFilters);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  regionRef.current = region;
  cropRef.current = cropFilters;

  const execute = async () => {
    if (!regionRef.current.trim()) {
      const message = hi ? 'क्षेत्र का नाम चाहिए।' : 'A region is required.';
      setError(message);
      return { ok: false, summary: message };
    }
    if (running.current) return { ok: false, summary: hi ? 'भाव पहले से लोड हो रहे हैं।' : 'Prices are already loading.' };
    running.current = true;
    setLoading(true);
    setError('');
    try {
      const result = getMarketPrices(regionRef.current, cropRef.current);
      if (!result.ok) return { ok: false, summary: result.summary };
      setPrices(result.data);
      setSummary(result.summary);
      summaryRef.current = result.summary;
      rememberSummary(result.summary);
      return { ok: true, summary: result.summary };
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  usePageAssistant({
    view: 'market',
    language,
    explain: () => explainView('market', language),
    read: () => summaryRef.current,
    apply: (patch) => {
      if (patch.region) {
        regionRef.current = patch.region;
        setRegion(patch.region);
      }
      if (patch.crop) {
        cropRef.current = patch.crop;
        setCropFilters(patch.crop);
      }
    },
    missing: () => textMissing(regionRef.current, hi ? 'क्षेत्र' : 'a region'),
    run: execute,
  });

  return (
    <PageFrame
      icon={<TrendingUp className="h-5 w-5" />}
      title={hi ? 'बाजार भाव' : 'Market Prices'}
      description={hi
        ? 'ये डेमो भाव हैं, लाइव मंडी भाव नहीं। फसल और क्षेत्र चुनकर सूची लाएँ।'
        : 'These are demo prices, not a live mandi quote. Choose a crop and region, then fetch the list.'}
    >
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="market-region" label={hi ? 'क्षेत्र' : 'Region'} error={error || undefined}>
            <TextInput id="market-region" value={region} invalid={Boolean(error)} onChange={(event) => { regionRef.current = event.target.value; setRegion(event.target.value); }} />
          </Field>
          <Field id="market-crops" label={hi ? 'फसलें' : 'Crops'} hint={hi ? 'खाली छोड़ें तो सारी डेमो फसलें' : 'Leave empty for every demo crop'}>
            <TextInput id="market-crops" value={cropFilters} aria-describedby="market-crops-hint" placeholder={hi ? 'गेहूँ, चावल' : 'wheat, rice'} onChange={(event) => { cropRef.current = event.target.value; setCropFilters(event.target.value); }} />
          </Field>
        </div>
        <div className="mt-4">
          <PrimaryButton onClick={() => { void execute(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hi ? 'डेमो भाव लाएँ' : 'Fetch demo prices'}
          </PrimaryButton>
        </div>
      </Panel>

      {summary && prices.length === 0 && !loading && (
        <EmptyState icon={<TrendingUp className="h-8 w-8" />} title={hi ? 'कोई पंक्ति नहीं मिली' : 'No matching rows'} body={summary} />
      )}

      {prices.length > 0 && (
        <div className="space-y-3">
          <DemoBadge language={language} />
          <div className="grid gap-3 md:grid-cols-2">
            {prices.map((price) => (
              <Panel key={`${price.cropName}-${price.region}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{price.cropName}</h2>
                    <p className="text-sm text-slate-500">₹{price.currentPrice} / {hi ? 'क्विंटल' : 'quintal'} · {price.region}</p>
                    <p className="text-xs text-slate-400">{price.date} · {hi ? 'डेमो' : 'Demo'}</p>
                  </div>
                  {price.trend === 'up' ? <ArrowUp className="h-5 w-5 text-agri-700" /> : price.trend === 'down' ? <ArrowDown className="h-5 w-5 text-red-600" /> : <Minus className="h-5 w-5 text-slate-400" />}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900"><p className="text-xs text-slate-500">{hi ? 'न्यूनतम' : 'Min'}</p><p className="font-semibold">₹{price.minPrice}</p></div>
                  <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900"><p className="text-xs text-slate-500">{hi ? 'अधिकतम' : 'Max'}</p><p className="font-semibold">₹{price.maxPrice}</p></div>
                </div>
              </Panel>
            ))}
          </div>
        </div>
      )}
    </PageFrame>
  );
};

export default MarketPrices;
