# P8f Real Bedrock Guardrail and Guarded Converse Smoke Test Design

## Purpose

P8f proves that the personal Bedrock sandbox can attach one Terraform-managed
Amazon Bedrock Guardrail to one synthetic `Converse` invocation. It is a
bounded infrastructure and access-control exercise, not a claim that a policy
is complete, effective for production, or suitable for real data.

## Scope

P8f adds:

1. A Terraform compatibility gate for the repository's locked AWS provider
   before adding a Guardrail resource.
2. One tagged sandbox Guardrail with Prompt Attack content filtering and
   sensitive-information handling only.
3. One explicit Guardrail version for use by a smoke test.
4. A separate GitHub OIDC Guardrail-smoke role, distinct from the current
   model-only smoke role.
5. A new manually approved `guardrail-smoke-test` mode in the existing
   `terraform-bedrock-sandbox` workflow.
6. Sanitized success and failure categories, documentation, and tests.

## Non-goals

P8f must not:

- change the default mock API mode or normal CI behavior;
- add AgentCore, RAG, tools, memory, persistent storage, gateways, or runtime
  services;
- use denied topics, word filters, contextual grounding, custom regex policy,
  or production policy content;
- evaluate real personal, customer, internal, confidential, or production
  content;
- print or commit raw input, output, trace, Guardrail identifier, version,
  account identifier, role ARN, state, plan, credentials, or provider error;
- create a retry loop or a destroy mode;
- change the existing model-only smoke role or make non-Guardrail calls use the
  new role.

## Provider Compatibility Gate

The current sandbox pins the HashiCorp AWS provider to the 5.x series and locks
the resolved provider version. Before adding implementation code, P8f must
verify that the locked provider exposes both required resources:

- `aws_bedrock_guardrail`;
- `aws_bedrock_guardrail_version`.

If either resource or required argument is unavailable, P8f stops. A provider
upgrade is a separate reviewed slice; it must not be bundled into this change.

## Guardrail Configuration

The Guardrail belongs in the existing `bedrock-sandbox` Terraform state and
uses the existing project, environment, synthetic-only, cost-boundary, and
teardown tags.

Its policy is intentionally narrow:

| Policy area | P8f setting | Reason |
| --- | --- | --- |
| Content | Prompt Attack filter only | Maps to the existing synthetic prompt-injection and jailbreak contract without defining broader business policy. |
| Sensitive information | One standard PII entity handling mode | Demonstrates the provider control surface without claiming real PII-detection coverage. |
| Blocked messages | Static generic input/output text | Avoids content-dependent or business-specific policy text. |
| Version | One explicit numeric version | Lets the guarded inference request pin a reviewed immutable policy version. |

The exact filter strengths, PII entity type, and handling action must be
written as Terraform variables with safe defaults and tested as a static
contract. They must be selected from values supported by the verified provider
version; no unverified provider syntax belongs in the implementation.

## IAM Boundary

Two roles remain separate:

| Role | Allowed responsibility | Must not do |
| --- | --- | --- |
| Terraform execution role | Create, read, update, version, tag, and delete the one tagged sandbox Guardrail as required by Terraform. | Invoke models or use Guardrail at runtime. |
| Guardrail smoke role | Invoke only the approved model/inference-profile path through `Converse` when the designated Guardrail is included. | Create, update, delete, list broadly, or version Guardrails; access unrelated models. |

The Guardrail smoke role must enforce the Guardrail identifier condition on
inference requests where AWS supports it. Its policy must retain the approved
model-resource restriction from the current smoke boundary. The existing
model-only smoke role remains unchanged.

The Terraform bootstrap role receives only the additional IAM policy lifecycle
actions demonstrated as necessary by the plan. It does not receive Bedrock
runtime invocation or `iam:PassRole` permission.

## Workflow Design

The existing manual `terraform-bedrock-sandbox` workflow gains a
`guardrail-smoke-test` mode under the existing protected `aws-sandbox`
environment.

The mode must:

1. require an exact confirmation input;
2. require the future protected `AWS_BEDROCK_GUARDRAIL_SMOKE_ROLE_TO_ASSUME`
   environment value;
3. require the existing region and approved model configuration;
4. read the Guardrail identifier and numeric version from Terraform outputs in
   the workflow rather than from manually copied GitHub values;
5. assume the separate Guardrail smoke role through OIDC;
6. make exactly one non-streaming synthetic `Converse` request with
   `guardrailConfig` referencing the pinned Guardrail version and trace
   disabled;
7. validate only a safe response shape or a recognized Guardrail-intervention
   shape;
8. emit one sanitized result category and remove temporary response/error
   files.

The workflow does not record raw prompt text, model output, Guardrail trace, or
provider errors. It uses one AWS attempt and fails closed.

## Evidence and Evaluation Boundary

P8f proves only that a real Guardrail can be attached to a controlled model
request under separate identity and infrastructure boundaries. It does not
prove classifier quality, safety coverage, false-positive rate, policy
suitability, or production readiness.

Permitted evidence:

- workflow mode and success/failure category;
- confirmation that one synthetic request was used;
- confirmation that a Guardrail version was attached;
- sanitized Terraform resource count and static-test result;
- confirmation that no raw content or trace was retained.

Prohibited evidence:

- all raw input/output/trace/error text;
- Guardrail identifiers, versions, ARNs, account IDs, role ARNs, model IDs,
  state, plans, and credentials.

A later evaluation-only slice may use a separately reviewed synthetic test set
to assess specific policy interventions. It must not be combined with P8f.

## Failure Handling and Stop Conditions

The workflow stops with a sanitized category if it encounters missing protected
configuration, unsupported provider resources, Terraform plan/apply failure,
OIDC failure, IAM denial, invalid Guardrail configuration, missing Guardrail
output, model/region incompatibility, Guardrail intervention, quota/throttling,
or an unexpected response shape.

Stop P8f and request review if provider compatibility requires an upgrade, AWS
requires broader IAM than the bounded design, the target model cannot use the
Guardrail in the chosen region, a request produces raw content in a log, or the
test requires a real-data sample.

## Tests

Static tests must cover:

- the Guardrail Terraform resource and version render with synthetic-only tags;
- the smoke role excludes administration and enforces the Guardrail condition;
- the Terraform execution role does not receive runtime invocation or
  `iam:PassRole`;
- workflow mode validation, exact confirmation, required environment values,
  output lookup, no-retry setting, trace-disabled configuration, and sanitized
  categories;
- repository checks preventing raw content, identifiers, or credentials from
  appearing in fixtures or workflow output.

Existing mock API tests, Terraform tests, repository checks, and security scan
must remain green. The real provider call is manually dispatched only after the
Terraform apply and environment approval are complete.

## Sources

- https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-use-converse-api.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/guardrails-permissions-id.html
- https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrock_guardrail
- https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/bedrock_guardrail_version
