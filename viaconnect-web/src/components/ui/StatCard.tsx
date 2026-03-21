import { TrendingUp, TrendingDown } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  className = "",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  trend?: "up" | "down";
  trendLabel?: string;
  className?: string;
}) {
  return (
    <div className={`glass rounded-xl p-5 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-9 h-9 rounded-lg bg-white/[0.04] flex items-center justify-center">
          <Icon className="w-4 h-4 text-gray-400" />
        </div>
        {trend && (
          <span
            className={`flex items-center gap-1 text-xs font-medium ${
              trend === "up" ? "text-portal-green" : "text-rose"
            }`}
          >
            {trend === "up" ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {trendLabel}
          </span>
        )}
      </div>
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );
}
