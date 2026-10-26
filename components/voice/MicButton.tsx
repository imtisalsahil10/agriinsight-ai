import React from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import type { VoicePhase } from '../../lib/voice/types';

interface MicButtonProps {
  phase: VoicePhase;
  label: string;
  describedBy?: string;
  onClick: () => void;
}

const MicButton: React.FC<MicButtonProps> = ({ phase, label, describedBy, onClick }) => {
  const listening = phase === 'listening';
  const busy = phase === 'thinking';
  const speaking = phase === 'speaking';

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={listening}
      aria-describedby={describedBy}
      className={`flex items-center justify-center min-h-14 min-w-14 h-20 w-20 rounded-full shadow-lg transition-colors touch-manipulation ${
        listening
          ? 'bg-red-600 text-white ring-4 ring-red-200 dark:ring-red-900'
          : speaking
            ? 'bg-amber-500 text-white'
            : 'bg-agri-600 text-white hover:bg-agri-700'
      }`}
    >
      {busy ? <Loader2 className="w-8 h-8 animate-spin" /> : speaking ? <Square className="w-7 h-7 fill-current" /> : <Mic className="w-8 h-8" />}
    </button>
  );
};

export default MicButton;
