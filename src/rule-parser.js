import { parseCIDR } from "./cidr.js";

const SUPPORTED_TYPES = Object.freeze({
  "IP-CIDR": 0,
  "IP-CIDR6": 1,
  DOMAIN: 2,
  "DOMAIN-SUFFIX": 2,
  "DOMAIN-KEYWORD": 3,
});

const KNOWN_UNSUPPORTED = new Set(["USER-AGENT", "IP-ASN", "URL-REGEX"]);

function normalizeDomain(value, inputType) {
  const normalized = value.toLowerCase().replace(/^\*\./, "").replace(/^\./, "");
  if (!normalized || /\s|,/.test(normalized)) {
    throw new Error(`Invalid ${inputType} value`);
  }
  return normalized;
}

export function parseRuleList(sourceId, text) {
  if (typeof sourceId !== "string" || !sourceId) throw new Error("Invalid source id");
  if (typeof text !== "string") throw new Error(`Invalid rule list: ${sourceId}`);

  const rules = [];
  const unsupported = {};
  let input = 0;
  let approximate = 0;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("//")) continue;
    input += 1;
    const fields = line.split(",").map((field) => field.trim());
    const inputType = fields[0]?.toUpperCase();
    const rawValue = fields[1];
    if (!rawValue) throw new Error(`${sourceId}: ${inputType} missing value`);

    if (KNOWN_UNSUPPORTED.has(inputType)) {
      unsupported[inputType] = (unsupported[inputType] ?? 0) + 1;
      continue;
    }
    if (!Object.hasOwn(SUPPORTED_TYPES, inputType)) {
      throw new Error(`${sourceId}: Unknown rule type ${inputType}`);
    }

    let type = SUPPORTED_TYPES[inputType];
    let value;
    try {
      if (type === 0 || type === 1) {
        const cidr = parseCIDR(rawValue);
        type = cidr.version === 6 ? 1 : 0;
        value = cidr.canonical;
      } else {
        value = normalizeDomain(rawValue, inputType);
      }
    } catch (error) {
      throw new Error(`${sourceId}: Invalid ${inputType} value`, { cause: error });
    }
    const isApproximate = inputType === "DOMAIN";
    if (isApproximate) approximate += 1;
    rules.push(
      Object.freeze({
        sourceId,
        inputType,
        type,
        value,
        approximate: isApproximate,
      }),
    );
  }

  return Object.freeze({
    rules: Object.freeze(rules),
    counts: Object.freeze({
      input,
      supported: rules.length,
      approximate,
      unsupported: Object.values(unsupported).reduce((sum, count) => sum + count, 0),
    }),
    unsupported: Object.freeze(unsupported),
  });
}
