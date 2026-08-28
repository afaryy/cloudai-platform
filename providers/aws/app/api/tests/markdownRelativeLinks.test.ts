import assert from "node:assert/strict";
import { readdir, readFile, stat } from "node:fs/promises";
import { dirname, extname, resolve } from "node:path";
import test from "node:test";

const repoRoot = resolve(process.cwd(), "../../../..");
const scanRoots = [
  resolve(repoRoot, "README.md"),
  resolve(repoRoot, "docs"),
  resolve(repoRoot, "providers"),
  resolve(repoRoot, "examples"),
  resolve(repoRoot, "helm"),
  resolve(repoRoot, "argocd"),
  resolve(repoRoot, "shared"),
];
const skippedDirectories = new Set([".git", ".terraform", "dist", "node_modules", "_private"]);

async function markdownFiles(path: string): Promise<string[]> {
  const metadata = await stat(path);
  if (metadata.isFile()) return extname(path) === ".md" ? [path] : [];

  const entries = await readdir(path, { withFileTypes: true });
  const nested = await Promise.all(
    entries
      .filter((entry) => !skippedDirectories.has(entry.name))
      .map((entry) => markdownFiles(resolve(path, entry.name))),
  );
  return nested.flat();
}

test("tracked documentation uses resolvable relative Markdown links", async () => {
  const files = (await Promise.all(scanRoots.map(markdownFiles))).flat();
  const failures: string[] = [];

  for (const file of files) {
    const source = await readFile(file, "utf8");
    for (const match of source.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      let target = match[1].trim();
      if (target.startsWith("<") && target.endsWith(">")) target = target.slice(1, -1);
      if (!target || target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target)) continue;

      target = decodeURIComponent(target.split("#", 1)[0]);
      if (!target) continue;

      try {
        await stat(resolve(dirname(file), target));
      } catch {
        failures.push(`${file.slice(repoRoot.length + 1)} -> ${match[1]}`);
      }
    }
  }

  assert.deepEqual(failures, []);
});
