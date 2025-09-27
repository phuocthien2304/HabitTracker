import React, { useEffect, useMemo, useState } from "react";
import api from "../services/api";

// Thanh biểu đồ đơn giản bằng CSS
function Bar({ label, value, max }) {
  const width = max ? Math.round((value / max) * 100) : 0;
  return (
    <div className="mb-3">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded">
        <div className="h-2 rounded" style={{ width: `${width}%`, background: "#111827" }} />
      </div>
    </div>
  );
}

export default function StatsPanel() {
  const [summary, setSummary] = useState(null);
  const [weekly, setWeekly] = useState([]);
  const [monthly, setMonthly] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const [s, w, m] = await Promise.all([
        api.get("/api/habits/stats/summary"),
        api.get("/api/habits/stats/weekly"),
        api.get("/api/habits/stats/monthly"),
      ]);
      setSummary(s.data);
      setWeekly(w.data);
      setMonthly(m.data);
      setLoading(false);
    }
    load();
  }, []);

  const maxWeekly = useMemo(() => Math.max(1, ...weekly.map(r => r.count || 0)), [weekly]);
  const maxMonthly = useMemo(() => Math.max(1, ...monthly.map(r => r.count || 0)), [monthly]);

  if (loading) return <p>Loading stats...</p>;

  return (
    <div className="space-y-8">
      <section className="bg-white rounded-xl shadow p-5">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        {summary ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-500">Total Habits</div>
              <div className="text-2xl font-bold">{summary.total ?? 0}</div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-500">Completed</div>
              <div className="text-2xl font-bold">{summary.completed ?? 0}</div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-500">In Progress</div>
              <div className="text-2xl font-bold">{summary.inProgress ?? 0}</div>
            </div>
            <div className="p-4 border rounded-xl">
              <div className="text-sm text-gray-500">Categories</div>
              <div className="text-2xl font-bold">{summary.categories ?? 0}</div>
            </div>
          </div>
        ) : <p>No data.</p>}
      </section>

      <section className="bg-white rounded-xl shadow p-5">
        <h3 className="text-lg font-semibold mb-4">Weekly</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            {weekly.map((r, idx) => (
              <Bar key={idx} label={r.weekLabel || r._id || `W${idx+1}`} value={r.count || 0} max={maxWeekly} />
            ))}
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead><tr><th>Week</th><th>Count</th></tr></thead>
              <tbody>
                {weekly.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2">{r.weekLabel || r._id || `W${idx+1}`}</td>
                    <td className="py-2">{r.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="bg-white rounded-xl shadow p-5">
        <h3 className="text-lg font-semibold mb-4">Monthly</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            {monthly.map((r, idx) => (
              <Bar key={idx} label={r.monthLabel || r._id || `M${idx+1}`} value={r.count || 0} max={maxMonthly} />
            ))}
          </div>
          <div className="overflow-auto">
            <table className="w-full text-left text-sm">
              <thead><tr><th>Month</th><th>Count</th></tr></thead>
              <tbody>
                {monthly.map((r, idx) => (
                  <tr key={idx} className="border-t">
                    <td className="py-2">{r.monthLabel || r._id || `M${idx+1}`}</td>
                    <td className="py-2">{r.count || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}
