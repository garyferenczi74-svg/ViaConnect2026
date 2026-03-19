const statusStyles: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  complete: "bg-green-100 text-green-800",
  completed: "bg-green-100 text-green-800",
  beneficial: "bg-green-100 text-green-800",
  essential: "bg-red-100 text-red-800",
  risk: "bg-red-100 text-red-800",
  inactive: "bg-gray-100 text-gray-600",
  neutral: "bg-blue-100 text-blue-800",
  recommended: "bg-blue-100 text-blue-800",
  pending: "bg-yellow-100 text-yellow-800",
  "in-review": "bg-purple-100 text-purple-800",
  draft: "bg-gray-100 text-gray-600",
  optional: "bg-gray-100 text-gray-600",
};

interface StatusBadgeProps {
  status: string;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const style = statusStyles[status] || "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${style}`}>
      {status.replace("-", " ")}
    </span>
  );
}
