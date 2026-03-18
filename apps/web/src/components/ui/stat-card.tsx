import * as React from "react"
import { cn } from "@/lib/utils"

interface StatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  title: string
  value: string | number
  change?: number
  changeLabel?: string
}

function TrendArrow({ value }: { value: number }) {
  if (value === 0) return null

  if (value > 0) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-emerald-500"
      >
        <path d="m18 15-6-6-6 6" />
      </svg>
    )
  }

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-red-500"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, icon, title, value, change, changeLabel, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-xl border border-gray-200 bg-white p-6 shadow-sm",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {icon && (
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              {icon}
            </div>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold tracking-tight text-gray-900">
            {value}
          </p>
          {change !== undefined && (
            <div className="mt-1 flex items-center gap-1">
              <TrendArrow value={change} />
              <span
                className={cn(
                  "text-sm font-medium",
                  change > 0 && "text-emerald-600",
                  change < 0 && "text-red-600",
                  change === 0 && "text-gray-500"
                )}
              >
                {change > 0 ? "+" : ""}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-sm text-gray-400">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }
)
StatCard.displayName = "StatCard"

export { StatCard }
