import test from "node:test";
import assert from "node:assert/strict";

import { RULE_SOURCES } from "../src/catalog.js";
import { parseARRS } from "../src/arrs.js";
import { buildRuleArtifacts } from "../src/rule-build.js";

function syntheticDownloads() {
  return new Map(
    RULE_SOURCES.map((source, sourceIndex) => [
      source.id,
      [
        `DOMAIN-SUFFIX,${source.id.toLowerCase()}.example`,
        `IP-CIDR,198.${sourceIndex}.0.0/16`,
      ].join("\n"),
    ]),
  );
}

test("builds approved groups and deterministic compatibility report", () => {
  const { files, report } = buildRuleArtifacts(syntheticDownloads(), {
    enforceMinimums: false,
  });
  assert.ok(files.has("ai.arrs"));
  assert.ok(files.has("china.arrs"));
  assert.equal(parseARRS(files.get("security.arrs")).routing, 2);
  assert.equal(parseARRS(files.get("china.arrs")).routing, 1);
  assert.equal(report.sources.length, 29);
  assert.equal(report.generatorVersion, "0.1.0");
  assert.equal(Object.hasOwn(report, "generatedAt"), false);
  assert.deepEqual([...files.keys()], [...files.keys()].toSorted());
});

test("merges custom AI rules into one public AI selector", () => {
  const { files } = buildRuleArtifacts(syntheticDownloads(), {
    enforceMinimums: false,
  });
  const ai = parseARRS(files.get("ai.arrs"));
  assert.ok(ai.rules.some((rule) => rule.value === "openai.example"));
  assert.ok(ai.rules.some((rule) => rule.value === "perplexity.ai"));
  assert.equal(files.has("custom-ai.arrs"), false);
});

test("fails a source below its declared floor", () => {
  const downloads = syntheticDownloads();
  assert.throws(() => buildRuleArtifacts(downloads), /Hijacking.*minimum/);
});
