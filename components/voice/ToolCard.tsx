import React, { useState } from 'react';
import { t } from '../../lib/i18n';
import type { ToolResult } from '../../lib/tools/types';
import type { Language } from '../../types';
import DemoBadge from './DemoBadge';

interface ToolCardProps {
  language: Language;
  result: ToolResult;
}

const ToolCard: React.FC<ToolCardProps> = ({ language, result }) => {
  const [open, setOpen] = useState(false);
  return (
    <article className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 text-left">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{result.name.replace(/_/g, ' ')}</h3>
        {result.demo && <DemoBadge language={language} />}
      </div>
      <p className="text-sm text-slate-700 dark:text-slate-200">{result.summary}</p>
      <button
        type="button"
        className="mt-3 min-h-14 text-sm font-semibold text-agri-700 dark:text-agri-300"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {t(language, 'voice_why')}
      </button>
      {open && (
        <dl className="mt-2 text-sm text-slate-600 dark:text-slate-300 space-y-1">
          <div><dt className="inline font-semibold">Source: </dt><dd className="inline">{result.source}</dd></div>
          <div><dt className="inline font-semibold">Confidence: </dt><dd className="inline">{Math.round(result.confidence * 100)}%</dd></div>
          <div><dt className="font-semibold">Inputs</dt><dd className="break-words">{JSON.stringify(result.inputs)}</dd></div>
        </dl>
      )}
    </article>
  );
};

export default ToolCard;
