"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon, XIcon } from "lucide-react"

import { LookupActions } from "@/components/basic-settings/lookup/lookup-actions"
import type { LookupPage } from "@/components/basic-settings/lookup/lookup-page"
import { lookupPages, type LookupKey } from "@/components/basic-settings/lookups"
import { createDataTableColumns, DataTable, type DataTableColumn, type DataTableSort } from "@/components/data-table/data-table"
import { StatusBadge } from "@/components/institutes/status-badge"
import { NoAccess } from "@/components/no-access"
import { PageLoader } from "@/components/page-loader"
import { DEFAULT_PAGE_SIZE } from "@/components/table-pagination"
import { stamp } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDebouncedValue } from "@/hooks/use-debounced-value"
import { capabilitiesFor, type AccessSurface, type Capabilities } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"
import type { LookupRow } from "@/lib/lookup-store"

const ALL = "all"

const suffixes: Record<AccessSurface, string> = { Admin: "Manage Admin", Manage: "Manage", View: "View" }

// Legacy <Lookup> ManageAdmin / Manage / ManageView: rows in rank order,
// filtered by institute. Admin also lists deleted rows ("With deleted"); View
// only reads.
export function LookupSurfaceList({ lookup, surface }: { lookup: LookupKey; surface: AccessSurface }) {
  const page = lookupPages[lookup]
  const can = { ...capabilitiesFor(surface, { softDelete: true }), ...page.capabilities?.[surface] }
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const admin = surface === "Admin"
  const withDeleted = admin && searchParams.get("deleted") === "1"
  const instituteParam = Number(searchParams.get("institute")) || undefined
  // A user with one institute only ever sees its rows.
  const instituteId =
    institutes.length === 1
      ? institutes[0].id
      : institutes.some((institute) => institute.id === instituteParam)
        ? instituteParam
        : undefined
  const pageNumber = Math.max(1, Number(searchParams.get("page")) || 1)
  const pageSize = Number(searchParams.get("size")) || DEFAULT_PAGE_SIZE
  const sortParam = searchParams.get("sort")
  const sort: DataTableSort | undefined = sortParam ? { id: sortParam, desc: searchParams.get("dir") === "desc" } : undefined

  // The search box answers at once; the API is asked once typing pauses.
  const [query, setQuery] = React.useState(searchParams.get("q") ?? "")
  const search = useDebouncedValue(query.trim(), 300)

  const { rows, totalItems = 0, error, denied } = page.store.useSurface(surface, {
    instituteId,
    withDeleted,
    search,
    sortBy: sort?.id,
    sortDirection: sort?.desc ? "desc" : "asc",
    page: pageNumber,
    pageSize,
  })
  const hasFilters = query !== "" || (!!instituteId && institutes.length > 1) || withDeleted

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

  // Keeps the debounced search in the URL, so Edit's returnTo brings it back.
  React.useEffect(() => {
    if ((searchParams.get("q") ?? "") !== search) setParams({ q: search || undefined })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only when the search settles
  }, [search])

  function resetFilters() {
    setQuery("")
    router.replace(pathname)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const showInstitute = institutes.length > 1
  const columns = React.useMemo(
    () => lookupColumns({ page, offset: (pageNumber - 1) * pageSize, returnTo, can, institutes, showInstitute }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- can is derived from surface
    [page, pageNumber, pageSize, returnTo, surface, institutes, showInstitute]
  )

  if (denied) return <NoAccess />
  if (!rows && !error) return <PageLoader label={`Loading ${page.plural.toLowerCase()}`} />

  const newHref = `/basic-settings/${page.segment}/new?${new URLSearchParams({
    ...(instituteId && { institute: String(instituteId) }),
    returnTo,
  })}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{`${page.singular} ${suffixes[surface]}`}</CardTitle>
            <CardDescription>{page.description}</CardDescription>
          </div>
          {can.create && (
            <Button asChild size="sm">
              <Link href={newHref}>
                <PlusIcon data-icon="inline-start" />
                Add {page.singular.toLowerCase()}
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2 @3xl/main:flex-row @3xl/main:items-center">
          <div className="relative @3xl/main:w-72">
            <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={page.searchPlaceholder}
              aria-label={`Search ${page.plural.toLowerCase()}`}
              className="pl-8"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {showInstitute && (
              <FilterSelect
                label="Institute"
                value={instituteId ? String(instituteId) : ALL}
                options={[
                  { value: ALL, label: "All institutes" },
                  ...institutes.map((institute) => ({ value: String(institute.id), label: institute.name })),
                ]}
                onChange={(value) => setParams({ institute: value === ALL ? undefined : value })}
                className="w-64"
              />
            )}
            {admin && (
              <FilterSelect
                label={`Deleted ${page.plural.toLowerCase()}`}
                value={withDeleted ? "1" : "0"}
                options={[
                  { value: "0", label: "Without deleted" },
                  { value: "1", label: "With deleted" },
                ]}
                onChange={(value) => setParams({ deleted: value === "1" ? "1" : undefined })}
              />
            )}
            {hasFilters && (
              <Button variant="ghost" onClick={resetFilters}>
                Reset
                <XIcon data-icon="inline-end" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <DataTable
        columns={columns}
        rows={rows}
        totalItems={totalItems}
        page={pageNumber}
        pageSize={pageSize}
        sort={sort}
        noun={page.plural.toLowerCase()}
        empty={`No ${page.plural.toLowerCase()} match these filters.`}
        error={error}
        getRowId={(row) => String(row.id)}
        rowClassName={(row) => (row.recordStatus === "Deleted" ? "text-muted-foreground" : undefined)}
        onPageChange={(next) => setParams({ page: next > 1 ? String(next) : undefined })}
        onPageSizeChange={(size) => setParams({ size: size === DEFAULT_PAGE_SIZE ? undefined : String(size) })}
        onSortChange={(next) => setParams({ sort: next?.id, dir: next?.desc ? "desc" : undefined })}
      />
    </div>
  )
}

const column = createDataTableColumns<LookupRow>()

// The legacy grid's columns: Name, the lookup's own, then the shared ones;
// Name, Rank and Date (last modified) sort on the API.
function lookupColumns({
  page,
  offset,
  returnTo,
  can,
  institutes,
  showInstitute,
}: {
  page: LookupPage
  offset: number
  returnTo: string
  can: Capabilities
  institutes: Institute[]
  showInstitute: boolean
}): DataTableColumn<LookupRow>[] {
  return column.columns([
    column.display({
      id: "sl",
      header: "Sl",
      cell: ({ row }) => offset + row.index + 1,
      meta: { className: "tabular-nums text-muted-foreground", headerClassName: "w-12" },
    }),
    column.accessor("name", {
      header: "Name",
      enableSorting: true,
      cell: ({ row }) => (
        <Link
          href={`/basic-settings/${page.segment}/${row.original.id}?returnTo=${encodeURIComponent(returnTo)}`}
          className="font-medium underline-offset-4 hover:underline"
        >
          {row.original.name}
        </Link>
      ),
      meta: { className: "whitespace-nowrap" },
    }),
    ...(page.columns ?? []),
    ...(showInstitute
      ? [
          column.display({
            id: "institute",
            header: "Institute",
            cell: ({ row }) => institutes.find((institute) => institute.id === row.original.instituteId)?.name ?? "—",
          }),
        ]
      : []),
    column.display({
      id: "user",
      header: "User",
      cell: ({ row }) =>
        row.original.createdAt !== row.original.modifiedAt ? (
          <>
            <div>Cr: {row.original.createdBy}</div>
            <div>Mo: {row.original.modifiedBy}</div>
          </>
        ) : (
          row.original.createdBy
        ),
      meta: { className: "whitespace-nowrap text-xs" },
    }),
    column.accessor("modifiedAt", {
      header: "Date",
      enableSorting: true,
      cell: ({ row }) =>
        row.original.createdAt !== row.original.modifiedAt ? (
          <>
            <div>Cr: {stamp(row.original.createdAt)}</div>
            <div>Mo: {stamp(row.original.modifiedAt)}</div>
          </>
        ) : (
          stamp(row.original.createdAt)
        ),
      meta: { className: "whitespace-nowrap text-xs tabular-nums" },
    }),
    column.accessor("rank", {
      header: "Rank",
      enableSorting: true,
      meta: { className: "text-center tabular-nums", headerClassName: "text-center" },
    }),
    column.display({
      id: "recordStatus",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.recordStatus} />,
    }),
    column.display({
      id: "actions",
      header: "",
      cell: ({ row }) => <LookupActions page={page} row={row.original} returnTo={returnTo} can={can} />,
      meta: { headerClassName: "w-10" },
    }),
  ])
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  className = "w-40",
}: {
  label: string
  value: string
  options: { value: string; label: string }[]
  onChange: (value: string) => void
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className={className} aria-label={label}>
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
