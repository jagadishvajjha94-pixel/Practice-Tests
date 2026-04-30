import { useEffect, useState } from "react";
import api from "../api/client";

const TrainerDashboard = () => {
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [feedback, setFeedback] = useState({});

  const load = async () => {
    const [studentsRes, subRes] = await Promise.all([api.get("/users/assigned-students"), api.get("/submissions")]);
    setStudents(studentsRes.data);
    setSubmissions(subRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const submitFeedback = async (submissionId) => {
    const payload = feedback[submissionId];
    if (!payload?.comments || !payload?.score) return;
    await api.post("/feedback", { submissionId, comments: payload.comments, score: Number(payload.score) });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-3">Assigned Students</h3>
        <ul className="grid md:grid-cols-2 gap-3">
          {students.map((s) => (
            <li key={s._id} className="border rounded p-3">
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-slate-600">{s.email}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-3">Submissions & Feedback</h3>
        <div className="space-y-3">
          {submissions.map((s) => (
            <div key={s._id} className="border rounded p-3 space-y-2">
              <p className="font-medium">{s.userId?.name} - {s.taskId?.title}</p>
              <a href={(import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace("/api", "") + s.fileUrl} target="_blank" rel="noreferrer" className="text-indigo-600 text-sm">
                Open Recording
              </a>
              <textarea
                className="w-full border rounded p-2"
                placeholder="Trainer feedback"
                onChange={(e) =>
                  setFeedback((prev) => ({ ...prev, [s._id]: { ...prev[s._id], comments: e.target.value } }))
                }
              />
              <input
                type="number"
                min="1"
                max="10"
                className="border rounded p-2"
                placeholder="Score /10"
                onChange={(e) =>
                  setFeedback((prev) => ({ ...prev, [s._id]: { ...prev[s._id], score: e.target.value } }))
                }
              />
              <button onClick={() => submitFeedback(s._id)} className="px-3 py-2 bg-indigo-600 text-white rounded">
                Submit Trainer Feedback
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrainerDashboard;
