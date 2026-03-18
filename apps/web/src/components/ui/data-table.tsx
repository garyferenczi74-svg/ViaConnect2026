"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { SearchInput } from "./search-input"
import { Select, SelectOption } from "./select"
import { Button } from "./button"
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "./table"

interface DataTableColumn<T> {
  key: string
  header: string
  cell?: (row: T) => React.ReactNode
  className?: string
  sortable?: boolean
}

interface DataTableProps<T> extends React.HTMLAttributes<HTMLDivElement> {
  columns: DataTableColumn<T>[]
  data: T[]
  searchable?: boolean
  searchPlaceholder?: string
  searchKey?: keyof T
  pageSize?: number
  pageSizeOptions?: number[]
  emptyIcon?: React.ReactNode
  emptyTitle?: string
  emptyDescription?: string
}

function DataTable<T extends Record<string, unknown>>({
  className,
  columns,
  data,
  searchable = true,
  searchPlaceholder = "Search...",
  searchKey,
  pageSize: initialPageSize = 10,
  pageSizeOptions = [5, 10, 20, 50],
  emptyIcon,
  emptyTitle = "No results found",
  emptyDescription = "Try adjusting your search or filters.",
  ...props
}: DataTableProps<T>) {
  const [search, setSearch] = React.useState("")
  const [currentPage, setCurrentPage] = React.useState(1)
  const [pageSize, setPageSize] = React.useState(initialPageSize)

  const filteredData = React.useMemo(() => {
    if (!search.trim()) return data
    const query = search.toLowerCase()
    return data.filter((row) => {
      if (searchKey) {
        const val = row[searchKey]
        return String(val ?? "").toLowerCase().includes(query)
      }
      return Object.values(row).some((val) =>
        String(val ?? "").toLowerCase().includes(query)
      )
    })
  }, [data, search, searchKey])

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize))

  React.useEffect(() => {
    setCurrentPage(1)
  }, [search, pageSize])

  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredData.slice(start, start + pageSize)
  }, [filteredData, currentPage, pageSize])

  const startIndex = (currentPage - 1) * pageSize + 1
  const endIndex = Math.min(currentPage * pageSize, filteredData.length)

  return (
    <div className={cn("space-y-4", className)} {...props}>
      {searchable && (
        <div className="flex items-center gap-4">
          <SearchInput
            className="max-w-sm"
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
      )}

      <div className="rounded-lg border border-gray-200 bg-white">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, rowIdx) => (
                <TableRow key={rowIdx}>
                  {columns.map((col) => (
                    <TableCell key={col.key} className={col.className}>
                      {col.cell
                        ? col.cell(row)
                        : (String(row[col.key] ?? "") as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="h-40 text-center"
                >
                  <div className="flex flex-col items-center justify-center gap-2 py-8">
                    {emptyIcon && (
                      <div className="text-gray-300">{emptyIcon}</div>
                    )}
                    <p className="text-sm font-medium text-gray-900">
                      {emptyTitle}
                    </p>
                    <p className="text-sm text-gray-500">
                      {emptyDescription}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredData.length > 0 && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>
              Showing {startIndex}-{endIndex} of {filteredData.length}
            </span>
            <Select
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
              className="h-8 w-[70px]"
            >
              {pageSizeOptions.map((size) => (
                <SelectOption key={size} value={String(size)}>
                  {size}
                </SelectOption>
              ))}
            </Select>
            <span>per page</span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              aria-label="First page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m11 17-5-5 5-5" />
                <path d="m18 17-5-5 5-5" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Previous page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </Button>
            <span className="px-3 text-sm text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                setCurrentPage((p) => Math.min(totalPages, p + 1))
              }
              disabled={currentPage === totalPages}
              aria-label="Next page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              aria-label="Last page"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m6 17 5-5-5-5" />
                <path d="m13 17 5-5-5-5" />
              </svg>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

export { DataTable }
export type { DataTableColumn, DataTableProps }
