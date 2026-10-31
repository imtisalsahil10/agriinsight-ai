import { describe, expect, it, vi } from 'vitest';
import { performPageAction } from './perform';
import { runUtterance, type AssistantHost } from './run';
import { applySoil, soilMissing, type SoilFields } from './validate';
import type { AssistantPage, FieldPatch, HandleResult } from './types';
import type { ViewState } from '../../types';

const blank: SoilFields = {
  pH: Number.NaN,
  nitrogen: Number.NaN,
  phosphorus: Number.NaN,
  potassium: Number.NaN,
  organicMatter: Number.NaN,
};

function soilPage(options: { busy?: boolean; fail?: boolean } = {}): { page: AssistantPage; runs: number; state: SoilFields } {
  const state = { ...blank };
  let runs = 0;
  let locked = false;
  const page: AssistantPage = {
    explain: () => 'soil',
    read: () => (runs > 0 ? 'demo soil note' : null),
    handle: (patch, execute) => performPageAction({
      language: 'en-US',
      claim: () => {
        if (options.busy || locked) return false;
        locked = true;
        return true;
      },
      release: () => {
        locked = false;
      },
      apply: (next) => {
        Object.assign(state, applySoil(state, next));
      },
      missing: () => soilMissing(state),
      run: async () => {
        runs += 1;
        if (options.fail) return { ok: false, summary: 'Soil analysis failed.' };
        return { ok: true, summary: 'Demo soil note. Nitrogen levels optimal.' };
      },
    }, patch, execute),
  };
  return { page, get runs() { return runs; }, state };
}

function host(page: AssistantPage | null, view: ViewState = 'soil'): AssistantHost & { navigated: string[]; waited: FieldPatch[] } {
  const navigated: string[] = [];
  const waited: FieldPatch[] = [];
  return {
    view,
    language: 'en-US',
    navigated,
    waited,
    getPage: (next) => (next === view ? page : null),
    navigate: (next) => navigated.push(next),
    setLanguage: () => undefined,
    waitForPage: async (next, patch, execute) => {
      waited.push(patch);
      navigated.push(next);
      if (!execute) return { ok: true, ran: false, summary: 'filled after opening' };
      if (!patch.crop && next === 'market') return { ok: false, ran: false, summary: 'I still need a crop.' };
      return { ok: true, ran: true, summary: `Demo prices for ${patch.crop ?? 'the region'}, not a live mandi quote.` };
    },
  };
}

describe('page actions', () => {
  it('does not run soil analysis when required fields are missing', async () => {
    const soil = soilPage();
    const outcome = await runUtterance('Analyze soil. Nitrogen is 40, phosphorus is 30, and potassium is 50.', host(soil.page));
    expect(outcome).toEqual({
      action: 'reply',
      text: 'I still need pH between 0 and 14, organic matter before I can run this. I have not started it.',
    });
    expect(soil.runs).toBe(0);
    expect(soil.state.nitrogen).toBe(40);
  });

  it('runs only after the tool succeeds and blocks a second run', async () => {
    const soil = soilPage();
    const ready: FieldPatch = { pH: 7, nitrogen: 40, phosphorus: 30, potassium: 50, organicMatter: 2 };
    const outcome = await runUtterance('Analyze my soil. pH is 7, nitrogen is 40, phosphorus is 30, potassium is 50, organic matter is 2.', host(soil.page));
    expect(outcome?.action).toBe('reply');
    if (outcome?.action === 'reply') expect(outcome.text).toMatch(/Demo soil note/);
    expect(soil.runs).toBe(1);
    expect(soil.state).toMatchObject(ready);

    let release = (): void => undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    let calls = 0;
    const slow: AssistantPage = {
      explain: () => 'soil',
      read: () => null,
      handle: (patch, execute) => performPageAction({
        language: 'en-US',
        claim: () => calls === 0,
        release: () => undefined,
        apply: () => undefined,
        missing: () => [],
        run: async () => {
          calls += 1;
          await gate;
          return { ok: true, summary: 'done' };
        },
      }, patch, execute),
    };
    const first = slow.handle({}, true);
    const second = await slow.handle({}, true);
    expect(second).toMatchObject({ ok: false, ran: false });
    expect(second.summary).toMatch(/already running/);
    release();
    await first;
    expect(calls).toBe(1);
  });

  it('does not report success when the tool fails', async () => {
    const soil = soilPage({ fail: true });
    const outcome = await runUtterance('Analyze soil. pH is 6.5, nitrogen is 40, phosphorus is 30, potassium is 50, organic matter is 3.', host(soil.page));
    expect(outcome).toMatchObject({ action: 'reply' });
    if (outcome?.action === 'reply') {
      expect(outcome.text).toMatch(/failed/);
      expect(outcome.text).not.toMatch(/Demo soil note/);
    }
  });

  it('navigates without claiming the destination already ran', async () => {
    const target = host(null, 'dashboard');
    const outcome = await runUtterance('Go to Disease Detection.', target);
    expect(target.navigated).toEqual(['disease']);
    expect(outcome?.action).toBe('reply');
    if (outcome?.action === 'reply') expect(outcome.text).toMatch(/AI suggestion/);
  });

  it('opens market, keeps the crop, and labels demo prices', async () => {
    const target = host(null, 'dashboard');
    const outcome = await runUtterance('Show me the market price for wheat', target);
    expect(target.waited[0]?.crop).toBe('wheat');
    expect(outcome).toMatchObject({
      action: 'reply',
      text: 'Demo prices for wheat, not a live mandi quote.',
    });
  });

  it('stops without a success message', async () => {
    const outcome = await runUtterance('Stop speaking', host(null, 'dashboard'));
    expect(outcome).toEqual({ action: 'stop' });
  });

  it('leaves ordinary questions for the chat model', async () => {
    const outcome = await runUtterance('How is the monsoon looking this week?', host(null, 'chat'));
    expect(outcome).toBeNull();
  });
});

describe('disease gate', () => {
  it('does not analyze when no image is available', async () => {
    const run = vi.fn(async () => ({ ok: true, summary: 'should not run' }));
    const page: AssistantPage = {
      explain: () => 'disease',
      read: () => null,
      handle: (_patch, execute) => performPageAction({
        language: 'en-US',
        claim: () => true,
        release: () => undefined,
        apply: () => undefined,
        missing: () => ['a leaf photo'],
        run,
      }, _patch, execute),
    };
    const outcome = await runUtterance('Analyze this leaf image.', host(page, 'disease'));
    expect(run).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({ action: 'reply' });
    if (outcome?.action === 'reply') expect(outcome.text).toMatch(/leaf photo/);
    const unused: HandleResult = { ok: false, ran: false, summary: '' };
    expect(unused.ran).toBe(false);
  });
});
