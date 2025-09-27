import { notFound, errorHandler } from "./middlewares/errorHandler.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import habitRouter from "./routes/habit.routes.js";

dotenv.config();

const app = express();const allowedOrigins = [
  process.env.CLIENT_URL,         // vercel
  "http://localhost:5173"         // local dev
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.use("/api/habits", habitRouter);
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => console.log("Server on http://localhost:" + PORT));
  })
  .catch((err) => {
    console.error("DB connect error:", err.message);
    process.exit(1);
  });

  app.use(notFound);

  app.use(errorHandler);
