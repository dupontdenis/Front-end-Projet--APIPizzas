import mongoose from "mongoose";

const pizzaSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // `description` stores a simple recipe/notes string (renamed from `recept`)
  description: { type: String, default: "" },
});

// Include virtuals when converting documents to objects/JSON
pizzaSchema.set("toObject", { virtuals: true });
pizzaSchema.set("toJSON", { virtuals: true });

// Virtual populate: connect Pizza -> Topping via Topping.pizzas (inverse relation)
pizzaSchema.virtual("toppings", {
  ref: "Topping",
  localField: "_id",
  foreignField: "pizzas",
  justOne: false,
});

// Virtual total price (cents) includes toppings when `toppings` is populated
pizzaSchema.virtual("totalPriceCents").get(function () {
  // Compute total price from populated `toppings` only (no base pizza price)
  if (
    !this.toppings ||
    !Array.isArray(this.toppings) ||
    this.toppings.length === 0
  )
    return 0;
  return this.toppings.reduce((acc, t) => acc + (t.priceCents || 0), 0);
});

pizzaSchema.virtual("totalPriceEur").get(function () {
  return (this.totalPriceCents || 0) / 100;
});

export const Pizza = mongoose.model("Pizza", pizzaSchema);
