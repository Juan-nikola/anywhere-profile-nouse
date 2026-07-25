import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";

const root = resolve(process.cwd());
const markdownFiles = [];
const ignoredDirectories = new Set([".git", ".worktrees", "node_modules"]);
async function collect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && ignoredDirectories.has(entry.name)) continue;
    const path = join(directory, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith(".md")) markdownFiles.push(path);
  }
}
await collect(root);

const problems = [];
for (const file of markdownFiles) {
  const text = await readFile(file, "utf8");
  for (const match of text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "");
    if (/^(?:https?:|mailto:|#)/.test(target)) continue;
    const path = target.split("#")[0];
    if (!path) continue;
    try {
      await access(resolve(dirname(file), decodeURIComponent(path)));
    } catch {
      problems.push(`${file.slice(root.length + 1)} -> ${target}`);
    }
  }
}

const readme = await readFile(join(root, "README.md"), "utf8");
const ruleNames = (await readdir(join(root, "rules")))
  .filter((name) => name.endsWith(".arrs"));
for (const name of ruleNames) {
  const url =
    `https://raw.githubusercontent.com/Juan-nikola/anywhere-profile/main/rules/${name}`;
  if (!readme.includes(url)) problems.push(`README.md missing ${url}`);
}
if (problems.length) throw new Error(`Documentation link errors:\n${problems.join("\n")}`);
process.stdout.write(
  `Checked ${markdownFiles.length} Markdown files and ${ruleNames.length} Raw URLs.\n`,
);
