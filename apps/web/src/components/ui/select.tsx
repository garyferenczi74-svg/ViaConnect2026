"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  placeholder?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, placeholder, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          className={cn(
            "flex h-9 w-full appearance-none rounded-md border border-gray-200 bg-white px-3 py-1 pr-8 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
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
            className="text-gray-400"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </div>
    )
  }
)
Select.displayName = "Select"

const SelectOption = React.forwardRef<
  HTMLOptionElement,
  React.OptionHTMLAttributes<HTMLOptionElement>
>(({ className, ...props }, ref) => (
  <option ref={ref} className={cn("text-sm", className)} {...props} />
))
SelectOption.displayName = "SelectOption"

const SelectGroup = React.forwardRef<
  HTMLOptGroupElement,
  React.OptgroupHTMLAttributes<HTMLOptGroupElement>
>(({ className, ...props }, ref) => (
  <optgroup ref={ref} className={cn("text-sm font-semibold", className)} {...props} />
))
SelectGroup.displayName = "SelectGroup"

export { Select, SelectOption, SelectGroup }
