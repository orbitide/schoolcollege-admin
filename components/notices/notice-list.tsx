"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PaperclipIcon, PinIcon, PlusIcon, SearchIcon } from "lucide-react"

import { NoticeActions } from "@/components/notices/notice-actions"
import { StateBadge } from "@/components/notices/notice-state"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { classStore } from "@/lib/academic-store"
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { noticeAudiences, noticeCategories, noticeState, useAllNotices } from "@/lib/notices"
import { cn } from "@/lib/utils"

export const NOTICES_HREF = "/notices"
export const NOTICES_RESOURCE = "notice"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Notice (Admin)",
  Manage: "Manage Notice",
  View: "View Notice",
}

// Notice › Manage Notice: every notice of the user's institutes, pinned
// first then newest, with where it stands (scheduled, live, expired). The
// surface decides the actions as elsewhere: Manage adds, edits, pins,
// (in)activates and deletes (soft); Admin also sees deleted ones, retrieves
// or removes them for good; View only reads.
export function NoticeList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: NOTICES_RESOURCE, softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const notices = useAllNotices()
  const classes = classStore.useAll()
  const canPick = institutes.length > 1
  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick ? institutes.find((i) => String(i.id) === param("institute")) : institutes[0]
  const withDeleted = can.restore && param("deleted") === "1"
  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const allowed = new Set(institutes.map((i) => i.id))
  const className = new Map(classes.map((c) => [c.id, c.name]))

  const rows = notices
    .filter(
      (n) =>
        allowed.has(n.instituteId) &&
        (!institute || n.instituteId === institute.id) &&
        (withDeleted || n.status !== "Deleted") &&
        (!param("category") || n.category === param("category")) &&
        (!param("audience") || n.audience === param("audience")) &&
        (!param("state") || noticeState(n) === param("state")) &&
        (!needle || n.title.toLowerCase().includes(needle) || n.body.toLowerCase().includes(needle))
    )
    .sort(
      (a, b) =>
        Number(a.status === "Deleted") - Number(b.status === "Deleted") ||
        Number(b.isPinned) - Number(a.isPinned) ||
        b.publishDate.localeCompare(a.publishDate) ||
        b.id - a.id
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
  const newHref = `${NOTICES_HREF}/new?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    returnTo,
  })}`
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>Notices for everyone, the teachers, or students and guardians of some classes.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource={NOTICES_RESOURCE} baseUrl={NOTICES_HREF} current={surface} />
            {can.create && institutes.length > 0 && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add Notice
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
              onChange={(v) => setParam({ institute: v })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All Institute"
            />
          )}
          <FilterField
            label="Category"
            value={param("category")}
            onChange={(v) => setParam({ category: v })}
            options={noticeCategories.map((c) => ({ value: c, label: c }))}
            allLabel="All categories"
          />
          <FilterField
            label="Audience"
            value={param("audience")}
            onChange={(v) => setParam({ audience: v })}
            options={noticeAudiences.map((a) => ({ value: a, label: a }))}
            allLabel="Every audience"
          />
          <FilterField
            label="Shown"
            value={param("state")}
            onChange={(v) => setParam({ state: v })}
            options={["Live", "Scheduled", "Expired", "Inactive"].map((s) => ({ value: s, label: s }))}
            allLabel="Any"
          />
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
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search notices"
                aria-label="Search notices"
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
              {!institute && <TableHead>Institute</TableHead>}
              <TableHead>Title</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>For</TableHead>
              <TableHead>Publish</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead className="text-right">SMS</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Shown</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((notice, index) => (
                <TableRow key={notice.id} className={cn(notice.status === "Deleted" && "text-muted-foreground")}>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  {!institute && <TableCell>{instituteName.get(notice.instituteId) ?? "—"}</TableCell>}
                  <TableCell className="max-w-80">
                    <Link
                      href={`${NOTICES_HREF}/${notice.id}?returnTo=${encodeURIComponent(returnTo)}`}
                      className="inline-flex items-center gap-1.5 font-medium underline-offset-4 hover:underline"
                    >
                      {notice.isPinned && <PinIcon className="size-3.5 shrink-0 text-amber-500" />}
                      {notice.title}
                      {notice.attachmentName && <PaperclipIcon className="size-3.5 shrink-0 text-muted-foreground" />}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={notice.category === "Urgent" ? "destructive" : "outline"}>{notice.category}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {notice.audience}
                    {notice.audience !== "Teachers" && notice.classIds.length > 0 && (
                      <span className="block text-muted-foreground">
                        {notice.classIds.map((id) => className.get(id) ?? "—").join(", ")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">{notice.publishDate}</TableCell>
                  <TableCell className="whitespace-nowrap">{notice.expiryDate || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{notice.smsCount || "—"}</TableCell>
                  <TableCell className="whitespace-nowrap text-xs">
                    {notice.modifiedBy}
                    <span className="block text-muted-foreground tabular-nums">{stamp(notice.modifiedAt)}</span>
                  </TableCell>
                  <TableCell>
                    <StateBadge notice={notice} />
                  </TableCell>
                  <TableCell>
                    <NoticeActions notice={notice} returnTo={returnTo} can={can} />
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={institute ? 10 : 11} className="h-24 text-center text-muted-foreground">
                  No notice matches these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
