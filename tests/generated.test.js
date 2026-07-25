import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

import { parseARRS } from "../src/arrs.js";

test("every committed ARR file parses and uses supported IDs", async () => {
  const names = (await readdir(new URL("../rules/", import.meta.url)))
    .filter((name) => name.endsWith(".arrs"));
  assert.ok(names.length >= 20);
  for (const name of names) {
    const text = await readFile(new URL(`../rules/${name}`, import.meta.url), "utf8");
    const parsed = parseARRS(text);
    assert.ok(parsed.rules.length > 0, name);
    assert.ok(parsed.rules.every((rule) => [0, 1, 2, 3].includes(rule.type)), name);
  }
});

test("the Sub-Store bundle is portable and contains its wrapper", async () => {
  const bundle = await readFile(
    new URL("../dist/substore-node-generator.js", import.meta.url),
    "utf8",
  );
  assert.doesNotMatch(bundle, /\bBuffer\b|node:|require\(/);
  assert.match(bundle, /async function operator\(input, targetPlatform\)/);
  assert.match(bundle, /produceArtifact/);
});
