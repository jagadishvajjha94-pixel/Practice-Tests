const MetricCard = ({ title, value, sub }) => (
  <div className="bg-white rounded-xl border p-4">
    <p className="text-sm text-slate-500">{title}</p>
    <p className="text-2xl font-bold mt-1">{value}</p>
    {sub ? <p className="text-xs text-slate-400 mt-1">{sub}</p> : null}
  </div>
);

export default MetricCard;
