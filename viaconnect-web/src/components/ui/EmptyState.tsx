import { Button } from "./Button";

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <div className={`flex flex-col items-center justify-center text-center py-16 ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-gray-500" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
