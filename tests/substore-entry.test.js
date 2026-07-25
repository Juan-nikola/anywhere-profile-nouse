import test from "node:test";
import assert from "node:assert/strict";

import { operator } from "../src/substore-entry.js";
import { nodeFixtures } from "./fixtures/nodes.js";

test("reads an isolated collection and returns a File Script artifact", async () => {
  const logs = [];
  const calls = [];
  const output = await operator(
    { name: "anywhere-nodes" },
    "JSON",
    {
      arguments: {
        output: "nodes",
        type: "collection",
        name: "anywhere-sources",
      },
      produceArtifact: async (request) => {
        calls.push(request);
        return [nodeFixtures.vlessReality];
      },
      logger: { info: (line) => logs.push(line) },
    },
  );
  assert.deepEqual(calls, [{
    type: "collection",
    name: "anywhere-sources",
    platform: "JSON",
    produceType: "internal",
  }]);
  const decoded = Buffer.from(output.$content, "base64").toString("utf8");
  assert.match(decoded, /^vless:\/\//);
  assert.equal(output.name, "anywhere-nodes");
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /192\.0\.2\.|TEST_ONLY|00000000-0000/);
});

test("rejects unknown options and empty source artifacts", async () => {
  await assert.rejects(
    () => operator({}, "JSON", {
      arguments: { output: "nodes", name: "anywhere-sources", secret: "x" },
      produceArtifact: async () => [],
    }),
    /Unknown option/,
  );
  await assert.rejects(
    () => operator({}, "JSON", {
      arguments: { output: "nodes", name: "anywhere-sources" },
      produceArtifact: async () => [],
    }),
    /non-empty node array/,
  );
});
