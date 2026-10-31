import React, { useRef, useState } from 'react';
import { Loader2, Sprout } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import DemoBadge from './voice/DemoBadge';
import { Callout, Field, PageFrame, Panel, PrimaryButton, Stat, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import type { FieldPatch } from '../lib/assistant/types';
import { applySoil, soilMissing, type SoilFields } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import { analyzeSoil } from '../lib/tools/soil';
import type { Language, SoilData } from '../types';

const INITIAL: SoilFields = { pH: 7, nitrogen: 50, phosphorus: 40, potassium: 300, organicMatter: 2 };

const SoilAnalysis: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [inputs, setInputs] = useState<SoilFields>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [soilData, setSoilData] = useState<SoilData | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef(inputs);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  inputsRef.current = inputs;

  const show = (value: number) => (Number.isFinite(value) ? value : '');

  const execute = async (): Promise<{ ok: boolean; summary: string }> => {
    const missing = soilMissing(inputsRef.current);
    setErrors(missing);
    if (missing.length) {
      return { ok: false, summary: hi ? `पहले ${missing.join(', ')} चाहिए।` : `I still need ${missing.join(', ')}.` };
    }
    if (running.current) return { ok: false, summary: hi ? 'विश्लेषण पहले से चल रहा है।' : 'Analysis is already running.' };
    running.current = true;
    setLoading(true);
    try {
      const result = analyzeSoil(inputsRef.current);
      if (!result.ok || !result.data) return { ok: false, summary: result.summary };
      setSoilData(result.data);
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
    view: 'soil',
    language,
    explain: () => explainView('soil', language),
    read: () => summaryRef.current,
    apply: (patch: FieldPatch) => {
      const next = applySoil(inputsRef.current, patch);
      inputsRef.current = next;
      setInputs(next);
      setErrors([]);
    },
    missing: () => soilMissing(inputsRef.current),
    run: execute,
  });

  const setNumber = (key: keyof SoilFields, raw: string) => {
    const next = { ...inputsRef.current, [key]: raw === '' ? Number.NaN : Number(raw) };
    inputsRef.current = next;
    setInputs(next);
  };

  return (
    <PageFrame
      icon={<Sprout className="h-5 w-5" />}
      title={hi ? 'मिट्टी विश्लेषण' : 'Soil Analysis'}
      description={hi
        ? 'pH, N, P, K और जैविक पदार्थ भरें। फसल सुझाव इसी डेमो गणना से आते हैं।'
        : 'Enter pH, nitrogen, phosphorus, potassium, and organic matter. Crop ideas come from this demo calculation.'}
    >
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="soil-ph" label={hi ? 'pH (0–14)' : 'pH (0–14)'} hint={hi ? '7 तटस्थ है' : '7 is neutral'} error={errors.find((item) => item.startsWith('pH'))}>
            <TextInput id="soil-ph" type="number" step="0.1" min="0" max="14" inputMode="decimal" value={show(inputs.pH)} aria-describedby="soil-ph-hint" invalid={errors.some((item) => item.startsWith('pH'))} onChange={(event) => setNumber('pH', event.target.value)} />
          </Field>
          <Field id="soil-n" label={hi ? 'नाइट्रोजन (ppm)' : 'Nitrogen (ppm)'}>
            <TextInput id="soil-n" type="number" min="0" inputMode="decimal" value={show(inputs.nitrogen)} invalid={errors.includes('nitrogen')} onChange={(event) => setNumber('nitrogen', event.target.value)} />
          </Field>
          <Field id="soil-p" label={hi ? 'फॉस्फोरस (ppm)' : 'Phosphorus (ppm)'}>
            <TextInput id="soil-p" type="number" min="0" inputMode="decimal" value={show(inputs.phosphorus)} invalid={errors.includes('phosphorus')} onChange={(event) => setNumber('phosphorus', event.target.value)} />
          </Field>
          <Field id="soil-k" label={hi ? 'पोटेशियम (ppm)' : 'Potassium (ppm)'}>
            <TextInput id="soil-k" type="number" min="0" inputMode="decimal" value={show(inputs.potassium)} invalid={errors.includes('potassium')} onChange={(event) => setNumber('potassium', event.target.value)} />
          </Field>
          <Field id="soil-om" label={hi ? 'जैविक पदार्थ (%)' : 'Organic matter (%)'} error={errors.includes('organic matter') ? (hi ? 'जैविक पदार्थ जाँचें' : 'Check organic matter') : undefined}>
            <TextInput id="soil-om" type="number" step="0.1" min="0" inputMode="decimal" value={show(inputs.organicMatter)} invalid={errors.includes('organic matter')} onChange={(event) => setNumber('organicMatter', event.target.value)} />
          </Field>
        </div>
        {errors.length > 0 && <div className="mt-3"><Callout tone="danger">{hi ? 'ये मान जाँचें: ' : 'Check these values: '}{errors.join(', ')}</Callout></div>}
        <div className="mt-4">
          <PrimaryButton onClick={() => { void execute(); }} disabled={loading} aria-busy={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hi ? 'मिट्टी का विश्लेषण करें' : 'Analyze soil'}
          </PrimaryButton>
        </div>
      </Panel>

      {soilData && summary && (
        <div className="space-y-4">
          <div className="flex items-center gap-2"><DemoBadge language={language} /><span className="text-sm text-slate-500">{summary}</span></div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Stat label="pH" value={soilData.pH} />
            <Stat label={hi ? 'नाइट्रोजन' : 'Nitrogen'} value={soilData.nitrogen} detail="ppm" />
            <Stat label={hi ? 'फॉस्फोरस' : 'Phosphorus'} value={soilData.phosphorus} detail="ppm" />
          </div>
          <Panel>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{hi ? 'अनुशंसित फसलें' : 'Suitable crops'}</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {soilData.cropSuitability.map((crop) => (
                <span key={crop} className="rounded-full bg-agri-50 px-2.5 py-1 text-sm text-agri-900 dark:bg-agri-900/40 dark:text-agri-100">{crop}</span>
              ))}
            </div>
            <h2 className="mt-4 text-sm font-semibold text-slate-900 dark:text-white">{hi ? 'सुझाव' : 'Recommendations'}</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
              {soilData.recommendations.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Panel>
        </div>
      )}
    </PageFrame>
  );
};

export default SoilAnalysis;
