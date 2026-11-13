import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { safeSet, violated, type ShieldContext } from "../src/delivery/shield.js";
import { ACTIONS, staticTable } from "../src/delivery/actions.js";

const v = JSON.parse(readFileSync(new URL("../../protocol/fixtures/shield-vectors.json", import.meta.url), "utf8"));

test("TypeScript Shield matches the Python Shield on 400 golden contexts (no cross-language drift)", () => {
  for (const row of v.contexts) {
    const x = row.ctx as ShieldContext;
    for (const a of Object.keys(ACTIONS)) assert.deepEqual(violated(a, x), row.violated[a], `${a} ${JSON.stringify(x)}`);
    assert.deepEqual(safeSet(x), row.safe);
  }
});

test("TypeScript static table matches Python on all golden bands", () => {
  for (const r of v.static) assert.equal(staticTable(r.cls, r.loss, r.burst), r.action, JSON.stringify(r));
});
