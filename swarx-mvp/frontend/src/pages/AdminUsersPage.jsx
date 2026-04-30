import { useEffect, useState } from "react";
import api from "../api/client";

const blankUser = { name: "", email: "", role: "student", password: "password123" };

const AdminUsersPage = () => {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(blankUser);
  const [assignForm, setAssignForm] = useState({ studentId: "", trainerId: "" });

  const load = async () => {
    const { data } = await api.get("/admin/users");
    setUsers(data);
  };

  useEffect(() => {
    load();
  }, []);

  const createUser = async (e) => {
    e.preventDefault();
    await api.post("/admin/users", form);
    setForm(blankUser);
    await load();
  };

  const removeUser = async (id) => {
    await api.delete(`/admin/users/${id}`);
    await load();
  };

  const assignTrainer = async (e) => {
    e.preventDefault();
    await api.post("/admin/assign-trainer", assignForm);
    setAssignForm({ studentId: "", trainerId: "" });
    await load();
  };

  const students = users.filter((u) => u.role === "student");
  const trainers = users.filter((u) => u.role === "trainer");

  return (
    <div className="space-y-5">
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Create User</h3>
        <form onSubmit={createUser} className="grid md:grid-cols-4 gap-3">
          <input className="border rounded p-2" placeholder="Name" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <input className="border rounded p-2" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <select className="border rounded p-2" value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value }))}>
            <option value="student">Student</option>
            <option value="trainer">Trainer</option>
            <option value="admin">Admin</option>
          </select>
          <button className="bg-indigo-600 text-white rounded p-2">Create</button>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-3">Assign Trainer to Student</h3>
        <form onSubmit={assignTrainer} className="grid md:grid-cols-3 gap-3">
          <select className="border rounded p-2" value={assignForm.studentId} onChange={(e) => setAssignForm((p) => ({ ...p, studentId: e.target.value }))}>
            <option value="">Select student</option>
            {students.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
          <select className="border rounded p-2" value={assignForm.trainerId} onChange={(e) => setAssignForm((p) => ({ ...p, trainerId: e.target.value }))}>
            <option value="">Select trainer</option>
            {trainers.map((t) => (
              <option key={t._id} value={t._id}>
                {t.name}
              </option>
            ))}
          </select>
          <button className="bg-indigo-600 text-white rounded p-2">Assign</button>
        </form>
      </div>

      <div className="bg-white border rounded-xl p-4 overflow-x-auto">
        <h3 className="font-semibold mb-3">Users</h3>
        <table className="w-full text-sm">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">Email</th>
              <th className="text-left p-2">Role</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t">
                <td className="p-2">{u.name}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2 capitalize">{u.role}</td>
                <td className="p-2">
                  <button onClick={() => removeUser(u._id)} className="text-red-600">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsersPage;
