// 将节点转换器打包为可直接粘贴到 Sub-Store 的单文件脚本。
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { build } from "esbuild";

const root = resolve(import.meta.dirname, "..");
const result = await build({
  absWorkingDir: root,
  entryPoints: ["src/substore-entry.js"],
  bundle: true,
  format: "iife",
  globalName: "AnywhereNodeBundle",
  platform: "neutral",
  target: "es2022",
  minify: false,
  legalComments: "none",
  write: false,
});
const wrapper = `
async function operator(input, targetPlatform) {
  return AnywhereNodeBundle.operator(input, targetPlatform, {
    arguments: $arguments,
    produceArtifact,
    logger: console
  });
}
`;
const destination = resolve(root, "dist/substore-node-generator.js");
await mkdir(dirname(destination), { recursive: true });
await writeFile(
  destination,
  `${result.outputFiles[0].text.trimEnd()}\n${wrapper.trimStart()}`,
  "utf8",
);
