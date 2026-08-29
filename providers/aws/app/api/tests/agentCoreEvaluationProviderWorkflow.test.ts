import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const ROOT = resolve(process.cwd(), "../../../..");
const WORKFLOW_PATH = resolve(ROOT, ".github/workflows/agentcore-evaluation-provider-parity.yml");
const CI_PATH = resolve(ROOT, ".github/workflows/ci.yml");

test("manual provider-parity workflow keeps ordinary CI cloud-free and protects direct spans", async () => {
  const [source, ciSource] = await Promise.all([
    readFile(WORKFLOW_PATH, "utf8"),
    readFile(CI_PATH, "utf8")
  ]);
  const validateJob = job(source, "validate", "direct-spans");
  const directJob = job(source, "direct-spans");

  assert.match(source, /workflow_dispatch:/);
  assert.doesNotMatch(source, /\n\s+(pull_request|push|schedule|workflow_call):/);
  assert.match(source, /mode:\n\s+type:\s*choice\n\s+options:\s*\[validate, direct-spans\]\n\s+default:\s*validate/);
  assert.match(source, /confirmation:\n\s+type:\s*string\n\s+required:\s*false/);
  assert.match(source, /permissions:\n\s+contents:\s*read/);
  assert.match(source, /group:\s*cloudai-agentcore-evaluation-provider-parity/);
  assert.match(source, /cancel-in-progress:\s*false/);
  assert.match(validateJob, /--mode validate/);
  assert.doesNotMatch(validateJob, /environment:|id-token:\s*write|configure-aws-credentials|upload-artifact/);
  assert.match(directJob, /environment:\s*aws-sandbox/);
  assert.match(directJob, /id-token:\s*write/);
  assert.match(directJob, /I_UNDERSTAND_AGENTCORE_EVALUATION_PROVIDER_PARITY/);
  assert.match(directJob, /AGENTCORE_EVALUATION_MAX_CALLS/);
  assert.match(directJob, /retention-days:\s*7/);
  assert.doesNotMatch(source, /strategy:|matrix:|continue-on-error:\s*true/);

  assert.match(directJob, /AGENTCORE_EVALUATION_READY/);
  assert.match(directJob, /AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME/);
  assert.match(directJob, /PROVIDER_PARITY_MODE:\s*direct-spans/);
  assert.match(directJob, /GITHUB_REF.*refs\/heads\/main/s);
  assert.match(directJob, /GITHUB_SHA.*\^\[0-9a-f\]\{40\}\$/s);
  assert.match(directJob, /role-to-assume:\s*\$\{\{ env\.AWS_AGENTCORE_EVALUATION_ROLE_TO_ASSUME \}\}/);
  assert.match(directJob, /mask-aws-account-id:\s*true/);
  assert.match(directJob, /if-no-files-found:\s*error/);
  assert.ok(
    directJob.indexOf("Preflight protected direct evaluation") < directJob.indexOf("configure-aws-credentials"),
    "the preflight must run before AWS credentials are configured"
  );

  const requiredApiJob = job(ciSource, "mock-genai-api", "agentcore-rag-runtime");
  assert.match(requiredApiJob, /pnpm test/);
  assert.doesNotMatch(ciSource, /configure-aws-credentials|direct-spans/);
});

function job(source: string, name: string, nextName?: string): string {
  const start = source.indexOf(`  ${name}:`);
  assert.notEqual(start, -1, `missing ${name} job`);
  const end = nextName === undefined ? source.length : source.indexOf(`  ${nextName}:`, start + 1);
  assert.notEqual(end, -1, `missing ${nextName} job`);
  return source.slice(start, end === -1 ? source.length : end);
}
