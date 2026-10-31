import React, { useEffect, useId, useRef, useState } from 'react';
import { Loader2, Mic, Send, Square, X } from 'lucide-react';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';
import type { SessionState } from '../../lib/voice/types';
import Waveform from '../voice/Waveform';

interface GlobalAssistantProps {
  language: Language;
  state: SessionState;
  dock: 'voice' | 'chat' | 'page';
  onMic: () => void;
  onStop: () => void;
  onSubmit: (text: string) => Promise<string | null>;
}

const GlobalAssistant: React.FC<GlobalAssistantProps> = ({ language, state, dock, onMic, onStop, onSubmit }) => {
  const [open, setOpen] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [turns, setTurns] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const titleId = useId();
  const hi = language === 'hi-IN';
  const listening = state.phase === 'listening';
  const thinking = state.phase === 'thinking';
  const speaking = state.phase === 'speaking';
  const dockClass = dock === 'chat' ? 'bottom-28' : dock === 'voice' ? 'bottom-36 sm:bottom-8' : 'bottom-4';

  useEffect(() => {
    if (!open) return;
    textRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const status = listening
    ? t(language, 'assistant_listening')
    : thinking
      ? t(language, 'assistant_thinking')
      : speaking
        ? t(language, 'assistant_speaking')
        : t(language, 'assistant_idle');

  const submit = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    setDraft('');
    const userTurn: { role: 'user' | 'assistant'; text: string } = { role: 'user', text };
    setTurns((current) => [...current, userTurn].slice(-8));
    try {
      const answer = await onSubmit(text);
      if (answer) {
        const reply: { role: 'user' | 'assistant'; text: string } = { role: 'assistant', text: answer };
        setTurns((current) => [...current, reply].slice(-8));
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`fixed right-3 z-40 ${dockClass} sm:right-5`} data-assistant-root>
      {open && (
        <section
          role="dialog"
          aria-labelledby={titleId}
          className="mb-3 flex w-[min(22rem,calc(100vw-1.5rem))] max-h-[min(28rem,calc(100dvh-6rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
        >
          <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 dark:border-slate-700">
            <div>
              <h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-white">{t(language, 'assistant_title')}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{status}</p>
            </div>
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)} aria-label={t(language, 'assistant_close')}>
              <X className="h-4 w-4" />
            </button>
          </header>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3">
            <Waveform level={state.audioLevel} active={listening || speaking} />
            <p className="sr-only" aria-live="polite">{status}</p>
            {(listening || state.partialTranscript || state.finalTranscript) && (
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:bg-slate-900 dark:text-slate-100">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">{hi ? 'आप' : 'You'}</span>
                {state.partialTranscript || state.finalTranscript || (hi ? 'सुन रहा हूँ…' : 'Listening…')}
              </p>
            )}
            {thinking && (
              <p className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t(language, 'assistant_thinking')}
              </p>
            )}
            {state.assistantText && (
              <p className="rounded-xl bg-agri-50 px-3 py-2 text-sm text-agri-950 dark:bg-agri-950/40 dark:text-agri-50">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-agri-700 dark:text-agri-300">{t(language, 'assistant_title')}</span>
                {state.assistantText}
              </p>
            )}
            {state.error && <p role="alert" className="text-sm text-red-700 dark:text-red-300">{state.error}</p>}
            {turns.map((turn, index) => (
              <p key={`${turn.role}-${index}`} className={`rounded-xl px-3 py-2 text-sm ${turn.role === 'user' ? 'bg-slate-50 text-slate-800 dark:bg-slate-900 dark:text-slate-100' : 'bg-agri-50 text-agri-950 dark:bg-agri-950/40 dark:text-agri-50'}`}>
                {turn.text}
              </p>
            ))}
            {turns.length === 0 && !state.assistantText && !state.error && !listening && (
              <p className="text-sm leading-relaxed text-slate-500 dark:text-slate-400">{t(language, 'assistant_hint')}</p>
            )}
          </div>

          <form
            className="flex items-end gap-2 border-t border-slate-100 p-2 dark:border-slate-700"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label className="sr-only" htmlFor="assistant-text">{t(language, 'assistant_placeholder')}</label>
            <textarea
              ref={textRef}
              id="assistant-text"
              rows={1}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              placeholder={t(language, 'assistant_placeholder')}
              className="field-input max-h-24 min-h-11 flex-1 resize-none py-2"
            />
            <button type="submit" className="btn-primary min-w-11 px-3" disabled={!draft.trim() || sending} aria-label={t(language, 'assistant_send')}>
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </form>
          <div className="flex gap-2 px-2 pb-2">
            <button type="button" className="btn-secondary flex-1" onClick={onMic} aria-pressed={listening}>
              <Mic className="h-4 w-4" />
              {listening ? t(language, 'assistant_send_voice') : t(language, 'assistant_listen')}
            </button>
            <button type="button" className="btn-secondary flex-1" onClick={onStop}>
              <Square className="h-3.5 w-3.5 fill-current" />
              {t(language, 'assistant_stop')}
            </button>
          </div>
        </section>
      )}

      <button
        type="button"
        className={`ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-agri-700 text-white shadow-lg hover:bg-agri-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-agri-700 ${listening ? 'ring-4 ring-agri-200 motion-safe:animate-pulse dark:ring-agri-900' : ''}`}
        aria-label={open ? t(language, 'assistant_close') : t(language, 'assistant_open')}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? <X className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
    </div>
  );
};

export default GlobalAssistant;
