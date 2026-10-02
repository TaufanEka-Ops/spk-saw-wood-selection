import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

import request from "supertest";

import { createApp } from "../src/app.js";
import { WOOD_SEED } from "../src/db/seed.js";
import { createMemoryRepository } from "../src/repositories/memoryRepository.js";

let app;
let repository;

before(async () => {
  repository = createMemoryRepository();
  for (const row of WOOD_SEED) await repository.create(row);
  app = createApp(repository);
});

after(async () => {
  await repository.close?.();
});

describe("GET /health", () => {
  it("reports the active storage adapter", async () => {
    const response = await request(app).get("/health").expect(200);
    assert.equal(response.body.status, "ok");
    assert.equal(response.body.storage, "memory");
  });
});

describe("woods resource", () => {
  it("lists every seeded species", async () => {
    const response = await request(app).get("/api/woods").expect(200);
    assert.equal(response.body.count, WOOD_SEED.length);
    assert.equal(response.body.data[0].name, "Kayu Mahoni");
  });

  it("returns a single species by id", async () => {
    const response = await request(app).get("/api/woods/1").expect(200);
    assert.equal(response.body.data.price, 800000);
  });

  it("answers 404 with JSON for an unknown id instead of hanging", async () => {
    const response = await request(app).get("/api/woods/9999").expect(404);
    assert.equal(response.body.error, "request_error");
    assert.match(response.body.message, /not found/);
  });

  it("creates a species and returns 201 with the stored row", async () => {
    const response = await request(app)
      .post("/api/woods")
      .send({ name: "Kayu Meranti", price: 450000, condition: 2, quality: 3, durability: 2 })
      .expect(201);
    assert.equal(response.body.data.name, "Kayu Meranti");
    assert.ok(response.body.data.id);
    await request(app).delete(`/api/woods/${response.body.data.id}`).expect(204);
  });

  it("rejects a non-numeric price with 422 and a field-level message", async () => {
    const response = await request(app)
      .post("/api/woods")
      .send({ name: "Kayu Palsu", price: "abc", condition: 1, quality: 1, durability: 1 })
      .expect(422);
    assert.equal(response.body.error, "request_error");
    assert.ok(response.body.details.includes("price must be a number"));
  });

  it("rejects an out-of-range durability score", async () => {
    const response = await request(app)
      .post("/api/woods")
      .send({ name: "Kayu Palsu", price: 1000, condition: 1, quality: 1, durability: 9 })
      .expect(422);
    assert.ok(response.body.details.some((message) => /between 0 and 5/.test(message)));
  });

  it("rejects a one-character name", async () => {
    await request(app)
      .post("/api/woods")
      .send({ name: "K", price: 1000, condition: 1, quality: 1, durability: 1 })
      .expect(422);
  });

  it("updates an existing species with PATCH", async () => {
    const created = await request(app)
      .post("/api/woods")
      .send({ name: "Kayu Uji", price: 300000, condition: 1, quality: 1, durability: 1 })
      .expect(201);
    const updated = await request(app)
      .patch(`/api/woods/${created.body.data.id}`)
      .send({ price: 275000 })
      .expect(200);
    assert.equal(updated.body.data.price, 275000);
    assert.equal(updated.body.data.name, "Kayu Uji");
    await request(app).delete(`/api/woods/${created.body.data.id}`).expect(204);
  });

  it("answers 404 for PATCH and DELETE on an unknown id", async () => {
    await request(app).patch("/api/woods/9999").send({ price: 1000 }).expect(404);
    await request(app).delete("/api/woods/9999").expect(404);
  });

  it("answers 404 in JSON for an unknown route", async () => {
    const response = await request(app).get("/api/nope").expect(404);
    assert.equal(response.body.error, "not_found");
  });

  it("rejects a malformed JSON body without crashing the server", async () => {
    await request(app)
      .post("/api/woods")
      .set("Content-Type", "application/json")
      .send('{"name": ')
      .expect(400);
  });
});

describe("ranking resource", () => {
  it("returns the criteria with normalised weights", async () => {
    const response = await request(app).get("/api/ranking/criteria").expect(200);
    assert.equal(response.body.data.length, 4);
    assert.equal(response.body.data.find((c) => c.key === "price").type, "cost");
  });

  it("ranks the stored alternatives", async () => {
    const response = await request(app).get("/api/ranking").expect(200);
    assert.equal(response.body.method, "SAW");
    assert.equal(response.body.count, WOOD_SEED.length);
    assert.deepEqual(response.body.ranking.map((row) => row.rank), [1, 2, 3, 4, 5]);
    assert.ok(response.body.ranking[0].score >= response.body.ranking[1].score);
  });

  it("exposes the normalisation divisors so the numbers can be audited", async () => {
    const response = await request(app).get("/api/ranking").expect(200);
    assert.equal(response.body.normalisation.price.divisor, 125000);
    assert.equal(response.body.normalisation.quality.divisor, 4);
    assert.ok(Math.abs(response.body.weights.price - 3 / 14) < 1e-12);
  });

  it("re-ranks when the caller supplies different weights", async () => {
    const response = await request(app)
      .post("/api/ranking/preview")
      .send({
        criteria: [
          { key: "price", label: "Harga", type: "cost", weight: 0.7 },
          { key: "condition", label: "Kondisi", type: "benefit", weight: 0.1 },
          { key: "quality", label: "Kualitas", type: "benefit", weight: 0.1 },
          { key: "durability", label: "Ketahanan", type: "benefit", weight: 0.1 },
        ],
      })
      .expect(200);
    assert.equal(response.body.ranking[0].name, "Kayu Sungkai");
  });

  it("rejects weights that do not sum to 1", async () => {
    const response = await request(app)
      .post("/api/ranking/preview")
      .send({ criteria: [{ key: "price", type: "cost", weight: 0.25 }] })
      .expect(422);
    assert.equal(response.body.error, "request_error");
  });
});

describe("empty dataset", () => {
  it("returns an empty ranking rather than dividing by zero", async () => {
    const empty = createMemoryRepository();
    const emptyApp = createApp(empty);
    const response = await request(emptyApp).get("/api/ranking").expect(200);
    assert.equal(response.body.count, 0);
    assert.deepEqual(response.body.ranking, []);
  });

  it("refuses a preview with 409 when there is nothing to rank", async () => {
    const empty = createMemoryRepository();
    const emptyApp = createApp(empty);
    await request(emptyApp).post("/api/ranking/preview")
      .send({ criteria: [{ key: "price", type: "cost", weight: 1 }] })
      .expect(409);
  });
});
