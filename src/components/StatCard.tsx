interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  colorClass?: string;
}

export default function StatCard({ label, value, detail, colorClass = "text-gray-800" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${colorClass}`}>{value}</p>
      {detail && <p className="text-xs text-gray-400 mt-2">{detail}</p>}
    </div>
  );
}
