import { Topping } from "../models/toppings.js";
import { Pizza } from "../models/pizza.js";

export async function createTopping(req, res) {
  try {
    const priceCents =
      typeof req.body.priceCents === "number"
        ? req.body.priceCents
        : req.body.price
        ? Math.round(parseFloat(req.body.price) * 100)
        : 0;

    const topping = new Topping({
      title: req.body.title,
      pizzas: req.body.pizzas,
      summary: req.body.summary,
      priceCents,
    });
    const saved = await topping.save();
    res.status(201).json(saved);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
}

export async function getToppings(req, res) {
  if (req.query && req.query.pizza) {
    const toppings = await Topping.find({ pizzas: req.query.pizza });
    return res.json(toppings);
  }

  const toppings = await Topping.find().populate("pizzas");
  res.json(toppings);
}

export async function getToppingsByPizza(req, res) {
  const pizzaId = req.params.pizzaId || req.params.id;
  if (!pizzaId) return res.status(400).json({ error: "pizza id is required" });
  const toppings = await Topping.find({ pizzas: pizzaId });
  res.json(toppings);
}

export async function getPizzasByTopping(req, res) {
  const toppingId = req.params.id;
  if (!toppingId)
    return res.status(400).json({ error: "topping id is required" });

  const topping = await Topping.findById(toppingId);
  if (!topping) return res.status(404).json({ error: "topping not found" });

  const pizzaIds = Array.isArray(topping.pizzas) ? topping.pizzas : [];
  const pizzas = await Pizza.find({ _id: { $in: pizzaIds } });
  res.json(pizzas);
}

export async function getTopping(req, res) {
  const topping = await Topping.findById(req.params.id).populate("pizzas");
  res.json(topping);
}

export async function updateTopping(req, res) {
  const updateData = { ...req.body };
  if (req.body.price || req.body.priceCents) {
    updateData.priceCents =
      typeof req.body.priceCents === "number"
        ? req.body.priceCents
        : req.body.price
        ? Math.round(parseFloat(req.body.price) * 100)
        : 0;
  }

  const updated = await Topping.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
  }).populate("pizzas");

  res.json(updated);
}

export async function deleteTopping(req, res) {
  await Topping.findByIdAndDelete(req.params.id);
  res.status(204).end();
}
