import { useEffect, useState } from "react";
import api from "../api/client";
import MetricCard from "../components/MetricCard";

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/admin/analytics").then((res) => setStats(res.data));
  }, []);

  if (!stats) return <p>Loading...</p>;

  return (
    <div className="grid md:grid-cols-4 gap-4">
      <MetricCard title="Total Users" value={stats.totalUsers} />
      <MetricCard title="Students" value={stats.totalStudents} />
      <MetricCard title="Trainers" value={stats.totalTrainers} />
      <MetricCard title="Submissions" value={stats.totalSubmissions} />
    </div>
  );
};

export default AdminDashboard;
