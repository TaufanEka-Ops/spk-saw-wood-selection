/**
 * Simple Additive Weighting — pure functions, no I/O, no framework.
 *
 * SAW, correctly stated:
 *
 *   1. Normalise every raw value into [0, 1]:
 *        benefit:  r_ij = x_ij / max_i(x_ij)
 *        cost:     r_ij = min_i(x_ij) / x_ij
 *   2. Scale each criterion by its *normalised* weight  w_j / sum(w)
 *   3. Score each alternative:  V_i = sum_j ( w_j * r_ij )
 *   4. Rank by V_i, descending.
 *
 * Note what step 3 does *not* contain: a final division by the sum of all
 * scores. That extra step exists in the original workbook and in the original
 * React code; it is not part of SAW and it is kept only in
 * `legacyScore()` so the difference can be demonstrated side by side.
 */

import { DEFAULT_CRITERIA, normaliseWeights } from "./criteria.js";

/**
 * Normalise one criterion column.
 * @returns {{ values: number[], divisor: number, min: number, max: number }}
 */
export function normaliseColumn(values, type) {
  if (!Array.isArray(values) || values.length === 0) {
    throw new Error("normaliseColumn: values must be a non-empty array");
  }
  const numeric = values.map((value) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new Error(`normaliseColumn: '${value}' is not a number`);
    if (parsed < 0) throw new Error("normaliseColumn: negative values are not supported");
    return parsed;
  });

  const min = Math.min(...numeric);
  const max = Math.max(...numeric);

  if (type === "benefit") {
    if (max === 0) {
      // Every alternative scores zero on this criterion: it carries no
      // information, so give it a neutral 0 rather than dividing by zero.
      return { values: numeric.map(() => 0), divisor: max, min, max };
    }
    return { values: numeric.map((value) => value / max), divisor: max, min, max };
  }

  if (type === "cost") {
    if (min === 0) {
      // A zero-cost alternative is free; min/x is undefined for the others.
      // Fall back to max-x rescaled to [0, 1] so the column stays usable.
      const span = max || 1;
      return { values: numeric.map((value) => (max - value) / span), divisor: min, min, max };
    }
    return { values: numeric.map((value) => min / value), divisor: min, min, max };
  }

  throw new Error(`normaliseColumn: unknown criterion type '${type}'`);
}

/**
 * Rank alternatives with SAW.
 *
 * @param {Array<{id?: string, name: string, values: Record<string, number>}>} alternatives
 * @param {Array} criteria
 * @returns {{ ranking: Array, matrix: Object, weights: Object }}
 */
export function rank(alternatives, criteria = DEFAULT_CRITERIA) {
  if (!Array.isArray(alternatives) || alternatives.length === 0) {
    throw new Error("rank: at least one alternative is required");
  }

  const missing = alternatives.filter((alternative) =>
    criteria.some((criterion) => !Number.isFinite(Number(alternative.values?.[criterion.key]))),
  );
  if (missing.length > 0) {
    throw new Error(
      `rank: missing or non-numeric values for ${missing.map((a) => a.name).join(", ")}`,
    );
  }

  const weights = normaliseWeights(criteria);
  const normalised = {};
  const divisors = {};

  for (const criterion of criteria) {
    const column = alternatives.map((alternative) => Number(alternative.values[criterion.key]));
    const result = normaliseColumn(column, criterion.type);
    normalised[criterion.key] = result.values;
    divisors[criterion.key] = {
      type: criterion.type,
      divisor: result.divisor,
      min: result.min,
      max: result.max,
      normalisedWeight: weights[criterion.key],
    };
  }

  const ranking = alternatives
    .map((alternative, index) => {
      const contributions = {};
      let score = 0;
      for (const criterion of criteria) {
        const contribution = normalised[criterion.key][index] * weights[criterion.key];
        contributions[criterion.key] = Number(contribution.toFixed(10));
        score += contribution;
      }
      return {
        id: alternative.id ?? alternative.name,
        name: alternative.name,
        raw: { ...alternative.values },
        contributions,
        score: Number(score.toFixed(10)),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return { ranking, weights, normalisation: divisors, method: "SAW" };
}

/**
 * DEPRECATED — a faithful re-implementation of the original submission.
 *
 * Two defects are reproduced here on purpose, so the repository can *prove*
 * they existed rather than merely asserting it in a README:
 *
 *   1. Weights are `1 / importance` (0.3333, 0.5, 0.2, 0.25) instead of
 *      `importance / sum(importance)`. They sum to 1.2833, not 1.
 *   2. `price` is normalised as `x / min(x)` — the benefit direction — so a
 *      more expensive species scores *higher* on a cost criterion.
 *
 * It then divides every score by the total, which SAW does not do.
 *
 * Do not call this from application code. It exists for
 * `scripts/reproduce-original-spreadsheet.js` and the regression test that
 * pins the original numbers.
 */
export function legacyScore(alternatives, criteria = DEFAULT_CRITERIA) {
  const legacyWeights = Object.fromEntries(criteria.map((c) => [c.key, 1 / c.weight]));
  const columns = {};
  for (const criterion of criteria) {
    columns[criterion.key] = alternatives.map((a) => Number(a.values[criterion.key]));
  }

  const totals = alternatives.map((_, index) => {
    let sum = 0;
    for (const criterion of criteria) {
      const column = columns[criterion.key];
      const minimum = Math.min(...column);
      const maximum = Math.max(...column);
      // defect 2: cost criteria treated as benefits
      const normalised = column[index] / (criterion.type === "cost" ? minimum : maximum);
      sum += normalised * legacyWeights[criterion.key];
    }
    return sum;
  });

  const grandTotal = totals.reduce((sum, value) => sum + value, 0);
  return alternatives
    .map((alternative, index) => ({
      name: alternative.name,
      weightedSum: Number(totals[index].toFixed(10)),
      legacyScore: Number((totals[index] / grandTotal).toFixed(10)),
    }))
    .sort((a, b) => b.legacyScore - a.legacyScore)
    .map((row, index) => ({ ...row, legacyRank: index + 1 }));
}
