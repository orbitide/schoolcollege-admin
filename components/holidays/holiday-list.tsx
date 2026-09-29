"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"

import { HolidayActions } from "@/components/holidays/holiday-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { classStore } from "@/lib/academic-store"
import { capabilitiesFor, useSurfaces, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { formatDateRange, useAllHolidays } from "@/lib/holidays"
import { academicMediums } from "@/lib/institutes"
import { cn } from "@/lib/utils"

export const HOLIDAYS_HREF = "/basic-settings/holidays"
export const HOLIDAYS_RESOURCE = "settings.holidays"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Holiday and Event (Admin)",
  Manage: "Manage Holiday and Event",
  View: "View Holiday and Event",
}

// Legacy HolidayAndEventSettings/ManageAdmin, Manage and ManageView: every
// institute's holidays and events, ordered by institute, medium, class and
// rank. The surface decides the actions: Manage adds, edits, (in)activates,
// reranks and (unlike most resources, as legacy Manage does) deletes; Admin
// also sees deleted ones, retrieves them and deletes them for good; View only
// reads. With `instituteId` it is that institute's tab.
export function HolidayList({
  surface,
  instituteId,
}: {
  surface: AccessSurface
  instituteId?: number
}) {
  const can = capabilitiesFor(surface, { resource: HOLIDAYS_RESOURCE, softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const accessible = useAccessibleInstitutes()
  const holidays = useAllHolidays()
  const classes = classStore.useAll()
  const embedded = instituteId != null
  const institutes = embedded ? accessible.filter((i) => i.id === instituteId) : accessible
  const canPick = !embedded && institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  // Legacy offers the medium filter beside the institute one, and only
  // applies it once an institute is picked.
  const showMediumFilter = canPick && !!institute?.enableMedium
  const medium = showMediumFilter ? param("medium") : ""
  const withDeleted = can.restore && param("deleted") === "1"
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()

  const instituteOrder = new Map(institutes.map((i, index) => [i.id, index]))
  const classOf = new Map(classes.map((c) => [c.id, c]))
  const rows = holidays
    .filter(
      (h) =>
        instituteOrder.has(h.instituteId) &&
        (!institute || h.instituteId === institute.id) &&
        (!medium || h.medium === medium) &&
        (withDeleted || h.status !== "Deleted") &&
        (!needle || h.name.toLowerCase().includes(needle))
    )
    .sort(
      (a, b) =>
        instituteOrder.get(a.instituteId)! - instituteOrder.get(b.instituteId)! ||
        a.medium.localeCompare(b.medium) ||
        (a.classId == null ? 0 : (classOf.get(a.classId)?.rank ?? 0)) -
          (b.classId == null ? 0 : (classOf.get(b.classId)?.rank ?? 0)) ||
        Number(a.status === "Deleted") - Number(b.status === "Deleted") ||
        a.rank - b.rank
    )

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const newHref = embedded
    ? `/institutes/${instituteId}/holidays/new`
    : `${HOLIDAYS_HREF}/new?${new URLSearchParams({
        ...(institute && { institute: String(institute.id) }),
        returnTo,
      })}`
  const showInstitute = !institute
  const showMedium = institutes.some(
    (i) => i.enableMedium && (!institute || i.id === institute.id)
  )
  const columnCount = 9 + Number(showInstitute) + Number(showMedium)

  return (
    <div
      className={cn("flex flex-col gap-4 md:gap-6", !embedded && "px-4 py-4 md:py-6 lg:px-6")}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">
              {embedded ? "Holidays & Events" : titles[surface]}
            </CardTitle>
            <CardDescription>
              Holidays and events for the whole institute, or for one medium or class.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {!embedded && (
              <SurfaceTabs resource={HOLIDAYS_RESOURCE} baseUrl={HOLIDAYS_HREF} current={surface} />
            )}
            {can.create && institutes.length > 0 && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add Holiday and Event
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, medium: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All Institute"
            />
          )}
          {showMediumFilter && (
            <FilterField
              label="Academic Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All Academic Medium"
            />
          )}
          {can.restore && (
            <FilterField
              label="Status"
              value={withDeleted ? "1" : "0"}
              onChange={(v) => setParam({ deleted: v === "1" ? "1" : "" })}
              options={[
                { value: "0", label: "Without Deleted" },
                { value: "1", label: "With Deleted" },
              ]}
            />
          )}
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name"
                aria-label="Search holidays and events"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              {showInstitute && <TableHead>Institute</TableHead>}
              {showMedium && <TableHead>Medium</TableHead>}
              <TableHead>Class</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Modification Date</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((holiday, index) => {
                const edited = holiday.createdAt !== holiday.modifiedAt
                const deleted = holiday.status === "Deleted"
                const owner = institutes.find((i) => i.id === holiday.instituteId)
                return (
                  <TableRow key={holiday.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {showInstitute && (
                      <TableCell>{owner?.shortName || owner?.name || "—"}</TableCell>
                    )}
                    {showMedium && (
                      <TableCell className="whitespace-nowrap">
                        {owner?.enableMedium ? holiday.medium || "All" : "—"}
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">
                      {holiday.classId == null
                        ? "All"
                        : (classOf.get(holiday.classId)?.name ?? "—")}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`${HOLIDAYS_HREF}/${holiday.id}?returnTo=${encodeURIComponent(returnTo)}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {holiday.name}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {formatDateRange(holiday.startDate, holiday.endDate)}
                      {holiday.repetition === "Yearly" && (
                        <span className="block text-xs text-muted-foreground">Every year</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={holiday.type === "Gazetted" ? "default" : "outline"}>
                        {holiday.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {holiday.createdBy}</div>
                          <div>Mo: {holiday.modifiedBy}</div>
                        </>
                      ) : (
                        holiday.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(holiday.createdAt)}</div>
                          <div>Mo: {stamp(holiday.modifiedAt)}</div>
                        </>
                      ) : (
                        stamp(holiday.createdAt)
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums">{deleted ? "—" : holiday.rank}</TableCell>
                    <TableCell>
                      <StatusBadge status={holiday.status} />
                    </TableCell>
                    <TableCell>
                      <HolidayActions
                        holiday={holiday}
                        returnTo={returnTo}
                        editHref={
                          embedded
                            ? `/institutes/${instituteId}/holidays/${holiday.id}/edit`
                            : `${HOLIDAYS_HREF}/${holiday.id}/edit?returnTo=${encodeURIComponent(returnTo)}`
                        }
                        can={can}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No holiday or event matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

// An institute's Holidays tab: its list on the best surface the user holds.
export function InstituteHolidays({ instituteId }: { instituteId: number }) {
  const surfaces = useSurfaces(HOLIDAYS_RESOURCE)
  return <HolidayList surface={surfaces[0] ?? "View"} instituteId={instituteId} />
}
