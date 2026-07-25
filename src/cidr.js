// 解析、规范化并比较 IPv4/IPv6 CIDR，不依赖平台网络库。
function parseIPv4Address(value) {
  const parts = value.split(".");
  if (parts.length !== 4) throw new Error(`Invalid IPv4 address: ${value}`);
  let result = 0n;
  for (const part of parts) {
    if (!/^(0|[1-9]\d{0,2})$/.test(part)) {
      throw new Error(`Invalid IPv4 address: ${value}`);
    }
    const octet = Number(part);
    if (octet > 255) throw new Error(`Invalid IPv4 address: ${value}`);
    result = (result << 8n) | BigInt(octet);
  }
  return result;
}

function expandEmbeddedIPv4(value) {
  if (!value.includes(".")) return value;
  const separator = value.lastIndexOf(":");
  if (separator < 0) throw new Error(`Invalid IPv6 address: ${value}`);
  const ipv4 = parseIPv4Address(value.slice(separator + 1));
  const high = ((ipv4 >> 16n) & 0xffffn).toString(16);
  const low = (ipv4 & 0xffffn).toString(16);
  return `${value.slice(0, separator)}:${high}:${low}`;
}

function parseIPv6Address(input) {
  const value = expandEmbeddedIPv4(input.toLowerCase());
  if ((value.match(/::/g) ?? []).length > 1) {
    throw new Error(`Invalid IPv6 address: ${input}`);
  }

  const hasCompression = value.includes("::");
  const [leftRaw, rightRaw = ""] = value.split("::");
  const left = leftRaw ? leftRaw.split(":") : [];
  const right = rightRaw ? rightRaw.split(":") : [];
  const all = [...left, ...right];
  if (all.some((part) => !/^[0-9a-f]{1,4}$/.test(part))) {
    throw new Error(`Invalid IPv6 address: ${input}`);
  }
  if ((!hasCompression && all.length !== 8) || (hasCompression && all.length >= 8)) {
    throw new Error(`Invalid IPv6 address: ${input}`);
  }

  const groups = hasCompression
    ? [...left, ...Array(8 - all.length).fill("0"), ...right]
    : all;
  let result = 0n;
  for (const group of groups) {
    result = (result << 16n) | BigInt(`0x${group}`);
  }
  return result;
}

function formatIPv4(value) {
  return [24n, 16n, 8n, 0n]
    .map((shift) => Number((value >> shift) & 0xffn))
    .join(".");
}

function formatIPv6(value) {
  const groups = [];
  for (let shift = 112n; shift >= 0n; shift -= 16n) {
    groups.push(Number((value >> shift) & 0xffffn));
  }

  let bestStart = -1;
  let bestLength = 0;
  for (let index = 0; index < groups.length; ) {
    if (groups[index] !== 0) {
      index += 1;
      continue;
    }
    let end = index;
    while (end < groups.length && groups[end] === 0) end += 1;
    if (end - index > bestLength && end - index >= 2) {
      bestStart = index;
      bestLength = end - index;
    }
    index = end;
  }

  if (bestStart < 0) return groups.map((group) => group.toString(16)).join(":");
  const left = groups.slice(0, bestStart).map((group) => group.toString(16)).join(":");
  const right = groups
    .slice(bestStart + bestLength)
    .map((group) => group.toString(16))
    .join(":");
  if (!left && !right) return "::";
  if (!left) return `::${right}`;
  if (!right) return `${left}::`;
  return `${left}::${right}`;
}

function prefixMask(bits, prefix) {
  if (prefix === 0) return 0n;
  const all = (1n << BigInt(bits)) - 1n;
  const hostBits = BigInt(bits - prefix);
  return (all << hostBits) & all;
}

export function parseCIDR(rawValue) {
  if (typeof rawValue !== "string" || rawValue.trim() !== rawValue || !rawValue) {
    throw new Error(`Invalid CIDR: ${String(rawValue)}`);
  }
  const parts = rawValue.split("/");
  if (parts.length > 2) throw new Error(`Invalid CIDR: ${rawValue}`);
  const address = parts[0];
  const version = address.includes(":") ? 6 : 4;
  const bits = version === 6 ? 128 : 32;
  const prefix = parts.length === 2 ? Number(parts[1]) : bits;
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > bits) {
    throw new Error(`Invalid CIDR prefix: ${rawValue}`);
  }
  const addressValue =
    version === 6 ? parseIPv6Address(address) : parseIPv4Address(address);
  const network = addressValue & prefixMask(bits, prefix);
  const formatted = version === 6 ? formatIPv6(network) : formatIPv4(network);
  return Object.freeze({
    version,
    bits,
    prefix,
    network,
    canonical: `${formatted}/${prefix}`,
  });
}

export function cidrContains(parent, child) {
  if (parent.version !== child.version) {
    throw new Error("Cannot compare mixed IP versions");
  }
  if (parent.prefix > child.prefix) return false;
  return (child.network & prefixMask(parent.bits, parent.prefix)) === parent.network;
}
