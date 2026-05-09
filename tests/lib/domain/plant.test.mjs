import test from "node:test";
import assert from "node:assert/strict";
import {
  calcProgress,
  calcGrowthStage,
  getStageLabel,
  PLANT_SPECIES,
} from "../../../src/lib/domain/plant.ts";

test("calcGrowthStage maps weekly completed count to stages", () => {
  assert.equal(calcGrowthStage(-1), 0);
  assert.equal(calcGrowthStage(0), 0);
  assert.equal(calcGrowthStage(1), 1);
  assert.equal(calcGrowthStage(3), 1);
  assert.equal(calcGrowthStage(4), 2);
  assert.equal(calcGrowthStage(7), 2);
  assert.equal(calcGrowthStage(8), 3);
  assert.equal(calcGrowthStage(12), 3);
  assert.equal(calcGrowthStage(13), 4);
  assert.equal(calcGrowthStage(18), 4);
  assert.equal(calcGrowthStage(19), 5);
});

test("calcProgress maps current stage progress including final stage", () => {
  assert.equal(calcProgress(0, 0), 0);
  assert.equal(calcProgress(2, 1), 67);
  assert.equal(calcProgress(5, 2), 50);
  assert.equal(calcProgress(10, 3), 60);
  assert.equal(calcProgress(-1, 1), 0);
  assert.equal(calcProgress(99, 4), 100);
  assert.equal(calcProgress(19, 5), 100);
});

test("plant species covers all months and required archetypes", () => {
  assert.equal(PLANT_SPECIES.length, 12);
  assert.deepEqual(new Set(PLANT_SPECIES.map((plant) => plant.archetype)), new Set([
    "upright",
    "cherry",
    "hanging",
    "delicate",
  ]));
  assert.equal(getStageLabel(5), "満開");
});
