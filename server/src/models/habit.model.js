import mongoose from "mongoose";

const HabitSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  completed: { type: Boolean, default: false },
  category: { type: String, default: "general" },
  targetPerWeek: { type: Number, default: 3, min: 0 },
  lastDoneAt: { type: Date },
  notes: { type: String }
}, { timestamps: true });

export default mongoose.model("Habit", HabitSchema);
