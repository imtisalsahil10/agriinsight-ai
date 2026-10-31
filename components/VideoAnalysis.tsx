import React, { useRef, useState } from 'react';
import { AlertCircle, Loader2, RefreshCw, Youtube } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import MarkdownRenderer from './MarkdownRenderer';
import { Field, PageFrame, Panel, PrimaryButton, SecondaryButton, TextInput } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { textMissing } from '../lib/assistant/validate';
import { rememberSummary } from '../lib/farm/store';
import { generateResponse } from '../services/geminiService';
import type { Language } from '../types';

const VideoAnalysis: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [url, setUrl] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef('');
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);
  urlRef.current = url;

  const handleAnalyze = async (videoUrl: string) => {
    const link = videoUrl.trim();
    if (!/^https?:\/\//i.test(link)) {
      const message = hi ? 'http या https लिंक चाहिए। विश्लेषण शुरू नहीं हुआ।' : 'An http or https link is required. Analysis has not started.';
      setError(message);
      return { ok: false, summary: message };
    }
    if (running.current) return { ok: false, summary: hi ? 'वीडियो पहले से चल रहा है।' : 'A video is already being analyzed.' };
    running.current = true;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const response = await generateResponse(
        `Analyze this YouTube video link: ${link}. Summarize the key farming techniques and advice mentioned in it.`,
        [],
        undefined,
        language,
      );
      setResult(response.text);
      summaryRef.current = response.text;
      rememberSummary(response.text);
      return { ok: true, summary: response.text };
    } catch (err) {
      console.error('Video analysis failed:', err);
      const message = hi
        ? 'वीडियो का विश्लेषण नहीं हो सका। लिंक जाँचें और फिर कोशिश करें।'
        : 'The video could not be analyzed. Check the link and try again.';
      setError(message);
      return { ok: false, summary: message };
    } finally {
      running.current = false;
      setIsLoading(false);
    }
  };

  usePageAssistant({
    view: 'video',
    language,
    explain: () => explainView('video', language),
    read: () => summaryRef.current,
    apply: (patch) => {
      if (!patch.url) return;
      urlRef.current = patch.url;
      setUrl(patch.url);
      setError(null);
    },
    missing: () => textMissing(urlRef.current, hi ? 'वीडियो लिंक' : 'a video link'),
    run: () => handleAnalyze(urlRef.current),
  });

  return (
    <PageFrame
      icon={<Youtube className="h-5 w-5" />}
      title={hi ? 'वीडियो विश्लेषण' : 'Video Analysis'}
      description={hi
        ? 'खेती वाले YouTube लिंक का सार। जवाब मॉडल से आता है।'
        : 'Summarize a farming YouTube link. The answer comes from the model.'}
    >
      <Panel>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            void handleAnalyze(url);
          }}
        >
          <Field id="video-url" label={hi ? 'लिंक' : 'Link'} error={error || undefined}>
            <TextInput id="video-url" type="url" required value={url} invalid={Boolean(error)} disabled={isLoading} placeholder="https://www.youtube.com/watch?v=..." onChange={(event) => { urlRef.current = event.target.value; setUrl(event.target.value); }} />
          </Field>
          <PrimaryButton type="submit" disabled={isLoading || !url.trim()}>
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isLoading ? (hi ? 'विश्लेषण हो रहा है' : 'Analyzing') : (hi ? 'वीडियो का विश्लेषण' : 'Analyze video')}
          </PrimaryButton>
        </form>
      </Panel>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-red-700 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      )}
      {result && (
        <Panel>
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">{hi ? 'सार' : 'Summary'}</h2>
            <SecondaryButton onClick={() => { setResult(null); setUrl(''); urlRef.current = ''; summaryRef.current = null; setError(null); }}>
              <RefreshCw className="h-4 w-4" />
              {hi ? 'नया लिंक' : 'New link'}
            </SecondaryButton>
          </div>
          <MarkdownRenderer content={result} />
        </Panel>
      )}
    </PageFrame>
  );
};

export default VideoAnalysis;
