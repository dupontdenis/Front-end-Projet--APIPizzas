import express from "express";
import {
  createTopping,
  getToppings,
  getTopping,
  updateTopping,
  deleteTopping,
  getPizzasByTopping,
} from "../controllers/toppingController.js";

const router = express.Router();

router.route("/").post(createTopping).get(getToppings);

router.get("/:id/pizzas", getPizzasByTopping);

router.route("/:id").get(getTopping).put(updateTopping).delete(deleteTopping);

export default router;
