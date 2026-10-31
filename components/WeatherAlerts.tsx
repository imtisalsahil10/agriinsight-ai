import React, { useRef, useState } from 'react';
import { Bug, Cloud, Loader2, Snowflake, Wind } from 'lucide-react';
import { usePageAssistant } from './assistant/context';
import { Callout, EmptyState, PageFrame, Panel, PrimaryButton } from './ui/ui';
import { explainView } from '../lib/assistant/copy';
import { rememberSummary } from '../lib/farm/store';
import { getWeatherAlert } from '../lib/tools/weather';
import type { Language, WeatherAlert } from '../types';

const WeatherAlerts: React.FC<{ language: Language }> = ({ language }) => {
  const hi = language === 'hi-IN';
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const summaryRef = useRef<string | null>(null);
  const running = useRef(false);

  const execute = async () => {
    if (running.current) return { ok: false, summary: hi ? 'चेतावनी पहले से लोड हो रही है।' : 'Alerts are already loading.' };
    if (!navigator.geolocation) {
      const summary = hi ? 'इस ब्राउज़र में स्थान सेवा नहीं है।' : 'This browser cannot share location.';
      setError(summary);
      return { ok: false, summary };
    }
    running.current = true;
    setLoading(true);
    setError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, enableHighAccuracy: false });
      });
      const result = await getWeatherAlert(position.coords.latitude, position.coords.longitude);
      setFetched(true);
      setAlerts(result.data.alerts);
      summaryRef.current = result.summary;
      if (!result.ok) {
        setError(result.summary);
        return { ok: false, summary: result.summary };
      }
      rememberSummary(result.summary);
      return { ok: true, summary: result.summary };
    } catch {
      const summary = hi ? 'स्थान नहीं मिला, इसलिए चेतावनी नहीं आई।' : 'Location was not available, so alerts were not fetched.';
      setError(summary);
      return { ok: false, summary };
    } finally {
      running.current = false;
      setLoading(false);
    }
  };

  usePageAssistant({
    view: 'alerts',
    language,
    explain: () => explainView('alerts', language),
    read: () => summaryRef.current,
    apply: () => undefined,
    missing: () => [],
    run: execute,
  });

  const icon = (type: string) => {
    if (type === 'frost') return <Snowflake className="h-4 w-4" />;
    if (type === 'wind') return <Wind className="h-4 w-4" />;
    if (type === 'pest') return <Bug className="h-4 w-4" />;
    return <Cloud className="h-4 w-4" />;
  };

  return (
    <PageFrame
      icon={<Wind className="h-5 w-5" />}
      title={hi ? 'मौसम चेतावनी' : 'Weather Alerts'}
      description={hi ? 'Open-Meteo से ठंढ, बारिश और तेज़ हवा। स्थान की अनुमति माँगी जाएगी।' : 'Frost, rain, and high wind from Open-Meteo. This asks for your location.'}
    >
      <PrimaryButton onClick={() => { void execute(); }} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {hi ? 'चेतावनी लाएँ' : 'Fetch alerts'}
      </PrimaryButton>
      {error && <Callout tone="danger">{error}</Callout>}
      {fetched && alerts.length === 0 && !loading && !error && (
        <EmptyState icon={<Cloud className="h-8 w-8" />} title={hi ? 'कोई चेतावनी नहीं' : 'No alert in this reading'} body={hi ? 'इस रीडिंग में ठंढ, भारी बारिश या तेज़ हवा नहीं है। स्रोत: Open-Meteo।' : 'No frost, heavy rain, or high wind in this reading. Source: Open-Meteo.'} />
      )}
      <div className="space-y-3">
        {alerts.map((alert) => (
          <Panel key={`${alert.type}-${alert.date}-${alert.message}`} className={alert.severity === 'high' ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-amber-400'}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="flex items-center gap-2 font-semibold capitalize">{icon(alert.type)}{alert.type}</h2>
              <span className="text-xs font-semibold uppercase text-slate-500">{alert.severity}</span>
            </div>
            <p className="mt-2 text-sm">{alert.message}</p>
            <p className="mt-1 text-xs text-slate-500">{alert.date}</p>
            <p className="mt-2 text-sm text-agri-800 dark:text-agri-200">{alert.recommendation}</p>
          </Panel>
        ))}
      </div>
    </PageFrame>
  );
};

export default WeatherAlerts;
