import test from "node:test";
import assert from "node:assert/strict";

import { scanText } from "../src/secret-scanner.js";

test("reports secret categories without echoing matched values", () => {
  const secretURI =
    "vless://00000000-0000-4000-8000-000000000001@real.example.com:443#node"; // TEST_ONLY_FIXTURE
  const tokenURL = "https://sub.example.com/path?token=super-secret-value"; // TEST_ONLY_FIXTURE
  const githubToken = `ghp_${"A".repeat(36)}`;
  const text = [secretURI, tokenURL, githubToken].join("\n");
  const findings = scanText("unsafe.txt", text);
  assert.deepEqual(findings.map((finding) => finding.category), [
    "proxy-uri",
    "private-url",
    "github-token",
  ]);
  const output = JSON.stringify(findings);
  assert.doesNotMatch(output, /00000000-0000|super-secret|ghp_/);
});

test("allows generated rules, implementation syntax, and synthetic fixtures", () => {
  const safe = [
    "2, example.com",
    'const scheme = "vless://";',
    '"password": "TEST_ONLY_PASSWORD"',
    "https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/ai.arrs",
  ].join("\n");
  assert.deepEqual(scanText("safe.js", safe), []);
});
