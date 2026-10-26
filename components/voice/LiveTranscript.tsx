import React, { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import type { Message } from '../../types';
import type { SessionState } from '../../lib/voice/types';
import MarkdownRenderer from '../MarkdownRenderer';

interface LiveTranscriptProps {
  label: string;
  messages: Message[];
  state: SessionState;
}

const LiveTranscript: React.FC<LiveTranscriptProps> = ({ label, messages, state }) => {
  const endRef = useRef<HTMLDivElement>(null);
  const last = messages[messages.length - 1];
  const draftIsCommitted = Boolean(last && last.role === 'model' && last.content === state.assistantText);
  const showDraft = Boolean(state.assistantText)
    && state.assistantText !== state.error
    && !draftIsCommitted
    && !state.announcingError;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, state.partialTranscript, state.assistantText, state.phase]);

  return (
    <div
      aria-live="polite"
      aria-relevant="additions text"
      aria-label={label}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3"
    >
      {messages.map((message) => {
        const isUser = message.role === 'user';
        return (
          <div key={message.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm md:text-base ${
              isUser
                ? 'bg-blue-600 text-white rounded-br-md'
                : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-md'
            }`}>
              {isUser ? <p className="whitespace-pre-wrap">{message.content}</p> : <MarkdownRenderer content={message.content} />}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {message.sources.map((source) => (
                    <a
                      key={source.uri}
                      href={source.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center max-w-[200px] text-xs text-blue-700 dark:text-blue-300 underline"
                    >
                      <ExternalLink className="w-3 h-3 mr-1 shrink-0" />
                      <span className="truncate">{source.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {state.phase === 'listening' && state.partialTranscript && (
        <p className="text-slate-500 dark:text-slate-400 italic px-1">{state.partialTranscript}</p>
      )}

      {showDraft && (
        <div className="flex justify-start">
          <div className="max-w-[90%] rounded-2xl rounded-bl-md px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm md:text-base text-slate-800 dark:text-slate-100">
            <MarkdownRenderer content={state.assistantText} />
          </div>
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
};

export default LiveTranscript;
