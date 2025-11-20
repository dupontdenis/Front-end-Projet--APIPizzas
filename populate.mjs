import mongoose from "mongoose";
import { Pizza } from "./models/pizza.js";
import { Topping } from "./models/toppings.js";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/library";

async function main() {
  await mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected to MongoDB:", MONGO_URL);

  // Remove all existing toppings and pizzas
  await Topping.deleteMany({});
  await Pizza.deleteMany({});
  console.log("Cleared toppings and pizzas collections.");

  // Create some sample pizzas
  // Create pizzas (include `name`, `description`, and `priceCents` fields)
  const pizzasData = [
    {
      name: "Margherita",
      description:
        "The Margherita pizza is a timeless Italian classic topped with tomato, mozzarella, and fresh basil",
    },
    {
      name: "Pepperoni",
      description:
        "The vegetarian pepperoni pizza offers a meat-free twist with spicy plant-based slices for a bold, savory bite.",
    },
    {
      name: "Capri Spicy",
      description:
        "Capri Spicy is a zesty pizza from Capri with chili flakes, garlic, and fresh basil for a hot, savory kick.",
    },
  ];

  const pizzas = await Pizza.insertMany(pizzasData);
  console.log("Inserted pizzas:", pizzas.map((a) => a.name).join(", "));

  // Create toppings that reference the pizzas above. Topping schema expects:
  // { title: <emoji string>, priceCents: <number>, pizzas: [ObjectId] }
  const toppingsData = [
    { title: "🧀", priceCents: 500, pizzas: [pizzas[0]._id, pizzas[1]._id] },
    {
      title: "🍅",
      priceCents: 250,
      pizzas: [pizzas[0]._id, pizzas[1]._id, pizzas[2]._id],
    },
    { title: "🐷", priceCents: 750, pizzas: [pizzas[1]._id] },
    // Toppings for Capri Spicy (new pizza at index 2)
    { title: "🧄", priceCents: 400, pizzas: [pizzas[2]._id] },
    { title: "🌿", priceCents: 200, pizzas: [pizzas[2]._id] },
  ];

  const toppings = await Topping.insertMany(toppingsData);
  console.log("Inserted toppings:", toppings.map((b) => b.title).join(", "));

  await mongoose.disconnect();
  console.log("Disconnected. Seed complete.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
