import { useEffect, useState } from "react";
import api from "../api/client";

const LeaderboardPage = () => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    api.get("/submissions/leaderboard").then((res) => setRows(res.data));
  }, []);

  return (
    <div className="bg-white border rounded-xl p-4">
      <h2 className="text-xl font-semibold mb-4">Leaderboard</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left px-3 py-2">Rank</th>
              <th className="text-left px-3 py-2">Student</th>
              <th className="text-left px-3 py-2">Avg Score</th>
              <th className="text-left px-3 py-2">Streak</th>
              <th className="text-left px-3 py-2">Submissions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r._id} className="border-t">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.averageScore}</td>
                <td className="px-3 py-2">{r.streakCount}</td>
                <td className="px-3 py-2">{r.totalSubmissions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardPage;
