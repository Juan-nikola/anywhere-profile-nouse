import test from "node:test";
import assert from "node:assert/strict";

import { renderNodeURI } from "../src/node-uri.js";
import { nodeFixtures } from "./fixtures/nodes.js";

test("renders VLESS Reality with Anywhere parameter names", () => {
  const uri = new URL(renderNodeURI(nodeFixtures.vlessReality));
  assert.equal(uri.protocol, "vless:");
  assert.equal(uri.searchParams.get("security"), "reality");
  assert.equal(
    uri.searchParams.get("pbk"),
    nodeFixtures.vlessReality["reality-opts"]["public-key"],
  );
  assert.equal(uri.searchParams.get("sid"), "00000000");
  assert.equal(uri.searchParams.get("fp"), "chrome_133");
});

test("renders every supported VLESS transport", () => {
  const ws = new URL(renderNodeURI(nodeFixtures.vlessWS));
  assert.equal(ws.searchParams.get("type"), "ws");
  assert.equal(ws.searchParams.get("host"), "cdn.example.invalid");
  assert.equal(ws.searchParams.get("path"), "/socket path");
  assert.equal(ws.searchParams.get("ed"), "2048");

  const grpc = new URL(renderNodeURI(nodeFixtures.vlessGRPC));
  assert.equal(grpc.searchParams.get("type"), "grpc");
  assert.equal(grpc.searchParams.get("serviceName"), "service/name");
  assert.equal(grpc.searchParams.get("mode"), "multi");

  const xhttp = new URL(renderNodeURI(nodeFixtures.vlessXHTTP));
  assert.equal(xhttp.searchParams.get("type"), "xhttp");
  assert.equal(xhttp.searchParams.get("mode"), "packet-up");
  assert.deepEqual(JSON.parse(xhttp.searchParams.get("extra")), {
    xPaddingBytes: "100-1000",
  });
});

test("renders Hysteria2, Trojan, AnyTLS, and Shadowsocks", () => {
  const hy2 = new URL(renderNodeURI(nodeFixtures.hysteria2));
  assert.equal(hy2.protocol, "hysteria2:");
  assert.equal(hy2.searchParams.get("upmbps"), "50");
  assert.equal(hy2.searchParams.get("obfs"), "salamander");

  assert.match(renderNodeURI(nodeFixtures.trojan), /^trojan:\/\//);
  const anytls = new URL(renderNodeURI(nodeFixtures.anytls));
  assert.equal(anytls.searchParams.get("ici"), "20");
  assert.match(renderNodeURI(nodeFixtures.shadowsocks), /^ss:\/\//);
});

test("brackets IPv6 and encodes credentials", () => {
  const uri = renderNodeURI(nodeFixtures.socksIPv6);
  assert.match(uri, /^socks5:\/\/user:.*@\[2001:db8::10\]:1080#/);
  assert.equal(decodeURIComponent(uri.split("#")[1]), "SOCKS 特殊 #1");
});

test("never renders unsupported or invalid nodes", () => {
  assert.throws(() => renderNodeURI(nodeFixtures.snell), /unsupported-protocol/);
  assert.throws(() => renderNodeURI(nodeFixtures.invalidPort), /invalid-port/);
});
