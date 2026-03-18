"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface DropdownMenuContextValue {
  open: boolean
  setOpen: React.Dispatch<React.SetStateAction<boolean>>
}

const DropdownMenuContext = React.createContext<DropdownMenuContextValue>({
  open: false,
  setOpen: () => {},
})

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false)

  React.useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (!target.closest("[data-dropdown-menu]")) {
        setOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClick)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [open])

  return (
    <DropdownMenuContext.Provider value={{ open, setOpen }}>
      <div className="relative inline-block" data-dropdown-menu>
        {children}
      </div>
    </DropdownMenuContext.Provider>
  )
}

function DropdownMenuTrigger({
  children,
  className,
  asChild,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { asChild?: boolean }) {
  const { open, setOpen } = React.useContext(DropdownMenuContext)

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
      onClick: (e: React.MouseEvent) => {
        setOpen((prev) => !prev)
        const child = children as React.ReactElement<{ onClick?: (e: React.MouseEvent) => void }>
        child.props.onClick?.(e)
      },
      "aria-expanded": open,
    })
  }

  return (
    <button
      type="button"
      className={className}
      onClick={() => setOpen((prev) => !prev)}
      aria-expanded={open}
      {...props}
    >
      {children}
    </button>
  )
}

function DropdownMenuContent({
  children,
  className,
  align = "start",
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  align?: "start" | "center" | "end"
}) {
  const { open } = React.useContext(DropdownMenuContext)

  if (!open) return null

  return (
    <div
      className={cn(
        "absolute z-50 mt-1 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md animate-in fade-in-0 zoom-in-95",
        align === "start" && "left-0",
        align === "center" && "left-1/2 -translate-x-1/2",
        align === "end" && "right-0",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuItem({
  children,
  className,
  disabled,
  onClick,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { disabled?: boolean }) {
  const { setOpen } = React.useContext(DropdownMenuContext)

  return (
    <div
      role="menuitem"
      className={cn(
        "relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-gray-100 focus:bg-gray-100",
        disabled && "pointer-events-none opacity-50",
        className
      )}
      onClick={(e) => {
        if (disabled) return
        onClick?.(e)
        setOpen(false)
      }}
      {...props}
    >
      {children}
    </div>
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("-mx-1 my-1 h-px bg-gray-100", className)}
      {...props}
    />
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("px-2 py-1.5 text-sm font-semibold text-gray-900", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
}
