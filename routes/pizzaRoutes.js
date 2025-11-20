import express from "express";
import {
  createPizza,
  getPizzas,
  getPizzasAggregated,
  getPizza,
  updatePizza,
  deletePizza,
} from "../controllers/pizzaController.js";
import { getToppingsByPizza } from "../controllers/toppingController.js";

const router = express.Router();

router.route("/").post(createPizza).get(getPizzas);
// Aggregation endpoint for faster list reads (avoids full population in app)
router.get("/aggregate", getPizzasAggregated);

router.get("/:id/toppings", getToppingsByPizza);

router.route("/:id").get(getPizza).put(updatePizza).delete(deletePizza);

export default router;
