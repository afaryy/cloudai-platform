import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const demoScriptPath = resolve(repoRoot, "docs/practices/demo-script.md");

test("demo script distinguishes the default local path from protected AWS validations", async () => {
  const demoScript = await readFile(demoScriptPath, "utf8");

  assert.match(demoScript, /default local.*does not.*AWS/is);
  assert.match(demoScript, /protected.*AWS.*validated/is);
  assert.doesNotMatch(demoScript, /default repo still does not deploy to AWS/i);
});
