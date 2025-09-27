import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import habitRouter from "./routes/habit.routes.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

// --- CORS ---
const allowList = new Set([
  "http://localhost:5173",
  ...(process.env.CLIENT_URL || "").split(",").map(s => s.trim()).filter(Boolean),
]);
const isAllowed = (origin) => {
  if (!origin) return true;
  if (allowList.has(origin)) return true;
  try { return new URL(origin).hostname.endsWith(".vercel.app"); } catch { return false; }
};
const corsOptions = {
  origin: (origin, cb) => (isAllowed(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  credentials: true,
  methods: ["GET","POST","PUT","PATCH","DELETE","OPTIONS"],
  allowedHeaders: ["Content-Type","Authorization"],
};
app.use(cors(corsOptions));
// Nếu muốn, chỉ bật preflight cho /api/* (không dùng '*'):
app.options("/api/*", cors(corsOptions));

// --- middlewares ---
app.use(express.json());
app.use(morgan("dev"));

// --- health ---
app.get("/", (_req, res) => res.send("Backend running"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// --- routes ---
app.use("/api/habits", habitRouter);

// --- errors ---
app.use(notFound);
app.use(errorHandler);

// --- start ---
const PORT = process.env.PORT || 5000;
mongoose.connect(process.env.MONGO_URI)
  .then(() => app.listen(PORT, "0.0.0.0", () => console.log("✅ Server on :", PORT)))
  .catch(err => { console.error("❌ DB connect error:", err.message); process.exit(1); });
