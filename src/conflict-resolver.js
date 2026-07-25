import { parseCIDR } from "./cidr.js";

class SuffixIndex {
  constructor() {
    this.root = { children: new Map(), owner: null };
  }

  findAncestor(value) {
    let node = this.root;
    for (const label of value.split(".").reverse()) {
      node = node.children.get(label);
      if (!node) return null;
      if (node.owner) return node.owner;
    }
    return null;
  }

  add(value, owner) {
    let node = this.root;
    for (const label of value.split(".").reverse()) {
      if (!node.children.has(label)) {
        node.children.set(label, { children: new Map(), owner: null });
      }
      node = node.children.get(label);
    }
    node.owner ??= owner;
  }
}

function networkAtPrefix(cidr, prefix) {
  if (prefix === 0) return 0n;
  const shift = BigInt(cidr.bits - prefix);
  return (cidr.network >> shift) << shift;
}

class CIDRIndex {
  constructor() {
    this.owners = new Map();
  }

  key(version, prefix, network) {
    return `${version}:${prefix}:${network.toString(16)}`;
  }

  findAncestor(value) {
    const cidr = parseCIDR(value);
    for (let prefix = 0; prefix <= cidr.prefix; prefix += 1) {
      const owner = this.owners.get(
        this.key(cidr.version, prefix, networkAtPrefix(cidr, prefix)),
      );
      if (owner) return owner;
    }
    return null;
  }

  add(value, owner) {
    const cidr = parseCIDR(value);
    const key = this.key(cidr.version, cidr.prefix, cidr.network);
    if (!this.owners.has(key)) this.owners.set(key, owner);
  }
}

function compareRules(left, right) {
  if (left.type !== right.type) return left.type - right.type;
  return left.value.localeCompare(right.value, "en");
}

export function resolveConflicts(groupEntries) {
  if (!Array.isArray(groupEntries)) throw new Error("Group entries must be an array");

  const exact = new Map();
  const suffixes = new SuffixIndex();
  const keywords = [];
  const cidrs = new CIDRIndex();
  const report = {
    identical: 0,
    coveredSuffix: 0,
    coveredKeyword: 0,
    coveredCIDR: 0,
    crossGroup: 0,
  };
  const groups = [];

  for (const entry of groupEntries) {
    if (!entry?.group?.id || !Array.isArray(entry.rules)) {
      throw new Error("Invalid conflict-resolution entry");
    }
    const accepted = [];
    for (const rule of entry.rules) {
      const exactKey = `${rule.type}\0${rule.value}`;
      let reason = null;
      let owner = exact.get(exactKey) ?? null;
      if (owner) {
        reason = "identical";
      } else if (rule.type === 2) {
        owner = suffixes.findAncestor(rule.value);
        if (owner) {
          reason = "coveredSuffix";
        } else {
          const match = keywords.find(({ value }) => rule.value.includes(value));
          if (match) {
            reason = "coveredKeyword";
            owner = match.owner;
          }
        }
      } else if (rule.type === 3) {
        const match = keywords.find(({ value }) => rule.value.includes(value));
        if (match) {
          reason = "coveredKeyword";
          owner = match.owner;
        }
      } else if (rule.type === 0 || rule.type === 1) {
        owner = cidrs.findAncestor(rule.value);
        if (owner) reason = "coveredCIDR";
      } else {
        throw new Error(`Unsupported Anywhere rule type: ${rule.type}`);
      }

      if (reason) {
        report[reason] += 1;
        if (owner !== entry.group.id) report.crossGroup += 1;
        continue;
      }

      accepted.push(rule);
      exact.set(exactKey, entry.group.id);
      if (rule.type === 2) suffixes.add(rule.value, entry.group.id);
      if (rule.type === 3) keywords.push({ value: rule.value, owner: entry.group.id });
      if (rule.type === 0 || rule.type === 1) cidrs.add(rule.value, entry.group.id);
    }
    groups.push({
      group: entry.group,
      rules: accepted.sort(compareRules),
    });
  }

  return {
    groups,
    report: Object.freeze(report),
  };
}

