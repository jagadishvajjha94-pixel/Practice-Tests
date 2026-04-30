import { Link } from "react-router-dom";

const HomePage = () => {
  return (
    <div className="max-w-4xl mx-auto text-center py-16">
      <h1 className="text-5xl font-bold mb-4">SWARX</h1>
      <p className="text-lg text-slate-600 mb-8">
        Communication and placement training platform for college students.
      </p>
      <div className="flex gap-3 justify-center">
        <Link to="/login" className="px-5 py-3 rounded bg-indigo-600 text-white">
          Login
        </Link>
        <Link to="/signup" className="px-5 py-3 rounded border border-slate-300">
          Signup
        </Link>
      </div>
    </div>
  );
};

export default HomePage;
