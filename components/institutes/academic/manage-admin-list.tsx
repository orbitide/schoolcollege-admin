"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, SearchIcon } from "lucide-react"

import {
  isKindEnabled,
  kindConfig,
  type AcademicKind,
  type EditableRecord,
} from "@/components/institutes/academic/kinds"
import { RecordActions } from "@/components/institutes/academic/record-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { academicMediums, recordStatuses, type Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { cn } from "@/lib/utils"

const ALL = "all"

// The legacy "Manage X (Admin)" page: one kind of record across every
// institute that uses it, with institute, medium, status and name filters.
export function ManageAdminList({ kind }: { kind: AcademicKind }) {
  const config = kindConfig(kind)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useInstitutes()
  // Subscribes to the store; rows are read per institute below so they come
  // out in each institute's own order (rank or date).
  config.store.useAll()

  const [status, setStatus] = React.useState(ALL)
  const [medium, setMedium] = React.useState(ALL)
  const [query, setQuery] = React.useState("")

  // Only institutes that have this structure turned on can hold its records.
  const enabled = institutes.filter((institute) => isKindEnabled(kind, institute))
  const instituteParam = searchParams.get("institute")
  const selected = enabled.find((institute) => String(institute.id) === instituteParam)
  const listed = selected ? [selected] : enabled

  const hasMedium =
    config.mediumFilter || config.fields.some((field) => field.key === "medium")
  const hasCurrent = config.fields.some((field) => field.current)
  const ranked = config.ranked !== false
  const columns = config.columns.filter(
    (column) => !column.showWhen || listed.some((institute) => column.showWhen!(institute))
  )

  const needle = query.trim().toLowerCase()
  const rows = listed.flatMap((institute) =>
    config.store
      .getList(institute.id)
      .filter(
        (record) =>
          (status === ALL || record.status === status) &&
          (medium === ALL || record.medium === medium || !record.medium) &&
          (!needle || record.name.toLowerCase().includes(needle))
      )
      .map((record) => ({ record, institute }))
  )

  // Keep the institute filter in the URL so it survives a trip to the form.
  const returnTo = selected ? `${pathname}?institute=${selected.id}` : pathname
  const recordHref = (institute: Institute, path: string) =>
    `/institutes/${institute.id}/${config.segment}/${path}?returnTo=${encodeURIComponent(returnTo)}`

  function selectInstitute(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value === ALL) params.delete("institute")
    else params.set("institute", value)
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const columnCount = columns.length + 6

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Manage {config.plural} (Admin)
          </h2>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        {selected ? (
          <Button asChild>
            <Link href={recordHref(selected, "new")}>
              <PlusIcon data-icon="inline-start" />
              Add {config.singular.toLowerCase()}
            </Link>
          </Button>
        ) : (
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button disabled={!enabled.length}>
                <PlusIcon data-icon="inline-start" />
                Add {config.singular.toLowerCase()}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-80 w-64 overflow-y-auto">
              <DropdownMenuLabel>For institute</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {enabled.map((institute) => (
                <DropdownMenuItem key={institute.id} asChild>
                  <Link href={recordHref(institute, "new")}>{institute.name}</Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Institute"
          value={selected ? String(selected.id) : ALL}
          onChange={selectInstitute}
          allLabel="All institutes"
          options={enabled.map((institute) => ({
            value: String(institute.id),
            label: institute.name,
          }))}
          className="w-full sm:w-64"
        />
        {hasMedium && (
          <FilterSelect
            label="Medium"
            value={medium}
            onChange={setMedium}
            allLabel="All mediums"
            options={academicMediums.map((m) => ({ value: m, label: m }))}
          />
        )}
        <FilterSelect
          label="Status"
          value={status}
          onChange={setStatus}
          allLabel="All statuses"
          options={recordStatuses.map((s) => ({ value: s, label: s }))}
        />
        <div className="relative w-full sm:w-56">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name"
            aria-label="Search by name"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Institute</TableHead>
              <TableHead>Name</TableHead>
              {columns.map((column) => (
                <TableHead
                  key={column.label}
                  className={cn(column.align === "right" && "text-right")}
                >
                  {column.label}
                </TableHead>
              ))}
              <TableHead className={selected && ranked ? "w-28" : "w-16"}>Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map(({ record, institute }, index) => (
                <TableRow key={record.id}>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/institutes/${institute.id}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {institute.shortName || institute.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {record.name}
                      {hasCurrent && Boolean(record.isCurrent) && <Badge>Current</Badge>}
                    </div>
                  </TableCell>
                  {columns.map((column) => (
                    <TableCell
                      key={column.label}
                      className={cn(column.align === "right" && "text-right tabular-nums")}
                    >
                      {!column.showWhen || column.showWhen(institute)
                        ? column.render(record)
                        : "—"}
                    </TableCell>
                  ))}
                  <TableCell>
                    <RankCell
                      kind={kind}
                      record={record}
                      // Rank is per institute, so it can only be moved
                      // while one institute is shown.
                      movable={Boolean(selected) && ranked && !needle && status === ALL && medium === ALL}
                      first={index === 0}
                      last={index === rows.length - 1}
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={record.status} />
                  </TableCell>
                  <TableCell>
                    <RecordActions
                      kind={kind}
                      record={record}
                      singular={config.singular}
                      instituteName={institute.name}
                      editHref={recordHref(institute, `${record.id}/edit`)}
                    />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="h-24 text-center text-muted-foreground"
                >
                  {enabled.length
                    ? `No ${config.plural.toLowerCase()} match these filters.`
                    : `No institute has ${config.plural.toLowerCase()} turned on.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function RankCell({
  kind,
  record,
  movable,
  first,
  last,
}: {
  kind: AcademicKind
  record: EditableRecord
  movable: boolean
  first: boolean
  last: boolean
}) {
  const { store, ranked } = kindConfig(kind)
  if (ranked === false) return <span className="text-muted-foreground">—</span>
  if (!movable) return <span className="tabular-nums">{record.rank}</span>
  return (
    <div className="flex items-center gap-1">
      <span className="w-6 tabular-nums text-muted-foreground">{record.rank}</span>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={first}
        onClick={() => store.move(record.id, "up")}
      >
        <ArrowUpIcon />
        <span className="sr-only">Move up</span>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="size-7"
        disabled={last}
        onClick={() => store.move(record.id, "down")}
      >
        <ArrowDownIcon />
        <span className="sr-only">Move down</span>
      </Button>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  allLabel,
  options,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  allLabel: string
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className={cn("w-full sm:w-44", className)}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectItem value={ALL}>{allLabel}</SelectItem>
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
