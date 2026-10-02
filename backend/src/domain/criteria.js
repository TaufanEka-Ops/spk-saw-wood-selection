/**
 * The decision model: which criteria, how important, and in which direction.
 *
 * Ground truth is the original workbook (`docs/reference/original-saw-workbook.xlsx`,
 * cells B2:F3). Importance weights are Harga 3, Kondisi 2, Kualitas 5,
 * Ketahanan 4 — a total of 14, *not* 1.
 *
 * `type` decides the normalisation direction:
 *   - 'cost'    : smaller raw value is better  -> r = min(x) / x
 *   - 'benefit' : larger raw value is better   -> r = x / max(x)
 */

export const DEFAULT_CRITERIA = Object.freeze([
  Object.freeze({ key: "price",       label: "Harga",     type: "cost",    weight: 3, unit: "IDR",      description: "Market price per cubic metre" }),
  Object.freeze({ key: "condition",   label: "Kondisi",   type: "benefit", weight: 2, unit: "score 0-5", description: "Physical condition on inspection" }),
  Object.freeze({ key: "quality",     label: "Kualitas",  type: "benefit", weight: 5, unit: "score 0-5", description: "Timber grade / surface quality" }),
  Object.freeze({ key: "durability",  label: "Ketahanan", type: "benefit", weight: 4, unit: "score 0-5", description: "Resistance to decay and insects" }),
]);

export const CRITERIA_KEYS = DEFAULT_CRITERIA.map((criterion) => criterion.key);

/** Importance weights rescaled so they sum to exactly 1. */
export function normaliseWeights(criteria = DEFAULT_CRITERIA) {
  const total = criteria.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (total <= 0) throw new Error("criteria weights must sum to a positive number");
  return Object.fromEntries(criteria.map((c) => [c.key, c.weight / total]));
}

/**
 * Validate a criteria override supplied through the API.
 * Returns { criteria, errors } — never throws, so the caller decides the status code.
 */
export function validateCriteria(input) {
  if (input === undefined || input === null) return { criteria: DEFAULT_CRITERIA, errors: [] };
  if (!Array.isArray(input) || input.length === 0) {
    return { criteria: DEFAULT_CRITERIA, errors: ["criteria must be a non-empty array"] };
  }
  const errors = [];
  const criteria = input.map((raw, index) => {
    const key = String(raw?.key ?? "").trim();
    const type = String(raw?.type ?? "").trim();
    const weight = Number(raw?.weight);
    if (!key) errors.push(`criteria[${index}].key is required`);
    if (!["cost", "benefit"].includes(type)) errors.push(`criteria[${index}].type must be 'cost' or 'benefit'`);
    if (!Number.isFinite(weight) || weight <= 0) errors.push(`criteria[${index}].weight must be a positive number`);
    return { key, label: String(raw?.label ?? key), type, weight, unit: raw?.unit, description: raw?.description };
  });
  if (criteria.length > 0 && criteria.every((c) => Number.isFinite(c.weight) && c.weight > 0)) {
    // A configuration that silently sums to something other than 1 is exactly
    // the bug the original spreadsheet shipped. Surface it, do not normalise away.
    const total = criteria.reduce((sum, c) => sum + c.weight, 0);
    if (Math.abs(total - 1) > 1e-9) {
      errors.push(`weights must sum to 1.0 (received ${total.toFixed(6)})`);
    }
  }
  return { criteria, errors };
}
