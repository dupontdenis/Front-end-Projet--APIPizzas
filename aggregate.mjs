import mongoose from "mongoose";
import { Pizza } from "./models/pizza.js";

const MONGO_URL = process.env.MONGO_URL || "mongodb://localhost:27017/library";

async function main() {
  await mongoose.connect(MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  const pizzas = await Pizza.aggregate([
    {
      $lookup: {
        from: "toppings",
        let: { pid: "$_id" },
        pipeline: [
          { $match: { $expr: { $in: ["$$pid", "$pizzas"] } } },
          { $project: { title: 1, priceCents: 1 } },
        ],
        as: "toppingsDocs",
      },
    },
    {
      $addFields: {
        totalPriceCents: { $sum: "$toppingsDocs.priceCents" },
        totalPriceEur: { $divide: [{ $sum: "$toppingsDocs.priceCents" }, 100] },
      },
    },
    {
      $project: {
        name: 1,
        description: 1,
        toppingsDocs: 1,
        totalPriceCents: 1,
        totalPriceEur: 1,
      },
    },
  ]);

  console.log(JSON.stringify(pizzas, null, 2));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
