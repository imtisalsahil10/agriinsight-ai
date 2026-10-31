import React, { useRef, useState } from 'react';
import { Droplets, Loader2 } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import DemoBadge from './voice/DemoBadge';
import { Field, PageFrame, Panel, PrimaryButton, Stat } from './ui/ui';
import { TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { textMissing } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import { generateIrrigationSchedule } from '../lib/tools/irrigation';
import type { IrrigationSchedule, Language } from '../types';

const IrrigationScheduleView: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [cropType, setCropType] = useState('wheat');
  const [schedule, setSchedule] = useState<IrrigationSchedule | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const cropRef = useRef(cropType);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  cropRef.current = cropType;

  const execute = async () => {
    if (!cropRef.current.trim()) {
      const message = hi ? 'फसल का नाम चाहिए।' : 'A crop name is required.';
      setError(message);
      return { ok: false, summary: message };
    }
    if (running.current) return { ok: false, summary: hi ? 'गणना पहले से चल रही है।' : 'That calculation is already running.' };
    running.current = true;
    setLoading(true);
    setError('');
    try {
      const result = generateIrrigationSchedule(cropRef.current);
      if (!result.ok || !result.data) return { ok: false, summary: result.summary };
      setSchedule(result.data);
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
    view: 'irrigation',
    language,
    explain: () => explainView('irrigation', language),
    read: () => summaryRef.current,
    apply: (patch) => {
      if (!patch.crop) return;
      cropRef.current = patch.crop;
      setCropType(patch.crop);
      setError('');
    },
    missing: () => textMissing(cropRef.current, hi ? 'फसल का नाम' : 'a crop name'),
    run: execute,
  });

  return (
    <PageFrame
      icon={<Droplets className="h-5 w-5" />}
      title={hi ? 'सिंचाई अनुसूची' : 'Irrigation'}
      description={hi
        ? 'फसल का नाम दें। यह डेमो फॉर्मूला है, मिट्टी की नमी का माप नहीं।'
        : 'Name the crop. This is a demo formula, not a soil-moisture reading.'}
    >
      <Panel>
        <Field id="irrigation-crop" label={hi ? 'फसल' : 'Crop'} hint={hi ? 'एक से ज़्यादा हों तो कॉमा से अलग करें' : 'Separate multiple crops with commas'} error={error || undefined}>
          <TextInput id="irrigation-crop" value={cropType} aria-describedby="irrigation-crop-hint" invalid={Boolean(error)} onChange={(event) => { cropRef.current = event.target.value; setCropType(event.target.value); }} placeholder={hi ? 'गेहूँ, चावल' : 'wheat, rice'} />
        </Field>
        <div className="mt-4">
          <PrimaryButton onClick={() => { void execute(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hi ? 'सिंचाई की गणना करें' : 'Calculate irrigation'}
          </PrimaryButton>
        </div>
      </Panel>
      {schedule && summary && (
        <div className="space-y-4">
          <DemoBadge language={language} />
          <div className="grid gap-3 md:grid-cols-3">
            <Stat label={hi ? 'अगली सिंचाई' : 'Next irrigation'} value={schedule.nextIrrigationDate} />
            <Stat label={hi ? 'पानी' : 'Water'} value={schedule.waterAmount} />
            <Stat label={hi ? 'आवृत्ति' : 'Frequency'} value={schedule.frequency} />
          </div>
          <Panel>
            <h2 className="text-sm font-semibold">{hi ? 'पानी बचाने के सुझाव' : 'Water-saving tips'}</h2>
            <ul className="mt-2 space-y-2 text-sm text-slate-700 dark:text-slate-200">
              {schedule.savingTips.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </Panel>
        </div>
      )}
    </PageFrame>
  );
};

export default IrrigationScheduleView;
