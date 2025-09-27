// server/src/controllers/habit.controller.js
import Habit from "../models/habit.model.js";

// 1) Create
export const createHabit = async (req, res) => {
  const { name, category, targetPerWeek, notes } = req.body;
  if (!name?.trim()) return res.status(400).json({ message: "name is required" });
  const doc = await Habit.create({ name: name.trim(), category, targetPerWeek, notes });
  return res.status(201).json(doc);
};

// 2) List + filter + pagination
export const listHabits = async (req, res) => {
  const { page = 1, limit = 10, status, category, from, to } = req.query;
  const q = {};
  if (status === "true") q.completed = true;
  if (status === "false") q.completed = false;
  if (category) q.category = category;
  if (from || to) { // lọc theo ngày tạo (có thể đổi sang lastDoneAt)
    q.createdAt = {};
    if (from) q.createdAt.$gte = new Date(from);
    if (to) q.createdAt.$lte = new Date(to);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    Habit.find(q).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Habit.countDocuments(q),
  ]);
  res.json({ items, page: +page, limit: +limit, total, pages: Math.ceil(total / limit) });
};

// 3) Get one
export const getHabit = async (req, res) => {
  const doc = await Habit.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
};

// 4) Update
export const updateHabit = async (req, res) => {
  const { name } = req.body;
  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ message: "name cannot be empty" });
  }
  const doc = await Habit.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json(doc);
};

// 5) Delete
export const deleteHabit = async (req, res) => {
  const doc = await Habit.findByIdAndDelete(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  res.json({ ok: true });
};

// 6) Toggle complete today
export const toggleToday = async (req, res) => {
  const doc = await Habit.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: "Not found" });
  const now = new Date();
  doc.completed = !doc.completed;
  doc.lastDoneAt = doc.completed ? now : doc.lastDoneAt;
  await doc.save();
  res.json(doc);
};

// 7) Stats summary (done / notDone)
export const statsSummary = async (_req, res) => {
  const agg = await Habit.aggregate([{ $group: { _id: "$completed", count: { $sum: 1 } } }]);
  const done = agg.find(a => a._id === true)?.count || 0;
  const notDone = agg.find(a => a._id === false)?.count || 0;
  res.json({ done, notDone });
};

// 8) Weekly stats
export const weeklyStats = async (_req, res) => {
  const now = new Date();
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const agg = await Habit.aggregate([
    { $match: { lastDoneAt: { $gte: startOfWeek, $lte: endOfWeek } } },
    { $group: { _id: { $dayOfWeek: "$lastDoneAt" }, count: { $sum: 1 } } },
    { $sort: { "_id": 1 } }
  ]);

  const series = [];
  for (let i = 1; i <= 7; i++) {
    const day = agg.find(a => a._id === i);
    series.push({ date: new Date(startOfWeek.getTime() + (i-1)*24*60*60*1000).toISOString().split('T')[0], count: day?.count || 0 });
  }

  const totalCompleted = agg.reduce((sum, item) => sum + item.count, 0);
  res.json({ series, totalCompleted, range: { start: startOfWeek.toISOString(), end: endOfWeek.toISOString() } });
};

// 9) Monthly stats
export const monthlyStats = async (_req, res) => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  endOfMonth.setHours(23, 59, 59, 999);

  const agg = await Habit.aggregate([
     { $match: { lastDoneAt: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: { $dayOfMonth: "$lastDoneAt" }, count: { $sum: 1 } } },
    { $sort: { "_id": 1 } }
  ]);

  const series = [];
  const daysInMonth = endOfMonth.getDate();
  for (let i = 1; i <= daysInMonth; i++) {
    const day = agg.find(a => a._id === i);
    series.push({ date: new Date(startOfMonth.getFullYear(), startOfMonth.getMonth(), i).toISOString().split('T')[0], count: day?.count || 0 });
  }

  const totalCompleted = agg.reduce((sum, item) => sum + item.count, 0);
  res.json({ series, totalCompleted, range: { start: startOfMonth.toISOString(), end: endOfMonth.toISOString() } });
};
// server/src/controllers/habit.controller.js
const weekRangeAt = (iso = null) => {
  const d = iso ? new Date(iso) : new Date();
  const day = (d.getDay() + 6) % 7;        // Mon=0..Sun=6
  const start = new Date(d); start.setDate(d.getDate() - day); start.setHours(0,0,0,0);
  const end   = new Date(start); end.setDate(start.getDate()+6); end.setHours(23,59,59,999);
  return { start, end };
};

export const statsWeekly = async (req, res) => {
  const { at } = req.query;                       // <-- NEW
  const { start, end } = weekRangeAt(at);         // dùng ngày được chọn
  const agg = await Habit.aggregate([
    { $match: { lastDoneAt: { $gte: start, $lte: end } } },
    { $group: { _id: { $dateToString: { date: "$lastDoneAt", format: "%Y-%m-%d" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const days = [...Array(7)].map((_,i)=>{ const d=new Date(start); d.setDate(start.getDate()+i); return d.toISOString().slice(0,10);});
  const byDay = Object.fromEntries(agg.map(a=>[a._id,a.count]));
  res.json({ range: { start, end }, series: days.map(d=>({ date:d, count:byDay[d]||0 })), totalCompleted: agg.reduce((s,a)=>s+a.count,0)});
};
// server/src/controllers/habit.controller.js
const yearRange = (year) => {
  const y = Number(year) || new Date().getFullYear();
  const start = new Date(y,0,1,0,0,0,0);
  const end   = new Date(y,11,31,23,59,59,999);
  return { y, start, end };
};

export const statsYearly = async (req, res) => {
  const { y, start, end } = yearRange(req.query.year);
  const agg = await Habit.aggregate([
    { $match: { lastDoneAt: { $gte: start, $lte: end } } },
    { $group: { _id: { $dateToString: { date: "$lastDoneAt", format: "%Y-%m" } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } }
  ]);
  const map = Object.fromEntries(agg.map(a=>[a._id,a.count]));
  const series = Array.from({length:12},(_,i)=>{
    const key = `${y}-${String(i+1).padStart(2,"0")}`;
    return { label: String(i+1).padStart(2,"0"), count: map[key]||0 };
  });
  res.json({ range: { year: y }, series });
};
