import { useEffect, useMemo, useState } from "react";
import api from "../api/client";
import AudioRecorder from "../components/AudioRecorder";
import MetricCard from "../components/MetricCard";

const StudentDashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [selectedTask, setSelectedTask] = useState("");
  const [file, setFile] = useState(null);
  const [msg, setMsg] = useState("");
  const [me, setMe] = useState(null);

  const load = async () => {
    const [tasksRes, subRes, meRes] = await Promise.all([
      api.get("/tasks"),
      api.get("/submissions"),
      api.get("/users/me"),
    ]);
    setTasks(tasksRes.data);
    setSubmissions(subRes.data);
    setMe(meRes.data);
    if (!selectedTask && tasksRes.data[0]?._id) setSelectedTask(tasksRes.data[0]._id);
  };

  useEffect(() => {
    load();
  }, []);

  const submit = async () => {
    if (!selectedTask || !file) return;
    const form = new FormData();
    form.append("taskId", selectedTask);
    form.append("media", file);
    await api.post("/submissions", form);
    setMsg("Submission uploaded successfully.");
    setFile(null);
    await load();
  };

  const avgScore = useMemo(() => {
    if (!submissions.length) return 0;
    return Math.round(submissions.reduce((sum, s) => sum + (s.finalScore || 0), 0) / submissions.length);
  }, [submissions]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <MetricCard title="Daily Streak" value={me?.streakCount || 0} />
        <MetricCard title="Total Submissions" value={me?.totalSubmissions || 0} />
        <MetricCard title="Average Score" value={`${avgScore}/10`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-lg">Submit Speaking Response</h3>
          <select className="w-full border rounded p-2" value={selectedTask} onChange={(e) => setSelectedTask(e.target.value)}>
            {tasks.map((t) => (
              <option key={t._id} value={t._id}>
                {t.title}
              </option>
            ))}
          </select>
          <AudioRecorder onRecorded={setFile} />
          <input type="file" accept="audio/*,video/*" onChange={(e) => setFile(e.target.files?.[0])} />
          <button onClick={submit} className="px-4 py-2 bg-indigo-600 text-white rounded">
            Submit Response
          </button>
          {msg ? <p className="text-sm text-emerald-600">{msg}</p> : null}
        </div>

        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold text-lg mb-3">Daily Tasks</h3>
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t._id} className="border rounded p-3">
                <p className="font-medium">{t.title}</p>
                <p className="text-sm text-slate-600">{t.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-3">Feedback & Progress</h3>
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s._id} className="border rounded p-3">
              <p className="font-medium">{s.taskId?.title}</p>
              <p className="text-sm text-slate-600 mb-2">Score: {s.finalScore}/10</p>
              <p className="text-sm">AI Grammar Tip: {s.aiFeedback?.grammarSuggestions?.[0]}</p>
              <p className="text-sm">Vocabulary: {s.aiFeedback?.vocabularyImprovements?.[0]}</p>
              <p className="text-sm">Confidence: {s.aiFeedback?.confidenceTips?.[0]}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
