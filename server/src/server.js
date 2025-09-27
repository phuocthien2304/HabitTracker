import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import habitRouter from "./routes/habit.routes.js";
import { notFound, errorHandler } from "./middlewares/errorHandler.js";

dotenv.config();

const app = express();

/** ---------- CORS ---------- */
// Cho phép nhập nhiều domain qua ENV, phân tách bằng dấu phẩy
const fromEnv = (process.env.CLIENT_URL || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// Danh sách “allow list” cố định
const allowList = new Set([
  "http://localhost:5173",
  ...fromEnv,
]);

// Cho phép tất cả các subdomain *.vercel.app (preview build)
const isAllowed = (origin) => {
  if (!origin) return true; // Postman/Thunder Client
  if (allowList.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true;
  } catch {}
  return false;
};

const corsOptions = {
  origin: (origin, cb) => (isAllowed(origin) ? cb(null, true) : cb(new Error("Not allowed by CORS"))),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
// preflight cho mọi route
app.options("*", cors(corsOptions));

/** ---------- Middlewares ---------- */
app.use(express.json());
app.use(morgan("dev"));

/** ---------- Healthcheck ---------- */
app.get("/", (_req, res) => res.send("Backend is running"));
app.get("/api/health", (_req, res) => res.json({ ok: true }));

/** ---------- Routes ---------- */
app.use("/api/habits", habitRouter);

/** ---------- Errors ---------- */
app.use(notFound);
app.use(errorHandler);

/** ---------- Start server ---------- */
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, "0.0.0.0", () => console.log("✅ Server on :" + PORT));
  })
  .catch((err) => {
    console.error("❌ DB connect error:", err.message);
    process.exit(1);
  });
