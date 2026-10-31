import React, { useRef, useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, ImagePlus, Leaf, Loader2, Trash2 } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import { Callout, EmptyState, PageFrame, Panel, PrimaryButton, SecondaryButton } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { rememberSummary } from '../lib/farm/store';
import { presentDisease } from '../lib/tools/disease';
import type { DiseaseAnalysis, Language } from '../types';

interface DiseaseDetectionProps {
  language: Language;
  onAnalyze?: (image: string) => Promise<DiseaseAnalysis | null>;
}

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function spokenDiagnosis(analysis: DiseaseAnalysis, reportedConfidence: number | undefined, language: Language): string {
  const lead = language === 'hi-IN'
    ? `यह AI सुझाव है, पक्का निदान नहीं। ${analysis.disease}, गंभीरता ${analysis.severity}.`
    : `This is an AI suggestion, not a confirmed diagnosis. ${analysis.disease}, severity ${analysis.severity}.`;
  const score = typeof reportedConfidence === 'number'
    ? (language === 'hi-IN' ? ` मॉडल का विश्वास ${Math.round(reportedConfidence * 100)} प्रतिशत।` : ` Model confidence ${Math.round(reportedConfidence * 100)} percent.`)
    : '';
  const remedy = analysis.organicRemedies[0] ? ` ${analysis.organicRemedies[0]}` : '';
  const prevention = analysis.preventionTips[0] ? ` ${analysis.preventionTips[0]}` : '';
  return `${lead}${score}${remedy}${prevention}`.trim();
}

const DiseaseDetection: React.FC<DiseaseDetectionProps> = ({ language, onAnalyze }) => {
  const hi = language === 'hi-IN';
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<DiseaseAnalysis | null>(null);
  const [reportedConfidence, setReportedConfidence] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const imageRef = useRef<string | null>(null);
  const running = useRef(false);
  const summaryRef = useRef<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const storeImage = (dataUrl: string) => {
    imageRef.current = dataUrl;
    setSelectedImage(dataUrl);
    setAnalysis(null);
    setReportedConfidence(undefined);
    summaryRef.current = null;
    setError(null);
  };

  const clearImage = () => {
    imageRef.current = null;
    setSelectedImage(null);
    setAnalysis(null);
    setReportedConfidence(undefined);
    summaryRef.current = null;
    setError(null);
  };

  const takeFile = async (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError(hi ? 'कृपया एक तस्वीर चुनें।' : 'Please choose an image file.');
      return;
    }
    try {
      storeImage(await readImage(file));
    } catch {
      setError(hi ? 'तस्वीर पढ़ी नहीं जा सकी।' : 'That image could not be read.');
    }
  };

  const execute = async (): Promise<{ ok: boolean; summary: string }> => {
    const image = imageRef.current;
    if (!image) {
      const summary = hi ? 'पहले पत्ती की तस्वीर जोड़ें। विश्लेषण शुरू नहीं हुआ।' : 'Add a leaf photo first. I have not started the analysis.';
      setError(summary);
      return { ok: false, summary };
    }
    if (!onAnalyze) {
      const summary = hi ? 'विश्लेषण सेवा उपलब्ध नहीं है।' : 'The analysis service is not available.';
      setError(summary);
      return { ok: false, summary };
    }
    if (running.current) {
      const summary = hi ? 'विश्लेषण पहले से चल रहा है।' : 'Analysis is already running.';
      return { ok: false, summary };
    }
    running.current = true;
    setLoading(true);
    setError(null);
    try {
      const raw = await onAnalyze(image);
      if (!raw) {
        const summary = hi
          ? 'विश्लेषण ने कोई निदान नहीं दिया। मैंने कोई रोग नहीं गढ़ा।'
          : 'The analysis did not return a diagnosis. I did not invent one.';
        setError(summary);
        return { ok: false, summary };
      }
      const view = presentDisease({ ...raw, confidence: raw.confidence });
      setReportedConfidence(raw.confidence);
      setAnalysis(view);
      const summary = spokenDiagnosis(view, raw.confidence, language);
      summaryRef.current = summary;
      rememberSummary(summary);
      return { ok: true, summary };
    } catch {
      const summary = hi ? 'विश्लेषण पूरा नहीं हो सका। फिर कोशिश करें।' : 'The analysis did not finish. Please try again.';
      setError(summary);
      return { ok: false, summary };
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  usePageAssistant({
    view: 'disease',
    language,
    explain: () => explainView('disease', language),
    read: () => summaryRef.current,
    apply: () => undefined,
    missing: () => (imageRef.current ? [] : [hi ? 'पत्ती की तस्वीर' : 'a leaf photo']),
    run: execute,
  });

  return (
    <PageFrame
      icon={<Leaf className="h-5 w-5" />}
      title={hi ? 'रोग पहचान' : 'Disease Detection'}
      description={hi
        ? 'पत्ती की तस्वीर अपलोड या कैप्चर करें। नतीजा AI सुझाव है, प्रयोगशाला निदान नहीं।'
        : 'Upload or capture a leaf photo. The result is an AI suggestion, not a laboratory diagnosis.'}
    >
      <Panel
        className={`border-dashed ${dragOver ? 'border-agri-600 bg-agri-50/60 dark:bg-agri-950/20' : ''}`}
      >
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragOver(false);
            void takeFile(event.dataTransfer.files?.[0]);
          }}
          className="flex flex-col items-center px-2 py-6 text-center"
        >
          <ImagePlus className="mb-3 h-8 w-8 text-agri-700" />
          <p className="font-medium text-slate-800 dark:text-slate-100">{hi ? 'तस्वीर यहाँ छोड़ें' : 'Drop a leaf photo here'}</p>
          <p className="mt-1 text-sm text-slate-500">{hi ? 'या फ़ाइल चुनें / कैमरा खोलें' : 'Or choose a file, or open the camera'}</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <SecondaryButton onClick={() => fileRef.current?.click()}>{hi ? 'फ़ाइल चुनें' : 'Choose file'}</SecondaryButton>
            <SecondaryButton onClick={() => cameraRef.current?.click()}>
              <Camera className="h-4 w-4" />
              {hi ? 'कैमरा' : 'Camera'}
            </SecondaryButton>
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="sr-only" onChange={(event) => { void takeFile(event.target.files?.[0]); event.target.value = ''; }} />
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => { void takeFile(event.target.files?.[0]); event.target.value = ''; }} />
        </div>
      </Panel>

      {selectedImage && (
        <div className="grid gap-4 md:grid-cols-[16rem_1fr]">
          <Panel className="p-3">
            <img src={selectedImage} alt={hi ? 'पत्ती की झलक' : 'Leaf preview'} className="h-56 w-full rounded-xl object-cover" />
            <div className="mt-3 flex gap-2">
              <SecondaryButton className="flex-1" onClick={() => fileRef.current?.click()}>{hi ? 'बदलें' : 'Replace'}</SecondaryButton>
              <SecondaryButton className="px-3" onClick={clearImage} aria-label={hi ? 'तस्वीर हटाएँ' : 'Remove image'}>
                <Trash2 className="h-4 w-4" />
              </SecondaryButton>
            </div>
          </Panel>
          <Panel className="flex flex-col justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{hi ? 'विश्लेषण' : 'Analysis'}</h2>
              <p className="mt-1 text-sm text-slate-500">{hi ? 'तस्वीर तैयार है। विश्लेषण असली सेवा के जवाब का इंतज़ार करता है।' : 'The photo is ready. Analysis waits for the real service response.'}</p>
            </div>
            <PrimaryButton onClick={() => { void execute(); }} disabled={loading} aria-busy={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {loading ? (hi ? 'विश्लेषण हो रहा है' : 'Analyzing') : (hi ? 'तस्वीर का विश्लेषण करें' : 'Analyze image')}
            </PrimaryButton>
          </Panel>
        </div>
      )}

      {!selectedImage && !analysis && (
        <EmptyState
          icon={<Leaf className="h-8 w-8" />}
          title={hi ? 'अभी कोई तस्वीर नहीं' : 'No photo yet'}
          body={hi ? 'सहायक से कहें “इस पत्ती का विश्लेषण करो” — बिना तस्वीर के वह रुकेगा।' : 'You can also say “analyze this leaf.” The assistant will stop if no photo is attached.'}
        />
      )}

      {error && <Callout tone="danger">{error}</Callout>}

      {analysis && (
        <div className="space-y-4">
          <Callout tone="warning">
            {hi
              ? 'यह AI द्वारा बनाया सुझाव है। छिड़काव से पहले नज़दीकी कृषि विज्ञान केंद्र से जाँच करें।'
              : 'This is an AI-generated suggestion. Check with your nearest Krishi Vigyan Kendra before spraying.'}
          </Callout>
          <Panel>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{hi ? 'संभावित रोग' : 'Possible disease'}</p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">{analysis.disease}</h2>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                analysis.severity === 'high' ? 'bg-red-100 text-red-800' : analysis.severity === 'medium' ? 'bg-amber-100 text-amber-900' : 'bg-agri-100 text-agri-900'
              }`}>
                {analysis.severity === 'high' ? <AlertCircle className="mr-1 inline h-3.5 w-3.5" /> : <CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />}
                {analysis.severity}
              </span>
            </div>
            {typeof reportedConfidence === 'number' && (
              <p className="mt-2 text-sm text-slate-500">{hi ? 'मॉडल का विश्वास' : 'Model confidence'}: {Math.round(reportedConfidence * 100)}%</p>
            )}
          </Panel>
          <div className="grid gap-3 md:grid-cols-2">
            <ResultList title={hi ? 'लक्षण' : 'Symptoms'} items={analysis.symptoms} />
            <ResultList title={hi ? 'जैविक उपचार' : 'Organic remedies'} items={analysis.organicRemedies} />
            <ResultList title={hi ? 'रासायनिक उपचार' : 'Chemical remedies'} items={analysis.chemicalRemedies} />
            <ResultList title={hi ? 'रोकथाम' : 'Prevention'} items={analysis.preventionTips} />
          </div>
          {(analysis.kvkLine || analysis.dosageNote) && (
            <Callout tone="warning">
              {analysis.kvkLine && <p className="font-medium">{analysis.kvkLine}</p>}
              {analysis.dosageNote && <p className="mt-1">{analysis.dosageNote}</p>}
              {analysis.precautions && (
                <ul className="mt-2 list-disc pl-4">
                  {analysis.precautions.map((item) => <li key={item}>{item}</li>)}
                </ul>
              )}
              <p className="mt-2 text-xs opacity-70">{hi ? 'स्रोत: मॉडल' : 'Source: model'}</p>
            </Callout>
          )}
        </div>
      )}
    </PageFrame>
  );
};

function ResultList({ title, items }: { title: string; items: string[] }) {
  return (
    <Panel>
      <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">—</p>
      ) : (
        <ul className="mt-2 space-y-1.5 text-sm text-slate-700 dark:text-slate-200">
          {items.map((item) => <li key={item} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-agri-700" />{item}</li>)}
        </ul>
      )}
    </Panel>
  );
}

export default DiseaseDetection;
