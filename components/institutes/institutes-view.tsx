"use client"

import * as React from "react"
import Link from "next/link"
import {
  ArrowDownIcon,
  ArrowUpDownIcon,
  ArrowUpIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  DownloadIcon,
  PlusIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { InstituteActions } from "@/components/institutes/institute-actions"
import { InstituteFormDialog } from "@/components/institutes/institute-form-dialog"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  formatDate,
  instituteTypes,
  plans,
  statuses,
  type Institute,
} from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

type SortKey = "name" | "students" | "joinedAt"
type Sort = { key: SortKey; direction: "asc" | "desc" }

const ALL = "all"
const PAGE_SIZES = [10, 20, 50]

export function InstitutesView() {
  const institutes = useInstitutes()
  const [search, setSearch] = React.useState("")
  const [status, setStatus] = React.useState(ALL)
  const [plan, setPlan] = React.useState(ALL)
  const [type, setType] = React.useState(ALL)
  const [sort, setSort] = React.useState<Sort>({
    key: "joinedAt",
    direction: "desc",
  })
  const [page, setPage] = React.useState(0)
  const [pageSize, setPageSize] = React.useState(10)
  const [addOpen, setAddOpen] = React.useState(false)

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = institutes.filter(
      (i) =>
        (status === ALL || i.status === status) &&
        (plan === ALL || i.plan === plan) &&
        (type === ALL || i.type === type) &&
        (!query ||
          [i.name, i.subdomain, i.city, i.principal, i.email].some((value) =>
            value.toLowerCase().includes(query)
          ))
    )
    const factor = sort.direction === "asc" ? 1 : -1
    return rows.sort((a, b) => {
      const x = a[sort.key]
      const y = b[sort.key]
      return (
        (typeof x === "number" && typeof y === "number"
          ? x - y
          : String(x).localeCompare(String(y))) * factor
      )
    })
  }, [institutes, search, status, plan, type, sort])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount - 1)
  const rows = filtered.slice(
    currentPage * pageSize,
    (currentPage + 1) * pageSize
  )
  const hasFilters =
    search !== "" || status !== ALL || plan !== ALL || type !== ALL

  function withReset<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPage(0)
    }
  }

  function resetFilters() {
    setSearch("")
    setStatus(ALL)
    setPlan(ALL)
    setType(ALL)
    setPage(0)
  }

  function toggleSort(key: SortKey) {
    setSort((current) =>
      current.key === key
        ? { key, direction: current.direction === "asc" ? "desc" : "asc" }
        : { key, direction: key === "name" ? "asc" : "desc" }
    )
  }

  const counts = {
    total: institutes.length,
    active: institutes.filter((i) => i.status === "Active").length,
    trial: institutes.filter((i) => i.status === "Trial").length,
    suspended: institutes.filter((i) => i.status === "Suspended").length,
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Institutes</h2>
          <p className="text-sm text-muted-foreground">
            Manage every tenant institute, its subscription and access.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => toast.info(`Exporting ${filtered.length} institutes`)}
          >
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
          <Button onClick={() => setAddOpen(true)}>
            <PlusIcon data-icon="inline-start" />
            Add Institute
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 @3xl/main:grid-cols-4">
        <StatCard label="Total institutes" value={counts.total} />
        <StatCard label="Active" value={counts.active} />
        <StatCard label="On trial" value={counts.trial} />
        <StatCard label="Suspended" value={counts.suspended} />
      </div>

      <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
        <div className="relative @3xl/main:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, subdomain, city…"
            value={search}
            onChange={(e) => withReset(setSearch)(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <FilterSelect
            label="Status"
            allLabel="All statuses"
            value={status}
            options={statuses}
            onChange={withReset(setStatus)}
          />
          <FilterSelect
            label="Plan"
            allLabel="All plans"
            value={plan}
            options={plans}
            onChange={withReset(setPlan)}
          />
          <FilterSelect
            label="Type"
            allLabel="All types"
            value={type}
            options={instituteTypes}
            onChange={withReset(setType)}
          />
          {hasFilters && (
            <Button variant="ghost" onClick={resetFilters}>
              Reset
              <XIcon data-icon="inline-end" />
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead>
                <SortButton sort={sort} sortKey="name" onSort={toggleSort}>
                  Institute
                </SortButton>
              </TableHead>
              <TableHead>Type</TableHead>
              <TableHead>City</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">
                <SortButton sort={sort} sortKey="students" onSort={toggleSort}>
                  Students
                </SortButton>
              </TableHead>
              <TableHead className="text-right">Teachers</TableHead>
              <TableHead>
                <SortButton sort={sort} sortKey="joinedAt" onSort={toggleSort}>
                  Joined
                </SortButton>
              </TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((institute) => (
                <InstituteRow key={institute.id} institute={institute} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={9} className="h-24 text-center">
                  No institutes match your filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-4">
        <p className="hidden text-sm text-muted-foreground lg:block">
          Showing {rows.length ? currentPage * pageSize + 1 : 0}–
          {currentPage * pageSize + rows.length} of {filtered.length}{" "}
          institutes
        </p>
        <div className="flex w-full items-center gap-6 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-sm font-medium">Rows per page</span>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                setPageSize(Number(value))
                setPage(0)
              }}
            >
              <SelectTrigger size="sm" className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent side="top">
                <SelectGroup>
                  {PAGE_SIZES.map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm font-medium">
            Page {currentPage + 1} of {pageCount}
          </span>
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <PageButton
              label="First page"
              className="hidden lg:flex"
              disabled={currentPage === 0}
              onClick={() => setPage(0)}
            >
              <ChevronsLeftIcon />
            </PageButton>
            <PageButton
              label="Previous page"
              disabled={currentPage === 0}
              onClick={() => setPage(currentPage - 1)}
            >
              <ChevronLeftIcon />
            </PageButton>
            <PageButton
              label="Next page"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(currentPage + 1)}
            >
              <ChevronRightIcon />
            </PageButton>
            <PageButton
              label="Last page"
              className="hidden lg:flex"
              disabled={currentPage >= pageCount - 1}
              onClick={() => setPage(pageCount - 1)}
            >
              <ChevronsRightIcon />
            </PageButton>
          </div>
        </div>
      </div>

      <InstituteFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}

function InstituteRow({ institute }: { institute: Institute }) {
  return (
    <TableRow>
      <TableCell>
        <Link
          href={`/institutes/${institute.id}`}
          className="font-medium hover:underline"
        >
          {institute.name}
        </Link>
        <div className="text-xs text-muted-foreground">
          {institute.subdomain}.sms.app
        </div>
      </TableCell>
      <TableCell>{institute.type}</TableCell>
      <TableCell>{institute.city}</TableCell>
      <TableCell>
        <Badge variant="outline" className="px-1.5 text-muted-foreground">
          {institute.plan}
        </Badge>
      </TableCell>
      <TableCell>
        <StatusBadge status={institute.status} />
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {institute.students.toLocaleString()}
      </TableCell>
      <TableCell className="text-right tabular-nums">
        {institute.teachers.toLocaleString()}
      </TableCell>
      <TableCell className="text-muted-foreground">
        {formatDate(institute.joinedAt)}
      </TableCell>
      <TableCell>
        <InstituteActions institute={institute} />
      </TableCell>
    </TableRow>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <Card size="sm" className="shadow-xs">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums">
          {value}
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function FilterSelect({
  label,
  allLabel,
  value,
  options,
  onChange,
}: {
  label: string
  allLabel: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

function SortButton({
  sort,
  sortKey,
  onSort,
  children,
}: {
  sort: Sort
  sortKey: SortKey
  onSort: (key: SortKey) => void
  children: React.ReactNode
}) {
  const Icon =
    sort.key !== sortKey
      ? ArrowUpDownIcon
      : sort.direction === "asc"
        ? ArrowUpIcon
        : ArrowDownIcon

  return (
    <Button
      variant="ghost"
      size="sm"
      className="-mx-2 h-8"
      onClick={() => onSort(sortKey)}
    >
      {children}
      <Icon data-icon="inline-end" className="text-muted-foreground" />
    </Button>
  )
}

function PageButton({
  label,
  className,
  children,
  ...props
}: React.ComponentProps<typeof Button> & { label: string }) {
  return (
    <Button
      variant="outline"
      size="icon"
      className={cn("size-8", className)}
      {...props}
    >
      <span className="sr-only">{label}</span>
      {children}
    </Button>
  )
}
