import test from "node:test";
import assert from "node:assert/strict";

import { parseRuleList } from "../src/rule-parser.js";

test("maps supported rules and reports approved approximations", () => {
  const parsed = parseRuleList(
    "Example",
    [
      "DOMAIN,api.example.com",
      "DOMAIN-SUFFIX,example.org",
      "DOMAIN-KEYWORD,cdn",
      "IP-CIDR,10.1.2.3/8,no-resolve",
      "IP-CIDR6,2001:db8::1/32,no-resolve",
      "USER-AGENT,Example*",
    ].join("\n"),
  );
  assert.deepEqual(
    parsed.rules.map(({ type, value, approximate }) => [type, value, approximate]),
    [
      [2, "api.example.com", true],
      [2, "example.org", false],
      [3, "cdn", false],
      [0, "10.0.0.0/8", false],
      [1, "2001:db8::/32", false],
    ],
  );
  assert.equal(parsed.unsupported["USER-AGENT"], 1);
  assert.equal(parsed.counts.input, 6);
  assert.equal(parsed.counts.supported, 5);
  assert.equal(parsed.counts.approximate, 1);
});

test("ignores comments and rejects malformed supported rules", () => {
  const parsed = parseRuleList("Example", "# comment\n\nDOMAIN-SUFFIX,Example.COM\n");
  assert.equal(parsed.rules[0].value, "example.com");
  assert.throws(() => parseRuleList("Example", "DOMAIN-SUFFIX,"), /missing value/i);
  assert.throws(() => parseRuleList("Example", "IP-CIDR,not-an-ip"), /invalid/i);
});

test("derives the Anywhere IP type from the actual address family", () => {
  const parsed = parseRuleList(
    "MixedIP",
    [
      "IP-CIDR,2607:fb10::/32,no-resolve",
      "IP-CIDR6,192.0.2.0/24,no-resolve",
    ].join("\n"),
  );
  assert.deepEqual(
    parsed.rules.map(({ type, value }) => [type, value]),
    [
      [1, "2607:fb10::/32"],
      [0, "192.0.2.0/24"],
    ],
  );
});

test("rejects a newly unknown rule type", () => {
  assert.throws(
    () => parseRuleList("Example", "FUTURE-RULE,value"),
    /Unknown rule type.*FUTURE-RULE/,
  );
});
