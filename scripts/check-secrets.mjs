import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { scanText } from "../src/secret-scanner.js";

const root = resolve(process.cwd());
const output = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
  { cwd: root },
);
const paths = output.toString("utf8").split("\0").filter(Boolean);
const findings = [];
for (const path of paths) {
  const data = await readFile(resolve(root, path));
  if (data.includes(0)) continue;
  findings.push(...scanText(path, data.toString("utf8")));
}
if (findings.length) {
  const summary = findings
    .map((finding) => `${finding.path}:${finding.line} ${finding.category}`)
    .join("\n");
  throw new Error(`Potential secrets detected:\n${summary}`);
}
process.stdout.write(`Secret scan passed for ${paths.length} public files.\n`);

