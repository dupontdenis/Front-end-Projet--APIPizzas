import mongoose from "mongoose";

const toppingSchema = new mongoose.Schema({
  // `title` is intended to be an emoji (or sequence of emojis) like "🍅" or "🧀"
  title: {
    type: String,
    required: true,
  },
  // `priceCents` stores integer cents in EUR for the topping (e.g. 50 means €0.50)
  priceCents: { type: Number, default: 0 },
  pizzas: [{ type: mongoose.Schema.Types.ObjectId, ref: "Pizza" }],
});

// Include virtuals in toObject/toJSON
toppingSchema.set("toObject", { virtuals: true });
toppingSchema.set("toJSON", { virtuals: true });

// Virtual getter for price in euros
toppingSchema.virtual("priceEur").get(function () {
  return (this.priceCents || 0) / 100;
});

export const Topping = mongoose.model("Topping", toppingSchema);
