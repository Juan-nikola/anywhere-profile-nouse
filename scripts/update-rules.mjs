// 完整下载并验证 29 个来源后才替换 ARR 与兼容性报告，失败保留旧版本。
import { mkdtemp, mkdir, readdir, rename, rm, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { RULE_SOURCES } from "../src/catalog.js";
import { buildRuleArtifacts } from "../src/rule-build.js";

const USER_AGENT = "anywhere-profile/0.1 (+https://github.com/Juan-nikola/anywhere-profile)";

export async function fetchRuleSources(fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch implementation is required");
  const results = await Promise.all(
    RULE_SOURCES.map(async (source) => {
      let response;
      try {
        response = await fetchImpl(source.url, {
          headers: { "User-Agent": USER_AGENT },
          signal: AbortSignal.timeout(20_000),
        });
      } catch (error) {
        throw new Error(`${source.id} download failed: ${error.message}`);
      }
      if (!response?.ok) {
        throw new Error(`${source.id} download failed: HTTP ${response?.status ?? "unknown"}`);
      }
      const text = await response.text();
      if (!text.trim()) throw new Error(`${source.id} download failed: empty response`);
      return [source.id, text];
    }),
  );
  return new Map(results);
}

function reportText(report) {
  return `${JSON.stringify(report, null, 2)}\n`;
}

export async function writeArtifacts(root, artifacts) {
  const absoluteRoot = resolve(root);
  const temporary = await mkdtemp(join(tmpdir(), "anywhere-profile-artifacts-"));
  const temporaryRules = join(temporary, "rules");
  const targetRules = join(absoluteRoot, "rules");
  const targetReports = join(absoluteRoot, "reports");
  try {
    await mkdir(temporaryRules, { recursive: true });
    for (const [name, content] of artifacts.files) {
      if (basename(name) !== name || !name.endsWith(".arrs")) {
        throw new Error(`Invalid generated rule path: ${name}`);
      }
      await writeFile(join(temporaryRules, name), content, "utf8");
    }
    await writeFile(join(temporary, "compatibility.json"), reportText(artifacts.report), "utf8");

    await mkdir(targetRules, { recursive: true });
    await mkdir(targetReports, { recursive: true });
    for (const name of artifacts.files.keys()) {
      await rename(join(temporaryRules, name), join(targetRules, name));
    }
    const expected = new Set(artifacts.files.keys());
    for (const name of await readdir(targetRules)) {
      if (name.endsWith(".arrs") && !expected.has(name)) {
        await unlink(join(targetRules, name));
      }
    }
    await rename(
      join(temporary, "compatibility.json"),
      join(targetReports, "compatibility.json"),
    );
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

export async function updateRules({
  root = process.cwd(),
  fetchImpl = globalThis.fetch,
} = {}) {
  const downloads = await fetchRuleSources(fetchImpl);
  const artifacts = buildRuleArtifacts(downloads);
  await writeArtifacts(root, artifacts);
  return {
    sources: downloads.size,
    files: artifacts.files.size,
    totals: artifacts.report.totals,
  };
}

const isDirect =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirect) {
  const summary = await updateRules();
  process.stdout.write(
    `Updated ${summary.files} Anywhere rule sets from ${summary.sources} sources.\n`,
  );
}
