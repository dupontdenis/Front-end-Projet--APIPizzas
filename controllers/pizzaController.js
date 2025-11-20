import { Pizza } from "../models/pizza.js";
import { Topping } from "../models/toppings.js";

export async function createPizza(req, res) {
  try {
    const pizza = new Pizza({
      name: req.body.name,
      dateOfCreation: req.body.dateOfCreation,
      discontinued: req.body.discontinued,
      toppings: req.body.toppings || [],
      description: req.body.description || "",
    });
    const saved = await pizza.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getPizzas(req, res) {
  // Populate toppings to compute total price (cents) and return EUR values
  const pizzas = await Pizza.find().populate({
    path: "toppings",
    model: Topping,
  });
  const result = pizzas.map((p) => {
    const toppingsSumCents = Array.isArray(p.toppings)
      ? p.toppings.reduce((acc, t) => acc + (t.priceCents || 0), 0)
      : 0;
    const totalPriceCents = toppingsSumCents;
    return { ...p.toObject(), totalPriceEur: totalPriceCents / 100 };
  });
  res.json(result);
}

// Aggregation-based list: computes total price in the database via $lookup and $sum
export async function getPizzasAggregated(req, res) {
  const pizzas = await Pizza.aggregate([
    {
      $lookup: {
        from: "toppings",
        localField: "toppings",
        foreignField: "_id",
        as: "toppingsDocs",
      },
    },
    {
      $addFields: {
        totalPriceCents: { $sum: "$toppingsDocs.priceCents" },
        totalPriceEur: { $divide: [{ $sum: "$toppingsDocs.priceCents" }, 100] },
      },
    },
    // Optionally project fields you want to expose; here we expose everything plus totals
  ]);

  res.json(pizzas);
}

export async function getPizza(req, res) {
  const pizza = await Pizza.findById(req.params.id).populate({
    path: "toppings",
    model: Topping,
  });
  if (!pizza) return res.status(404).json({ error: "pizza not found" });
  const toppingsSumCents = Array.isArray(pizza.toppings)
    ? pizza.toppings.reduce((acc, t) => acc + (t.priceCents || 0), 0)
    : 0;
  const totalPriceCents = toppingsSumCents;
  res.json({ ...pizza.toObject(), totalPriceEur: totalPriceCents / 100 });
}

export async function updatePizza(req, res) {
  const updated = await Pizza.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      dateOfCreation: req.body.dateOfCreation,
      discontinued: req.body.discontinued,
      toppings: req.body.toppings,
      description: req.body.description || "",
    },
    { new: true }
  );
  res.json(updated);
}

export async function deletePizza(req, res) {
  await Pizza.findByIdAndDelete(req.params.id);
  res.status(204).end();
}
