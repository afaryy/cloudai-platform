import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const terraformRoot = resolve(repoRoot, "providers/aws/infra/terraform");

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
