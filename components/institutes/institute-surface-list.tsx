"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
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

import { InstituteSurfaceActions } from "@/components/institutes/institute-surface-actions"
import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { StatusBadge } from "@/components/institutes/status-badge"
import { DEFAULT_PAGE_SIZE, TablePagination } from "@/components/table-pagination"
import { stamp } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { capabilitiesFor, type AccessSurface, type Capabilities } from "@/lib/access"
import { formatTaka } from "@/lib/billing"
import { useBillOf, type InstituteBill } from "@/lib/institute-billing"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { exportInstitutesCsv, instituteTypes, statuses, type Institute, type InstituteStatus } from "@/lib/institutes"
import { useInstituteSurface, useInstitutes } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

const ALL = "all"

const titles: Record<AccessSurface, string> = {
  Admin: "Institute Manage Admin",
  Manage: "Institute Manage",
  View: "Institute View",
}

// What a surface offers on institutes. All three are platform pages; onboarding
// (create, SaaS status, delete, retrieve) comes with Manage Admin, while
// Manage edits, (in)activates and reranks.
export function useInstituteCapabilities(surface: AccessSurface): Capabilities & { saasStatus: boolean } {
  const can = capabilitiesFor(surface, { softDelete: true })
  const admin = surface === "Admin"
  return {
    ...can,
    create: can.create && admin,
    delete: can.delete && admin,
    restore: can.restore && admin,
    saasStatus: admin,
  }
}

// Legacy Institute/Manage (Manage Admin), InstituteManage and
// InstituteManageView: the user's institutes in rank order. Admin also lists
// deleted institutes ("With deleted"); View only reads.
export function InstituteSurfaceList({ surface }: { surface: AccessSurface }) {
  const can = useInstituteCapabilities(surface)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  // Admin (the platform's page) also filters by SaaS status, type and deleted.
  const admin = surface === "Admin"
  const withDeleted = admin && searchParams.get("deleted") === "1"
  const statusParam = searchParams.get("status")
  const typeParam = searchParams.get("type")
  const saasStatus = admin ? statuses.find((status) => status === statusParam) : undefined
  const type = admin ? instituteTypes.find((value) => value === typeParam) : undefined
  const page = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Number(searchParams.get("size")) || DEFAULT_PAGE_SIZE

  // The search box answers at once; the API is asked once typing pauses.
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "")
  const search = useDebouncedValue(query.trim(), 300)

  const { rows, totalItems = 0, error, denied } = useInstituteSurface(surface, {
    withDeleted,
    search,
    status: saasStatus,
    type,
    page,
    pageSize,
  })
  // The summary and the export cover every institute, not just this page.
  const institutes = useInstitutes()
  const hasFilters = query !== "" || !!saasStatus || !!type || withDeleted

  // Any filter change goes back to the first page.
  function setParams(changes: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams)
    for (const [name, value] of Object.entries(changes)) {
      if (value) params.set(name, value)
      else params.delete(name)
    }
    if (!("page" in changes)) params.delete("page")
    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname)
  }

  const setParam = (name: string, value: string | undefined) => setParams({ [name]: value })

  // Keeps the debounced search in the URL, so Edit's returnTo brings it back.
  React.useEffect(() => {
    if ((searchParams.get("q") ?? "") !== search) setParam("q", search || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the search settles
  }, [search])

  function setDeleted(value: string) {
    setParam("deleted", value === "1" ? "1" : undefined)
  }

  function resetFilters() {
    setQuery("")
    router.replace(pathname)
  }

  function exportFiltered() {
    const needle = search.toLowerCase()
    const list = institutes.filter(
      (institute) =>
        (!saasStatus || institute.status === saasStatus) &&
        (!type || institute.type === type) &&
        (!needle ||
          [institute.name, institute.shortName, institute.eiin, institute.subdomain, institute.email].some((value) =>
            value.toLowerCase().includes(needle)
          ))
    )
    exportInstitutesCsv(list)
    toast.success(`Exported ${list.length} institutes`)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const columnCount = 11

  if (denied) return <NoAccess />
  if (!rows && !error) return <PageLoader label="Loading institutes" />

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      {admin ? (
        <>
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
                disabled={institutes.length === 0}
                onClick={exportFiltered}
              >
                <DownloadIcon data-icon="inline-start" />
                Export
              </Button>
              {can.create && (
                <Button asChild>
                  <Link href="/institutes/new">
                    <PlusIcon data-icon="inline-start" />
                    Add Institute
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <InstituteSummary
            institutes={institutes}
            selected={saasStatus}
            onSelect={(status) => setParam("status", status)}
          />

          <div className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
            <div className="relative @3xl/main:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, short name, EIIN, email…"
                aria-label="Search institutes"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="pl-8"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <FilterSelect
                label="Status"
                value={saasStatus ?? ALL}
                options={[{ value: ALL, label: "All statuses" }, ...statuses.map((value) => ({ value, label: value }))]}
                onChange={(value) => setParam("status", value === ALL ? undefined : value)}
              />
              <FilterSelect
                label="Type"
                value={type ?? ALL}
                options={[{ value: ALL, label: "All types" }, ...instituteTypes.map((value) => ({ value, label: value }))]}
                onChange={(value) => setParam("type", value === ALL ? undefined : value)}
              />
              <FilterSelect
                label="Deleted institutes"
                value={withDeleted ? "1" : "0"}
                options={[
                  { value: "0", label: "Without deleted" },
                  { value: "1", label: "With deleted" },
                ]}
                onChange={setDeleted}
              />
              {hasFilters && (
                <Button variant="ghost" onClick={resetFilters}>
                  Reset
                  <XIcon data-icon="inline-end" />
                </Button>
              )}
            </div>
          </div>
        </>
      ) : (
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>Institutes, in rank order.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {can.create && (
              <Button asChild size="sm">
                <Link href="/institutes/new">
                  <PlusIcon data-icon="inline-start" />
                  Add institute
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, short name, EIIN, email"
                aria-label="Search institutes"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      )}

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Short name</TableHead>
              <TableHead>Logo</TableHead>
              <TableHead>EIIN</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-center">Rank</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows?.length ? (
              rows.map((institute, index) => {
                const edited = institute.createdAt !== institute.modifiedAt
                const deleted = institute.recordStatus === "Deleted"
                return (
                  <TableRow key={institute.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{(page - 1) * pageSize + index + 1}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {deleted ? (
                        institute.name
                      ) : (
                        <Link
                          href={`/institutes/${institute.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {institute.name}
                        </Link>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{institute.shortName}</TableCell>
                    <TableCell>
                      {institute.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- a data URL from the form
                        <img src={institute.logoUrl} alt="" className="size-10 rounded object-contain" />
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{institute.eiin}</TableCell>
                    <TableCell>{institute.email}</TableCell>
                    <TableCell className="text-center tabular-nums">{institute.rank}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {institute.createdBy}</div>
                          <div>Mo: {institute.modifiedBy}</div>
                        </>
                      ) : (
                        institute.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(institute.createdAt ?? "")}</div>
                          <div>Mo: {stamp(institute.modifiedAt ?? "")}</div>
                        </>
                      ) : (
                        stamp(institute.createdAt ?? "")
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={institute.recordStatus} />
                    </TableCell>
                    <TableCell>
                      <InstituteSurfaceActions institute={institute} returnTo={returnTo} can={can} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {error ?? (rows ? "No institutes match these filters." : "Loading…")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <TablePagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        noun="institutes"
        onPageChange={(next) => setParams({ page: next > 1 ? String(next) : undefined })}
        onPageSizeChange={(size) => setParams({ size: size === DEFAULT_PAGE_SIZE ? undefined : String(size) })}
      />
    </div>
  )
}

// Manage Admin's SaaS summary (the former platform page's cards) over the
// institutes not deleted; a card filters the list by its status, and Total
// clears the filter.
function InstituteSummary({
  institutes,
  selected,
  onSelect,
}: {
  institutes: Institute[]
  selected?: InstituteStatus
  onSelect: (status?: InstituteStatus) => void
}) {
  const stats = getStats(
    institutes.filter((institute) => institute.recordStatus !== "Deleted"),
    useBillOf()
  )

  return (
    <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
      <StatCard
        label="Total institutes"
        value={stats.total}
        icon={<SchoolIcon />}
        tone="blue"
        detail={`${stats.students.toLocaleString()} students · ${stats.teachers.toLocaleString()} teachers`}
        selected={!selected}
        onClick={() => onSelect(undefined)}
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
        detail={`${formatTaka(stats.revenue("Active"))} billing this month (est.)`}
        percent={stats.share("Active")}
        selected={selected === "Active"}
        onClick={() => onSelect("Active")}
      />
      <StatCard
        label="On trial"
        value={stats.count("Trial")}
        icon={<HourglassIcon />}
        tone="amber"
        detail={`${formatTaka(stats.revenue("Trial"))} a month if converted`}
        percent={stats.share("Trial")}
        selected={selected === "Trial"}
        onClick={() => onSelect("Trial")}
      />
      <StatCard
        label="Suspended"
        value={stats.count("Suspended")}
        icon={<BanIcon />}
        tone="red"
        detail={`${stats.studentsIn("Suspended").toLocaleString()} students without access`}
        percent={stats.share("Suspended")}
        selected={selected === "Suspended"}
        onClick={() => onSelect("Suspended")}
      />
    </div>
  )
}
function getStats(institutes: Institute[], billOf: (i: Institute) => InstituteBill) {
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
    // What the institutes would be billed this month if all were active.
    revenue: (status: InstituteStatus) =>
      sum(withStatus(status), (i) => {
        const bill = billOf(i)
        return bill.students * bill.rate
      }),
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
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
