import React, { useRef, useState } from 'react';
import { Loader2, Zap } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import DemoBadge from './voice/DemoBadge';
import { Callout, Field, PageFrame, Panel, PrimaryButton, Stat, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { applyYield, yieldMissing, type YieldFields } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import { predictYield } from '../lib/tools/yield';
import type { Language, YieldPrediction } from '../types';

const INITIAL: YieldFields = { cropType: 'wheat', area: 5, rainfallDays: 25, temperature: 22 };

const YieldPredictionComp: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [inputs, setInputs] = useState<YieldFields>(INITIAL);
  const [errors, setErrors] = useState<string[]>([]);
  const [prediction, setPrediction] = useState<YieldPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const inputsRef = useRef(inputs);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  inputsRef.current = inputs;

  const show = (value: number) => (Number.isFinite(value) ? value : '');

  const execute = async () => {
    const missing = yieldMissing(inputsRef.current);
    setErrors(missing);
    if (missing.length) return { ok: false, summary: hi ? `पहले ${missing.join(', ')} चाहिए।` : `I still need ${missing.join(', ')}.` };
    if (running.current) return { ok: false, summary: hi ? 'अनुमान पहले से चल रहा है।' : 'Prediction is already running.' };
    running.current = true;
    setLoading(true);
    try {
      const result = predictYield(inputsRef.current);
      if (!result.ok || !result.data) return { ok: false, summary: result.summary };
      setPrediction(result.data);
      summaryRef.current = result.summary;
      rememberSummary(result.summary);
      return { ok: true, summary: result.summary };
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  usePageAssistant({
    view: 'yield',
    language,
    explain: () => explainView('yield', language),
    read: () => summaryRef.current,
    apply: (patch) => {
      const next = applyYield(inputsRef.current, patch);
      inputsRef.current = next;
      setInputs(next);
      setErrors([]);
    },
    missing: () => yieldMissing(inputsRef.current),
    run: execute,
  });

  return (
    <PageFrame
      icon={<Zap className="h-5 w-5" />}
      title={hi ? 'पैदावार अनुमान' : 'Yield Prediction'}
      description={hi
        ? 'फसल, क्षेत्रफल, वर्षा के दिन और तापमान से डेमो अनुमान। यह मापी हुई कटाई नहीं है।'
        : 'A demo estimate from crop, area, rainfall days, and temperature. It is not a measured harvest.'}
    >
      <Panel>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="yield-crop" label={hi ? 'फसल' : 'Crop'} error={errors.includes('a crop') ? errors[0] : undefined}>
            <TextInput id="yield-crop" value={inputs.cropType} invalid={errors.includes('a crop')} onChange={(event) => { const next = { ...inputsRef.current, cropType: event.target.value }; inputsRef.current = next; setInputs(next); }} />
          </Field>
          <Field id="yield-area" label={hi ? 'क्षेत्रफल (हेक्टेयर)' : 'Area (hectares)'}>
            <TextInput id="yield-area" type="number" min="0" step="0.1" inputMode="decimal" value={show(inputs.area)} invalid={errors.some((item) => item.startsWith('area'))} onChange={(event) => { const next = { ...inputsRef.current, area: event.target.value === '' ? Number.NaN : Number(event.target.value) }; inputsRef.current = next; setInputs(next); }} />
          </Field>
          <Field id="yield-rain" label={hi ? 'वर्षा के दिन (0–30)' : 'Rainfall days (0–30)'}>
            <TextInput id="yield-rain" type="number" min="0" max="30" inputMode="numeric" value={show(inputs.rainfallDays)} invalid={errors.some((item) => item.startsWith('rainfall'))} onChange={(event) => { const next = { ...inputsRef.current, rainfallDays: event.target.value === '' ? Number.NaN : Number(event.target.value) }; inputsRef.current = next; setInputs(next); }} />
          </Field>
          <Field id="yield-temp" label={hi ? 'औसत तापमान (°C)' : 'Average temperature (°C)'}>
            <TextInput id="yield-temp" type="number" inputMode="decimal" value={show(inputs.temperature)} invalid={errors.includes('temperature')} onChange={(event) => { const next = { ...inputsRef.current, temperature: event.target.value === '' ? Number.NaN : Number(event.target.value) }; inputsRef.current = next; setInputs(next); }} />
          </Field>
        </div>
        {errors.length > 0 && <div className="mt-3"><Callout tone="danger">{errors.join(', ')}</Callout></div>}
        <div className="mt-4">
          <PrimaryButton onClick={() => { void execute(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hi ? 'पैदावार का अनुमान' : 'Predict yield'}
          </PrimaryButton>
        </div>
      </Panel>
      {prediction && (
        <div className="space-y-4">
          <DemoBadge language={language} />
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label={hi ? 'अपेक्षित पैदावार' : 'Expected yield'} value={prediction.expectedYield} detail={prediction.unit} />
            <Stat label={hi ? 'श्रेणी' : 'Grade'} value={prediction.qualityGrade} />
            <Stat label={hi ? 'फॉर्मूला विश्वास' : 'Formula confidence'} value={`${prediction.confidence}%`} detail={hi ? 'डेमो फॉर्मूला' : 'Demo formula'} />
          </div>
          <Panel>
            <h2 className="text-sm font-semibold">{hi ? 'कारक' : 'Factors'}</h2>
            <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
              {prediction.factors.map((factor) => (
                <li key={factor.name} className="flex items-center justify-between py-2 text-sm">
                  <span>{factor.name}<span className="ml-2 text-slate-500">{factor.value}</span></span>
                  <span className="text-xs font-medium uppercase text-slate-500">{factor.impact}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      )}
    </PageFrame>
  );
};

export default YieldPredictionComp;
