import test from "node:test";
import assert from "node:assert/strict";

import {
  GROUPS,
  RULE_SOURCES,
  ROUTING,
  validateCatalog,
} from "../src/catalog.js";

test("catalog declares every upstream exactly once", () => {
  assert.equal(RULE_SOURCES.length, 29);
  assert.equal(new Set(RULE_SOURCES.map((source) => source.id)).size, 29);
  assert.doesNotThrow(() => validateCatalog());
});

test("groups preserve the approved initial routing", () => {
  const byId = new Map(GROUPS.map((group) => [group.id, group]));
  assert.equal(byId.get("security").routing, ROUTING.reject);
  assert.equal(byId.get("china").routing, ROUTING.direct);
  assert.equal(byId.get("ai").routing, ROUTING.default);
  assert.ok(byId.get("ai").sourceIds.includes("OpenAI"));
  assert.ok(byId.get("social").sourceIds.includes("Twitter"));
});

test("catalog slugs, priorities, and source ownership are unique", () => {
  assert.equal(new Set(GROUPS.map((group) => group.slug)).size, GROUPS.length);
  assert.equal(new Set(GROUPS.map((group) => group.priority)).size, GROUPS.length);
  for (const source of RULE_SOURCES) {
    assert.equal(
      GROUPS.find((group) => group.id === source.groupId)?.sourceIds.includes(source.id),
      true,
      `${source.id} must belong to ${source.groupId}`,
    );
  }
});
