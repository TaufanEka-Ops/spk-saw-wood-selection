# spk-saw backend

Express API that ranks wood species for furniture production with the
**Simple Additive Weighting (SAW)** method.

```bash
npm install
STORAGE=memory npm start        # no database required
npm test                        # 60+ assertions, node:test runner
npm run verify:legacy           # original result vs corrected result, side by side
```

## Why the storage layer is pluggable

`STORAGE=memory` runs the whole API from an in-memory adapter; `STORAGE=mysql`
switches to Sequelize. The original project required a MySQL server just to
see a response, which is why its logic was never tested. Everything below the
route layer is pure and database-free.

## Endpoints

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/health` | Liveness + which adapter is active |
| `GET` | `/api/woods` | List alternatives |
| `GET` | `/api/woods/:id` | Fetch one alternative |
| `POST` | `/api/woods` | Create (validated, `422` on failure) |
| `PATCH` | `/api/woods/:id` | Partial update |
| `DELETE` | `/api/woods/:id` | Remove (`204`) |
| `GET` | `/api/ranking/criteria` | Criteria, types and normalised weights |
| `GET` | `/api/ranking` | Full SAW run: ranking, contributions, normalisation |
| `POST` | `/api/ranking/preview` | Re-rank with caller-supplied weights (what-if) |

## Layout

```
src/
  domain/        pure business logic — criteria, SAW, validation (no imports from express/sequelize)
  repositories/  persistence adapters behind one interface (memory, mysql)
  routes/        HTTP surface, thin
  middleware/    error handling, async wrapper
  config/        environment, validated once
  app.js         builds the Express app from a repository (testable)
  index.js       bootstrap: wire, listen, shut down cleanly
```

The dependency arrows point inward only: `routes -> domain` and
`repositories -> domain`. `domain/` imports nothing from the framework,
which is what lets `tests/saw.test.js` run in milliseconds.
