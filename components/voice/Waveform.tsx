import React, { useEffect, useState } from 'react';

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

export function VoiceMeter({ active, readLevel }: { active: boolean; readLevel: () => number }) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active) return undefined;
    let frame = 0;
    let last = -1;
    const tick = () => {
      const next = readLevel();
      if (Math.abs(next - last) >= 0.04 || (next === 0 && last !== 0)) {
        last = next;
        setLevel(next);
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [active, readLevel]);

  return <Waveform level={active ? level : 0} active={active} />;
}

export default Waveform;
