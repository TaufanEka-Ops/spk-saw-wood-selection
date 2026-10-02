import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { DEFAULT_CRITERIA, normaliseWeights, validateCriteria } from "../src/domain/criteria.js";
import { legacyScore, normaliseColumn, rank } from "../src/domain/saw.js";
import { WOOD_SEED } from "../src/db/seed.js";

const asAlternatives = (rows) =>
  rows.map((row, index) => ({
    id: String(index + 1),
    name: row.name,
    values: {
      price: row.price,
      condition: row.condition,
      quality: row.quality,
      durability: row.durability,
    },
  }));

describe("criteria", () => {
  it("weights sum to exactly 1 after normalisation", () => {
    const weights = normaliseWeights();
    const total = Object.values(weights).reduce((sum, value) => sum + value, 0);
    assert.ok(Math.abs(total - 1) < 1e-12, `weights summed to ${total}`);
  });

  it("derives weights from the workbook importances (3,2,5,4 over 14)", () => {
    const weights = normaliseWeights();
    assert.ok(Math.abs(weights.price - 3 / 14) < 1e-12);
    assert.ok(Math.abs(weights.condition - 2 / 14) < 1e-12);
    assert.ok(Math.abs(weights.quality - 5 / 14) < 1e-12);
    assert.ok(Math.abs(weights.durability - 4 / 14) < 1e-12);
  });

  it("rejects a criteria payload whose weights do not sum to 1", () => {
    const { errors } = validateCriteria([
      { key: "a", type: "cost", weight: 0.3333333 },
      { key: "b", type: "benefit", weight: 0.5 },
      { key: "c", type: "benefit", weight: 0.2 },
      { key: "d", type: "benefit", weight: 0.25 },
    ]);
    assert.equal(errors.length, 1);
    assert.match(errors[0], /sum to 1\.0/);
  });

  it("rejects an unknown criterion type and a negative weight", () => {
    const { errors } = validateCriteria([{ key: "a", type: "sideways", weight: -2 }]);
    assert.equal(errors.length, 2);
  });
});

describe("normaliseColumn", () => {
  it("scales benefits against the column maximum", () => {
    const { values } = normaliseColumn([1, 2, 4], "benefit");
    assert.deepEqual(values, [0.25, 0.5, 1]);
  });

  it("scales costs against the column minimum, so cheaper is better", () => {
    const { values } = normaliseColumn([125000, 800000, 1300000], "cost");
    assert.equal(values[0], 1);
    assert.ok(values[1] < values[0] && values[2] < values[1]);
    assert.ok(Math.abs(values[1] - 125000 / 800000) < 1e-12);
  });

  it("returns zeros instead of NaN when a benefit column is all zeros", () => {
    const { values } = normaliseColumn([0, 0, 0], "benefit");
    assert.deepEqual(values, [0, 0, 0]);
    assert.ok(values.every(Number.isFinite));
  });

  it("stays finite when a cost column contains a zero", () => {
    const { values } = normaliseColumn([0, 100, 200], "cost");
    assert.ok(values.every(Number.isFinite), `got ${values}`);
  });

  it("refuses a non-numeric value rather than coercing it to NaN", () => {
    assert.throws(() => normaliseColumn([1, "abc"], "benefit"), /is not a number/);
  });

  it("refuses an empty column", () => {
    assert.throws(() => normaliseColumn([], "benefit"), /non-empty/);
  });
});

describe("rank", () => {
  it("produces a dense, descending rank order", () => {
    const { ranking } = rank(asAlternatives(WOOD_SEED));
    assert.equal(ranking.length, WOOD_SEED.length);
    assert.deepEqual(ranking.map((row) => row.rank), [1, 2, 3, 4, 5]);
    for (let i = 1; i < ranking.length; i += 1) {
      assert.ok(ranking[i - 1].score >= ranking[i].score);
    }
  });

  it("keeps every score inside [0, 1]", () => {
    const { ranking } = rank(asAlternatives(WOOD_SEED));
    for (const row of ranking) {
      assert.ok(row.score >= 0 && row.score <= 1, `${row.name} scored ${row.score}`);
    }
  });

  it("scores equal inputs equally", () => {
    const twin = [
      { name: "A", values: { price: 100, condition: 1, quality: 1, durability: 1 } },
      { name: "B", values: { price: 100, condition: 1, quality: 1, durability: 1 } },
    ];
    const { ranking } = rank(twin);
    assert.equal(ranking[0].score, ranking[1].score);
  });

  it("ranks the cheaper of two otherwise identical species higher", () => {
    const { ranking } = rank([
      { name: "expensive", values: { price: 1000, condition: 3, quality: 3, durability: 3 } },
      { name: "cheap", values: { price: 100, condition: 3, quality: 3, durability: 3 } },
    ]);
    assert.equal(ranking[0].name, "cheap");
  });

  it("normalised contributions sum back to the score", () => {
    const { ranking, weights } = rank(asAlternatives(WOOD_SEED));
    for (const row of ranking) {
      const total = Object.values(row.contributions).reduce((sum, value) => sum + value, 0);
      assert.ok(Math.abs(total - row.score) < 1e-9, `${row.name}: ${total} vs ${row.score}`);
      assert.equal(Object.keys(row.contributions).length, DEFAULT_CRITERIA.length);
    }
    assert.equal(Object.keys(weights).length, DEFAULT_CRITERIA.length);
  });

  it("surfaces missing criteria values as an explicit error", () => {
    assert.throws(
      () => rank([{ name: "incomplete", values: { price: 100 } }]),
      /missing or non-numeric values/,
    );
  });

  it("refuses an empty alternative list", () => {
    assert.throws(() => rank([]), /at least one alternative/);
  });
});

describe("legacy reproduction (the original submission)", () => {
  // Values transcribed from docs/reference/original-saw-workbook.xlsx rows 20-39.
  const WORKBOOK = {
    weightedSums: { "Kayu Mahoni": 2.6333333333333333, "Kayu Jati": 3.466666666666667,
                    "Kayu Trembesi": 2.1, "Kayu Jati Belanda": 4.116666666666667,
                    "Kayu Sungkai": 1.1833333333333331 },
    scores: { "Kayu Mahoni": 0.19506172839506172, "Kayu Jati": 0.25679012345679014,
              "Kayu Trembesi": 0.15555555555555556, "Kayu Jati Belanda": 0.3049382716049383,
              "Kayu Sungkai": 0.0876543209876543 },
    ranking: ["Kayu Jati Belanda", "Kayu Jati", "Kayu Mahoni", "Kayu Trembesi", "Kayu Sungkai"],
  };

  it("reproduces the original weighted sums to 1e-9", () => {
    for (const row of legacyScore(asAlternatives(WOOD_SEED))) {
      const expected = WORKBOOK.weightedSums[row.name];
      assert.ok(Math.abs(row.weightedSum - expected) < 1e-9,
        `${row.name}: reproduced ${row.weightedSum}, workbook ${expected}`);
    }
  });

  it("reproduces the original final scores and ranking order", () => {
    const rows = legacyScore(asAlternatives(WOOD_SEED));
    for (const row of rows) {
      assert.ok(Math.abs(row.legacyScore - WORKBOOK.scores[row.name]) < 1e-9,
        `${row.name}: ${row.legacyScore} vs ${WORKBOOK.scores[row.name]}`);
    }
    assert.deepEqual(rows.map((row) => row.name), WORKBOOK.ranking);
  });

  it("documents that the legacy weights do not sum to 1", () => {
    const legacyTotal = DEFAULT_CRITERIA.reduce((sum, c) => sum + 1 / c.weight, 0);
    assert.ok(Math.abs(legacyTotal - 1.2833333333333332) < 1e-9);
    assert.ok(legacyTotal > 1.28, "legacy weights must be shown to overshoot 1");
  });

  it("changes the recommendation once the defects are fixed", () => {
    const legacyWinner = legacyScore(asAlternatives(WOOD_SEED))[0].name;
    const correctedWinner = rank(asAlternatives(WOOD_SEED)).ranking[0].name;
    assert.equal(legacyWinner, "Kayu Jati Belanda");
    assert.notEqual(legacyWinner, correctedWinner,
      "the corrected method must not silently agree with the defective one");
  });
});
