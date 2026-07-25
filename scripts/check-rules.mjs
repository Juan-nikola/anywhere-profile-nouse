// 下载全部上游并执行健康阈值、类型和可转换性检查，不写入文件。
import { buildRuleArtifacts } from "../src/rule-build.js";
import { fetchRuleSources } from "./update-rules.mjs";

const downloads = await fetchRuleSources();
const artifacts = buildRuleArtifacts(downloads);
process.stdout.write(
  `OK ${downloads.size} sources, ${artifacts.files.size} Anywhere rule sets, ` +
  `${artifacts.report.totals.supported} convertible entries.\n`,
);
