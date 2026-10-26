import React from 'react';

interface WaveformProps {
  level: number;
  active: boolean;
}

const WEIGHTS = [0.45, 0.7, 1, 0.85, 0.55, 0.9, 0.4];

const Waveform: React.FC<WaveformProps> = ({ level, active }) => {
  const energy = active ? Math.max(level, 0.08) : 0;
  return (
    <div className="flex items-end justify-center gap-1 h-16" aria-hidden="true">
      {WEIGHTS.map((weight, index) => (
        <span
          key={index}
          className={`w-1.5 rounded-full ${active ? 'bg-agri-500' : 'bg-slate-300 dark:bg-slate-600'}`}
          style={{ height: `${Math.max(6, energy * 56 * weight + (active ? 8 : 6))}px` }}
        />
      ))}
    </div>
  );
};

export default Waveform;
