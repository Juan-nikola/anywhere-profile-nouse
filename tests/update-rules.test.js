import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { RULE_SOURCES } from "../src/catalog.js";
import { updateRules } from "../scripts/update-rules.mjs";

function validListFor(url) {
  const source = RULE_SOURCES.find((entry) => entry.url === url);
  return Array.from(
    { length: source.minEntries },
    (_, index) => `DOMAIN-SUFFIX,${index}.${source.id.toLowerCase()}.example`,
  ).join("\n");
}

async function fixtureRepository() {
  const root = await mkdtemp(join(tmpdir(), "anywhere-update-test-"));
  await mkdir(join(root, "rules"), { recursive: true });
  await mkdir(join(root, "reports"), { recursive: true });
  await writeFile(join(root, "rules", "ai.arrs"), "known-good\n");
  await writeFile(join(root, "reports", "compatibility.json"), "{}\n");
  return root;
}

test("does not replace prior files when one source fails", async () => {
  const root = await fixtureRepository();
  const fetchImpl = async (url) =>
    url.includes("/Claude/")
      ? new Response("upstream failure", { status: 503 })
      : new Response(validListFor(url), { status: 200 });
  await assert.rejects(() => updateRules({ root, fetchImpl }), /Claude.*503/);
  assert.equal(await readFile(join(root, "rules", "ai.arrs"), "utf8"), "known-good\n");
});

test("writes a complete verified artifact set only after all downloads pass", async () => {
  const root = await fixtureRepository();
  const fetchImpl = async (url) => new Response(validListFor(url), { status: 200 });
  const summary = await updateRules({ root, fetchImpl });
  assert.equal(summary.sources, 29);
  assert.ok(summary.files > 20);
  assert.match(await readFile(join(root, "rules", "ai.arrs"), "utf8"), /name = 🤖 AI 专用/);
  const report = JSON.parse(await readFile(join(root, "reports", "compatibility.json"), "utf8"));
  assert.equal(report.sources.length, 29);
});
