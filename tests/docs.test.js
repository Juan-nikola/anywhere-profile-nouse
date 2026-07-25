import test from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("documents every public rule subscription and core Anywhere behavior", async () => {
  const readme = await read("README.md");
  const ruleNames = (await readdir(new URL("../rules", import.meta.url)))
    .filter((name) => name.endsWith(".arrs"));

  for (const name of ruleNames) {
    const url =
      `https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/${name}`;
    assert.match(readme, new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  for (const phrase of [
    "anywhere-sources",
    "anywhere-nodes",
    "Country Bypass",
    "Prevent DNS Leak",
    "anywhere://add-rule-set",
    "不能自动测速",
    "不能故障转移",
    "不能多层嵌套",
    "不要公开",
    "规则每天更新",
    "节点每 6 小时更新",
  ]) {
    assert.ok(readme.includes(phrase), `README.md missing: ${phrase}`);
  }
});

test("ships deployment, maintenance, compatibility, and troubleshooting guides", async () => {
  const required = {
    "docs/deployment.md": ["File Script", "output=nodes&type=collection&name=anywhere-sources"],
    "docs/maintenance.md": ["npm run verify", "update:rules"],
    "docs/compatibility.md": ["DOMAIN", "VMess", "代理链"],
    "docs/troubleshooting.md": ["Default", "Country Bypass", "脱敏"],
    "RELEASE_CHECKLIST.md": ["GitHub Actions", "Raw"],
  };

  for (const [path, phrases] of Object.entries(required)) {
    const text = await read(path);
    for (const phrase of phrases) {
      assert.ok(text.includes(phrase), `${path} missing: ${phrase}`);
    }
  }
});
