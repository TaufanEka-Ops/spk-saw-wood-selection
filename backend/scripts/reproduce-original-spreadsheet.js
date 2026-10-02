/**
 * Print the original result and the corrected result side by side.
 *
 *   node scripts/reproduce-original-spreadsheet.js
 *
 * The left column is what the 2022 submission produced (and what
 * `docs/reference/original-saw-workbook.xlsx` contains). The right column is
 * the same data through a correct SAW implementation. They disagree about
 * which wood to buy, which is the whole point of this repository.
 */

import { DEFAULT_CRITERIA, normaliseWeights } from "../src/domain/criteria.js";
import { WOOD_SEED } from "../src/db/seed.js";
import { legacyScore, rank } from "../src/domain/saw.js";

const alternatives = WOOD_SEED.map((row, index) => ({
  id: String(index + 1),
  name: row.name,
  values: { price: row.price, condition: row.condition, quality: row.quality, durability: row.durability },
}));

const legacy = legacyScore(alternatives);
const corrected = rank(alternatives).ranking;
const weights = normaliseWeights();

console.log("=".repeat(84));
console.log("ORIGINAL SUBMISSION — weights taken as 1/importance, cost criteria scored as benefits");
console.log("=".repeat(84));
console.log("  weights used : " + DEFAULT_CRITERIA.map((c) => `1/${c.weight}`).join(", ")
  + `   (sum ${DEFAULT_CRITERIA.reduce((s, c) => s + 1 / c.weight, 0).toFixed(4)} — not 1)`);
console.table(legacy.map((row) => ({
  rank: row.legacyRank, wood: row.name,
  "weighted sum": row.weightedSum.toFixed(4),
  "reported score": row.legacyScore.toFixed(4),
})));
console.log(`  => recommendation: ${legacy[0].name}`);

console.log();
console.log("=".repeat(84));
console.log("CORRECTED — weights normalised to sum to 1, cost criterion inverted");
console.log("=".repeat(84));
console.log("  weights used : "
  + DEFAULT_CRITERIA.map((c) => `${c.label} ${weights[c.key].toFixed(4)}`).join(", ")
  + `   (sum ${Object.values(weights).reduce((s, v) => s + v, 0).toFixed(4)})`);
console.table(corrected.map((row) => ({
  rank: row.rank, wood: row.name,
  score: row.score.toFixed(4),
  ...Object.fromEntries(DEFAULT_CRITERIA.map((c) => [c.label, row.contributions[c.key].toFixed(4)])),
})));
console.log(`  => recommendation: ${corrected[0].name}`);

console.log();
const moved = corrected.findIndex((row) => row.name === legacy[0].name) + 1;
console.log(`  Original pick '${legacy[0].name}' now ranks #${moved} of ${corrected.length}.`);
console.log(`  '${corrected[0].name}' moves from #${legacy.find((r) => r.name === corrected[0].name).legacyRank} to #1.`);
