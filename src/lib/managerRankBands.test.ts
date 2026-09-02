import assert from "node:assert/strict";
import test from "node:test";
import {
  filterManagersByRankBand,
  getManagerRankBand,
} from "./managerRankBands.ts";

test("league ranks map to non-overlapping manager bands", () => {
  assert.equal(getManagerRankBand(1), "1-50");
  assert.equal(getManagerRankBand(50), "1-50");
  assert.equal(getManagerRankBand(51), "51-100");
  assert.equal(getManagerRankBand(100), "51-100");
  assert.equal(getManagerRankBand(101), "101-150");
  assert.equal(getManagerRankBand(150), "101-150");
  assert.equal(getManagerRankBand(151), "151+");
});

test("unknown ranks are not mislabeled as 151+", () => {
  assert.equal(getManagerRankBand(null), null);
  assert.equal(getManagerRankBand(undefined), null);
  assert.equal(getManagerRankBand(0), null);
  assert.equal(getManagerRankBand(Number.NaN), null);
});

test("selecting a band returns only managers in that band", () => {
  const managers = [
    { id: 1, bucket: "1-50" },
    { id: 2, bucket: "51-100" },
    { id: 3, bucket: "51-100" },
    { id: 4, bucket: "151+" },
  ];

  assert.deepEqual(
    filterManagersByRankBand(managers, "51-100").map((manager) => manager.id),
    [2, 3]
  );
  assert.deepEqual(
    filterManagersByRankBand(managers, "1-50").map((manager) => manager.id),
    [1]
  );
});
