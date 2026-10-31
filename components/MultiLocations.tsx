import React, { useRef, useState } from 'react';
import { Map, MapPin, Plus } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import { Callout, EmptyState, Field, PageFrame, Panel, PrimaryButton, SecondaryButton, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { textMissing } from '../lib/assistant/validate';
import type { FarmLocation, Language } from '../types';

const MultiLocations: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [locations, setLocations] = useState<FarmLocation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', cropTypes: '', areaSize: 5 });
  const [error, setError] = useState('');
  const formRef = useRef(formData);
  const locationsRef = useRef(locations);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  formRef.current = formData;
  locationsRef.current = locations;

  const execute = async () => {
    const name = formRef.current.name.trim();
    if (!name) {
      const message = hi ? 'स्थान का नाम चाहिए।' : 'A location name is required.';
      setError(message);
      setShowForm(true);
      return { ok: false, summary: message };
    }
    if (running.current) return { ok: false, summary: hi ? 'स्थान जोड़ा जा रहा है।' : 'A location is already being saved.' };
    running.current = true;
    try {
      const area = Number.isFinite(formRef.current.areaSize) ? formRef.current.areaSize : 5;
      const created: FarmLocation = {
        id: Date.now().toString(),
        name,
        latitude: 28.7041 + Math.random() * 0.5,
        longitude: 77.1025 + Math.random() * 0.5,
        cropTypes: formRef.current.cropTypes.split(',').map((crop) => crop.trim()).filter(Boolean),
        areaSize: area,
        createdAt: Date.now(),
      };
      const next = [...locationsRef.current, created];
      locationsRef.current = next;
      setLocations(next);
      setFormData({ name: '', cropTypes: '', areaSize: 5 });
      formRef.current = { name: '', cropTypes: '', areaSize: 5 };
      setShowForm(false);
      setError('');
      const summary = `${created.name} saved on this screen, ${created.areaSize} hectares. The map point is a placeholder, not a GPS reading.`;
      summaryRef.current = summary;
      return { ok: true, summary };
    } finally {
      running.current = false;
    }
  };

  usePageAssistant({
    view: 'locations',
    language,
    explain: () => explainView('locations', language),
    read: () => summaryRef.current ?? (locationsRef.current.length ? locationsRef.current.map((item) => item.name).join(', ') : null),
    apply: (patch) => {
      const next = { ...formRef.current };
      if (patch.locationName) next.name = patch.locationName;
      if (patch.crop) next.cropTypes = patch.crop;
      if (typeof patch.area === 'number') next.areaSize = patch.area;
      formRef.current = next;
      setFormData(next);
      setShowForm(true);
      setError('');
    },
    missing: () => textMissing(formRef.current.name, hi ? 'स्थान का नाम' : 'a location name'),
    run: execute,
  });

  return (
    <PageFrame
      icon={<Map className="h-5 w-5" />}
      title={hi ? 'कई खेत' : 'Multi-farm'}
      description={hi
        ? 'नाम, फसल और क्षेत्रफल इस स्क्रीन पर रखें। नक्शे का बिंदु प्लेसहोल्डर है, GPS नहीं।'
        : 'Keep a name, crops, and area on this screen. The map point is a placeholder, not GPS.'}
    >
      <SecondaryButton onClick={() => setShowForm((open) => !open)}>
        <Plus className="h-4 w-4" />
        {hi ? 'नया स्थान' : 'Add location'}
      </SecondaryButton>
      {showForm && (
        <Panel>
          <div className="space-y-4">
            <Field id="loc-name" label={hi ? 'नाम' : 'Name'} error={error || undefined}>
              <TextInput id="loc-name" value={formData.name} invalid={Boolean(error)} placeholder={hi ? 'उत्तरी खेत' : 'North field'} onChange={(event) => { const next = { ...formRef.current, name: event.target.value }; formRef.current = next; setFormData(next); }} />
            </Field>
            <Field id="loc-crops" label={hi ? 'फसलें' : 'Crops'} hint={hi ? 'कॉमा से अलग करें' : 'Separate with commas'}>
              <TextInput id="loc-crops" value={formData.cropTypes} aria-describedby="loc-crops-hint" onChange={(event) => { const next = { ...formRef.current, cropTypes: event.target.value }; formRef.current = next; setFormData(next); }} />
            </Field>
            <Field id="loc-area" label={hi ? 'क्षेत्रफल (हेक्टेयर)' : 'Area (hectares)'}>
              <TextInput id="loc-area" type="number" min="0" step="0.1" value={Number.isFinite(formData.areaSize) ? formData.areaSize : ''} onChange={(event) => { const next = { ...formRef.current, areaSize: event.target.value === '' ? Number.NaN : Number(event.target.value) }; formRef.current = next; setFormData(next); }} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton className="flex-1" onClick={() => { void execute(); }}>{hi ? 'सहेजें' : 'Save'}</PrimaryButton>
              <SecondaryButton onClick={() => setShowForm(false)}>{hi ? 'रद्द' : 'Cancel'}</SecondaryButton>
            </div>
          </div>
        </Panel>
      )}
      {locations.length === 0 && !showForm && (
        <EmptyState icon={<MapPin className="h-8 w-8" />} title={hi ? 'अभी कोई खेत नहीं' : 'No fields yet'} body={hi ? 'नाम बोलें, फिर जोड़ो कहें।' : 'Say a name, then say add the location.'} />
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {locations.map((loc) => (
          <Panel key={loc.id}>
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-agri-700" />{loc.name}</h2>
            <p className="mt-1 text-sm text-slate-500">{loc.areaSize} {hi ? 'हेक्टेयर' : 'hectares'}</p>
            <p className="mt-1 text-xs text-slate-400">{loc.latitude.toFixed(2)}, {loc.longitude.toFixed(2)} · {hi ? 'प्लेसहोल्डर' : 'Placeholder'}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {loc.cropTypes.map((crop) => <span key={crop} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs dark:bg-slate-700">{crop}</span>)}
            </div>
          </Panel>
        ))}
      </div>
      <Callout tone="info">{hi ? 'अक्षांश-देशांतर इस डिवाइस पर अनुमानित बिंदु हैं।' : 'Coordinates are an approximate point stored only in this browser session.'}</Callout>
    </PageFrame>
  );
};

export default MultiLocations;
