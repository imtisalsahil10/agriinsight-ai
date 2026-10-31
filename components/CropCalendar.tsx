import React, { useRef, useState } from 'react';
import { Calendar, Loader2 } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import { Field, PageFrame, Panel, PrimaryButton, Stat, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { textMissing } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import type { CropCalendarEntry, Language } from '../types';

function buildCalendar(cropType: string): CropCalendarEntry {
  const primary = cropType.split(',').map((item) => item.trim()).filter(Boolean)[0]?.toLowerCase() || 'custom crop';
  if (primary === 'wheat') {
    return {
      cropType: 'Wheat',
      season: 'Rabi (Winter)',
      plantingDate: 'October 15 - November 30',
      harvestDate: 'March 15 - April 30',
      tasks: [
        { date: 'Oct 15', task: 'Field preparation', priority: 'high' },
        { date: 'Nov 1', task: 'Sowing', priority: 'high' },
        { date: 'Nov 15', task: 'First irrigation', priority: 'high' },
        { date: 'Dec 15', task: 'Weeding', priority: 'medium' },
        { date: 'Jan 15', task: 'Second irrigation', priority: 'high' },
        { date: 'Feb 15', task: 'Fertilizer application', priority: 'medium' },
        { date: 'Mar 15', task: 'Final irrigation', priority: 'high' },
        { date: 'Apr 1', task: 'Harvest', priority: 'high' },
      ],
    };
  }
  if (primary === 'rice') {
    return {
      cropType: 'Rice',
      season: 'Kharif (Monsoon)',
      plantingDate: 'June 1 - July 31',
      harvestDate: 'October 15 - November 30',
      tasks: [
        { date: 'May 1', task: 'Nursery preparation', priority: 'high' },
        { date: 'Jun 1', task: 'Transplanting', priority: 'high' },
        { date: 'Jul 15', task: 'Weeding', priority: 'medium' },
        { date: 'Aug 1', task: 'Drain for weeding', priority: 'medium' },
        { date: 'Sep 15', task: 'Drain for ripening', priority: 'medium' },
        { date: 'Oct 15', task: 'Harvesting starts', priority: 'high' },
      ],
    };
  }
  return {
    cropType: primary,
    season: 'Custom season',
    plantingDate: 'Based on local conditions',
    harvestDate: 'Based on maturity',
    tasks: [
      { date: 'Week 1', task: 'Field preparation', priority: 'high' },
      { date: 'Week 2', task: 'Sowing/transplanting', priority: 'high' },
      { date: 'Week 4', task: 'First irrigation', priority: 'high' },
      { date: 'Week 6', task: 'Nutrient application', priority: 'medium' },
      { date: 'Week 10', task: 'Pest scouting', priority: 'medium' },
      { date: 'Week 14', task: 'Harvest readiness checks', priority: 'high' },
    ],
  };
}

const CropCalendar: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [cropType, setCropType] = useState('wheat');
  const [calendar, setCalendar] = useState<CropCalendarEntry | null>(null);
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
    if (running.current) return { ok: false, summary: hi ? 'कैलेंडर बन रहा है।' : 'The calendar is already being built.' };
    running.current = true;
    setLoading(true);
    setError('');
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      const entry = buildCalendar(cropRef.current);
      setCalendar(entry);
      const summary = `${entry.cropType}, ${entry.season}. Planting ${entry.plantingDate}. Harvest ${entry.harvestDate}.`;
      summaryRef.current = summary;
      rememberSummary(summary);
      return { ok: true, summary };
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  usePageAssistant({
    view: 'calendar',
    language,
    explain: () => explainView('calendar', language),
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
      icon={<Calendar className="h-5 w-5" />}
      title={hi ? 'फसल कैलेंडर' : 'Crop Calendar'}
      description={hi ? 'गेहूँ और धान के मौसमी काम, या किसी और फसल की सामान्य रूपरेखा।' : 'Seasonal tasks for wheat and rice, or a general outline for another crop.'}
    >
      <Panel>
        <Field id="cal-crop" label={hi ? 'फसल' : 'Crop'} error={error || undefined}>
          <TextInput id="cal-crop" value={cropType} invalid={Boolean(error)} onChange={(event) => { cropRef.current = event.target.value; setCropType(event.target.value); }} placeholder={hi ? 'गेहूँ, धान' : 'wheat, rice'} />
        </Field>
        <div className="mt-4">
          <PrimaryButton onClick={() => { void execute(); }} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {hi ? 'कैलेंडर बनाएँ' : 'Generate calendar'}
          </PrimaryButton>
        </div>
      </Panel>
      {calendar && (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Stat label={hi ? 'मौसम' : 'Season'} value={calendar.season} detail={calendar.plantingDate} />
            <Stat label={hi ? 'कटाई' : 'Harvest'} value={calendar.harvestDate} detail={calendar.cropType} />
          </div>
          <Panel>
            <h2 className="text-sm font-semibold">{hi ? 'काम' : 'Tasks'}</h2>
            <ol className="mt-2 divide-y divide-slate-100 dark:divide-slate-700">
              {calendar.tasks.map((task) => (
                <li key={`${task.date}-${task.task}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span><span className="font-medium">{task.task}</span><span className="ml-2 text-slate-500">{task.date}</span></span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${task.priority === 'high' ? 'bg-red-50 text-red-800' : 'bg-amber-50 text-amber-900'}`}>{task.priority}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      )}
    </PageFrame>
  );
};

export default CropCalendar;
