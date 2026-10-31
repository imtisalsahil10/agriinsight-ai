import type { Language, ViewState } from '../../types';
import { explainView, noResults } from './copy';
import { interpret } from './intent';
import type { AssistantPage, FieldPatch, HandleResult } from './types';

export interface AssistantHost {
  view: ViewState;
  language: Language;
  getPage: (view: ViewState) => AssistantPage | null;
  navigate: (view: ViewState) => void;
  setLanguage: (language: Language) => void;
  waitForPage: (view: ViewState, patch: FieldPatch, execute: boolean) => Promise<HandleResult>;
}

export type UtteranceOutcome =
  | { action: 'stop' }
  | { action: 'reply'; text: string };

function reply(text: string): UtteranceOutcome {
  return { action: 'reply', text };
}

export async function runUtterance(text: string, host: AssistantHost): Promise<UtteranceOutcome | null> {
  const intent = interpret(text);
  if (intent.kind === 'chat') return null;
  if (intent.kind === 'stop') return { action: 'stop' };
  if (intent.kind === 'language') {
    host.setLanguage(intent.language);
    return reply(intent.language === 'hi-IN'
      ? 'अब मैं हिन्दी में बात करूँगा।'
      : 'I will use English now.');
  }
  if (intent.kind === 'explain') {
    return reply(explainView(host.view, host.language));
  }
  if (intent.kind === 'read') {
    const page = host.getPage(host.view);
    const spoken = page?.read() ?? null;
    return reply(spoken && spoken.trim() ? spoken : noResults(host.language));
  }
  if (intent.kind === 'navigate') {
    host.navigate(intent.view);
    return reply(explainView(intent.view, host.language));
  }

  const target = intent.view && intent.view !== host.view ? intent.view : host.view;
  if (intent.view && intent.view !== host.view) {
    const result = await host.waitForPage(intent.view, intent.patch, intent.execute);
    return reply(result.summary);
  }
  const page = host.getPage(target);
  if (!page) {
    return reply(explainView(host.view, host.language));
  }
  const result = await page.handle(intent.patch, intent.execute);
  return reply(result.summary);
}
