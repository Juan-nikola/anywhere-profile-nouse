import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import { buildRuleArtifacts } from "../src/rule-build.js";
import { fetchRuleSources } from "./update-rules.mjs";

function hash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 12);
}

async function currentFiles(root) {
  const rulesRoot = join(root, "rules");
  const names = (await readdir(rulesRoot))
    .filter((name) => name.endsWith(".arrs"))
    .toSorted();
  return new Map(
    await Promise.all(
      names.map(async (name) => [name, await readFile(join(rulesRoot, name), "utf8")]),
    ),
  );
}

const root = resolve(process.cwd());
const downloads = await fetchRuleSources();
const expected = buildRuleArtifacts(downloads);
const actual = await currentFiles(root);
const differences = [];
const names = new Set([...expected.files.keys(), ...actual.keys()]);
for (const name of [...names].toSorted()) {
  const expectedContent = expected.files.get(name);
  const actualContent = actual.get(name);
  if (expectedContent !== actualContent) {
    differences.push(
      `${join("rules", name)} expected=${hash(expectedContent ?? "")} actual=${hash(actualContent ?? "")}`,
    );
  }
}
const expectedReport = `${JSON.stringify(expected.report, null, 2)}\n`;
const actualReport = await readFile(join(root, "reports", "compatibility.json"), "utf8");
if (expectedReport !== actualReport) {
  differences.push(
    `reports/compatibility.json expected=${hash(expectedReport)} actual=${hash(actualReport)}`,
  );
}
if (differences.length) {
  throw new Error(`Generated artifacts are stale:\n${differences.join("\n")}`);
}
process.stdout.write(`Generated artifacts match ${downloads.size} live sources.\n`);

