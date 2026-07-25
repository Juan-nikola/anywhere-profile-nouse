const PATTERNS = Object.freeze([
  {
    category: "proxy-uri",
    expression:
      /(?:vless|hysteria2|hy2|trojan|anytls|ss|socks5|socks):\/\/[^\s"'<>]+@[^\s"'<>]+:\d+/i,
  },
  {
    category: "private-url",
    expression:
      /https?:\/\/[^\s"'<>]+[?&](?:token|auth|key|subscription|sub)=[^&#\s"'<>]+/i,
  },
  {
    category: "github-token",
    expression: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/,
  },
  {
    category: "credential-field",
    expression:
      /"(?:password|passwd|psk|uuid|privateKey|private_key)"\s*:\s*"(?!TEST_ONLY_|<)[^"]{4,}"/i,
  },
]);

export function scanText(path, text) {
  const findings = [];
  for (const [index, line] of String(text).split(/\r?\n/).entries()) {
    if (line.includes("TEST_ONLY_")) continue;
    for (const pattern of PATTERNS) {
      if (pattern.expression.test(line)) {
        findings.push({
          path,
          line: index + 1,
          category: pattern.category,
        });
      }
    }
  }
  return findings;
}

