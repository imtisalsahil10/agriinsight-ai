import type { Language } from '../../types';
import { actionFailed, alreadyRunning, askMissing, filledSummary } from './copy';
import type { FieldPatch, HandleResult } from './types';

export interface PageActionSpec {
  language: Language;
  claim: () => boolean;
  release: () => void;
  apply: (patch: FieldPatch) => void;
  missing: () => string[];
  run: () => Promise<{ ok: boolean; summary: string }>;
}

/**
 * Applies spoken fields, refuses to run when inputs are missing or a run is
 * already in flight, and returns the tool's own summary only after it finishes.
 */
export async function performPageAction(
  spec: PageActionSpec,
  patch: FieldPatch,
  execute: boolean,
): Promise<HandleResult> {
  spec.apply(patch);
  if (!execute) {
    return { ok: true, ran: false, summary: filledSummary(patch, spec.language) };
  }
  if (!spec.claim()) {
    return { ok: false, ran: false, summary: alreadyRunning(spec.language) };
  }
  try {
    const missing = spec.missing();
    if (missing.length > 0) {
      return { ok: false, ran: false, summary: askMissing(missing, spec.language) };
    }
    const result = await spec.run();
    return { ok: result.ok, ran: result.ok, summary: result.summary };
  } catch {
    return { ok: false, ran: false, summary: actionFailed(spec.language) };
  } finally {
    spec.release();
  }
}
