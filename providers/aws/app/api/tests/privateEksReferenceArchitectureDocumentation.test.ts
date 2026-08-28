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
const runnerWorkflowPath = resolve(repoRoot, ".github/workflows/terraform-eks-private-runner.yml");
const runnerRunbookPath = resolve(repoRoot, "docs/solutions/vpc-connected-runner-runbook.md");
const bootstrapTemplatePath = resolve(repoRoot, "providers/aws/infra/bootstrap/github-oidc-terraform-backend.yaml");
const bootstrapWorkflowPath = resolve(repoRoot, ".github/workflows/update-aws-bootstrap.yml");

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

test("private runner consumes network state without overstating runtime readiness", async () => {
  const [runnerMain, runnerWorkflow, runnerRunbook, architecture, runbook] = await Promise.all([
    readFile(runnerMainPath, "utf8"),
    readFile(runnerWorkflowPath, "utf8"),
    readFile(runnerRunbookPath, "utf8"),
    readFile(architecturePath, "utf8"),
    readFile(deliveryRunbookPath, "utf8"),
  ]);

  assert.match(runnerMain, /data "terraform_remote_state" "network"/);
  assert.match(runnerMain, /private_subnet_ids\s*=\s*data\.terraform_remote_state\.network\.outputs\.private_subnet_ids/);
  assert.match(runnerWorkflow, /AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME/);
  assert.match(runnerWorkflow, /I_UNDERSTAND_PRIVATE_EKS_RUNNER_APPLY/);
  assert.match(runnerRunbook, /dedicated runner-state OIDC role/i);
  assert.match(runnerRunbook, /runtime validation remains pending/i);
  assert.match(architecture, /protected runner lifecycle\s+workflow is source implemented/is);
  assert.match(runbook, /protected lifecycle workflow is source implemented/is);
});

test("private runner bootstrap documents the three-identity handoff without claiming runtime", async () => {
  const [bootstrapTemplate, bootstrapWorkflow, runnerRunbook, readiness] = await Promise.all([
    readFile(bootstrapTemplatePath, "utf8"),
    readFile(bootstrapWorkflowPath, "utf8"),
    readFile(runnerRunbookPath, "utf8"),
    readFile(environmentReadinessPath, "utf8"),
  ]);

  assert.match(bootstrapTemplate, /GitHubActionsPrivateEKSRunnerRole/);
  assert.match(bootstrapTemplate, /PrivateEKSRunnerRoleArn/);
  assert.match(bootstrapWorkflow, /Publish private EKS runner role handoff/);
  assert.match(bootstrapWorkflow, /AWS_PRIVATE_EKS_RUNNER_ROLE_TO_ASSUME/);
  assert.match(runnerRunbook, /bootstrap source now defines identity 2/i);
  assert.match(readiness, /runner-role source\s+contract is implemented/i);
  assert.match(`${runnerRunbook}\n${readiness}`, /CloudFormation apply remains pending/i);
  assert.match(`${runnerRunbook}\n${readiness}`, /runner\s+runtime validation remains pending/i);
});
