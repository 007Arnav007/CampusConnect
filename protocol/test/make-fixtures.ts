// Generates cross-language test vectors consumed by Python tests (ml-service/tests/test_protocol_vectors.py).
import { writeFileSync } from "node:fs";
import { buildNotice } from "../src/index.js";
const keys = { k1: "fixture-secret-fixture-secret-123456" };
const notice = buildNotice({
  mid: "00000000-0000-4000-8000-000000000001", rnd: 0, cpy: 1, seq: 7, iat: 1_700_000_000_000, exp: 1_700_000_030_000,
  cls: "CRITICAL_NOTICE", pri: "HIGH", pol: "static/S1", rid: "RX-LIB", kid: "k1", nonce: "fixednonce", test: true,
  body: { zones: ["LIB-F2-E"], text: "TEST NOTICE \u00e9\u0928" }
}, keys);
writeFileSync(new URL("../fixtures/vectors.json", import.meta.url), JSON.stringify({ keys, notice }, null, 2));
console.log("wrote fixtures/vectors.json");
