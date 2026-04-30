import { Link, NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const linksByRole = {
  student: [
    { to: "/student", label: "Dashboard" },
    { to: "/student/leaderboard", label: "Leaderboard" },
  ],
  trainer: [
    { to: "/trainer", label: "Dashboard" },
    { to: "/trainer/tasks", label: "Assign Tasks" },
  ],
  admin: [
    { to: "/admin", label: "Dashboard" },
    { to: "/admin/users", label: "Users" },
  ],
};

const AppLayout = ({ children }) => {
  const { user, logout } = useAuth();
  const links = user ? linksByRole[user.role] : [];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <div className="flex">
        <aside className="w-64 hidden md:block bg-slate-900 text-white min-h-screen p-4">
          <Link to="/" className="text-2xl font-bold block mb-6">
            SWARX
          </Link>
          <nav className="space-y-2">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `block px-3 py-2 rounded ${isActive ? "bg-indigo-600" : "hover:bg-slate-800"}`
                }
              >
                {l.label}
              </NavLink>
            ))}
          </nav>
        </aside>
        <main className="flex-1">
          <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
            <div className="font-semibold">Communication & Placement Training</div>
            {user ? (
              <div className="flex items-center gap-3">
                <span className="text-sm">{user.name}</span>
                <button onClick={logout} className="px-3 py-1 text-sm rounded bg-slate-200 hover:bg-slate-300">
                  Logout
                </button>
              </div>
            ) : (
              <Link to="/login" className="text-indigo-600 font-medium">
                Login
              </Link>
            )}
          </header>
          <div className="p-4 md:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
