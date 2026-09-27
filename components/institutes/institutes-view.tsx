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
  BanIcon,
  CircleCheckIcon,
  DownloadIcon,
  HourglassIcon,
  PlusIcon,
  SchoolIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { InstituteActions } from "@/components/institutes/institute-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  exportInstitutesCsv,
  formatDate,
  instituteTypes,
  monthlyRevenue,
  plans,
  statuses,
  type Institute,
  type InstituteStatus,
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

  const filtered = React.useMemo(() => {
    const query = search.trim().toLowerCase()
    const rows = institutes.filter(
      (i) =>
        (status === ALL || i.status === status) &&
        (plan === ALL || i.plan === plan) &&
        (type === ALL || i.type === type) &&
        (!query ||
          [
            i.name,
            i.shortName,
            i.eiin,
            i.subdomain,
            i.city,
            i.principal,
            i.email,
          ].some((value) => value.toLowerCase().includes(query)))
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

  const stats = getStats(institutes)

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
            disabled={filtered.length === 0}
            onClick={() => {
              exportInstitutesCsv(filtered)
              toast.success(`Exported ${filtered.length} institutes`)
            }}
          >
            <DownloadIcon data-icon="inline-start" />
            Export
          </Button>
          <Button asChild>
            <Link href="/institutes/new">
              <PlusIcon data-icon="inline-start" />
              Add Institute
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
        <StatCard
          label="Total institutes"
          value={stats.total}
          icon={<SchoolIcon />}
          tone="blue"
          detail={`${stats.students.toLocaleString()} students · ${stats.teachers.toLocaleString()} teachers`}
          selected={status === ALL}
          onClick={() => withReset(setStatus)(ALL)}
        >
          <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-emerald-500" style={{ width: `${stats.share("Active")}%` }} />
            <div className="bg-amber-500" style={{ width: `${stats.share("Trial")}%` }} />
            <div className="bg-red-500" style={{ width: `${stats.share("Suspended")}%` }} />
          </div>
        </StatCard>
        <StatCard
          label="Active"
          value={stats.count("Active")}
          icon={<CircleCheckIcon />}
          tone="emerald"
          detail={`$${stats.revenue("Active").toLocaleString()} monthly recurring revenue`}
          percent={stats.share("Active")}
          selected={status === "Active"}
          onClick={() => withReset(setStatus)("Active")}
        />
        <StatCard
          label="On trial"
          value={stats.count("Trial")}
          icon={<HourglassIcon />}
          tone="amber"
          detail={`$${stats.revenue("Trial").toLocaleString()} potential MRR if converted`}
          percent={stats.share("Trial")}
          selected={status === "Trial"}
          onClick={() => withReset(setStatus)("Trial")}
        />
        <StatCard
          label="Suspended"
          value={stats.count("Suspended")}
          icon={<BanIcon />}
          tone="red"
          detail={`${stats.studentsIn("Suspended").toLocaleString()} students without access`}
          percent={stats.share("Suspended")}
          selected={status === "Suspended"}
          onClick={() => withReset(setStatus)("Suspended")}
        />
      </div>

      <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
        <div className="relative @3xl/main:w-72">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, EIIN, subdomain, city…"
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
              <TableHead>EIIN</TableHead>
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
                <TableCell colSpan={10} className="h-24 text-center">
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
    </div>
  )
}

function InstituteRow({ institute }: { institute: Institute }) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <InstituteLogo institute={institute} />
          <div className="min-w-0">
            <Link
              href={`/institutes/${institute.id}`}
              className="font-medium hover:underline"
            >
              {institute.name}
            </Link>
            <div className="text-xs text-muted-foreground">
              {institute.shortName} · {institute.subdomain}.sms.app
            </div>
          </div>
        </div>
      </TableCell>
      <TableCell>{institute.type}</TableCell>
      <TableCell className="tabular-nums">{institute.eiin}</TableCell>
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

function InstituteLogo({ institute }: { institute: Institute }) {
  if (institute.logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={institute.logoUrl}
        alt=""
        className="size-8 shrink-0 rounded-md border object-contain"
      />
    )
  }

  return (
    <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground">
      {(institute.shortName || institute.name).slice(0, 2).toUpperCase()}
    </div>
  )
}

function getStats(institutes: Institute[]) {
  const total = institutes.length
  const withStatus = (status: InstituteStatus) =>
    institutes.filter((i) => i.status === status)
  const sum = (rows: Institute[], pick: (i: Institute) => number) =>
    rows.reduce((acc, i) => acc + pick(i), 0)

  return {
    total,
    students: sum(institutes, (i) => i.students),
    teachers: sum(institutes, (i) => i.teachers),
    count: (status: InstituteStatus) => withStatus(status).length,
    share: (status: InstituteStatus) =>
      total ? Math.round((withStatus(status).length / total) * 100) : 0,
    revenue: (status: InstituteStatus) =>
      Math.round(sum(withStatus(status), monthlyRevenue)),
    studentsIn: (status: InstituteStatus) =>
      sum(withStatus(status), (i) => i.students),
  }
}

const tones = {
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    bar: "bg-blue-500",
    ring: "ring-blue-500/60",
  },
  emerald: {
    icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    bar: "bg-emerald-500",
    ring: "ring-emerald-500/60",
  },
  amber: {
    icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    ring: "ring-amber-500/60",
  },
  red: {
    icon: "bg-red-500/10 text-red-600 dark:text-red-400",
    bar: "bg-red-500",
    ring: "ring-red-500/60",
  },
}

function StatCard({
  label,
  value,
  icon,
  tone,
  detail,
  percent,
  selected,
  onClick,
  children,
}: {
  label: string
  value: number
  icon: React.ReactNode
  tone: keyof typeof tones
  detail: string
  percent?: number
  selected: boolean
  onClick: () => void
  children?: React.ReactNode
}) {
  const colors = tones[tone]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="rounded-xl text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <Card
        className={cn(
          "h-full bg-gradient-to-t from-primary/5 to-card shadow-xs transition-shadow hover:shadow-md dark:bg-card",
          selected && cn("ring-2", colors.ring)
        )}
      >
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className="text-3xl font-semibold tabular-nums">
                {value}
              </span>
            </div>
            <div
              className={cn(
                "flex size-10 items-center justify-center rounded-lg [&_svg]:size-5",
                colors.icon
              )}
            >
              {icon}
            </div>
          </div>
          {children ??
            (percent !== undefined && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn("h-full rounded-full", colors.bar)}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-muted-foreground tabular-nums">
                  {percent}%
                </span>
              </div>
            ))}
          <p className="text-xs text-muted-foreground">{detail}</p>
        </CardContent>
      </Card>
    </button>
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
