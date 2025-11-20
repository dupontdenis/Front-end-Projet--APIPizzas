# APIPizzaTopping

## Overview

## How to retrieve all books for a given author (the "trick")

To get all books written by a specific author, query the `Book` collection for documents where the `authors` array contains the author's `_id`:

```js
// In a controller or route:
const books = await Book.find({ authors: authorId });
```

Or with REST Client/cURL:

# APIBookAuthor — API Documentation

This repository provides a small REST API to manage pizzas and toppings (Node.js, Express, Mongoose).
This README focuses on the API: how to run it, seed data, and the available endpoints with examples.

## Run locally

Install dependencies and start the server:

```bash
npm install
# Seed the database (this will erase authors and books):
npm run seed
# Start the server:
npm start
```

### Prerequisites

```bash
docker run --name mongo -p 27017:27017 -d mongo:latest
```

Make sure the database is reachable at `mongodb://localhost:27017/library` (or set `MONGO_URL` accordingly) before running the seed or starting the server.

For development with auto-restart use:

```bash
npm run dev
```

## Seeded data

Running `npm run seed` inserts example pizzas and toppings into the database. The seeder adds sample pizzas.

To see the seeded pizzas and their `_id` values:

```
GET http://localhost:3000/pizzas
```

Copy a pizza's `_id` to use when creating toppings.

## API Endpoints

Base URL: `http://localhost:3000`

Authors

POST /authors
Content-Type: application/json

Body example:

```json
{
  "name": "Alice Example",
  "dateOfBirth": "1985-04-12",
  "dateOfDeath": null
}
```

GET /authors

GET /authors/:id

PUT /authors/:id
Content-Type: application/json

Body example:

```json
{
  "name": "Alice Updated",
  "dateOfBirth": "1985-04-12",
  "dateOfDeath": null
}
```

DELETE /authors/:id

Books

POST /books
Content-Type: application/json

Body example (single author):

```json
{
  "title": "Example Book",
  "authors": ["<AUTHOR_ID>"]
}
```

Body example (multiple authors):

```json
{
  "title": "Collected Works (Seeded)",
  "authors": ["<AUTHOR_ID_1>", "<AUTHOR_ID_2>"]
}
```

GET /books

GET /books/:id

PUT /books/:id
Content-Type: application/json

Body example:

```json
{
  "title": "Example Book (Updated)",
  "authors": ["<AUTHOR_ID>"]
}
```

DELETE /books/:id

## Using seeded IDs in requests

1. Run the seeder: `npm run seed`.
2. Get authors: `GET /authors` and copy an `_id` value.
3. Use that `_id` in the `authors` array when creating a book.

## Notes

If you'd like, I can add: a) example responses for each endpoint, b) a short Postman collection, or c) auto-fill the `api-requests.http` placeholders with IDs produced by the seeder.

## Frontend tester

A minimal static frontend is included to quickly test the `GET /authors` and `GET /books` endpoints.

The frontend files are in the `public/` folder: `index.html`, `main.js`, and `style.css`.

# APIPizzas — Pizza & Topping API

A small Node.js + Express + Mongoose API that manages pizzas and toppings.
This README explains how to run the project, seed example data, and — importantly — how pizza prices are calculated dynamically.

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

Make sure MongoDB is running locally or set `MONGO_URL` to your MongoDB connection string. The project uses `mongodb://localhost:27017/library` by default.

## Seeded data

Run `npm run seed` to insert example pizzas and toppings. After seeding you can list pizzas:

```
GET http://localhost:3000/pizzas
```

and toppings:

```
GET http://localhost:3000/toppings
```

## How pizza price is calculated (dynamically)

This project intentionally calculates pizza prices dynamically from topping prices rather than storing a cached total on the `Pizza` documents. The important pieces are:

- Relationship used by the seeder: toppings reference the pizzas they belong to via a `pizzas` array on the `Topping` model. Pizzas do NOT store topping ids.
- Mongoose virtual populate: the `Pizza` model defines a virtual named `toppings` that looks up `Topping` documents where `Topping.pizzas` contains the pizza `_id`.
  - This lets you call `Pizza.find().populate('toppings')` and get topping objects attached to the pizza documents without storing topping ids on pizzas.
- Total price virtual: the `Pizza` schema defines a `totalPriceCents` virtual that reduces over `this.toppings` (sums `topping.priceCents`), and a `totalPriceEur` virtual that divides cents by 100.
  - Example (conceptual):

```js
// in models/pizza.js (illustrative)
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

- What this means in practice:
  - If you fetch pizzas and populate `toppings`, the returned pizza objects include the computed `totalPriceEur` automatically.
  - If you fetch pizzas without populating, the virtual cannot compute totals because `toppings` will not be available.

### Aggregation endpoint (fast reads)

For list endpoints where you need totals for many pizzas and want to avoid populating each pizza in application code, the server provides an aggregation-based endpoint that computes totals in the database using `$lookup` and `$sum`.

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

- Cached/persisted totals (not implemented by default)
  - Pros: fastest reads (no populate or aggregation required).
  - Cons: requires update logic: whenever a topping price changes, or when toppings are added/removed from a pizza, cached totals must be recomputed and written. This adds complexity and potential for inconsistency if updates are not handled correctly.

Recommendation: keep the virtuals for correctness and implement the aggregation-based endpoint for list views or performance-sensitive pages. Only implement persisted cached totals if you have measured performance problems that aggregation cannot solve.

## API endpoints (summary)

- `GET /pizzas` — list pizzas (populate if needed to compute virtuals)
- `GET /pizzas/aggregate` — aggregation-based list that includes `totalPriceEur`
- `GET /pizzas/:id` — pizza details (populate toppings in controller to include virtual total)
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
- Click **Load Pizzas** to fetch `/pizzas` (or change to `/pizzas/aggregate` in `public/main.js` to use the aggregated totals).
- Click **Load Toppings** to fetch `/toppings`.

## Want help?

If you want, I can:

- Switch the frontend to use `/pizzas/aggregate` by default for lists.
- Add a small Mongoose hook to persist totals when toppings change (if you prefer cached totals).
- Add example responses to the API docs or a Postman/REST Client collection.

---
