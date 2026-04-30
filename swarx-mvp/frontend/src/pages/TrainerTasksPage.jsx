import { useEffect, useState } from "react";
import api from "../api/client";

const TrainerTasksPage = () => {
  const [students, setStudents] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [form, setForm] = useState({ title: "", description: "", assignedTo: [] });

  const load = async () => {
    const [studentsRes, tasksRes] = await Promise.all([api.get("/users/assigned-students"), api.get("/tasks")]);
    setStudents(studentsRes.data);
    setTasks(tasksRes.data);
  };

  useEffect(() => {
    load();
  }, []);

  const createTask = async (e) => {
    e.preventDefault();
    await api.post("/tasks", form);
    setForm({ title: "", description: "", assignedTo: [] });
    await load();
  };

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-3">Assign New Task</h3>
        <form onSubmit={createTask} className="space-y-3">
          <input className="w-full border rounded p-2" placeholder="Task title" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          <textarea className="w-full border rounded p-2" placeholder="Task description" value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} />
          <select
            multiple
            className="w-full border rounded p-2 min-h-32"
            value={form.assignedTo}
            onChange={(e) =>
              setForm((p) => ({
                ...p,
                assignedTo: Array.from(e.target.selectedOptions).map((o) => o.value),
              }))
            }
          >
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded">Create Task</button>
        </form>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-3">Existing Tasks</h3>
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
  );
};

export default TrainerTasksPage;
