import type {
  GuardrailAssessmentRequest,
  GuardrailAssessmentVerdict,
  GuardrailReasonCode,
  GuardrailVerdict
} from "../types.js";

const FIXED_RECORDED_AT = "2026-07-11T00:00:00.000Z";

export function assessGuardrailSignals(request: GuardrailAssessmentRequest): GuardrailAssessmentVerdict {
  const { verdict, reasonCode } = decideGuardrailVerdict(request);

  return {
    requestId: request.requestId,
    verdict,
    reasonCode,
    policyProfile: request.policyProfile,
    audit: {
      traceId: `trace_${request.requestId}`,
      recordedAt: FIXED_RECORDED_AT
    }
  };
}

function decideGuardrailVerdict(
  request: GuardrailAssessmentRequest
): { verdict: GuardrailVerdict; reasonCode: GuardrailReasonCode } {
  if (request.syntheticSignals.includes("prompt-injection") || request.syntheticSignals.includes("jailbreak-attempt")) {
    return {
      verdict: "deny",
      reasonCode: "synthetic_prompt_injection_signal"
    };
  }

  if (request.syntheticSignals.includes("pii-detected")) {
    return {
      verdict: "redact",
      reasonCode: "synthetic_pii_signal"
    };
  }

  if (request.syntheticSignals.includes("high-risk-action")) {
    return {
      verdict: "approval-required",
      reasonCode: "synthetic_high_risk_action_signal"
    };
  }

  return {
    verdict: "allow",
    reasonCode: "no_synthetic_risk_signal"
  };
}
