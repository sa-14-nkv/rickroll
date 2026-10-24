import assert from "node:assert/strict";
import test from "node:test";
import { getClientIp } from "../client-ip.mjs";

function request(ip, forwardedFor) {
  return {
    ip,
    get(name) {
      return name === "x-forwarded-for" ? forwardedFor : undefined;
    }
  };
}

test("uses the Vercel forwarded client IP instead of the local runtime address", () => {
  assert.equal(getClientIp(request("127.0.0.1", "203.0.113.5"), true), "203.0.113.5");
});

test("returns null on Vercel when the forwarded IP header is missing", () => {
  assert.equal(getClientIp(request("127.0.0.1", undefined), true), null);
});

test("uses Express's resolved IP outside Vercel", () => {
  assert.equal(getClientIp(request("198.51.100.8", undefined), false), "198.51.100.8");
});

test("rejects malformed addresses", () => {
  assert.equal(getClientIp(request("not-an-ip", undefined), false), null);
});
