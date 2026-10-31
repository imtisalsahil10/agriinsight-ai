import React, { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import { performPageAction } from '../../lib/assistant/perform';
import type { AssistantPage, FieldPatch, HandleResult } from '../../lib/assistant/types';
import type { Language, ViewState } from '../../types';

export interface PageController {
  view: ViewState;
  language: Language;
  explain: () => string;
  read: () => string | null;
  apply: (patch: FieldPatch) => void;
  missing: () => string[];
  run: () => Promise<{ ok: boolean; summary: string }>;
}

interface Waiter {
  view: ViewState;
  patch: FieldPatch;
  execute: boolean;
  resolve: (result: HandleResult) => void;
}

export interface AssistantRegistry {
  register: (view: ViewState, page: AssistantPage) => void;
  unregister: (view: ViewState) => void;
  getPage: (view: ViewState) => AssistantPage | null;
  waitForPage: (view: ViewState, patch: FieldPatch, execute: boolean) => Promise<HandleResult>;
  takeWaiter: (view: ViewState) => Waiter | null;
}

const AssistantContext = createContext<AssistantRegistry | null>(null);

export function AssistantProvider({ children }: { children: React.ReactNode }) {
  const pages = useRef(new Map<ViewState, AssistantPage>());
  const waiter = useRef<Waiter | null>(null);

  const value = useMemo<AssistantRegistry>(() => ({
    register(view, page) {
      pages.current.set(view, page);
    },
    unregister(view) {
      pages.current.delete(view);
    },
    getPage(view) {
      return pages.current.get(view) ?? null;
    },
    takeWaiter(view) {
      if (waiter.current?.view !== view) return null;
      const pending = waiter.current;
      waiter.current = null;
      return pending;
    },
    waitForPage(view, patch, execute) {
      return new Promise((resolve) => {
        let timer = 0;
        const finish = (result: HandleResult) => {
          window.clearTimeout(timer);
          resolve(result);
        };
        timer = window.setTimeout(() => {
          if (waiter.current?.resolve === finish) waiter.current = null;
          resolve({
            ok: false,
            ran: false,
            summary: 'I opened that page, but it was not ready to run. Please ask again from this screen.',
          });
        }, 4000);
        waiter.current = { view, patch, execute, resolve: finish };
      });
    },
  }), []);

  return <AssistantContext.Provider value={value}>{children}</AssistantContext.Provider>;
}

export function useAssistantRegistry(): AssistantRegistry {
  const registry = useContext(AssistantContext);
  if (!registry) throw new Error('AssistantProvider is missing');
  return registry;
}

export function usePageAssistant(spec: PageController): void {
  const registry = useAssistantRegistry();
  const specRef = useRef(spec);
  specRef.current = spec;
  const lock = useRef(false);

  useEffect(() => {
    const page: AssistantPage = {
      explain: () => specRef.current.explain(),
      read: () => specRef.current.read(),
      handle: (patch, execute) => performPageAction({
        language: specRef.current.language,
        claim: () => {
          if (lock.current) return false;
          lock.current = true;
          return true;
        },
        release: () => {
          lock.current = false;
        },
        apply: (next) => specRef.current.apply(next),
        missing: () => specRef.current.missing(),
        run: () => specRef.current.run(),
      }, patch, execute),
    };
    registry.register(spec.view, page);
    const pending = registry.takeWaiter(spec.view);
    if (pending) void page.handle(pending.patch, pending.execute).then(pending.resolve);
    return () => {
      lock.current = false;
      registry.unregister(spec.view);
    };
  }, [registry, spec.view]);
}
