"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { PlusIcon, SearchIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { SurfaceTabs } from "@/components/surface-tabs"
import { useStudentLookups } from "@/components/students/student-lookups"
import { TeacherActions } from "@/components/teachers/teacher-actions"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
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
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { useTeachers, type Teacher } from "@/lib/teachers"
import { cn } from "@/lib/utils"

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Teacher (Admin)",
  Manage: "Manage Teacher",
  View: "View Teacher",
}

// Legacy Teacher/ManageAdmin, Manage and ManageView: every institute's
// teachers with the sections and subjects they take. The surface decides the
// actions: Manage adds, edits, (in)activates and reranks; Admin also deletes,
// sees deleted teachers and retrieves them; View only reads.
export function TeacherList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const teachers = useTeachers()
  const name = useStudentLookups()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const withDeleted = can.restore && param("deleted") === "1"

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const allowed = new Set(institutes.map((i) => i.id))
  const rows = teachers
    .filter(
      (teacher) =>
        allowed.has(teacher.instituteId) &&
        (!institute || teacher.instituteId === institute.id) &&
        (withDeleted || teacher.status !== "Deleted") &&
        (!needle ||
          [teacher.name, teacher.teacherCode, teacher.email, teacher.mobile].some((value) =>
            value.toLowerCase().includes(needle)
          ))
    )
    // Deleted teachers hold no rank, so they go after the ranked ones.
    .sort(
      (a, b) =>
        a.instituteId - b.instituteId ||
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
  const newHref = `/teachers/new?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    returnTo,
  })}`
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))
  const sectionNames = (teacher: Teacher) =>
    teacher.sections
      .map((s) => `${name("class", s.classId)} ${name("section", s.sectionId)}`)
      .join(", ")
  const subjectNames = (teacher: Teacher) =>
    teacher.subjectIds.map((id) => name("subject", id)).join(", ")
  const columnCount = institute ? 12 : 13

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>
              Each institute&apos;s teachers, with the sections they take and the subjects they
              teach.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource="teacher" baseUrl="/teachers" current={surface} />
            {can.create && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add teacher
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
              allLabel="All institutes"
            />
          )}
          {can.restore && (
            <FilterField
              label="Deleted teachers"
              value={withDeleted ? "1" : "0"}
              onChange={(v) => setParam({ deleted: v === "1" ? "1" : "" })}
              options={[
                { value: "0", label: "Without deleted" },
                { value: "1", label: "With deleted" },
              ]}
            />
          )}
          <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search name, code, email, mobile"
                aria-label="Search teachers"
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
              <TableHead>Name</TableHead>
              <TableHead>Teacher code</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Rank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((teacher, index) => {
                const edited = teacher.createdAt !== teacher.modifiedAt
                const deleted = teacher.status === "Deleted"
                return (
                  <TableRow key={teacher.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {!institute && (
                      <TableCell>{instituteName.get(teacher.instituteId) ?? "—"}</TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">
                      <Link
                        href={`/teachers/${teacher.id}?returnTo=${encodeURIComponent(returnTo)}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {teacher.name}
                      </Link>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{teacher.teacherCode}</TableCell>
                    <TableCell className="max-w-64 min-w-40 whitespace-normal">
                      {sectionNames(teacher) || "—"}
                    </TableCell>
                    <TableCell className="max-w-56 min-w-32 whitespace-normal">
                      {subjectNames(teacher) || "—"}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell className="tabular-nums">{teacher.mobile}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {teacher.createdBy}</div>
                          <div>Mo: {teacher.modifiedBy}</div>
                        </>
                      ) : (
                        teacher.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(teacher.createdAt)}</div>
                          <div>Mo: {stamp(teacher.modifiedAt)}</div>
                        </>
                      ) : (
                        stamp(teacher.createdAt)
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">
                      {deleted ? "—" : teacher.rank}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={teacher.status} />
                    </TableCell>
                    <TableCell>
                      <TeacherActions teacher={teacher} returnTo={returnTo} can={can} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No teachers match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
