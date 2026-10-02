/** Validation for the wood-species resource. */

export const SCORE_RANGE = Object.freeze({ min: 0, max: 5 });

/**
 * Validate one alternative payload coming from the client.
 *
 * The original `POST /users` wrote `req.body` straight into Sequelize with no
 * checks at all, so `{ "harga": "abc" }` reached the driver and the controller
 * answered with a 200 and no body after logging the error.
 *
 * @returns {{ value: object|null, errors: string[] }}
 */
export function validateAlternative(body) {
  const errors = [];
  const name = String(body?.name ?? "").trim();
  if (name.length < 2) errors.push("name must be at least 2 characters");
  if (name.length > 120) errors.push("name must be at most 120 characters");

  const price = Number(body?.price);
  if (!Number.isFinite(price)) errors.push("price must be a number");
  else if (price <= 0) errors.push("price must be greater than 0");

  const scores = {};
  for (const key of ["condition", "quality", "durability"]) {
    const value = Number(body?.[key]);
    if (!Number.isFinite(value)) errors.push(`${key} must be a number`);
    else if (value < SCORE_RANGE.min || value > SCORE_RANGE.max) {
      errors.push(`${key} must be between ${SCORE_RANGE.min} and ${SCORE_RANGE.max}`);
    }
    scores[key] = value;
  }

  if (errors.length > 0) return { value: null, errors };
  return { value: { name, price, ...scores }, errors: [] };
}

/** Map a stored row onto the shape the SAW domain expects. */
export function toAlternative(row) {
  return {
    id: String(row.id),
    name: row.name,
    values: {
      price: Number(row.price),
      condition: Number(row.condition),
      quality: Number(row.quality),
      durability: Number(row.durability),
    },
  };
}
