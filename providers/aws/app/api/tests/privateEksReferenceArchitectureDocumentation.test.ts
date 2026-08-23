import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const architecturePath = resolve(repoRoot, "docs/architecture/private-eks-reference-architecture.md");
const specPath = resolve(repoRoot, "docs/superpowers/specs/2026-08-24-private-eks-reference-architecture-design.md");

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
