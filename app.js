import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import pizzaRoutes from "./routes/pizzaRoutes.js";
import toppingRoutes from "./routes/toppingRoutes.js";

const app = express();
app.use(express.json());
// Enable CORS for all origins (allows requests from any domain)
// Explicitly allow common methods and headers to avoid client issues.
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

mongoose.connect("mongodb://localhost:27017/library");

// Serve frontend static files from the `public` directory
app.use(express.static("public"));

app.use("/pizzas", pizzaRoutes);
app.use("/toppings", toppingRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
