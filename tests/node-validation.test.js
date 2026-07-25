import test from "node:test";
import assert from "node:assert/strict";

import { validateNode } from "../src/node-validation.js";
import { nodeFixtures } from "./fixtures/nodes.js";

test("allows only protocols Anywhere can import natively", () => {
  assert.equal(validateNode(nodeFixtures.vlessReality).valid, true);
  assert.equal(validateNode(nodeFixtures.hysteria2).valid, true);
  assert.deepEqual(validateNode(nodeFixtures.snell), {
    valid: false,
    protocol: "snell",
    reason: "unsupported-protocol",
    warnings: [],
  });
});

test("rejects malformed supported nodes with reason codes only", () => {
  assert.deepEqual(validateNode(nodeFixtures.invalidPort), {
    valid: false,
    protocol: "ss",
    reason: "invalid-port",
    warnings: [],
  });
  assert.equal(validateNode({ type: "vless", name: "x", server: "x", port: 443 }).reason,
    "missing-credential");
  assert.equal(validateNode({
    ...nodeFixtures.trojan,
    network: "ws",
  }).reason, "unsupported-transport");
});
