"use client"

import { useEffect, useMemo, useState } from "react"
import { api } from "../services/api"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

// --------- UI helper ---------
const Pill = ({ children, className = "" }) => (
  <span className={`px-2 py-1 rounded-full text-xs font-medium ${className}`}>{children}</span>
)

// Định dạng ngày
const fmtDate = (d) => new Date(d).toLocaleDateString("vi-VN")

export default function Home() {
  // ---------- CRUD + LIST ----------
  const [form, setForm] = useState({ name: "", category: "", targetPerWeek: 3 })
  const [data, setData] = useState({ items: [], page: 1, pages: 1 })
  const [query, setQuery] = useState({ status: "all", category: "", page: 1, limit: 8 })
  const [stats, setStats] = useState({ done: 0, notDone: 0 })

  // ---------- CATEGORY (dropdown + thêm mới) ----------
  const [categories, setCategories] = useState([]) // danh sách có sẵn
  const [showAddCat, setShowAddCat] = useState(false) // mở input thêm danh mục
  const [newCat, setNewCat] = useState("")

  // ---------- STATS MODAL ----------
  const [showStats, setShowStats] = useState(false)
  const [viewMode, setViewMode] = useState("week") // 'week' | 'month'
  const [weeklyStats, setWeeklyStats] = useState(null) // { series: [{date,count}], totalCompleted }
  const [monthlyStats, setMonthlyStats] = useState(null) // { range:{start,end}, series:[{date,count}] }
  const [loadingWeekly, setLoadingWeekly] = useState(false)
  const [loadingMonthly, setLoadingMonthly] = useState(false)

  // ---------- LIST ----------
  const fetchList = async () => {
    const params = { page: query.page, limit: query.limit }
    if (query.status !== "all") params.status = query.status
    if (query.category) params.category = query.category
    const res = await api.get("/habits", { params })
    setData(res.data)
  }

  const fetchStats = async () => {
    const res = await api.get("/habits/stats/summary")
    setStats(res.data)
  }

  // Lấy list + stats
  useEffect(() => {
    fetchList() /* eslint-disable-next-line */
  }, [query])
  useEffect(() => {
    fetchStats() /* eslint-disable-next-line */
  }, [data])

  // Cập nhật dropdown categories dựa theo danh sách hiện có
  useEffect(() => {
    const uniq = Array.from(new Set((data.items || []).map((i) => i.category).filter(Boolean))).sort((a, b) =>
      a.localeCompare(b, "vi"),
    )
    setCategories(uniq)
  }, [data.items])

  // ---------- Thêm danh mục mới ----------
  const addCategory = (e) => {
    e.preventDefault()
    const cat = newCat.trim()
    if (!cat) return
    if (!categories.includes(cat)) {
      setCategories((prev) => [...prev, cat].sort((a, b) => a.localeCompare(b, "vi")))
    }
    setForm((f) => ({ ...f, category: cat })) // set luôn vào form
    setNewCat("")
    setShowAddCat(false)
  }

  // ---------- FETCH detail stats ----------
  const fetchWeeklyStats = async () => {
    try {
      setLoadingWeekly(true)
      const res = await api.get("/habits/stats/weekly")
      setWeeklyStats(res.data)
    } finally {
      setLoadingWeekly(false)
    }
  }

  const fetchMonthlyStats = async () => {
    try {
      setLoadingMonthly(true)
      const res = await api.get("/habits/stats/monthly")
      setMonthlyStats(res.data)
    } finally {
      setLoadingMonthly(false)
    }
  }

  // Mở modal: preload CẢ 2 để đổi tab mượt
  const openStatsModal = async () => {
    setShowStats(true)
    fetchWeeklyStats()
    fetchMonthlyStats()
  }

  // Khi đổi tab, nếu tab chưa có dữ liệu thì tải bổ sung
  const onSwitchWeek = () => {
    setViewMode("week")
    if (!weeklyStats) fetchWeeklyStats()
  }
  const onSwitchMonth = () => {
    setViewMode("month")
    if (!monthlyStats) fetchMonthlyStats()
  }

  // ---------- CRUD ----------
  const onCreate = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return
    await api.post("/habits", form)
    setForm({ name: "", category: form.category || "", targetPerWeek: 3 })
    setQuery({ ...query, page: 1 }) // reload list
  }

  const onToggle = async (id) => {
    await api.post(`/habits/${id}/toggle`)
    fetchList()
  }

  const onDelete = async (id) => {
    await api.delete(`/habits/${id}`)
    fetchList()
  }

  // ---------- Safe % helpers ----------
  const totalHabits = (stats?.done ?? 0) + (stats?.notDone ?? 0)
  const weeklyCompleted = weeklyStats?.totalCompleted ?? 0
  const weeklyRate = totalHabits ? ((weeklyCompleted / totalHabits) * 100).toFixed(1) : "0.0"
  const monthlyCompleted = monthlyStats?.series?.reduce((s, i) => s + i.count, 0) ?? 0
  const monthlyRate = totalHabits ? ((monthlyCompleted / totalHabits) * 100).toFixed(1) : "0.0"

  const weeklyChartData = useMemo(() => {
    if (!weeklyStats?.series) return []
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    return weeklyStats.series.map((d) => ({
      day: dayNames[new Date(d.date).getDay()],
      date: fmtDate(d.date),
      count: d.count,
      fullDate: d.date,
    }))
  }, [weeklyStats])

  const monthlyChartData = useMemo(() => {
    if (!monthlyStats?.series) return []
    return monthlyStats.series.map((d) => ({
      date: fmtDate(d.date),
      count: d.count,
      fullDate: d.date,
    }))
  }, [monthlyStats])

  // ---------- UI ----------
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
            <span>🎯 Habit Tracker</span>
          </h1>
          <p className="text-slate-600">Theo dõi và xây dựng thói quen tích cực mỗi ngày</p>
        </div>

        {/* Add */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Thêm thói quen mới</h2>

          {/* Form thêm mới */}
          <form onSubmit={onCreate} className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <input
              className="md:col-span-6 px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-black"
              placeholder="Tên thói quen (vd: Đọc sách 30', Thiền...)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            {/* Dropdown chọn danh mục */}
            <div className="md:col-span-4 flex flex-col gap-2">
              <select
                className="px-4 py-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="">— Chọn danh mục —</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              {/* Toggle thêm danh mục mới */}
              {!showAddCat ? (
                <button
                  type="button"
                  className="text-white hover:underline self-start"
                  onClick={() => setShowAddCat(true)}
                >
                  ➕ Thêm danh mục mới
                </button>
              ) : (
                <form onSubmit={addCategory} className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-black"
                    placeholder="Tên danh mục mới…"
                    value={newCat}
                    onChange={(e) => setNewCat(e.target.value)}
                  />
                  <button
                    onClick={addCategory}
                    className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    Thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCat(false)
                      setNewCat("")
                    }}
                    className="px-3 py-2 rounded-xl border border-slate-300"
                  >
                    Huỷ
                  </button>
                </form>
              )}
            </div>

            <button className="md:col-span-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium">
              Thêm
            </button>
          </form>
        </div>

        {/* Summary + Filters */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-slate-200 p-6 mb-6">
          <div className="flex flex-col xl:flex-row justify-between gap-6">
            <div className="flex items-center gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{stats.done}</div>
                <div className="text-sm text-slate-600">Hoàn thành</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-amber-600">{stats.notDone}</div>
                <div className="text-sm text-slate-600">Chưa hoàn thành</div>
              </div>
              <button
                onClick={openStatsModal}
                className="px-4 py-2 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-medium"
              >
                📊 Thống kê chi tiết
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <select
                value={query.status}
                onChange={(e) => setQuery({ ...query, status: e.target.value, page: 1 })}
                className="px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-black"
              >
                <option value="all">Tất cả trạng thái</option>
                <option value="false">Chưa hoàn thành</option>
                <option value="true">Đã hoàn thành</option>
              </select>

              {/* Dropdown lọc danh mục */}
              <select
                value={query.category}
                onChange={(e) => setQuery({ ...query, category: e.target.value, page: 1 })}
                className="px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500 text-black"
              >
                <option value="">Tất cả danh mục</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* List */}
        <div className="bg-white/80 backdrop-blur rounded-2xl shadow border border-slate-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Danh sách thói quen</h2>

          {data.items.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <div className="text-5xl mb-2">📝</div>
              Chưa có thói quen nào. Hãy thêm thói quen đầu tiên!
            </div>
          ) : (
            <div className="grid gap-3">
              {data.items.map((h) => (
                <div
                  key={h._id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={h.completed}
                      onChange={() => onToggle(h._id)}
                      className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${h.completed ? "line-through text-slate-500" : "text-slate-800"}`}>
                        {h.name}
                      </span>
                      {/* HIỆN DANH MỤC */}
                      {h.category && <Pill className="bg-indigo-100 text-indigo-700">{h.category}</Pill>}
                    </div>
                  </div>
                  <button
                    onClick={() => onDelete(h._id)}
                    className="px-3 py-1 rounded-lg border border-slate-300 hover:bg-rose-50 text-slate-700"
                  >
                    🗑 Xóa
                  </button>
                </div>
              ))}
            </div>
          )}

          {data.pages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-6">
              <button
                disabled={data.page <= 1}
                onClick={() => setQuery({ ...query, page: data.page - 1 })}
                className="px-4 py-2 rounded-xl border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
              >
                ← Trước
              </button>
              <span className="px-4 py-2 text-slate-600">
                Trang {data.page}/{data.pages}
              </span>
              <button
                disabled={data.page >= data.pages}
                onClick={() => setQuery({ ...query, page: data.page + 1 })}
                className="px-4 py-2 rounded-xl border border-slate-300 disabled:opacity-50 hover:bg-slate-50"
              >
                Sau →
              </button>
            </div>
          )}
        </div>

        {/* --------- MODAL: Stats --------- */}
        {showStats && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full h-full max-w-none max-h-none overflow-y-auto md:w-[95vw] md:h-[95vh] md:max-w-6xl md:max-h-[95vh]">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-800">📊 Thống kê chi tiết</h2>
                  <button onClick={() => setShowStats(false)} className="text-slate-500 hover:text-slate-700 text-2xl">
                    ×
                  </button>
                </div>

                {/* Switch */}
                <div className="flex gap-2 mb-6">
                  <button
                    onClick={onSwitchWeek}
                    className={`px-4 py-2 rounded-xl font-medium ${
                      viewMode === "week" ? "bg-indigo-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    Xem tuần
                  </button>
                  <button
                    onClick={onSwitchMonth}
                    className={`px-4 py-2 rounded-xl font-medium ${
                      viewMode === "month" ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-700"
                    }`}
                  >
                    Xem tháng
                  </button>
                </div>

                {/* WEEK */}
                {viewMode === "week" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800">📅 Thống kê tuần này</h3>
                    {loadingWeekly ? (
                      <div className="text-center py-6 text-slate-500">Đang tải…</div>
                    ) : weeklyStats ? (
                      <>
                        {/* Tóm tắt + "ô tròn" theo ngày */}
                        <div className="bg-indigo-50 rounded-xl p-4">
                          <div className="text-center mb-3">
                            <div className="text-3xl font-bold text-indigo-700">{weeklyCompleted}</div>
                            <div className="text-sm text-slate-600">
                              Tỷ lệ hoàn thành tuần: <b>{weeklyRate}%</b>
                            </div>
                          </div>
                          <div className="grid grid-cols-7 gap-2">
                            {weeklyStats.series.map((d) => {
                              const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
                              const dayIdx = new Date(d.date).getDay()
                              return (
                                <div key={d.date} className="text-center">
                                  <div className="text-xs text-slate-600 mb-1">{dayNames[dayIdx]}</div>
                                  <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium ${
                                      d.count > 0 ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600"
                                    }`}
                                  >
                                    {d.count}
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                          <h4 className="font-medium mb-4 text-lg">Biểu đồ cột - Thống kê tuần</h4>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={weeklyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                  }}
                                  formatter={(value, name) => [value, "Số lần hoàn thành"]}
                                  labelFormatter={(label, payload) => {
                                    if (payload && payload[0]) {
                                      return `${label} (${payload[0].payload.date})`
                                    }
                                    return label
                                  }}
                                />
                                <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Hoàn thành" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* BẢNG tuần */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <h4 className="font-medium mb-2">Bảng thống kê tuần</h4>
                          <div className="overflow-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr>
                                  <th className="py-2">Ngày</th>
                                  <th className="py-2">Số lần hoàn thành</th>
                                </tr>
                              </thead>
                              <tbody>
                                {weeklyStats.series.map((r) => (
                                  <tr key={r.date} className="border-t">
                                    <td className="py-2">{fmtDate(r.date)}</td>
                                    <td className="py-2">{r.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 text-slate-500">Không có dữ liệu</div>
                    )}
                  </div>
                )}

                {/* MONTH */}
                {viewMode === "month" && (
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-slate-800">📈 Thống kê tháng này</h3>
                    {loadingMonthly ? (
                      <div className="text-center py-6 text-slate-500">Đang tải…</div>
                    ) : monthlyStats ? (
                      <>
                        {/* Tóm tắt */}
                        <div className="bg-emerald-50 rounded-xl p-4">
                          <div className="text-center mb-3">
                            <div className="text-3xl font-bold text-emerald-700">{monthlyCompleted}</div>
                            <div className="text-sm text-slate-600">
                              Tỷ lệ hoàn thành tháng: <b>{monthlyRate}%</b>
                            </div>
                            {monthlyStats.range?.start && monthlyStats.range?.end && (
                              <div className="text-xs text-slate-500 mt-1">
                                {fmtDate(monthlyStats.range.start)} — {fmtDate(monthlyStats.range.end)}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6">
                          <h4 className="font-medium mb-4 text-lg">Biểu đồ cột - Thống kê tháng</h4>
                          <div className="h-80">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={monthlyChartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis
                                  dataKey="date"
                                  stroke="#64748b"
                                  fontSize={12}
                                  angle={-45}
                                  textAnchor="end"
                                  height={80}
                                />
                                <YAxis stroke="#64748b" fontSize={12} />
                                <Tooltip
                                  contentStyle={{
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                    borderRadius: "8px",
                                    fontSize: "14px",
                                  }}
                                  formatter={(value, name) => [value, "Số lần hoàn thành"]}
                                  labelFormatter={(label) => `Ngày ${label}`}
                                />
                                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Hoàn thành" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </div>

                        {/* BẢNG tháng */}
                        <div className="bg-white rounded-xl border border-slate-200 p-4">
                          <h4 className="font-medium mb-2">Bảng thống kê tháng</h4>
                          <div className="overflow-auto">
                            <table className="w-full text-left text-sm">
                              <thead>
                                <tr>
                                  <th className="py-2">Ngày</th>
                                  <th className="py-2">Số lần hoàn thành</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(monthlyStats.series || []).map((r, idx) => (
                                  <tr key={`${r.date}-${idx}`} className="border-t">
                                    <td className="py-2">{fmtDate(r.date)}</td>
                                    <td className="py-2">{r.count}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="text-center py-6 text-slate-500">Không có dữ liệu</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
