"use client"

import { ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export const PAGE_SIZES = [10, 20, 50, 100]

export const DEFAULT_PAGE_SIZE = 10

// The footer under a table: "Showing a–b of n", rows per page and page buttons.
// `page` is 1-based, as the API's PagedList; feed it a PagedList's numbers.
export function TablePagination({
  page,
  pageSize,
  totalItems,
  noun = "rows",
  pageSizes = PAGE_SIZES,
  onPageChange,
  onPageSizeChange,
}: {
  page: number
  pageSize: number
  totalItems: number
  noun?: string
  pageSizes?: readonly number[]
  onPageChange: (page: number) => void
  onPageSizeChange?: (pageSize: number) => void
}) {
  const pageCount = Math.max(1, Math.ceil(totalItems / pageSize))
  const current = Math.min(Math.max(page, 1), pageCount)
  const from = totalItems ? (current - 1) * pageSize + 1 : 0
  const to = Math.min(current * pageSize, totalItems)

  return (
    <div className="flex items-center justify-between gap-4">
      <p className="hidden text-sm text-muted-foreground lg:block">
        Showing {from}–{to} of {totalItems.toLocaleString()} {noun}
      </p>
      <div className="flex w-full items-center gap-6 lg:w-fit">
        {onPageSizeChange && (
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium">Rows per page</span>
            <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {pageSizes.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        )}
        <span className="text-sm font-medium">
          Page {current} of {pageCount}
        </span>
        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <PageButton label="First page" className="hidden lg:flex" disabled={current <= 1} onClick={() => onPageChange(1)}>
            <ChevronsLeftIcon />
          </PageButton>
          <PageButton label="Previous page" disabled={current <= 1} onClick={() => onPageChange(current - 1)}>
            <ChevronLeftIcon />
          </PageButton>
          <PageButton label="Next page" disabled={current >= pageCount} onClick={() => onPageChange(current + 1)}>
            <ChevronRightIcon />
          </PageButton>
          <PageButton
            label="Last page"
            className="hidden lg:flex"
            disabled={current >= pageCount}
            onClick={() => onPageChange(pageCount)}
          >
            <ChevronsRightIcon />
          </PageButton>
        </div>
      </div>
    </div>
  )
}

function PageButton({ label, className, children, ...props }: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button variant="outline" size="icon" className={cn("size-8", className)} {...props}>
      <span className="sr-only">{label}</span>
      {children}
    </Button>
  )
}
