import {
  CUSTOM_RULES,
  GROUPS,
  LOCAL_RULES,
  RULE_SOURCES,
  validateCatalog,
} from "./catalog.js";
import { parseRuleList } from "./rule-parser.js";
import { resolveConflicts } from "./conflict-resolver.js";
import { parseARRS, renderARRS } from "./arrs.js";

export const GENERATOR_VERSION = "0.1.0";

function parseCustom(sourceId, lines) {
  return parseRuleList(sourceId, lines.join("\n"));
}

function sortedObject(record) {
  return Object.fromEntries(Object.entries(record).toSorted(([left], [right]) =>
    left.localeCompare(right, "en")));
}

function buildPhases(parsedBySource) {
  const groupById = new Map(GROUPS.map((group) => [group.id, group]));
  const phases = [
    {
      group: groupById.get("local"),
      rules: parseCustom("built-in:local", LOCAL_RULES).rules,
    },
  ];

  for (const [customKey, groupId] of [
    ["block", "custom-block"],
    ["direct", "custom-direct"],
    ["proxy", "custom-proxy"],
  ]) {
    if (CUSTOM_RULES[customKey].length) {
      phases.push({
        group: groupById.get(groupId),
        rules: parseCustom(`custom:${customKey}`, CUSTOM_RULES[customKey]).rules,
      });
    }
  }

  if (CUSTOM_RULES.ai.length) {
    phases.push({
      group: groupById.get("ai"),
      rules: parseCustom("custom:ai", CUSTOM_RULES.ai).rules,
    });
  }

  for (const group of GROUPS) {
    if (!group.sourceIds.length) continue;
    phases.push({
      group,
      rules: group.sourceIds.flatMap((sourceId) => parsedBySource.get(sourceId).rules),
    });
  }
  return phases;
}

export function buildRuleArtifacts(
  downloads,
  {
    enforceMinimums = true,
    generatorVersion = GENERATOR_VERSION,
  } = {},
) {
  validateCatalog();
  if (!(downloads instanceof Map)) throw new Error("Rule downloads must be a Map");

  const parsedBySource = new Map();
  const sourceReports = [];
  for (const source of RULE_SOURCES) {
    const text = downloads.get(source.id);
    if (typeof text !== "string") throw new Error(`Missing rule source: ${source.id}`);
    const parsed = parseRuleList(source.id, text);
    if (enforceMinimums && parsed.counts.input < source.minEntries) {
      throw new Error(
        `${source.id} has ${parsed.counts.input} entries; minimum is ${source.minEntries}`,
      );
    }
    parsedBySource.set(source.id, parsed);
    sourceReports.push({
      id: source.id,
      groupId: source.groupId,
      minimum: source.minEntries,
      ...parsed.counts,
      unsupportedTypes: sortedObject(parsed.unsupported),
    });
  }

  const resolved = resolveConflicts(buildPhases(parsedBySource));
  const acceptedByGroup = new Map(GROUPS.map((group) => [group.id, []]));
  for (const entry of resolved.groups) {
    acceptedByGroup.get(entry.group.id).push(...entry.rules);
  }

  const unsortedFiles = [];
  const groupReports = [];
  for (const group of GROUPS) {
    const rules = acceptedByGroup.get(group.id);
    if (!rules.length) continue;
    const sourceIds = [];
    if (group.id === "local") sourceIds.push("built-in:local");
    if (group.id === "custom-block") sourceIds.push("custom:block");
    if (group.id === "custom-direct") sourceIds.push("custom:direct");
    if (group.id === "custom-proxy") sourceIds.push("custom:proxy");
    if (group.id === "ai" && CUSTOM_RULES.ai.length) sourceIds.push("custom:ai");
    sourceIds.push(...group.sourceIds);
    const content = renderARRS(group, rules, sourceIds, generatorVersion);
    parseARRS(content);
    unsortedFiles.push([`${group.slug}.arrs`, content]);
    groupReports.push({
      id: group.id,
      slug: group.slug,
      name: group.name,
      routing: group.routing,
      rules: rules.length,
      sources: sourceIds,
    });
  }

  const files = new Map(
    unsortedFiles.toSorted(([left], [right]) => left.localeCompare(right, "en")),
  );
  const totals = sourceReports.reduce(
    (result, source) => {
      result.input += source.input;
      result.supported += source.supported;
      result.approximate += source.approximate;
      result.unsupported += source.unsupported;
      return result;
    },
    { input: 0, supported: 0, approximate: 0, unsupported: 0 },
  );
  const report = {
    generatorVersion,
    sources: sourceReports,
    groups: groupReports,
    totals,
    conflicts: resolved.report,
  };
  return { files, report };
}

