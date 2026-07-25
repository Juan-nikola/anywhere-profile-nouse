// 把已验证的 Sub-Store 节点无损映射为 Anywhere 原生 URI。
import { canonicalProtocol, validateNode } from "./node-validation.js";
import { base64Encode } from "./base64.js";

function encoded(value) {
  return encodeURIComponent(String(value));
}

function authorityHost(host) {
  return host.includes(":") ? `[${host}]` : host;
}

function addParam(params, key, value) {
  if (value !== undefined && value !== null && String(value) !== "") {
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
    random: "chrome_120",
  };
  const allowed = new Set([
    "chrome_133",
    "chrome_120",
    "chrome_106",
    "firefox_148",
    "firefox_120",
    "safari_26",
    "edge_106",
    "non_browser",
  ]);
  return aliases[value] ?? (allowed.has(value) ? value : "chrome_120");
}

function alpnValue(node) {
  if (Array.isArray(node.alpn)) return node.alpn.join(",");
  return typeof node.alpn === "string" ? node.alpn : undefined;
}

function stableJSON(value) {
  if (Array.isArray(value)) return value.map(stableJSON);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .toSorted()
        .map((key) => [key, stableJSON(value[key])]),
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
    if (options.permitWithoutStream !== undefined) {
      addParam(params, "permit_without_stream", options.permitWithoutStream ? "true" : "false");
    }
  } else if (network === "xhttp") {
    const options = node["xhttp-opts"] ?? node.xhttpOpts ?? node.xhttpSettings ?? {};
    addParam(params, "host", options.host);
    addParam(params, "path", options.path ?? "/");
    addParam(params, "mode", options.mode ?? "auto");
    const extra = options.extra ?? Object.fromEntries(
      Object.entries(options).filter(([key]) => !["host", "path", "mode"].includes(key)),
    );
    if (extra && Object.keys(extra).length) {
      addParam(params, "extra", JSON.stringify(stableJSON(extra)));
    }
  }
  return baseURL("vless", encoded(node.uuid.toLowerCase()), node, params);
}

function bandwidth(value) {
  if (value === undefined || value === null || value === "") return undefined;
  const match = String(value).match(/\d+(?:\.\d+)?/);
  return match ? String(Math.round(Number(match[0]))) : undefined;
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
    params,
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
    node["idle-session-check-interval"] ?? node.idleCheckInterval,
  );
  addParam(params, "it", node["idle-session-timeout"] ?? node.idleTimeout);
  addParam(params, "mis", node["min-idle-session"] ?? node.minIdleSession);
  return renderTLSPasswordNode("anytls", node, params);
}

function renderShadowsocks(node) {
  const userInfo = base64Encode(
    `${node.cipher ?? node.method}:${node.password}`,
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

export function renderNodeURI(node) {
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
