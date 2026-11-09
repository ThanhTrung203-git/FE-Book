import test from "node:test";
import assert from "node:assert/strict";
import { defaultOrderTimeValue } from "../src/orderTimeFilter.js";
test("default filter inputs use Vietnam time even when the UTC day differs",()=>{
  const now="2026-11-08T18:30:00Z";
  assert.equal(defaultOrderTimeValue("day",now),"2026-11-09");
  assert.equal(defaultOrderTimeValue("hour",now),"2026-11-09T01:00");
  assert.equal(defaultOrderTimeValue("month",now),"2026-11");
  assert.equal(defaultOrderTimeValue("week",now),"2026-W46");
  assert.equal(defaultOrderTimeValue("",now),"");
});
test("ISO week defaults correctly handle year boundaries",()=>{
  assert.equal(defaultOrderTimeValue("week","2021-01-01T05:00:00Z"),"2020-W53");
  assert.equal(defaultOrderTimeValue("week","2024-12-30T05:00:00Z"),"2025-W01");
});
