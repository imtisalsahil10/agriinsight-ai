import React from 'react';
import { LayoutGrid, Sunrise } from 'lucide-react';
import { usePageAssistant } from '../assistant/context';
import { explainView } from '../../lib/assistant/copy';
import { t } from '../../lib/i18n';
import type { ToolResult } from '../../lib/tools/types';
import type { Language, Message } from '../../types';
import { modeLabel, statusLine, voiceCopy } from '../../lib/voice/copy';
import type { SessionState, VoiceMode } from '../../lib/voice/types';
import LiveTranscript from './LiveTranscript';
import MicButton from './MicButton';
import ToolCard from './ToolCard';
import Waveform from './Waveform';

interface VoiceHomeProps {
  language: Language;
  messages: Message[];
  state: SessionState;
  tools: ToolResult[];
  onMic: () => void;
  onMode: (mode: VoiceMode) => void;
  onOpenDashboard: () => void;
  onBriefing: () => void;
}

const VoiceHome: React.FC<VoiceHomeProps> = ({ language, messages, state, tools, onMic, onMode, onOpenDashboard, onBriefing }) => {
  const copy = voiceCopy(language);
  const latest = [...messages].reverse().find((message) => message.role === 'model' && message.id !== 'welcome')?.content ?? '';
  usePageAssistant({
    view: 'voice',
    language,
    explain: () => explainView('voice', language),
    read: () => latest.trim() ? latest : null,
    apply: () => undefined,
    missing: () => [],
    run: async () => ({ ok: false, summary: explainView('voice', language) }),
  });
  const status = statusLine(copy, state.phase, null);
  const micLabel = state.phase === 'listening'
    ? copy.micSend
    : state.phase === 'thinking' || state.phase === 'speaking'
      ? copy.micInterrupt
      : copy.micStart;

  return (
    <div className="flex-1 min-h-0 flex flex-col max-w-3xl mx-auto w-full">
      <LiveTranscript label={copy.transcript} messages={messages} state={state} />
      {tools.length > 0 && (
        <div className="px-4 pb-3 space-y-2 max-h-48 overflow-y-auto">
          {tools.map((result, index) => <ToolCard key={`${result.name}-${index}`} language={language} result={result} />)}
        </div>
      )}

      <div className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/90 px-4 pt-4 pb-6">
        {state.error && (
          <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-300 text-center">
            {state.error}
          </p>
        )}

        <Waveform level={state.audioLevel} active={state.phase === 'listening' || state.phase === 'speaking'} />
        <p id="voice-status" className="text-center text-sm text-slate-600 dark:text-slate-300 min-h-5 mb-4">
          {status}
        </p>

        <div
          role="radiogroup"
          aria-label={copy.modeLabel}
          className="flex justify-center gap-2 mb-4"
        >
          {(['push-to-talk', 'hands-free'] as const).map((mode) => {
            const selected = state.mode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onMode(mode)}
                className={`min-h-14 px-4 rounded-full text-sm font-semibold border touch-manipulation ${
                  selected
                    ? 'bg-agri-600 text-white border-agri-600'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                }`}
              >
                {modeLabel(copy, mode)}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col items-center gap-4">
          <MicButton phase={state.phase} label={micLabel} describedBy="voice-status" onClick={onMic} />
          <button
            type="button"
            onClick={onBriefing}
            className="min-h-14 px-5 inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold touch-manipulation"
          >
            <Sunrise className="w-5 h-5" />
            {t(language, 'voice_briefing')}
          </button>
          <button
            type="button"
            onClick={onOpenDashboard}
            className="min-h-14 px-5 inline-flex items-center gap-2 rounded-full border border-slate-300 dark:border-slate-600 text-slate-800 dark:text-slate-100 font-semibold touch-manipulation"
          >
            <LayoutGrid className="w-5 h-5" />
            {copy.quickActions}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceHome;
