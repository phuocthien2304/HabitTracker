// server/src/routes/habit.routes.js
import { Router } from "express";
import { createHabit, listHabits, getHabit, updateHabit, deleteHabit, toggleToday, statsSummary, weeklyStats, monthlyStats, statsWeekly, statsYearly } from "../controllers/habit.controller.js";

const r = Router();
r.get("/", listHabits);
r.post("/", createHabit);
r.get("/stats/summary", statsSummary);
r.get("/stats/weekly", weeklyStats);
r.get("/stats/monthly", monthlyStats);
r.get("/:id", getHabit);
r.put("/:id", updateHabit);
r.delete("/:id", deleteHabit);
r.post("/:id/toggle", toggleToday);

export default r;
