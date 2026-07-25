// 过滤、去重、稳定命名节点，并生成不泄漏诊断信息的原生订阅。
import { base64Encode } from "./base64.js";
import { canonicalProtocol, validateNode } from "./node-validation.js";
import { renderNodeURI } from "./node-uri.js";

const FLAG_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
const ASIA_PACIFIC = new Set([
  "AE", "AF", "AM", "AS", "AU", "AZ", "BD", "BH", "BN", "BT", "CC", "CK",
  "CN", "CX", "CY", "FJ", "FM", "GE", "GU", "HK", "ID", "IL", "IN", "IQ",
  "IR", "JO", "JP", "KG", "KH", "KI", "KP", "KR", "KW", "KZ", "LA", "LB",
  "LK", "MH", "MM", "MN", "MO", "MP", "MV", "MY", "NC", "NF", "NP", "NR",
  "NU", "NZ", "OM", "PF", "PG", "PH", "PK", "PS", "PW", "QA", "SA", "SB",
  "SG", "SY", "TH", "TJ", "TK", "TL", "TM", "TO", "TR", "TV", "TW", "UZ",
  "VN", "VU", "WF", "WS", "YE",
]);
const EUROPE = new Set([
  "AD", "AL", "AT", "AX", "BA", "BE", "BG", "BY", "CH", "CZ", "DE", "DK",
  "EE", "ES", "FI", "FO", "FR", "GB", "GG", "GI", "GR", "HR", "HU", "IE",
  "IM", "IS", "IT", "JE", "LI", "LT", "LU", "LV", "MC", "MD", "ME", "MK",
  "MT", "NL", "NO", "PL", "PT", "RO", "RS", "RU", "SE", "SI", "SJ", "SK",
  "SM", "UA", "VA",
]);
const AMERICAS = new Set([
  "AG", "AI", "AR", "AW", "BB", "BL", "BM", "BO", "BQ", "BR", "BS", "BZ",
  "CA", "CL", "CO", "CR", "CU", "CW", "DM", "DO", "EC", "FK", "GD", "GF",
  "GL", "GP", "GT", "GY", "HN", "HT", "JM", "KN", "KY", "LC", "MF", "MQ",
  "MS", "MX", "NI", "PA", "PE", "PM", "PR", "PY", "SR", "SV", "SX", "TC",
  "TT", "US", "UY", "VC", "VE", "VG", "VI",
]);

const REGION_HINTS = [
  [/\b(japan|tokyo|osaka|jp|nrt|hnd|kix)\b/i, "🇯🇵"],
  [/\b(hong ?kong|hk|hkg)\b/i, "🇭🇰"],
  [/\b(singapore|sg|sin)\b/i, "🇸🇬"],
  [/\b(taiwan|taipei|tw|tpe)\b/i, "🇹🇼"],
  [/\b(korea|seoul|kr|icn)\b/i, "🇰🇷"],
  [/\b(australia|sydney|au|syd)\b/i, "🇦🇺"],
  [/\b(united states|usa|us|lax|sjc|sea|nyc|dallas|chicago)\b/i, "🇺🇸"],
  [/\b(canada|toronto|vancouver|ca|yyz|yvr)\b/i, "🇨🇦"],
  [/\b(germany|frankfurt|de|fra)\b/i, "🇩🇪"],
  [/\b(united kingdom|britain|london|uk|gb|lon)\b/i, "🇬🇧"],
  [/\b(france|paris|fr|cdg)\b/i, "🇫🇷"],
  [/\b(netherlands|amsterdam|nl|ams)\b/i, "🇳🇱"],
];

function flagCode(flag) {
  return [...flag]
    .map((character) => String.fromCharCode(character.codePointAt(0) - 0x1f1e6 + 65))
    .join("");
}

function classifyRegion(name) {
  const explicit = String(name).match(FLAG_PATTERN)?.[0];
  const flag = explicit ?? REGION_HINTS.find(([pattern]) => pattern.test(name))?.[1] ?? "🏳️";
  if (flag === "🏳️") return { flag, region: "other", order: 3 };
  const code = flagCode(flag);
  if (ASIA_PACIFIC.has(code)) return { flag, region: "asia-pacific", order: 0 };
  if (EUROPE.has(code)) return { flag, region: "europe", order: 1 };
  if (AMERICAS.has(code)) return { flag, region: "americas", order: 2 };
  return { flag, region: "other", order: 3 };
}

function sourceKind(node) {
  const source = [
    node._subDisplayName,
    node._subName,
    node._collectionDisplayName,
    node._collectionName,
  ].filter((value) => typeof value === "string").join(" ");
  if (/\[\s*自建\s*\]/i.test(source)) return { kind: "self-hosted", label: "[自建]" };
  if (/\[\s*机场\s*\]/i.test(source)) return { kind: "airport", label: "[机场]" };
  if (/\[\s*realm\s*\]/i.test(source)) return { kind: "realm", label: "[Realm]" };
  if (/\[\s*服务端链\s*\]/i.test(source)) return { kind: "server-chain", label: "[服务端链]" };
  if (/\[\s*落地\s*\]/i.test(source)) return { kind: "landing", label: "[落地]" };
  return { kind: "source", label: "[来源]" };
}

function cleanName(value) {
  const cleaned = String(value)
    .replace(FLAG_PATTERN, " ")
    .replace(/\[\s*(?:自建|机场|realm|服务端链|落地|来源)\s*\]/gi, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned || "未命名节点";
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .filter((key) => key !== "name" && !key.startsWith("_"))
        .toSorted()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function increment(record, key, amount = 1) {
  record[key] = (record[key] ?? 0) + amount;
}

export function normalizeNodes(input) {
  const sourceNodes = Array.isArray(input) ? input : [];
  const diagnostics = {
    total: sourceNodes.length,
    accepted: 0,
    protocol: {},
    region: {},
    source: {},
    excluded: {},
    warnings: {},
  };
  const seen = new Set();
  const nodes = [];

  for (const original of sourceNodes) {
    const validation = validateNode(original);
    if (!validation.valid) {
      increment(diagnostics.excluded, validation.reason);
      continue;
    }
    const identity = JSON.stringify(stableValue(original));
    if (seen.has(identity)) {
      increment(diagnostics.excluded, "exact-duplicate");
      continue;
    }
    seen.add(identity);

    const node = structuredClone(original);
    node.type = canonicalProtocol(node.type);
    node.port = Number(node.port);
    const region = classifyRegion(node.name);
    const source = sourceKind(node);
    node.name = `${region.flag} ${source.label} ${cleanName(node.name)}`;
    Object.defineProperty(node, "_anywhereSort", {
      value: `${region.order}\0${region.flag}\0${node.name}`,
      enumerable: false,
    });
    nodes.push(node);
    increment(diagnostics.protocol, node.type);
    increment(diagnostics.region, region.region);
    increment(diagnostics.source, source.kind);
    for (const warning of validation.warnings) increment(diagnostics.warnings, warning);
  }

  nodes.sort((left, right) => left._anywhereSort.localeCompare(right._anywhereSort, "zh-Hans-CN"));
  diagnostics.accepted = nodes.length;
  return { nodes, diagnostics };
}

export function produceNodeSubscription(input) {
  const normalized = normalizeNodes(input);
  if (!normalized.nodes.length) {
    throw new Error("No valid Anywhere nodes; refusing to publish an empty subscription");
  }
  const lines = normalized.nodes.map(renderNodeURI);
  return {
    content: base64Encode(`${lines.join("\n")}\n`),
    diagnostics: normalized.diagnostics,
  };
}
