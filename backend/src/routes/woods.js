import { Router } from "express";

import { toAlternative, validateAlternative } from "../domain/wood.js";
import { HttpError, asyncHandler } from "../middleware/errorHandler.js";

export function createWoodRouter(repository) {
  const router = Router();

  router.get(
    "/",
    asyncHandler(async (req, res) => {
      const rows = await repository.list();
      res.json({ count: rows.length, data: rows });
    }),
  );

  router.get(
    "/:id",
    asyncHandler(async (req, res) => {
      const row = await repository.findById(req.params.id);
      if (!row) throw new HttpError(404, `wood '${req.params.id}' not found`);
      res.json({ data: row });
    }),
  );

  router.post(
    "/",
    asyncHandler(async (req, res) => {
      const { value, errors } = validateAlternative(req.body);
      if (errors.length > 0) throw new HttpError(422, "validation failed", errors);
      const created = await repository.create(value);
      res.status(201).json({ data: created });
    }),
  );

  router.patch(
    "/:id",
    asyncHandler(async (req, res) => {
      const existing = await repository.findById(req.params.id);
      if (!existing) throw new HttpError(404, `wood '${req.params.id}' not found`);
      const { value, errors } = validateAlternative({ ...existing, ...req.body });
      if (errors.length > 0) throw new HttpError(422, "validation failed", errors);
      const updated = await repository.update(req.params.id, value);
      res.json({ data: updated });
    }),
  );

  router.delete(
    "/:id",
    asyncHandler(async (req, res) => {
      const removed = await repository.remove(req.params.id);
      if (!removed) throw new HttpError(404, `wood '${req.params.id}' not found`);
      res.status(204).send();
    }),
  );

  return router;
}

export { toAlternative };
