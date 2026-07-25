import test from "node:test";
import assert from "node:assert/strict";

import {
  normalizeNodes,
  produceNodeSubscription,
} from "../src/node-normalizer.js";
import { nodeFixtures } from "./fixtures/nodes.js";

test("deduplicates by network identity and never returns identities", () => {
  const result = normalizeNodes([
    nodeFixtures.vlessReality,
    structuredClone(nodeFixtures.vlessReality),
  ]);
  assert.equal(result.nodes.length, 1);
  assert.deepEqual(result.diagnostics.excluded, { "exact-duplicate": 1 });
  assert.doesNotMatch(
    JSON.stringify(result.diagnostics),
    /192\.0\.2\.|00000000-0000|TEST_ONLY/,
  );
});

test("filters unsupported nodes and produces a Base64 native subscription", () => {
  const result = produceNodeSubscription([
    nodeFixtures.shadowsocks,
    nodeFixtures.vlessReality,
    nodeFixtures.snell,
  ]);
  const decoded = Buffer.from(result.content, "base64").toString("utf8");
  assert.match(decoded, /^ss:\/\//);
  assert.match(decoded, /\nvless:\/\//);
  assert.equal(result.diagnostics.accepted, 2);
  assert.equal(result.diagnostics.excluded["unsupported-protocol"], 1);
});

test("refuses an empty supported set", () => {
  assert.throws(
    () => produceNodeSubscription([nodeFixtures.snell]),
    /No valid Anywhere nodes/,
  );
});

