import React, { useRef, useState } from 'react';
import { Beaker, Loader2 } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import { Callout, Field, PageFrame, Panel, PrimaryButton, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { textMissing } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import type { FertilizerGuide, Language } from '../types';

const GUIDES: Record<string, FertilizerGuide[]> = {
  wheat: [
    {
      name: 'NPK 10:26:26',
      type: 'chemical',
      cropSuitable: ['Wheat', 'Rice', 'Corn'],
      dosage: '100-150 kg/hectare',
      applicationTime: 'At planting',
      safetyPrecautions: ['Wear gloves', 'Avoid dust inhalation', 'Store in a dry place'],
      cost: '₹5000-6000/bag',
    },
    {
      name: 'Compost/FYM',
      type: 'organic',
      cropSuitable: ['All crops'],
      dosage: '10-15 tons/hectare',
      applicationTime: 'Before planting',
      safetyPrecautions: ['Use fully decomposed material', 'Keep weed seeds out'],
      cost: '₹2000-3000/load',
    },
    {
      name: 'Urea',
      type: 'chemical',
      cropSuitable: ['Wheat', 'Rice', 'Corn'],
      dosage: '100-120 kg/hectare',
      applicationTime: 'In splits — 50% at planting, 50% at tillering',
      safetyPrecautions: ['Use in adequate moisture', 'Avoid direct contact'],
      cost: '₹3500-4000/bag',
    },
  ],
};

function lookup(crop: string): FertilizerGuide[] {
  const primary = crop.split(',').map((item) => item.trim().toLowerCase()).filter(Boolean)[0] || 'wheat';
  return GUIDES[primary] || GUIDES.wheat;
}

const FertilizerGuideComp: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [cropType, setCropType] = useState('wheat');
  const [concern, setConcern] = useState('');
  const [fertilizers, setFertilizers] = useState<FertilizerGuide[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cropRef = useRef(cropType);
  const concernRef = useRef('');
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  cropRef.current = cropType;

  const execute = async () => {
    if (!cropRef.current.trim()) {
      const message = hi ? 'फसल का नाम चाहिए।' : 'A crop name is required.';
      setError(message);
      return { ok: false, summary: message };
    }
    if (running.current) return { ok: false, summary: hi ? 'खोज पहले से चल रही है।' : 'That search is already running.' };
    running.current = true;
    setLoading(true);
    setError('');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const rows = lookup(cropRef.current);
      setFertilizers(rows);
      const names = rows.map((row) => row.name).join(', ');
      const concernLine = concernRef.current
        ? ` You mentioned ${concernRef.current}. This list is the crop reference, not a soil test.`
        : '';
      const summary = `Reference fertilizer guide for ${cropRef.current}: ${names}.${concernLine}`;
      summaryRef.current = summary;
      rememberSummary(summary);
      return { ok: true, summary };
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  usePageAssistant({
    view: 'fertilizer',
    language,
    explain: () => explainView('fertilizer', language),
    read: () => summaryRef.current,
    apply: (patch) => {
      if (patch.crop) {
        cropRef.current = patch.crop;
        setCropType(patch.crop);
      }
      if (patch.concern) {
        concernRef.current = patch.concern;
        setConcern(patch.concern);
      }
      setError('');
    },
    missing: () => textMissing(cropRef.current, hi ? 'फसल का नाम' : 'a crop name'),
    run: execute,
  });

  return (
    <PageFrame
      icon={<Beaker className="h-5 w-5" />}
      title={hi ? 'खाद गाइड' : 'Fertilizer'}
      description={hi
        ? 'फसल के अनुसार संदर्भ खुराक। यह मिट्टी जाँच नहीं है।'
        : 'Reference doses for a crop. This is not a soil test.'}
    >
      <Panel>
        <Field id="fert-crop" label={hi ? 'फसल' : 'Crop'} error={error || undefined}>
          <TextInput id="fert-crop" value={cropType} invalid={Boolean(error)} onChange={(event) => { cropRef.current = event.target.value; setCropType(event.target.value); }} placeholder={hi ? 'गेहूँ' : 'wheat'} />
        </Field>
        {concern && <div className="mt-3"><Callout tone="info">{hi ? 'आपकी बात: ' : 'You mentioned: '}{concern}</Callout></div>}
        <div className="mt-4">
          <PrimaryButton onClick={() => { void execute(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hi ? 'खाद देखें' : 'Find fertilizers'}
          </PrimaryButton>
        </div>
      </Panel>
      <div className="space-y-3">
        {fertilizers.map((fert) => (
          <Panel key={fert.name}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{fert.name}</h2>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{fert.type}</p>
              </div>
              <p className="text-sm font-medium text-agri-800 dark:text-agri-200">{fert.cost}</p>
            </div>
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-slate-500">{hi ? 'खुराक' : 'Dosage'}</dt><dd className="font-medium">{fert.dosage}</dd></div>
              <div><dt className="text-xs text-slate-500">{hi ? 'समय' : 'When'}</dt><dd className="font-medium">{fert.applicationTime}</dd></div>
            </dl>
            <ul className="mt-3 space-y-1 text-sm text-slate-700 dark:text-slate-200">
              {fert.safetyPrecautions.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </Panel>
        ))}
      </div>
    </PageFrame>
  );
};

export default FertilizerGuideComp;
