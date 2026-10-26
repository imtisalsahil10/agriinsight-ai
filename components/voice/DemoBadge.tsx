import React from 'react';
import { t } from '../../lib/i18n';
import type { Language } from '../../types';

const DemoBadge: React.FC<{ language: Language }> = ({ language }) => (
  <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-900">
    {t(language, 'voice_demo')}
  </span>
);

export default DemoBadge;
