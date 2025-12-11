# APIPizzas — Pizza & Topping API

## Overview

Small Node.js + Express + Mongoose REST API to manage pizzas and toppings. This README explains how to run the project, seed example data, and how pizza prices are calculated dynamically from topping prices.

## Run locally

Install dependencies and start the server:

```bash
npm install
# Seed the database (this will erase pizzas and toppings collections):
npm run seed
# Start the server:
npm start
```

For development with autoreload:

```bash
npm run dev
```

### Prerequisites

You can run MongoDB locally with Docker:

```bash
docker run --name mongo -p 27017:27017 -d mongo:latest
```

By default the project expects `MONGO_URL` to point at `mongodb://localhost:27017/library`. Set `MONGO_URL` to your connection string if needed.

## Seeded data

Run `npm run seed` to insert example pizzas and toppings. After seeding you can list pizzas:

```
GET http://localhost:3000/pizzas
```

Run `npm run seed` to insert example pizzas and toppings. After seeding you can list pizzas:

```
GET http://localhost:3000/pizzas
```

and toppings:

```
GET http://localhost:3000/toppings
```

Copy a pizza's `_id` to use when creating or updating toppings that reference pizzas.

## How pizza price is calculated (dynamically)

Pizza prices are computed from topping prices rather than storing a cached total on the `Pizza` documents. Key points:

- Seeder relationship: toppings reference the pizzas they belong to via a `pizzas` array on the `Topping` model. Pizzas do NOT store topping ids.
- Virtual populate: the `Pizza` model defines a virtual named `toppings` that looks up `Topping` documents where `Topping.pizzas` contains the pizza `_id`.
  - This lets you call `Pizza.find().populate('toppings')` and get topping objects attached to pizza documents without storing topping ids on pizzas.
- Total price virtuals: the `Pizza` schema defines a `totalPriceCents` virtual that sums `topping.priceCents`, and a `totalPriceEur` virtual that divides cents by 100.

Example (illustrative snippet from `models/pizza.js`):

```js
pizzaSchema.virtual("toppings", {
  ref: "Topping",
  localField: "_id",
  foreignField: "pizzas",
  justOne: false,
});

pizzaSchema.virtual("totalPriceCents").get(function () {
  if (!Array.isArray(this.toppings) || this.toppings.length === 0) return 0;
  return this.toppings.reduce((sum, t) => sum + (t.priceCents || 0), 0);
});

pizzaSchema.virtual("totalPriceEur").get(function () {
  return (this.totalPriceCents || 0) / 100;
});
```

When you fetch pizzas and populate `toppings`, the returned pizza objects include the computed `totalPriceEur` automatically. If you fetch pizzas without populating, the virtuals cannot compute totals.

### Aggregation endpoint (fast reads)

For list endpoints where you need totals for many pizzas and want to avoid populating, the server provides an aggregation-based endpoint (`GET /pizzas/aggregate`) that computes totals in the database using `$lookup` and `$sum`.

Example pipeline (used in `GET /pizzas/aggregate`):

```js
// lookup toppings by matching pizza id in topping.pizzas
{
  $lookup: {
    from: 'toppings',
    let: { pid: '$_id' },
    pipeline: [
      { $match: { $expr: { $in: ['$$pid', '$pizzas'] } } },
      { $project: { title: 1, priceCents: 1 } }
    ],
    as: 'toppingsDocs'
  }
},
{ $addFields: { totalPriceCents: { $sum: '$toppingsDocs.priceCents' }, totalPriceEur: { $divide: [{ $sum: '$toppingsDocs.priceCents' }, 100] } } }
```

This returns pizzas with `toppingsDocs`, `totalPriceCents`, and `totalPriceEur` computed by the DB — useful for fast listings.

### Trade-offs and recommendations

- Virtuals (current approach)

  - Pros: always-consistent (reflect topping price changes immediately), low schema complexity, no write-time bookkeeping.
  - Cons: computing totals requires populating toppings; may be slower for very large lists.

- Aggregation endpoint

  - Pros: computes totals in the DB efficiently and returns numeric totals without populating Mongoose documents.
  - Cons: aggregation might be more complex to maintain; returns plain objects rather than full Mongoose documents.

- Cached/persisted totals (not implemented)
  - Pros: fastest reads (no populate or aggregation required).
  - Cons: requires update logic to keep totals consistent when topping prices change.

Recommendation: keep virtuals for correctness and use the aggregation endpoint for performance-sensitive list views. Consider persisted cached totals only if profiling shows an actual need.

## API endpoints (summary)

- `GET /pizzas` — list pizzas (populate if needed to compute virtuals)
- `GET /pizzas/aggregate` — aggregation-based list that includes `totalPriceEur`
- `GET /pizzas/:id` — pizza details (populate toppings to include virtual total)
- `POST /pizzas` — create pizza
- `PUT /pizzas/:id` — update pizza
- `DELETE /pizzas/:id` — delete pizza

- `GET /toppings` — list toppings
- `GET /toppings/:id` — topping details
- `POST /toppings` — create topping (include `pizzas` array of pizza ids)
- `PUT /toppings/:id` — update topping
- `DELETE /toppings/:id` — delete topping

## Frontend tester

A tiny static frontend is included in `public/` for quick tests:

- Open `http://localhost:3000/` after starting the server.
- Click **Load Pizzas** to fetch `/pizzas` (or change to `/pizzas/aggregate` in `public/main.js`).
- Click **Load Toppings** to fetch `/toppings`.

## Want help?

If you want, I can:

- Switch the frontend to use `/pizzas/aggregate` by default for lists.
- Add a small Mongoose hook to persist totals when toppings change (for cached totals).
- Add example responses to the API docs or a Postman/REST Client collection.

---
