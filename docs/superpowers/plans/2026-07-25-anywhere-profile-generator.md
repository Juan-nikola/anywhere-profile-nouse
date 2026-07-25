# Anywhere Profile Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish `Juan-nikola/anywhere-profile`, a deterministic Anywhere rule and private-node-subscription generator that preserves every feasible behavior from the existing Shadowrocket profile.

**Architecture:** Keep rule parsing, CIDR handling, conflict resolution, ARR rendering, and node URI rendering in focused ESM modules. A deterministic update command downloads the 29 declared sources, validates per-source floors, generates public `.arrs` files and a compatibility report, while a bundled Sub-Store File Script generates the separate private Base64 node subscription. GitHub Actions regenerates and commits only verified content changes.

**Tech Stack:** Node.js 22+, ESM, built-in `node:test`, esbuild 0.28.1, GitHub Actions, Sub-Store File Script runtime, Anywhere `.arrs` and native URI formats.

## Global Constraints

- Do not modify the existing `shadowrocket-profile` repository or any existing Sub-Store resource.
- Public Git must never contain real node servers, ports, UUIDs, passwords, tokens, private subscription URLs, or Sub-Store administration URLs.
- Rules and reports must be byte-for-byte deterministic for identical inputs; no wall-clock timestamps in generated files.
- Only Anywhere rule types `0` IPv4 CIDR, `1` IPv6 CIDR, `2` domain suffix, and `3` domain keyword may appear in `.arrs`.
- Known unsupported Shadowrocket types are counted in reports; a previously unknown type fails generation.
- Empty node output and empty or under-floor upstream rule sources must fail closed.
- The official Anywhere client remains unmodified; automatic latency selection, failover, nested policy groups, protocol/UA/ASN routing, and shared policy selectors remain explicitly unsupported.
- Node refresh guidance is every 6 hours; public rules refresh daily.
- Node support is limited to accurately renderable VLESS, Hysteria2, Trojan, AnyTLS, Shadowsocks, and SOCKS5 entries.
- Use test-driven development: add a failing test, observe failure, add minimal implementation, observe pass, then commit.

---

## File Map

- `package.json`: Node version and verification commands.
- `.gitignore`: local dependencies, editor state, macOS metadata, and temporary downloads.
- `THIRD_PARTY_NOTICES.md`: attribution for Anywhere format research and Blackmatrix7 rule data.
- `src/catalog.js`: stable group definitions, source URLs, priority order, initial routing, custom rules.
- `src/rule-parser.js`: parse one Shadowrocket list into normalized Anywhere-capable rules plus diagnostics.
- `src/cidr.js`: dependency-free IPv4/IPv6 parsing, canonicalization, and containment.
- `src/conflict-resolver.js`: remove later rules that would violate earlier Shadowrocket priority under Anywhere specificity.
- `src/arrs.js`: deterministic ARR rendering and parsing validation.
- `src/rule-build.js`: combine downloaded texts, custom/local rules, conflict results, artifacts, and reports.
- `src/node-validation.js`: protocol-specific node validation with non-sensitive reason codes.
- `src/node-uri.js`: render supported Sub-Store node objects to Anywhere-native URIs.
- `src/node-normalizer.js`: stable naming, identity dedupe, diagnostics, and Base64 subscription output.
- `src/substore-entry.js`: Sub-Store File Script entry point.
- `scripts/update-rules.mjs`: network updater with atomic in-memory generation before filesystem replacement.
- `scripts/build.mjs`: bundle `src/substore-entry.js` for Sub-Store.
- `scripts/check-generated.mjs`: reproduce generated artifacts and fail on differences.
- `scripts/check-secrets.mjs`: scan tracked/public candidates for credential patterns.
- `scripts/check-links.mjs`: validate documented local paths and declared Raw rule URLs.
- `tests/*.test.js`: unit and integration coverage.
- `tests/fixtures/*.js`: entirely synthetic nodes and rule lists.
- `rules/*.arrs`: generated public Anywhere subscriptions.
- `reports/compatibility.json`: deterministic conversion and conflict counts.
- `README.md`: concise Chinese overview and quick start.
- `docs/deployment.md`: exact Sub-Store and Anywhere setup.
- `docs/maintenance.md`: daily operations, updates, adding providers, and rollback.
- `docs/compatibility.md`: supported/approximated/unsupported behavior matrix.
- `docs/troubleshooting.md`: diagnosis without exposing secrets.
- `RELEASE_CHECKLIST.md`: local, GitHub, Raw URL, and device canary gates.
- `.github/workflows/verify.yml`: pull/push verification.
- `.github/workflows/update-rules.yml`: scheduled verified regeneration and conditional commit.

---

### Task 1: Project Foundation and Routing Catalog

**Files:**
- Create: `.gitignore`
- Create: `package.json`
- Create: `THIRD_PARTY_NOTICES.md`
- Create: `src/catalog.js`
- Create: `tests/catalog.test.js`

**Interfaces:**
- Produces: `ROUTING`, `GROUPS`, `RULE_SOURCES`, `CUSTOM_RULES`, `LOCAL_RULES`, and `validateCatalog()` from `src/catalog.js`.
- `ROUTING` is `{ default: 0, direct: 1, reject: 2 }`.
- A group is `{ id, slug, name, routing, priority, sourceIds }`.
- A source is `{ id, url, groupId, minEntries }`.

- [ ] **Step 1: Add the failing catalog tests**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { GROUPS, RULE_SOURCES, ROUTING, validateCatalog } from "../src/catalog.js";

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
```

- [ ] **Step 2: Run the catalog tests and observe the missing module**

Run: `node --test tests/catalog.test.js`  
Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/catalog.js`.

- [ ] **Step 3: Add the package and complete catalog**

Create `package.json` with Node 22, ESM, `test`, `build`, `update:rules`,
`check:generated`, `check:secrets`, `check:links`, and `verify` scripts.
Add all 29 source records copied from the approved Shadowrocket catalog and
the approved group table. Define:

```js
export const ROUTING = Object.freeze({ default: 0, direct: 1, reject: 2 });

export function validateCatalog() {
  const sourceIds = new Set();
  const groupIds = new Set(GROUPS.map((group) => group.id));
  for (const source of RULE_SOURCES) {
    if (sourceIds.has(source.id)) throw new Error(`Duplicate source: ${source.id}`);
    if (!groupIds.has(source.groupId)) throw new Error(`Unknown group: ${source.groupId}`);
    if (!Number.isInteger(source.minEntries) || source.minEntries < 1) {
      throw new Error(`Invalid minimum: ${source.id}`);
    }
    sourceIds.add(source.id);
  }
  if (RULE_SOURCES.length !== 29) throw new Error("Expected 29 rule sources");
}
```

`CUSTOM_RULES` contains `block`, `direct`, `proxy`, and the six approved AI
suffixes; `LOCAL_RULES` contains localhost, `.local`, `.lan`, `home.arpa`,
private IPv4, CGNAT, loopback, link-local, multicast, ULA, and IPv6 multicast.

- [ ] **Step 4: Run the tests**

Run: `npm test`  
Expected: PASS, 2 catalog tests.

- [ ] **Step 5: Commit the foundation**

```bash
git add .gitignore package.json THIRD_PARTY_NOTICES.md src/catalog.js tests/catalog.test.js
git commit -m "feat: define Anywhere routing catalog"
```

---

### Task 2: Rule and CIDR Parsing

**Files:**
- Create: `src/cidr.js`
- Create: `src/rule-parser.js`
- Create: `tests/cidr.test.js`
- Create: `tests/rule-parser.test.js`

**Interfaces:**
- Produces: `parseCIDR(value)` → `{ version, bits, prefix, network, canonical }`.
- Produces: `cidrContains(parent, child)` → boolean.
- Produces: `parseRuleList(sourceId, text)` → `{ rules, counts, unsupported }`.
- A normalized rule is `{ sourceId, inputType, type, value, approximate }`.

- [ ] **Step 1: Add failing CIDR tests**

```js
test("canonicalizes and compares IPv4 networks", () => {
  const broad = parseCIDR("10.1.2.3/8");
  const narrow = parseCIDR("10.2.0.0/16");
  assert.equal(broad.canonical, "10.0.0.0/8");
  assert.equal(cidrContains(broad, narrow), true);
  assert.equal(cidrContains(narrow, broad), false);
});

test("canonicalizes compressed IPv6", () => {
  const cidr = parseCIDR("2001:db8::1/32");
  assert.equal(cidr.version, 6);
  assert.equal(cidr.canonical, "2001:db8::/32");
});
```

- [ ] **Step 2: Run CIDR tests and observe failure**

Run: `node --test tests/cidr.test.js`  
Expected: FAIL with missing `src/cidr.js`.

- [ ] **Step 3: Implement dependency-free CIDR utilities**

Parse IPv4 octets into a 32-bit `BigInt`; expand IPv6 `::`, embedded IPv4,
and eight hextets into a 128-bit `BigInt`. Mask host bits and render a stable
canonical address. Reject invalid prefix lengths, non-decimal IPv4 octets,
invalid hextets, and mixed address versions in `cidrContains()`.

- [ ] **Step 4: Pass CIDR tests**

Run: `node --test tests/cidr.test.js`  
Expected: PASS.

- [ ] **Step 5: Add failing rule parser tests**

```js
test("maps supported rules and reports approved approximations", () => {
  const parsed = parseRuleList("Example", [
    "DOMAIN,api.example.com",
    "DOMAIN-SUFFIX,example.org",
    "DOMAIN-KEYWORD,cdn",
    "IP-CIDR,10.1.2.3/8,no-resolve",
    "IP-CIDR6,2001:db8::1/32,no-resolve",
    "USER-AGENT,Example*",
  ].join("\n"));
  assert.deepEqual(parsed.rules.map(({ type, value, approximate }) => [type, value, approximate]), [
    [2, "api.example.com", true],
    [2, "example.org", false],
    [3, "cdn", false],
    [0, "10.0.0.0/8", false],
    [1, "2001:db8::/32", false],
  ]);
  assert.equal(parsed.unsupported["USER-AGENT"], 1);
});

test("rejects a newly unknown rule type", () => {
  assert.throws(() => parseRuleList("Example", "FUTURE-RULE,value"), /Unknown rule type/);
});
```

- [ ] **Step 6: Implement strict rule parsing**

Ignore blank/comment lines. Recognize the four supported source types plus
known unsupported `USER-AGENT`, `IP-ASN`, and `URL-REGEX`. Normalize domains
to lowercase without leading dots; validate non-empty values; canonicalize
CIDRs; set `approximate: true` only for `DOMAIN`. Treat all other leading
types as fatal.

- [ ] **Step 7: Run parser tests and all tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 8: Commit parsing**

```bash
git add src/cidr.js src/rule-parser.js tests/cidr.test.js tests/rule-parser.test.js
git commit -m "feat: parse Anywhere-compatible rules"
```

---

### Task 3: Shadowrocket-Priority Conflict Resolver

**Files:**
- Create: `src/conflict-resolver.js`
- Create: `tests/conflict-resolver.test.js`

**Interfaces:**
- Consumes: ordered `{ group, rules }[]` and normalized rules from Task 2.
- Produces: `resolveConflicts(groupEntries)` → `{ groups, report }`.
- `groups` preserves input order and contains filtered `rules`.
- `report` contains `identical`, `coveredSuffix`, `coveredKeyword`,
  `coveredCIDR`, and `crossGroup` counters.

- [ ] **Step 1: Add failing semantic tests**

```js
test("earlier broad suffix prevents a later specific suffix from stealing traffic", () => {
  const result = resolveConflicts([
    entry("security", [suffix("example.com")]),
    entry("china", [suffix("api.example.com")]),
  ]);
  assert.deepEqual(result.groups[1].rules, []);
  assert.equal(result.report.coveredSuffix, 1);
});

test("earlier specific suffix coexists with a later broad suffix", () => {
  const result = resolveConflicts([
    entry("github", [suffix("api.github.com")]),
    entry("microsoft", [suffix("github.com")]),
  ]);
  assert.equal(result.groups[0].rules.length, 1);
  assert.equal(result.groups[1].rules.length, 1);
});

test("earlier broad CIDR prevents Anywhere longest-prefix reversal", () => {
  const result = resolveConflicts([
    entry("security", [ipv4("10.0.0.0/8")]),
    entry("china", [ipv4("10.1.0.0/16")]),
  ]);
  assert.equal(result.groups[1].rules.length, 0);
  assert.equal(result.report.coveredCIDR, 1);
});
```

- [ ] **Step 2: Run and observe the missing resolver**

Run: `node --test tests/conflict-resolver.test.js`  
Expected: FAIL with missing module.

- [ ] **Step 3: Implement indexed conflict resolution**

Use a reversed-label suffix trie, a small ordered keyword index, per-version
CIDR prefix maps, and exact type/value maps. Process groups by approved
priority and rules by source order. Drop a later rule only when every match
it can produce is already captured by an earlier rule:

```js
function candidateIsCovered(rule, indexes) {
  if (indexes.exact.has(`${rule.type}\0${rule.value}`)) return "identical";
  if (rule.type === 2 && indexes.suffix.hasAncestor(rule.value)) return "coveredSuffix";
  if (rule.type === 2 && indexes.keywords.some((word) => rule.value.includes(word))) return "coveredKeyword";
  if (rule.type === 3 && indexes.keywords.some((word) => rule.value.includes(word))) return "coveredKeyword";
  if ((rule.type === 0 || rule.type === 1) && indexes.cidr.hasAncestor(rule.value)) return "coveredCIDR";
  return null;
}
```

Indexes retain the owning group so `crossGroup` counts only conflicts across
different destinations. Sort final rules by type and value for deterministic
output after ownership has been decided.

- [ ] **Step 4: Run resolver and full tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 5: Commit conflict preservation**

```bash
git add src/conflict-resolver.js tests/conflict-resolver.test.js
git commit -m "feat: preserve routing priority across Anywhere rules"
```

---

### Task 4: Deterministic ARR and Compatibility Artifact Builder

**Files:**
- Create: `src/arrs.js`
- Create: `src/rule-build.js`
- Create: `tests/arrs.test.js`
- Create: `tests/rule-build.test.js`

**Interfaces:**
- Produces: `renderARRS(group, rules, sourceIds, generatorVersion)` → string.
- Produces: `parseARRS(text)` → `{ name, routing, rules }` for validation.
- Produces: `buildRuleArtifacts(downloads, options?)` → `{ files, report }`;
  `files` is a `Map<string,string>` relative to `rules/`.

- [ ] **Step 1: Add failing ARR round-trip tests**

```js
test("renders deterministic Anywhere rule sets", () => {
  const text = renderARRS(
    { name: "🤖 AI 专用", routing: 0 },
    [{ type: 2, value: "openai.com" }, { type: 0, value: "1.2.3.0/24" }],
    ["OpenAI", "Claude"],
    "0.1.0",
  );
  assert.match(text, /^# Generated by anywhere-profile 0\\.1\\.0/m);
  assert.doesNotMatch(text, /2026-|T\\d\\d:/);
  assert.deepEqual(parseARRS(text), {
    name: "🤖 AI 专用",
    routing: 0,
    rules: [{ type: 0, value: "1.2.3.0/24" }, { type: 2, value: "openai.com" }],
  });
});
```

- [ ] **Step 2: Implement ARR rendering and strict re-parser**

Quote nothing because ARR rule values cannot contain commas. Emit header
comments, `name`, `routing`, a blank line, and sorted `type, value` lines.
The re-parser rejects duplicate headers, unsupported IDs, empty values, and
malformed lines.

- [ ] **Step 3: Add failing full artifact test**

Build synthetic downloads for all sources from the catalog, using at least
`minEntries` duplicate-safe fixture lines per source. Assert:

```js
const { files, report } = buildRuleArtifacts(downloads);
assert.ok(files.has("ai.arrs"));
assert.ok(files.has("china.arrs"));
assert.equal(parseARRS(files.get("security.arrs")).routing, 2);
assert.equal(parseARRS(files.get("china.arrs")).routing, 1);
assert.equal(report.sources.length, 29);
assert.equal(report.generatorVersion, "0.1.0");
assert.equal(Object.hasOwn(report, "generatedAt"), false);
```

- [ ] **Step 4: Implement the artifact orchestration**

Validate the catalog and every source floor, parse all sources, prepend
approved custom/local rule entries, resolve conflicts in group priority
order, render every non-empty group, and build a sorted report with per-source
input/supported/approximate/unsupported counts and global conflict counts.
Do not emit empty custom groups; document their source arrays for later edits.

- [ ] **Step 5: Run all tests**

Run: `npm test`  
Expected: PASS.

- [ ] **Step 6: Commit the deterministic rule builder**

```bash
git add src/arrs.js src/rule-build.js tests/arrs.test.js tests/rule-build.test.js
git commit -m "feat: generate deterministic Anywhere rule sets"
```

---

### Task 5: Network Update, Generated Checks, and Initial Public Rules

**Files:**
- Create: `scripts/update-rules.mjs`
- Create: `scripts/check-generated.mjs`
- Create: `tests/update-rules.test.js`
- Generate: `rules/*.arrs`
- Generate: `reports/compatibility.json`

**Interfaces:**
- Produces: `fetchRuleSources(fetchImpl)` → `Map<sourceId,text>`.
- Produces: `writeArtifacts(root, artifacts)` with all content prepared
  before existing files are replaced.
- CLI: `node scripts/update-rules.mjs`.

- [ ] **Step 1: Add failing fetch and fail-closed tests**

```js
test("does not replace prior files when one source fails", async () => {
  const existing = await fixtureRepository();
  const fetchImpl = async (url) => url.includes("/Claude/")
    ? new Response("upstream failure", { status: 503 })
    : new Response(validListFor(url), { status: 200 });
  await assert.rejects(() => updateRules({ root: existing, fetchImpl }), /Claude.*503/);
  assert.equal(await readFile(join(existing, "rules/ai.arrs"), "utf8"), "known-good\n");
});
```

- [ ] **Step 2: Implement bounded concurrent downloads**

Use `AbortSignal.timeout(20_000)`, a descriptive `User-Agent`, explicit 2xx
checks, UTF-8 text, and source-specific error messages. Build every artifact
in memory and validate it before writing. Write through a temporary directory
inside the repository, rename completed files, then remove stale generated
ARR files only after success.

- [ ] **Step 3: Implement reproducibility checking**

`check-generated.mjs` downloads the current sources, regenerates in a
temporary directory, and compares file names and bytes against `rules/` and
`reports/compatibility.json`. It exits non-zero with only paths and hashes,
never remote response bodies.

- [ ] **Step 4: Run the updater against all 29 live sources**

Run: `npm run update:rules`  
Expected: 29 sources accepted; generated `.arrs` files and compatibility report.

- [ ] **Step 5: Run tests and inspect generated formats**

Run: `npm test && npm run check:generated`  
Expected: PASS and no differences.

- [ ] **Step 6: Commit update tooling and initial artifacts**

```bash
git add scripts/update-rules.mjs scripts/check-generated.mjs tests/update-rules.test.js rules reports
git commit -m "feat: publish verified Anywhere rule subscriptions"
```

---

### Task 6: Supported Node Validation and Native URI Rendering

**Files:**
- Create: `src/node-validation.js`
- Create: `src/node-uri.js`
- Create: `tests/fixtures/nodes.js`
- Create: `tests/node-validation.test.js`
- Create: `tests/node-uri.test.js`

**Interfaces:**
- Produces: `validateNode(node)` → `{ valid, protocol, reason?, warnings }`.
- Produces: `renderNodeURI(node)` → native URI string or throws a
  credential-free error carrying a reason code.
- Produces: `SUPPORTED_PROTOCOLS`.

- [ ] **Step 1: Add synthetic protocol fixtures**

Fixtures use documentation-only addresses (`192.0.2.0/24`,
`198.51.100.0/24`, `2001:db8::/32`) and values beginning `TEST_ONLY_`.
Include SS2022, VLESS Reality, VLESS WS, VLESS gRPC, VLESS XHTTP, Hysteria2
with obfuscation, Trojan, AnyTLS, authenticated SOCKS5, an unsupported Snell,
and invalid entries.

- [ ] **Step 2: Add failing validation tests**

```js
test("allows only protocols Anywhere can import natively", () => {
  assert.equal(validateNode(fixtures.vlessReality).valid, true);
  assert.equal(validateNode(fixtures.hysteria2).valid, true);
  assert.deepEqual(validateNode(fixtures.snell), {
    valid: false, protocol: "snell", reason: "unsupported-protocol", warnings: [],
  });
});
```

- [ ] **Step 3: Implement non-sensitive validation**

Validate object shape, non-empty name/server, integer port 1–65535, and
protocol fields. Errors expose only reason codes such as `missing-server`,
`invalid-port`, `missing-credential`, `unsupported-transport`, and
`unsupported-protocol`.

- [ ] **Step 4: Add failing URI assertions**

```js
test("renders VLESS Reality with Anywhere parameter names", () => {
  const uri = new URL(renderNodeURI(fixtures.vlessReality));
  assert.equal(uri.protocol, "vless:");
  assert.equal(uri.searchParams.get("security"), "reality");
  assert.equal(uri.searchParams.get("pbk"), "TEST_ONLY_PUBLIC_KEY");
  assert.equal(uri.searchParams.get("sid"), "00000000");
});

test("brackets IPv6 and encodes credentials", () => {
  const uri = renderNodeURI(fixtures.socksIPv6);
  assert.match(uri, /^socks5:\\/\\/user:.*@\\[2001:db8::10\\]:1080#/);
});
```

- [ ] **Step 5: Implement native URI rendering**

Use the parameter names consumed by the inspected Anywhere source:
`security`, `type`, `encryption`, `flow`, `sni`, `alpn`, `fp`, `pbk`, `sid`,
WS `host/path/ed`, gRPC `serviceName/authority/mode`, and XHTTP parameters.
Render Hysteria2 `upmbps/downmbps`, `obfs`, `obfs-password`, Gecko packet
sizes, and `sni`; AnyTLS `ici/it/mis`; SIP002 SS; and standard SOCKS5.
Percent-encode each component independently and bracket IPv6 authority.

- [ ] **Step 6: Pass focused and full tests**

Run: `node --test tests/node-validation.test.js tests/node-uri.test.js && npm test`  
Expected: PASS.

- [ ] **Step 7: Commit node compatibility**

```bash
git add src/node-validation.js src/node-uri.js tests/fixtures/nodes.js tests/node-validation.test.js tests/node-uri.test.js
git commit -m "feat: render Anywhere-native node subscriptions"
```

---

### Task 7: Node Normalization, Sub-Store Entry, and Bundle

**Files:**
- Create: `src/node-normalizer.js`
- Create: `src/substore-entry.js`
- Create: `scripts/build.mjs`
- Create: `tests/node-normalizer.test.js`
- Create: `tests/substore-entry.test.js`
- Generate: `dist/substore-node-generator.js`

**Interfaces:**
- Produces: `normalizeNodes(nodes)` → `{ nodes, diagnostics }`.
- Produces: `produceNodeSubscription(nodes)` → `{ content, diagnostics }`,
  where `content` is standard Base64 of newline-delimited native URIs.
- Exposes Sub-Store `operator(proxies, targetPlatform, context)` returning
  the Base64 string.

- [ ] **Step 1: Add failing normalization tests**

```js
test("deduplicates by network identity and never logs identities", () => {
  const result = normalizeNodes([fixtures.vlessReality, structuredClone(fixtures.vlessReality)]);
  assert.equal(result.nodes.length, 1);
  assert.deepEqual(result.diagnostics.excluded, { "exact-duplicate": 1 });
  assert.doesNotMatch(JSON.stringify(result.diagnostics), /192\\.0\\.2\\.|00000000-0000/);
});

test("refuses an empty supported set", () => {
  assert.throws(() => produceNodeSubscription([fixtures.snell]), /No valid Anywhere nodes/);
});
```

- [ ] **Step 2: Implement stable normalization**

Normalize protocol aliases (`hy2` to `hysteria2`, `shadowsocks` to `ss`),
preserve source classification labels and region flags using focused,
adapted logic from the user-owned Shadowrocket project, and compute duplicate
identities with SHA-256 without returning identity material. Sort by region
and display name before URI rendering.

- [ ] **Step 3: Add failing Sub-Store entry tests**

```js
test("returns Base64 subscription and safe diagnostics", async () => {
  const logs = [];
  const output = await operator([fixtures.vlessReality], "URI", {
    arguments: { output: "nodes" },
    logger: { info: (line) => logs.push(line) },
  });
  const decoded = Buffer.from(output, "base64").toString("utf8");
  assert.match(decoded, /^vless:\\/\\//);
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs[0], /192\\.0\\.2\\.|TEST_ONLY_PUBLIC_KEY/);
});
```

- [ ] **Step 4: Implement strict Sub-Store entry**

Accept only `output=nodes`; reject unknown public arguments. Ignore
`targetPlatform` because output is already an Anywhere-native Base64
subscription. Log one JSON diagnostics line through the supplied logger.

- [ ] **Step 5: Bundle and test the distributable**

Bundle with esbuild as an IIFE exposing the required Sub-Store global
operator shape, deterministic banner, UTF-8, and no source map.

Run: `npm run build && node --test tests/substore-entry.test.js`  
Expected: PASS and `dist/substore-node-generator.js` exists.

- [ ] **Step 6: Commit Sub-Store output**

```bash
git add src/node-normalizer.js src/substore-entry.js scripts/build.mjs tests/node-normalizer.test.js tests/substore-entry.test.js dist/substore-node-generator.js package-lock.json
git commit -m "feat: build private Anywhere node generator"
```

---

### Task 8: Verification, Secret Scanning, and CI

**Files:**
- Create: `scripts/check-secrets.mjs`
- Create: `scripts/check-links.mjs`
- Create: `tests/security.test.js`
- Create: `tests/generated.test.js`
- Create: `.github/workflows/verify.yml`
- Create: `.github/workflows/update-rules.yml`

**Interfaces:**
- CLI: `npm run check:secrets`, `npm run check:links`, `npm run verify`.
- Scheduled workflow performs update, verify, conditional commit, and push.

- [ ] **Step 1: Add failing security tests**

Create a temporary repository fixture containing a `vless://` URI,
`subscription?token=...`, a GitHub token shape, and a safe `.arrs`; assert
the scanner reports only file path, line number, and category, never the
matched secret.

- [ ] **Step 2: Implement secret and link scanners**

Scan tracked candidates obtained from `git ls-files` plus untracked files
under intended public directories. Allow synthetic `TEST_ONLY_` fixture
values. Reject native proxy schemes outside fixture source files, token/key
patterns, private subscription query parameters, and common credential JSON
keys. Check Markdown relative links and assert every cataloged rule file has
a corresponding documented Raw URL.

- [ ] **Step 3: Add generated artifact tests**

Assert bundle rebuild equality, ARR round-trip validity, sorted JSON report,
and no unsupported IDs or malformed comment/header lines.

- [ ] **Step 4: Add verification workflow**

`verify.yml` runs checkout, setup-node 22, `npm ci`, and `npm run verify`.
Set `permissions: contents: read`.

- [ ] **Step 5: Add scheduled update workflow**

Use:

```yaml
on:
  schedule:
    - cron: "23 19 * * *"
  workflow_dispatch:
permissions:
  contents: write
```

Run `npm ci`, `npm run update:rules`, and `npm run verify`; configure the bot
identity; commit only `rules/` and `reports/compatibility.json` when
`git diff --quiet` is false; push the current branch. Do not expose response
bodies in failure logging.

- [ ] **Step 6: Run the complete verification**

Run: `npm run verify`  
Expected: all tests, bundle checks, live rule checks, generated checks,
link checks, and secret scans pass.

- [ ] **Step 7: Commit verification and CI**

```bash
git add scripts/check-secrets.mjs scripts/check-links.mjs tests/security.test.js tests/generated.test.js .github/workflows
git commit -m "ci: verify and refresh Anywhere rules"
```

---

### Task 9: Chinese Documentation and Release Checklist

**Files:**
- Create: `README.md`
- Create: `docs/deployment.md`
- Create: `docs/maintenance.md`
- Create: `docs/compatibility.md`
- Create: `docs/troubleshooting.md`
- Create: `RELEASE_CHECKLIST.md`
- Create: `tests/docs.test.js`

**Interfaces:**
- Documents the exact `Juan-nikola/anywhere-profile` Raw URLs and
  `anywhere-sources` / `anywhere-nodes` resource names.

- [ ] **Step 1: Add failing documentation contract tests**

Assert README contains:

```js
for (const phrase of [
  "anywhere-sources", "anywhere-nodes", "Country Bypass",
  "不能自动测速", "不能故障转移", "不能多层嵌套",
  "不要公开", "规则每天更新", "节点每 6 小时更新",
]) assert.match(readme, new RegExp(phrase));
```

Assert every emitted `rules/<slug>.arrs` has an HTTPS Raw URL in README and
that deployment, maintenance, compatibility, troubleshooting, and release
checklist links exist.

- [ ] **Step 2: Write the README quick start**

Lead with outcomes, then unavoidable differences. Include the complete rule
group/default table, all Raw URLs, shortest deployment path, security
boundary, and links to detailed guides. State that `Default` means inactive
and therefore follows lower routing/global behavior until a specific node
is selected.

- [ ] **Step 3: Write detailed guides**

Deployment includes backup, independent Sub-Store group creation, File
Script installation, private output creation, first refresh, Anywhere node
import, ARR import, initial assignments, China Country Bypass, one-device
canary, and rollback. Maintenance covers adding a provider and daily node
switching. Compatibility enumerates exact, approximate, and unsupported
features using generated report counts. Troubleshooting uses only domain and
reason-code diagnostics and warns against screenshots of complete URLs.

- [ ] **Step 4: Write release checklist**

Require local verify, clean worktree, public secret scan, GitHub Actions
success, Raw URL HTTP 200, independent device canary, LAN/direct/proxy tests,
and preserved Shadowrocket rollback.

- [ ] **Step 5: Run documentation and full verification**

Run: `node --test tests/docs.test.js && npm run verify`  
Expected: PASS.

- [ ] **Step 6: Commit documentation**

```bash
git add README.md docs/deployment.md docs/maintenance.md docs/compatibility.md docs/troubleshooting.md RELEASE_CHECKLIST.md tests/docs.test.js
git commit -m "docs: add Anywhere deployment and maintenance guides"
```

---

### Task 10: Independent Review, GitHub Publication, and Production Validation

**Files:**
- Modify only if review finds defects in files created by Tasks 1–9.

**Interfaces:**
- Creates public GitHub repository `Juan-nikola/anywhere-profile`.
- Production branch is `main`.

- [ ] **Step 1: Run spec-coverage review**

Compare every section of
`docs/superpowers/specs/2026-07-25-anywhere-profile-design.md` against code,
tests, workflows, reports, and docs. Record gaps in the task log and fix each
with a failing regression test before implementation.

- [ ] **Step 2: Run fresh full verification**

Run:

```bash
npm ci
npm run verify
git status --short
```

Expected: verify succeeds and the worktree is clean.

- [ ] **Step 3: Create the public GitHub repository**

Resolve the authenticated account with `gh api user --jq .login`, require it
to equal `Juan-nikola`, then run:

```bash
gh repo create Juan-nikola/anywhere-profile \
  --public \
  --source=. \
  --remote=origin \
  --description="Anywhere 日常无感分流、规则订阅与私密节点生成器"
```

Do not use `--push` until the remote target has been read back and verified.

- [ ] **Step 4: Verify the remote and push**

Run:

```bash
git remote get-url origin
gh repo view Juan-nikola/anywhere-profile --json nameWithOwner,isPrivate,url
git push -u origin main
```

Expected: exact owner/name, `isPrivate=false`, and successful push.

- [ ] **Step 5: Observe GitHub Actions and Raw files**

Use `gh run list` / `gh run watch` for the initial verify workflow. Check at
least `rules/ai.arrs`, `rules/china.arrs`, and
`reports/compatibility.json` through `raw.githubusercontent.com` and require
HTTP 200 plus expected headers/content.

- [ ] **Step 6: Create the initial release**

After Actions and Raw validation pass:

```bash
git tag -a v0.1.0 -m "Anywhere profile generator v0.1.0"
git push origin v0.1.0
gh release create v0.1.0 --title "v0.1.0" --notes-file RELEASE_CHECKLIST.md
```

- [ ] **Step 7: Final completion evidence**

Report the public repository URL, commit, tag, Actions result, generated rule
count, supported/approximated/unsupported counts, and exact next steps the
user must perform in their private Sub-Store and Anywhere app. Do not claim
the private device deployment is complete until the user performs it.

