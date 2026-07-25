import { buildRuleArtifacts } from "../src/rule-build.js";
import { fetchRuleSources } from "./update-rules.mjs";

const downloads = await fetchRuleSources();
const artifacts = buildRuleArtifacts(downloads);
process.stdout.write(
  `OK ${downloads.size} sources, ${artifacts.files.size} Anywhere rule sets, ` +
  `${artifacts.report.totals.supported} convertible entries.\n`,
);

