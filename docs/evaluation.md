# Engineering review

A review of my own 2022 final project, written four years later. It is kept in
the repository because a rebuild that hides what it fixed is not a rebuild, it
is a replacement — and because the defects here are the most instructive part.

## The core defect: the calculation was wrong twice over

**Where it came from.** The original submission was a spreadsheet
(`docs/reference/original-saw-workbook.xlsx`) plus a web application that
reproduced the spreadsheet in JavaScript. The web application matches the
spreadsheet exactly — which is the problem, because the spreadsheet was wrong.

### Defect 1 — weights were never normalised

The criteria importances are Harga 3, Kondisi 2, Kualitas 5, Ketahanan 4
(workbook cells B3:E3). Their sum is **14**. SAW requires each criterion to be
scaled by `w_j / sum(w)`, which is:

| Criterion | Importance | Correct weight | What the code used | Error |
|---|---:|---:|---:|---:|
| Harga (price) | 3 | 0.2143 | 0.3333 | +55% |
| Kondisi | 2 | 0.1429 | 0.5000 | +250% |
| Kualitas (quality) | 5 | 0.3571 | 0.2000 | −44% |
| Ketahanan | 4 | 0.2857 | 0.2500 | −12% |
| **Total** | **14** | **1.0000** | **1.2833** | |

The values 0.3333, 0.5, 0.2 and 0.25 are `1 / importance`, not
`importance / total`. The workbook's own total cell contains a hard-coded `1`,
which is why the sum being 1.2833 was never noticed — the spreadsheet displayed
the answer it was expected to display.

The practical effect is that "quality" — the criterion the project's title says
it ranks by — carried 44% less influence than intended, while "condition"
carried two and a half times more.

### Defect 2 — the cost criterion was scored as a benefit

In the workbook (rows 20–24) price is normalised as `x_ij / min(x)`. For Kayu
Mahoni that is `800000 / 125000 = 6.4`. SAW normalises a cost criterion the other
way round: `min(x) / x_ij`, giving `0.15625`. So a more expensive species scored
**higher** on a criterion that exists to penalise expense.

The React frontend actually did this one correctly (`Harga / rm.harga`), so the
submitted application and the submitted spreadsheet disagreed with each other.
Nobody checked.

### Defect 3 — a non-standard final step

Both the spreadsheet and the application then divided each weighted sum by the
total of all weighted sums, producing scores that sum to 1. SAW's `V_i` is the
weighted sum itself; the extra division changes the numbers without changing the
order, and its only effect is to make the scores look like probabilities when
they are not.

### The consequence

The original recommendation was **Kayu Jati Belanda** at 1,300,000 IDR. With the
arithmetic corrected, the recommendation is **Kayu Sungkai** at 125,000 IDR — one
tenth the price, and the highest quality and condition scores in the set.
Kayu Sungkai was ranked **last** by the original method.

The recommendation was not slightly off. It was inverted.

`legacyScore()` in `backend/src/domain/saw.js` reproduces the defective result
deliberately, and `backend/tests/saw.test.js` asserts both results against the
workbook. That is what turns "I fixed it" into a claim a reviewer can check.

## Engineering defects

### Silent failures

```js
export const getUsers = async (req, res) => {
  try {
    const response = await User.findAll();
    res.status(200).json(response);
  } catch (error) {
    console.log(error.message);      // ← and then nothing
  }
};
```

No `res.*` call in the `catch`. When the query failed, the request hung until the
client timed out and the server logged one line. Every one of the five CRUD
handlers had this shape. A 404 lookup returned `res.status(200).json(null)` —
the frontend then read `.name` off `null` and crashed.

Now: `asyncHandler` funnels rejections into a single `errorHandler` that always
responds, maps status codes, and prints the stack only for 5xx.

### Injection of `req.body` straight into the driver

`await User.create(req.body)` with no validation. `{"harga":"abc"}` reached
MySQL and the failure was swallowed by the bug above, so the API answered **200**
with an empty body. Now `validateAlternative()` returns field-level messages and
the route answers `422`.

### Credentials and a foreign database name in version control

```js
const db = new Sequelize('crood_db', 'root', '', { host: 'localhost' });
```

`crood_db` is not from this project. Configuration now comes from the environment
with `.env.example` documenting every key.

### `db.sync()` as an import side effect

```js
(async () => { await db.sync(); })();
```

At the bottom of the model file. Importing the model migrated the schema — a
side effect on `import`, before the app is ready, with no error handling and no
way to disable it in tests. Moved into the bootstrap.

### The SAW arithmetic lived in the browser, twice

`TableFinal.jsx` and `TableHasil.jsx` each fetched `/users` and each recomputed
min, max and the score — two copies of the same formula in two components, plus
`UserList` fetching a third time. Three HTTP requests per page load, two
implementations of the core algorithm, and no way to test either. Now the ranking
is computed once on the server and returned with its own audit trail.

### Domain naming

The model was `User`, the table was `users`, and it held wood species. Nothing in
the codebase said "wood" except the UI strings. Renamed to `Wood` / `woods`.

### Other smaller things

| Issue | Fix |
|---|---|
| `nodemon` in `dependencies` | `devDependencies`, plus a `dev` script |
| `app.listen()` with no `error` listener | `EADDRINUSE` reported with guidance |
| No `start` / `dev` / `test` scripts | All three defined |
| `RUBRIK`-typo CSS class `feild` (Bulma expects `field`) in two components | Corrected |
| `res.key={rm._id}` used as a React key on a Sequelize model whose column is `id` | Removed with the rewrite; keys are stable now |
| `console.log(error)` as the only error path in the frontend | `describeError()` surface messages to the user |
| Division by `Kondisi`/`Kualitas`/`Ketahanan` with no guard | A zero column yields 0 rather than `NaN`, and a cost column containing zero falls back to max-minus-value |
| Hard-coded `http://localhost:5000` in five files | Vite proxy + `VITE_API_URL` |

## What the original got right

- The SAW formulation in the report is correct, and the criteria/type
  classification (price as cost, the other three as benefit) is right. The
  implementation drifted from the design; the design itself was sound.
- The UI made the method legible: the raw data table, the normalised table and the
  final ranking were all on one screen. That instinct is why this repository still
  shows all three.
- Express + Sequelize + React with a separated backend and frontend is the right
  architecture for the problem. It is a more ambitious stack than most course
  projects attempt, and the layering survived the rebuild intact.

## What I would tell a reviewer

The interesting thing about this repository is not the application. It is that the
application was confidently, verifiably wrong for three years, that the error was
hidden by a hard-coded total, and that a test comparing the output against the
original source is what finally surfaced it. Defect 2 was caught by writing the
correct implementation from the specification rather than by reading the old code
— which is the argument for writing the specification down.
