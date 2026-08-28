import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const architecturePath = resolve(repoRoot, "docs/architecture/private-eks-reference-architecture.md");
const specPath = resolve(repoRoot, "docs/superpowers/specs/2026-08-24-private-eks-reference-architecture-design.md");
const featuredSolutionsPath = resolve(repoRoot, "docs/solutions/featured-solutions.md");
const deliveryRunbookPath = resolve(repoRoot, "docs/solutions/eks-private-sandbox-runbook.md");
const environmentReadinessPath = resolve(repoRoot, "docs/solutions/private-eks-github-environment-readiness.md");
const runnerMainPath = resolve(repoRoot, "providers/aws/infra/terraform/envs/eks-private-runner/main.tf");

test("private EKS architecture preserves the public sandbox boundary", async () => {
  const architecture = await readFile(architecturePath, "utf8");

  for (const phrase of [
    /private worker/i,
    /private GPU/i,
    /controlled NAT|controlled egress/i,
    /VPC-connected delivery runner/i,
    /public IP addresses/i,
    /existing (?:EKS )?sandbox/i,
  ]) {
    assert.match(architecture, phrase);
  }

  assert.match(architecture, /Design complete|runtime implementation is separate work/i);
  assert.doesNotMatch(architecture, /private runtime (?:is )?implemented/i);
  assert.doesNotMatch(architecture, /\b\d{12}\b/);
  assert.doesNotMatch(architecture, /arn:aws:/i);
  assert.doesNotMatch(architecture, /subnet-[0-9a-f]{8,}/i);
});

test("private EKS documentation separates AWS EKS service access from Kubernetes API access", async () => {
  const [architecture, spec] = await Promise.all([
    readFile(architecturePath, "utf8"),
    readFile(specPath, "utf8"),
  ]);
  const combined = `${architecture}\n${spec}`;

  assert.match(combined, /EKS service API/i);
  assert.match(combined, /Kubernetes API/i);
  assert.match(combined, /not the EKS service endpoint/i);
  assert.match(combined, /outbound connectivity to GitHub Actions services/i);
  assert.match(combined, /job reception|action downloads/i);
});

test("private EKS protected CI and image-promotion contracts are explicit", async () => {
  const [architecture, spec, plan] = await Promise.all([
    readFile(architecturePath, "utf8"),
    readFile(specPath, "utf8"),
    readFile(resolve(repoRoot, "docs/superpowers/plans/2026-08-24-private-eks-reference-architecture.md"), "utf8"),
  ]);
  const combined = `${architecture}\n${spec}\n${plan}`;

  for (const gate of [
    "PRIVATE_EKS_BUDGET_APPROVED",
    "PRIVATE_EKS_MONTHLY_BUDGET_USD",
    "PRIVATE_EKS_RUNNER_READY",
    "PRIVATE_EKS_ENDPOINT_POLICY_READY",
  ]) {
    assert.match(combined, new RegExp(gate));
  }

  assert.match(combined, /source.*promoted digest/i);
  assert.match(combined, /private ECR/i);
  assert.match(combined, /scan[- ]gate/i);
  assert.match(combined, /mutable tag/i);
});

test("private EKS documents one network owner across architecture and delivery", async () => {
  const [architecture, featuredSolutions, runbook] = await Promise.all([
    readFile(architecturePath, "utf8"),
    readFile(featuredSolutionsPath, "utf8"),
    readFile(deliveryRunbookPath, "utf8"),
  ]);
  const combined = `${architecture}\n${featuredSolutions}\n${runbook}`;

  assert.match(combined, /eks-private-network.*owns.*VPC.*CIDR.*private subnets/is);
  assert.match(combined, /eks-private-sandbox.*consumes.*network.*remote state/is);
  assert.match(combined, /does not recreate.*network|without recreating network/is);
  assert.equal((architecture.match(/^### Private subnets$/gm) ?? []).length, 1);
});

test("private EKS readiness reflects the configured environment without overstating runtime", async () => {
  const [readiness, runbook] = await Promise.all([
    readFile(environmentReadinessPath, "utf8"),
    readFile(deliveryRunbookPath, "utf8"),
  ]);

  assert.match(readiness, /aws-private-eks.*exists/is);
  assert.match(readiness, /required reviewer/is);
  assert.match(readiness, /main.*deployment branch policy/is);
  assert.match(readiness, /network bootstrap variables.*configured/is);
  assert.match(readiness, /runner.*EKS.*ARC.*pending/is);
  assert.doesNotMatch(readiness, /no `aws-private-eks` Environment/i);
  assert.match(runbook, /standalone `preflight`.*existing.*cluster/is);
  assert.match(runbook, /first private-EKS deployment.*same-run.*plan preflight/is);
});

test("private runner documentation preserves its current pre-remote-state boundary", async () => {
  const [runnerMain, architecture, runbook] = await Promise.all([
    readFile(runnerMainPath, "utf8"),
    readFile(architecturePath, "utf8"),
    readFile(deliveryRunbookPath, "utf8"),
  ]);

  assert.doesNotMatch(runnerMain, /terraform_remote_state/);
  assert.match(architecture, /direct remote-state consumption.*next implementation gate/is);
  assert.match(runbook, /Direct remote-state consumption.*next implementation gate/is);
});
