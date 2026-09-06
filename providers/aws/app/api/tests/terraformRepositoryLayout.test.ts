import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import { promisify } from "node:util";

const repoRoot = resolve(process.cwd(), "../../../..");
const terraformRoot = resolve(repoRoot, "providers/aws/infra/terraform");
const execFileAsync = promisify(execFile);

test("Terraform layout migration is explicit and state safe", async () => {
  const manifest = JSON.parse(
    await readFile(resolve(terraformRoot, "layout-migration.json"), "utf8"),
  ) as {
    version: number;
    preserveStateKeys: boolean;
    preserveResourceAddresses: boolean;
    mappings: Array<{
      kind: "bootstrap" | "module" | "foundation";
      from: string;
      to: string;
      stateKey: string | null;
      status: "legacy" | "migrated";
    }>;
  };

  assert.equal(manifest.version, 1);
  assert.equal(manifest.preserveStateKeys, true);
  assert.equal(manifest.preserveResourceAddresses, true);
  assert.equal(manifest.mappings.length, 17);
  assert.equal((await stat(resolve(terraformRoot, "modules"))).isDirectory(), true);
});

test("Terraform CI resolves concrete test directories from the migration manifest", async () => {
  const workflow = await readFile(
    resolve(repoRoot, ".github/workflows/terraform-tests.yaml"),
    "utf8",
  );
  const jqProgramMatch = workflow.match(
    /terraform_dirs="\$\(jq -c '\n([\s\S]*?)\n\s*' providers\/aws\/infra\/terraform\/layout-migration\.json\)"/,
  );

  assert.ok(jqProgramMatch, "Terraform CI matrix jq program must be present");

  // Mutation caught: an incorrectly escaped jq interpolation renders literal text.
  const { stdout } = await execFileAsync("jq", [
    "-c",
    jqProgramMatch[1],
    resolve(terraformRoot, "layout-migration.json"),
  ]);
  const matrixDirectories = JSON.parse(stdout) as string[];

  assert.deepEqual(matrixDirectories, [
    "providers/aws/infra/terraform/envs/agentcore-rag-sandbox",
    "providers/aws/infra/terraform/envs/bedrock-sandbox",
    "providers/aws/infra/terraform/envs/cost-guardrails",
    "providers/aws/infra/terraform/envs/eks-gpu-kueue-poc",
    "providers/aws/infra/terraform/envs/eks-private-network",
    "providers/aws/infra/terraform/envs/eks-private-runner",
    "providers/aws/infra/terraform/envs/eks-private-sandbox",
    "providers/aws/infra/terraform/envs/eks-sandbox",
    "providers/aws/infra/terraform/modules/bedrock-access",
    "providers/aws/infra/terraform/modules/cost-guardrails",
    "providers/aws/infra/terraform/modules/eks",
    "providers/aws/infra/terraform/modules/eks-gpu-kueue",
    "providers/aws/infra/terraform/modules/network",
    "providers/aws/infra/terraform/modules/private-egress",
    "providers/aws/infra/terraform/modules/private-network",
    "providers/aws/infra/terraform/modules/private-runner",
  ]);
});
