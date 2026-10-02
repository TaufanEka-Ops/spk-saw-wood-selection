import { Router } from "express";

import { DEFAULT_CRITERIA, validateCriteria } from "../domain/criteria.js";
import { rank } from "../domain/saw.js";
import { toAlternative } from "../domain/wood.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";

export function createRankingRouter(repository) {
  const router = Router();

  /** The criteria and their normalised weights, for the UI to display. */
  router.get(
    "/criteria",
    asyncHandler(async (_req, res) => {
      res.json({ data: DEFAULT_CRITERIA });
    }),
  );

  /**
   * Compute the ranking.
   *
   * The original application performed this arithmetic inside a React
   * component, in the browser, twice (TableFinal and TableHasil each fetched
   * the list and recomputed min/max). Moving it server-side means one
   * implementation, one place to test, and no chance of the two views
   * disagreeing.
   */
  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const rows = await repository.list();
      if (rows.length === 0) {
        res.json({ method: "SAW", count: 0, ranking: [], weights: {}, normalisation: {} });
        return;
      }
      const alternatives = rows.map(toAlternative);
      const result = rank(alternatives, DEFAULT_CRITERIA);
      res.json({ count: result.ranking.length, ...result });
    }),
  );

  /** Same computation with caller-supplied weights, for what-if analysis. */
  router.post(
    "/preview",
    asyncHandler(async (req, res) => {
      const { criteria, errors } = validateCriteria(req.body?.criteria);
      if (errors.length > 0) throw new HttpError(422, "validation failed", errors);
      const rows = await repository.list();
      if (rows.length === 0) throw new HttpError(409, "no alternatives stored yet");
      const result = rank(rows.map(toAlternative), criteria);
      res.json({ count: result.ranking.length, ...result });
    }),
  );

  return router;
}
