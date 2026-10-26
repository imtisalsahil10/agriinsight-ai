import type { DiseaseAnalysis } from '../../types';
import { toolResult, type ToolResult } from './types';

const DOSE_UNIT = /(\d+(\.\d+)?)\s*(ml|g|kg|l|litre|liter|%|ppm)\b/i;

export const KVK_LINE = 'Consult your nearest Krishi Vigyan Kendra (KVK) before applying chemicals.';

export function presentDisease(analysis: DiseaseAnalysis): DiseaseAnalysis {
  const chemical = analysis.chemicalRemedies ?? [];
  const mentionsChemical = chemical.length > 0;
  return {
    ...analysis,
    chemicalRemedies: chemical.map((remedy) => (
      DOSE_UNIT.test(remedy) ? remedy : `${remedy} (follow the label for the dose, in ml or g per litre)`
    )),
    dosageNote: mentionsChemical
      ? 'Doses are label guidance only. Measure in millilitres or grams, and do not mix products unless the label says so.'
      : undefined,
    precautions: mentionsChemical
      ? [
        'Wear gloves and a mask',
        'Do not spray in strong wind or rain',
        'Keep chemicals away from children, animals, and open water',
      ]
      : analysis.precautions,
    kvkLine: mentionsChemical ? KVK_LINE : analysis.kvkLine,
    source: 'model',
    confidence: analysis.confidence ?? 0.55,
  };
}

export async function diagnoseCropDisease(
  image: string | null,
  analyze: (image: string) => Promise<DiseaseAnalysis | null>,
): Promise<ToolResult<DiseaseAnalysis | null>> {
  if (!image) {
    return toolResult({
      ok: false,
      name: 'diagnose_crop_disease',
      source: 'model',
      demo: false,
      confidence: 0,
      summary: 'Take a leaf photo first. I will not guess a disease without one.',
      inputs: { image: false },
      data: null,
    });
  }
  const raw = await analyze(image);
  if (!raw) {
    return toolResult({
      ok: false,
      name: 'diagnose_crop_disease',
      source: 'model',
      demo: false,
      confidence: 0,
      summary: 'I could not read that photo. Try a closer picture of the leaf in daylight.',
      inputs: { image: true },
      data: null,
    });
  }
  const data = presentDisease(raw);
  return toolResult({
    ok: true,
    name: 'diagnose_crop_disease',
    source: 'model',
    demo: false,
    confidence: data.confidence ?? 0.55,
    summary: `${data.disease}. Severity ${data.severity}. ${data.kvkLine ?? ''}`.trim(),
    inputs: { image: true },
    data,
  });
}
