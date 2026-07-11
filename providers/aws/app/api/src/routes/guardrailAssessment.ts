import { assessGuardrailSignals } from "../lib/guardrailPolicy.js";
import { normalizeGuardrailAssessmentRequest } from "../lib/validation.js";
import type { GuardrailAssessmentVerdict } from "../types.js";

export function postGuardrailAssessment(body: unknown): GuardrailAssessmentVerdict {
  return assessGuardrailSignals(normalizeGuardrailAssessmentRequest(body));
}
