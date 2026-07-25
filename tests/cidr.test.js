import test from "node:test";
import assert from "node:assert/strict";

import { cidrContains, parseCIDR } from "../src/cidr.js";

test("canonicalizes and compares IPv4 networks", () => {
  const broad = parseCIDR("10.1.2.3/8");
  const narrow = parseCIDR("10.2.0.0/16");
  assert.equal(broad.canonical, "10.0.0.0/8");
  assert.equal(cidrContains(broad, narrow), true);
  assert.equal(cidrContains(narrow, broad), false);
});

test("canonicalizes compressed IPv6", () => {
  const cidr = parseCIDR("2001:db8::1/32");
  assert.equal(cidr.version, 6);
  assert.equal(cidr.canonical, "2001:db8::/32");
});

test("accepts bare addresses as single-host networks", () => {
  assert.equal(parseCIDR("192.0.2.1").canonical, "192.0.2.1/32");
  assert.equal(parseCIDR("2001:db8::1").canonical, "2001:db8::1/128");
});

test("rejects malformed and mixed CIDRs", () => {
  for (const invalid of ["256.0.0.1/8", "1.2.3/24", "2001:::1/64", "10.0.0.0/33"]) {
    assert.throws(() => parseCIDR(invalid));
  }
  assert.throws(() => cidrContains(parseCIDR("10.0.0.0/8"), parseCIDR("2001:db8::/32")));
});

