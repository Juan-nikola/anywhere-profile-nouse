export const SUPPORTED_PROTOCOLS = Object.freeze(
  new Set(["vless", "hysteria2", "trojan", "anytls", "ss", "socks5"]),
);

export function canonicalProtocol(rawType) {
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

export function validateNode(node) {
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
