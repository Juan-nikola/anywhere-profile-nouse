import test from "node:test";
import assert from "node:assert/strict";

import { resolveConflicts } from "../src/conflict-resolver.js";

function group(id) {
  return { id, slug: id, name: id, routing: 0 };
}

function entry(id, rules) {
  return { group: group(id), rules };
}

function rule(type, value) {
  return { sourceId: "fixture", inputType: "fixture", type, value, approximate: false };
}

const suffix = (value) => rule(2, value);
const keyword = (value) => rule(3, value);
const ipv4 = (value) => rule(0, value);

test("earlier broad suffix prevents a later specific suffix from stealing traffic", () => {
  const result = resolveConflicts([
    entry("security", [suffix("example.com")]),
    entry("china", [suffix("api.example.com")]),
  ]);
  assert.deepEqual(result.groups[1].rules, []);
  assert.equal(result.report.coveredSuffix, 1);
  assert.equal(result.report.crossGroup, 1);
});

test("earlier specific suffix coexists with a later broad suffix", () => {
  const result = resolveConflicts([
    entry("github", [suffix("api.github.com")]),
    entry("microsoft", [suffix("github.com")]),
  ]);
  assert.equal(result.groups[0].rules.length, 1);
  assert.equal(result.groups[1].rules.length, 1);
});

test("earlier keyword prevents a later keyword or suffix subset", () => {
  const result = resolveConflicts([
    entry("security", [keyword("tracker")]),
    entry("ads", [keyword("supertracker"), suffix("tracker.example")]),
  ]);
  assert.equal(result.groups[1].rules.length, 0);
  assert.equal(result.report.coveredKeyword, 2);
});

test("earlier broad CIDR prevents Anywhere longest-prefix reversal", () => {
  const result = resolveConflicts([
    entry("security", [ipv4("10.0.0.0/8")]),
    entry("china", [ipv4("10.1.0.0/16")]),
  ]);
  assert.equal(result.groups[1].rules.length, 0);
  assert.equal(result.report.coveredCIDR, 1);
});

test("deduplicates identical rules and returns stable sorting", () => {
  const result = resolveConflicts([
    entry("one", [suffix("z.example"), ipv4("192.0.2.0/24"), suffix("a.example")]),
    entry("two", [suffix("z.example")]),
  ]);
  assert.deepEqual(
    result.groups[0].rules.map(({ type, value }) => [type, value]),
    [
      [0, "192.0.2.0/24"],
      [2, "a.example"],
      [2, "z.example"],
    ],
  );
  assert.equal(result.report.identical, 1);
});
