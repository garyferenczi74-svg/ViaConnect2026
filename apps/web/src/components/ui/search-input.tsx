"use client"

import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  onClear?: () => void
}

const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, value, onChange, onClear, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState("")
    const isControlled = value !== undefined
    const currentValue = isControlled ? value : internalValue

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(e.target.value)
      }
      onChange?.(e)
    }

    const handleClear = () => {
      if (!isControlled) {
        setInternalValue("")
      }
      onClear?.()
    }

    return (
      <div className={cn("relative", className)}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          ref={ref}
          type="search"
          value={currentValue}
          onChange={handleChange}
          className="flex h-9 w-full rounded-md border border-gray-200 bg-white pl-9 pr-9 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        {currentValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-gray-400 hover:text-gray-600 focus:outline-none"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    )
  }
)
SearchInput.displayName = "SearchInput"

export { SearchInput }
