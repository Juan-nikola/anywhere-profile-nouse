var AnywhereNodeBundle = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/substore-entry.js
  var substore_entry_exports = {};
  __export(substore_entry_exports, {
    operator: () => operator
  });

  // src/base64.js
  var ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  function utf8Bytes(value) {
    const bytes = [];
    for (const character of String(value)) {
      const codePoint = character.codePointAt(0);
      if (codePoint <= 127) {
        bytes.push(codePoint);
      } else if (codePoint <= 2047) {
        bytes.push(192 | codePoint >> 6, 128 | codePoint & 63);
      } else if (codePoint <= 65535) {
        bytes.push(
          224 | codePoint >> 12,
          128 | codePoint >> 6 & 63,
          128 | codePoint & 63
        );
      } else {
        bytes.push(
          240 | codePoint >> 18,
          128 | codePoint >> 12 & 63,
          128 | codePoint >> 6 & 63,
          128 | codePoint & 63
        );
      }
    }
    return bytes;
  }
  function base64Encode(value) {
    const bytes = utf8Bytes(value);
    let output = "";
    for (let index = 0; index < bytes.length; index += 3) {
      const first = bytes[index];
      const second = bytes[index + 1];
      const third = bytes[index + 2];
      const combined = first << 16 | (second ?? 0) << 8 | (third ?? 0);
      output += ALPHABET[combined >> 18 & 63];
      output += ALPHABET[combined >> 12 & 63];
      output += second === void 0 ? "=" : ALPHABET[combined >> 6 & 63];
      output += third === void 0 ? "=" : ALPHABET[combined & 63];
    }
    return output;
  }

  // src/node-validation.js
  var SUPPORTED_PROTOCOLS = Object.freeze(
    /* @__PURE__ */ new Set(["vless", "hysteria2", "trojan", "anytls", "ss", "socks5"])
  );
  function canonicalProtocol(rawType) {
    const type = typeof rawType === "string" ? rawType.trim().toLowerCase() : "";
    if (type === "hy2") return "hysteria2";
    if (type === "shadowsocks") return "ss";
    if (type === "socks") return "socks5";
    return type;
  }
  function invalid(protocol, reason, warnings = []) {
    return { valid: false, protocol, reason, warnings };
  }
  function present(value) {
    return typeof value === "string" && value.length > 0;
  }
  function validateNode(node) {
    const protocol = canonicalProtocol(node?.type);
    const warnings = [];
    if (!SUPPORTED_PROTOCOLS.has(protocol)) {
      return invalid(protocol || "unknown", "unsupported-protocol");
    }
    if (!present(node?.name)) return invalid(protocol, "missing-name");
    if (!present(node?.server)) return invalid(protocol, "missing-server");
    if (!Number.isInteger(Number(node?.port)) || Number(node.port) < 1 || Number(node.port) > 65535) {
      return invalid(protocol, "invalid-port");
    }
    if (protocol === "vless") {
      if (!present(node.uuid) || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(node.uuid)) {
        return invalid(protocol, "missing-credential");
      }
      const network = String(node.network ?? "tcp").toLowerCase();
      if (!["tcp", "ws", "grpc", "xhttp", "httpupgrade"].includes(network)) {
        return invalid(protocol, "unsupported-transport");
      }
      if (node["reality-opts"] && !present(node["reality-opts"]["public-key"])) {
        return invalid(protocol, "missing-credential");
      }
    }
    if (protocol === "hysteria2" && !present(node.password ?? node.auth)) {
      return invalid(protocol, "missing-credential");
    }
    if ((protocol === "trojan" || protocol === "anytls") && !present(node.password)) {
      return invalid(protocol, "missing-credential");
    }
    if (protocol === "trojan") {
      const network = String(node.network ?? "tcp").toLowerCase();
      if (network !== "tcp") return invalid(protocol, "unsupported-transport");
    }
    if (protocol === "ss") {
      if (!present(node.password) || !present(node.cipher ?? node.method)) {
        return invalid(protocol, "missing-credential");
      }
      if (node.plugin || node["plugin-opts"]) return invalid(protocol, "unsupported-transport");
    }
    if (node["skip-cert-verify"] === true || node.insecure === true) {
      warnings.push("global-allow-insecure-required");
    }
    return { valid: true, protocol, warnings };
  }

  // src/node-uri.js
  function encoded(value) {
    return encodeURIComponent(String(value));
  }
  function authorityHost(host) {
    return host.includes(":") ? `[${host}]` : host;
  }
  function addParam(params, key, value) {
    if (value !== void 0 && value !== null && String(value) !== "") {
      params.push(`${encoded(key)}=${encoded(value)}`);
    }
  }
  function fingerprint(raw) {
    const value = String(raw ?? "chrome_120").toLowerCase();
    const aliases = {
      chrome: "chrome_133",
      firefox: "firefox_148",
      safari: "safari_26",
      edge: "edge_106",
      ios: "chrome_120",
      random: "chrome_120"
    };
    const allowed = /* @__PURE__ */ new Set([
      "chrome_133",
      "chrome_120",
      "chrome_106",
      "firefox_148",
      "firefox_120",
      "safari_26",
      "edge_106",
      "non_browser"
    ]);
    return aliases[value] ?? (allowed.has(value) ? value : "chrome_120");
  }
  function alpnValue(node) {
    if (Array.isArray(node.alpn)) return node.alpn.join(",");
    return typeof node.alpn === "string" ? node.alpn : void 0;
  }
  function stableJSON(value) {
    if (Array.isArray(value)) return value.map(stableJSON);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value).toSorted().map((key) => [key, stableJSON(value[key])])
      );
    }
    return value;
  }
  function baseURL(scheme, userInfo, node, params = []) {
    const query = params.length ? `?${params.join("&")}` : "";
    return `${scheme}://${userInfo}${userInfo ? "@" : ""}${authorityHost(node.server)}:${Number(node.port)}${query}#${encoded(node.name)}`;
  }
  function renderVLESS(node) {
    const params = [];
    const reality = node["reality-opts"];
    const tls = node.tls === true || node.security === "tls";
    const security = reality ? "reality" : tls ? "tls" : "none";
    addParam(params, "encryption", node.encryption ?? "none");
    addParam(params, "flow", node.flow);
    addParam(params, "security", security);
    const network = String(node.network ?? "tcp").toLowerCase();
    if (network !== "tcp") addParam(params, "type", network);
    const serverName = node.servername ?? node.sni;
    if (security !== "none") {
      addParam(params, "sni", serverName ?? node.server);
      addParam(params, "alpn", alpnValue(node));
      addParam(params, "fp", fingerprint(node["client-fingerprint"] ?? node.fingerprint));
    }
    if (reality) {
      addParam(params, "pbk", reality["public-key"]);
      addParam(params, "sid", reality["short-id"]);
    }
    if (network === "ws") {
      const options = node["ws-opts"] ?? node.wsOpts ?? {};
      addParam(params, "host", options.headers?.Host ?? options.headers?.host ?? options.host);
      addParam(params, "path", options.path ?? "/");
      addParam(params, "ed", options["max-early-data"] ?? options.maxEarlyData);
    } else if (network === "httpupgrade") {
      const options = node["httpupgrade-opts"] ?? node.httpupgradeOpts ?? {};
      addParam(params, "host", options.headers?.Host ?? options.host);
      addParam(params, "path", options.path ?? "/");
    } else if (network === "grpc") {
      const options = node["grpc-opts"] ?? node.grpcOpts ?? {};
      addParam(params, "serviceName", options["grpc-service-name"] ?? options.serviceName);
      addParam(params, "authority", options.authority);
      const mode = options["grpc-mode"] ?? options.mode;
      if (mode === "multi" || options.multiMode === true) addParam(params, "mode", "multi");
      addParam(params, "userAgent", options.userAgent);
      addParam(params, "initial_windows_size", options.initialWindowsSize);
      addParam(params, "idle_timeout", options.idleTimeout);
      addParam(params, "health_check_timeout", options.healthCheckTimeout);
      if (options.permitWithoutStream !== void 0) {
        addParam(params, "permit_without_stream", options.permitWithoutStream ? "true" : "false");
      }
    } else if (network === "xhttp") {
      const options = node["xhttp-opts"] ?? node.xhttpOpts ?? node.xhttpSettings ?? {};
      addParam(params, "host", options.host);
      addParam(params, "path", options.path ?? "/");
      addParam(params, "mode", options.mode ?? "auto");
      const extra = options.extra ?? Object.fromEntries(
        Object.entries(options).filter(([key]) => !["host", "path", "mode"].includes(key))
      );
      if (extra && Object.keys(extra).length) {
        addParam(params, "extra", JSON.stringify(stableJSON(extra)));
      }
    }
    return baseURL("vless", encoded(node.uuid.toLowerCase()), node, params);
  }
  function bandwidth(value) {
    if (value === void 0 || value === null || value === "") return void 0;
    const match = String(value).match(/\d+(?:\.\d+)?/);
    return match ? String(Math.round(Number(match[0]))) : void 0;
  }
  function renderHysteria2(node) {
    const params = [];
    const up = bandwidth(node.up ?? node.upmbps);
    const down = bandwidth(node.down ?? node.downmbps);
    if (up || down) {
      addParam(params, "upmbps", up ?? "10");
      addParam(params, "downmbps", down ?? "50");
    }
    addParam(params, "obfs", node.obfs);
    addParam(params, "obfs-password", node["obfs-password"] ?? node.obfsPassword);
    addParam(params, "obfs-min-packet-size", node["obfs-min-packet-size"]);
    addParam(params, "obfs-max-packet-size", node["obfs-max-packet-size"]);
    addParam(params, "sni", node.sni ?? node.servername);
    return baseURL(
      "hysteria2",
      encoded(node.password ?? node.auth),
      node,
      params
    );
  }
  function renderTLSPasswordNode(scheme, node, extraParams = []) {
    const params = [...extraParams];
    addParam(params, "sni", node.sni ?? node.servername);
    addParam(params, "alpn", alpnValue(node));
    addParam(params, "fp", fingerprint(node["client-fingerprint"] ?? node.fingerprint));
    return baseURL(scheme, encoded(node.password), node, params);
  }
  function renderAnyTLS(node) {
    const params = [];
    addParam(
      params,
      "ici",
      node["idle-session-check-interval"] ?? node.idleCheckInterval
    );
    addParam(params, "it", node["idle-session-timeout"] ?? node.idleTimeout);
    addParam(params, "mis", node["min-idle-session"] ?? node.minIdleSession);
    return renderTLSPasswordNode("anytls", node, params);
  }
  function renderShadowsocks(node) {
    const userInfo = base64Encode(
      `${node.cipher ?? node.method}:${node.password}`
    ).replace(/=+$/g, "");
    return baseURL("ss", userInfo, node);
  }
  function renderSOCKS5(node) {
    let userInfo = "";
    if (node.username) {
      userInfo = `${encoded(node.username)}:${encoded(node.password ?? "")}`;
    }
    return baseURL("socks5", userInfo, node);
  }
  function renderNodeURI(node) {
    const validation = validateNode(node);
    if (!validation.valid) throw new Error(validation.reason);
    switch (canonicalProtocol(node.type)) {
      case "vless":
        return renderVLESS(node);
      case "hysteria2":
        return renderHysteria2(node);
      case "trojan":
        return renderTLSPasswordNode("trojan", node);
      case "anytls":
        return renderAnyTLS(node);
      case "ss":
        return renderShadowsocks(node);
      case "socks5":
        return renderSOCKS5(node);
      default:
        throw new Error("unsupported-protocol");
    }
  }

  // src/node-normalizer.js
  var FLAG_PATTERN = /[\u{1F1E6}-\u{1F1FF}]{2}/u;
  var ASIA_PACIFIC = /* @__PURE__ */ new Set([
    "AE",
    "AF",
    "AM",
    "AS",
    "AU",
    "AZ",
    "BD",
    "BH",
    "BN",
    "BT",
    "CC",
    "CK",
    "CN",
    "CX",
    "CY",
    "FJ",
    "FM",
    "GE",
    "GU",
    "HK",
    "ID",
    "IL",
    "IN",
    "IQ",
    "IR",
    "JO",
    "JP",
    "KG",
    "KH",
    "KI",
    "KP",
    "KR",
    "KW",
    "KZ",
    "LA",
    "LB",
    "LK",
    "MH",
    "MM",
    "MN",
    "MO",
    "MP",
    "MV",
    "MY",
    "NC",
    "NF",
    "NP",
    "NR",
    "NU",
    "NZ",
    "OM",
    "PF",
    "PG",
    "PH",
    "PK",
    "PS",
    "PW",
    "QA",
    "SA",
    "SB",
    "SG",
    "SY",
    "TH",
    "TJ",
    "TK",
    "TL",
    "TM",
    "TO",
    "TR",
    "TV",
    "TW",
    "UZ",
    "VN",
    "VU",
    "WF",
    "WS",
    "YE"
  ]);
  var EUROPE = /* @__PURE__ */ new Set([
    "AD",
    "AL",
    "AT",
    "AX",
    "BA",
    "BE",
    "BG",
    "BY",
    "CH",
    "CZ",
    "DE",
    "DK",
    "EE",
    "ES",
    "FI",
    "FO",
    "FR",
    "GB",
    "GG",
    "GI",
    "GR",
    "HR",
    "HU",
    "IE",
    "IM",
    "IS",
    "IT",
    "JE",
    "LI",
    "LT",
    "LU",
    "LV",
    "MC",
    "MD",
    "ME",
    "MK",
    "MT",
    "NL",
    "NO",
    "PL",
    "PT",
    "RO",
    "RS",
    "RU",
    "SE",
    "SI",
    "SJ",
    "SK",
    "SM",
    "UA",
    "VA"
  ]);
  var AMERICAS = /* @__PURE__ */ new Set([
    "AG",
    "AI",
    "AR",
    "AW",
    "BB",
    "BL",
    "BM",
    "BO",
    "BQ",
    "BR",
    "BS",
    "BZ",
    "CA",
    "CL",
    "CO",
    "CR",
    "CU",
    "CW",
    "DM",
    "DO",
    "EC",
    "FK",
    "GD",
    "GF",
    "GL",
    "GP",
    "GT",
    "GY",
    "HN",
    "HT",
    "JM",
    "KN",
    "KY",
    "LC",
    "MF",
    "MQ",
    "MS",
    "MX",
    "NI",
    "PA",
    "PE",
    "PM",
    "PR",
    "PY",
    "SR",
    "SV",
    "SX",
    "TC",
    "TT",
    "US",
    "UY",
    "VC",
    "VE",
    "VG",
    "VI"
  ]);
  var REGION_HINTS = [
    [/\b(japan|tokyo|osaka|jp|nrt|hnd|kix)\b/i, "\u{1F1EF}\u{1F1F5}"],
    [/\b(hong ?kong|hk|hkg)\b/i, "\u{1F1ED}\u{1F1F0}"],
    [/\b(singapore|sg|sin)\b/i, "\u{1F1F8}\u{1F1EC}"],
    [/\b(taiwan|taipei|tw|tpe)\b/i, "\u{1F1F9}\u{1F1FC}"],
    [/\b(korea|seoul|kr|icn)\b/i, "\u{1F1F0}\u{1F1F7}"],
    [/\b(australia|sydney|au|syd)\b/i, "\u{1F1E6}\u{1F1FA}"],
    [/\b(united states|usa|us|lax|sjc|sea|nyc|dallas|chicago)\b/i, "\u{1F1FA}\u{1F1F8}"],
    [/\b(canada|toronto|vancouver|ca|yyz|yvr)\b/i, "\u{1F1E8}\u{1F1E6}"],
    [/\b(germany|frankfurt|de|fra)\b/i, "\u{1F1E9}\u{1F1EA}"],
    [/\b(united kingdom|britain|london|uk|gb|lon)\b/i, "\u{1F1EC}\u{1F1E7}"],
    [/\b(france|paris|fr|cdg)\b/i, "\u{1F1EB}\u{1F1F7}"],
    [/\b(netherlands|amsterdam|nl|ams)\b/i, "\u{1F1F3}\u{1F1F1}"]
  ];
  function flagCode(flag) {
    return [...flag].map((character) => String.fromCharCode(character.codePointAt(0) - 127462 + 65)).join("");
  }
  function classifyRegion(name) {
    const explicit = String(name).match(FLAG_PATTERN)?.[0];
    const flag = explicit ?? REGION_HINTS.find(([pattern]) => pattern.test(name))?.[1] ?? "\u{1F3F3}\uFE0F";
    if (flag === "\u{1F3F3}\uFE0F") return { flag, region: "other", order: 3 };
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
      node._collectionName
    ].filter((value) => typeof value === "string").join(" ");
    if (/\[\s*自建\s*\]/i.test(source)) return { kind: "self-hosted", label: "[\u81EA\u5EFA]" };
    if (/\[\s*机场\s*\]/i.test(source)) return { kind: "airport", label: "[\u673A\u573A]" };
    if (/\[\s*realm\s*\]/i.test(source)) return { kind: "realm", label: "[Realm]" };
    if (/\[\s*服务端链\s*\]/i.test(source)) return { kind: "server-chain", label: "[\u670D\u52A1\u7AEF\u94FE]" };
    if (/\[\s*落地\s*\]/i.test(source)) return { kind: "landing", label: "[\u843D\u5730]" };
    return { kind: "source", label: "[\u6765\u6E90]" };
  }
  function cleanName(value) {
    const cleaned = String(value).replace(FLAG_PATTERN, " ").replace(/\[\s*(?:自建|机场|realm|服务端链|落地|来源)\s*\]/gi, " ").replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim();
    return cleaned || "\u672A\u547D\u540D\u8282\u70B9";
  }
  function stableValue(value) {
    if (Array.isArray(value)) return value.map(stableValue);
    if (value && typeof value === "object") {
      return Object.fromEntries(
        Object.keys(value).filter((key) => key !== "name" && !key.startsWith("_")).toSorted().map((key) => [key, stableValue(value[key])])
      );
    }
    return value;
  }
  function increment(record, key, amount = 1) {
    record[key] = (record[key] ?? 0) + amount;
  }
  function normalizeNodes(input) {
    const sourceNodes = Array.isArray(input) ? input : [];
    const diagnostics = {
      total: sourceNodes.length,
      accepted: 0,
      protocol: {},
      region: {},
      source: {},
      excluded: {},
      warnings: {}
    };
    const seen = /* @__PURE__ */ new Set();
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
        enumerable: false
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
  function produceNodeSubscription(input) {
    const normalized = normalizeNodes(input);
    if (!normalized.nodes.length) {
      throw new Error("No valid Anywhere nodes; refusing to publish an empty subscription");
    }
    const lines = normalized.nodes.map(renderNodeURI);
    return {
      content: base64Encode(`${lines.join("\n")}
`),
      diagnostics: normalized.diagnostics
    };
  }

  // src/substore-entry.js
  var ALLOWED_OPTIONS = /* @__PURE__ */ new Set(["output", "type", "name"]);
  function parseArguments(rawArguments) {
    if (!rawArguments || typeof rawArguments !== "object" || Array.isArray(rawArguments)) {
      throw new Error("arguments must be an object");
    }
    for (const key of Object.keys(rawArguments)) {
      if (!key.startsWith("_") && !ALLOWED_OPTIONS.has(key)) {
        throw new Error(`Unknown option: ${key}`);
      }
    }
    const output = rawArguments.output;
    if (output !== "nodes") throw new Error("output must be nodes");
    const type = rawArguments.type ?? "collection";
    if (!["collection", "col"].includes(type)) {
      throw new Error("type must be collection");
    }
    const name = rawArguments.name ?? "anywhere-sources";
    if (typeof name !== "string" || !name.trim() || /[\r\n]/.test(name)) {
      throw new Error("name must be a non-empty collection name");
    }
    return { type: "collection", name: name.trim() };
  }
  function logDiagnostics(context, diagnostics) {
    const logger = context?.logger ?? globalThis?.console;
    const method = typeof logger === "function" ? logger : typeof logger?.info === "function" ? logger.info.bind(logger) : typeof logger?.log === "function" ? logger.log.bind(logger) : null;
    if (!method) return;
    try {
      method(`[anywhere-profile] ${JSON.stringify(diagnostics)}`);
    } catch {
    }
  }
  async function operator(input = {}, targetPlatform, context = {}) {
    void targetPlatform;
    const options = parseArguments(context.arguments ?? {});
    if (typeof context.produceArtifact !== "function") {
      throw new Error("produceArtifact is unavailable");
    }
    const nodes = await context.produceArtifact({
      type: options.type,
      name: options.name,
      platform: "JSON",
      produceType: "internal"
    });
    if (!Array.isArray(nodes) || !nodes.length) {
      throw new Error("produceArtifact must return a non-empty node array");
    }
    const result = produceNodeSubscription(nodes);
    logDiagnostics(context, result.diagnostics);
    return { ...input, $content: result.content };
  }
  return __toCommonJS(substore_entry_exports);
})();
async function operator(input, targetPlatform) {
  return AnywhereNodeBundle.operator(input, targetPlatform, {
    arguments: $arguments,
    produceArtifact,
    logger: console
  });
}
