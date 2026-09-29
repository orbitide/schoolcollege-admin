"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CheckIcon, MinusIcon, PlusIcon, SearchIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { useStudentLookups } from "@/components/students/student-lookups"
import { SurfaceTabs } from "@/components/surface-tabs"
import { FilterField, examDate, stamp } from "@/components/term-exams/term-exam-fields"
import { TermExamActions } from "@/components/term-exams/term-exam-actions"
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
import {
  branchStore,
  classStore,
  groupStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const flagColumns = [
  { label: "Online published", key: "onlinePublished" },
  { label: "In year book", key: "showInYearBook" },
  { label: "Calculate GPA", key: "calculateGpa" },
  { label: "Multi paper", key: "multiPaperCalculation" },
  { label: "Grace marks", key: "hasGraceMarks" },
  { label: "Parent w/o optional", key: "parentExamWithoutOptional" },
] as const

const titles: Record<AccessSurface, string> = {
  Admin: "Manage Term Exam (Admin)",
  Manage: "Manage Term Exam",
  View: "View Term Exam",
}

// Legacy TermExam/ManageAdmin, Manage and ManageView: every institute's term
// exams, narrowed by institute and academic structure. The surface decides
// the actions: Manage adds, copies, publishes, (in)activates and edits
// exams left "Edit enable"; Admin edits any exam, deletes, sees deleted
// exams and retrieves them; View only reads.
export function TermExamList({ surface }: { surface: AccessSurface }) {
  const can = capabilitiesFor(surface, { resource: "term-exam", softDelete: true })
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const name = useStudentLookups()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)

  const medium = param("medium")
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const withDeleted = can.restore && param("deleted") === "1"

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const allowed = new Set(institutes.map((i) => i.id))
  const is = (value: number | null, key: string) => !param(key) || String(value) === param(key)
  const rows = exams
    .filter(
      (exam) =>
        allowed.has(exam.instituteId) &&
        (!institute || exam.instituteId === institute.id) &&
        (withDeleted || exam.status !== "Deleted") &&
        (!medium || exam.medium === medium) &&
        is(exam.classId, "class") &&
        is(exam.groupId, "group") &&
        is(exam.yearId, "year") &&
        is(exam.branchId, "branch") &&
        (!param("version") || exam.version === param("version")) &&
        is(exam.shiftId, "shift") &&
        (!needle ||
          exam.name.toLowerCase().includes(needle) ||
          exam.fullName.toLowerCase().includes(needle))
    )
    .sort((a, b) => a.instituteId - b.instituteId || a.rank - b.rank)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const clearStructure = { medium: "", class: "", group: "", year: "", branch: "", version: "", shift: "" }
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const newHref = `/term-exam/new?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    returnTo,
  })}`

  const byId = new Map(exams.map((e) => [e.id, e]))
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))
  // Optional columns only show when some listed exam uses them (as the
  // legacy grid hides its all-"-" columns).
  const show = {
    institute: !institute,
    medium: rows.some((e) => e.medium),
    group: rows.some((e) => e.groupId != null),
    branch: rows.some((e) => e.branchId != null),
    version: rows.some((e) => e.version),
    shift: rows.some((e) => e.shiftId != null),
    parent: rows.some((e) => e.parentExamId != null),
  }
  const columnCount = 11 + flagColumns.length + Object.values(show).filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">{titles[surface]}</CardTitle>
            <CardDescription>
              The exams each class sits in an academic year, with their subjects and result
              settings.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <SurfaceTabs resource="term-exam" baseUrl="/term-exam" current={surface} />
            {can.create && (
              <Button asChild size="sm">
                <Link href={newHref}>
                  <PlusIcon data-icon="inline-start" />
                  Add term exam
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
              onChange={(v) => setParam({ institute: v, ...clearStructure })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Medium"
              value={medium}
              onChange={(v) => setParam({ medium: v, class: "", group: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          {institute && (
            <FilterField
              label="Class"
              value={param("class")}
              onChange={(v) => setParam({ class: v, group: "" })}
              options={classes
                .filter((c) => !medium || !c.medium || c.medium === medium)
                .map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All classes"
            />
          )}
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute && (
            <FilterField
              label="Academic year"
              value={param("year")}
              onChange={(v) => setParam({ year: v })}
              options={years.map((y) => ({ value: String(y.id), label: y.name }))}
              allLabel="All years"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Version"
              value={param("version")}
              onChange={(v) => setParam({ version: v })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={param("shift")}
              onChange={(v) => setParam({ shift: v })}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          {can.restore && (
            <FilterField
              label="Deleted exams"
              value={withDeleted ? "1" : "0"}
              onChange={(v) => setParam({ deleted: v === "1" ? "1" : "" })}
              options={[
                { value: "0", label: "Without deleted" },
                { value: "1", label: "With deleted" },
              ]}
            />
          )}
          <div className="flex flex-col justify-end">
            <div className="relative">
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
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              {show.institute && <TableHead>Institute</TableHead>}
              <TableHead>Name</TableHead>
              {show.medium && <TableHead>Medium</TableHead>}
              <TableHead>Class</TableHead>
              {show.group && <TableHead>Group</TableHead>}
              <TableHead>Year</TableHead>
              {show.branch && <TableHead>Branch</TableHead>}
              {show.version && <TableHead>Version</TableHead>}
              {show.shift && <TableHead>Shift</TableHead>}
              {show.parent && <TableHead>Parent exam</TableHead>}
              <TableHead>Exam date</TableHead>
              <TableHead>Result publish</TableHead>
              <TableHead className="text-center">Subjects</TableHead>
              {flagColumns.map((flag) => (
                <TableHead key={flag.key} className="text-center">
                  {flag.label}
                </TableHead>
              ))}
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((exam, index) => {
                const edited = exam.createdAt !== exam.modifiedAt
                return (
                  <TableRow
                    key={exam.id}
                    className={cn(exam.status === "Deleted" && "text-muted-foreground")}
                  >
                    <TableCell className="tabular-nums text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    {show.institute && (
                      <TableCell>{instituteName.get(exam.instituteId) ?? "—"}</TableCell>
                    )}
                    <TableCell>
                      <Link
                        href={`/term-exam/${exam.id}?returnTo=${encodeURIComponent(returnTo)}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {exam.name}
                      </Link>
                      <div className="text-xs text-muted-foreground">{exam.fullName}</div>
                    </TableCell>
                    {show.medium && <TableCell>{exam.medium || "—"}</TableCell>}
                    <TableCell className="whitespace-nowrap">{name("class", exam.classId)}</TableCell>
                    {show.group && (
                      <TableCell>{exam.groupId == null ? "All groups" : name("group", exam.groupId)}</TableCell>
                    )}
                    <TableCell>{name("year", exam.yearId)}</TableCell>
                    {show.branch && (
                      <TableCell>{exam.branchId == null ? "All branches" : name("branch", exam.branchId)}</TableCell>
                    )}
                    {show.version && <TableCell>{exam.version || "All versions"}</TableCell>}
                    {show.shift && (
                      <TableCell>{exam.shiftId == null ? "All shifts" : name("shift", exam.shiftId)}</TableCell>
                    )}
                    {show.parent && (
                      <TableCell>
                        {exam.parentExamId == null ? "—" : (byId.get(exam.parentExamId)?.name ?? "—")}
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {examDate(exam.examStart)} – {examDate(exam.examEnd)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {examDate(exam.resultPublish)}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{exam.subjects.length}</TableCell>
                    {flagColumns.map((flag) => (
                      <TableCell key={flag.key} className="text-center">
                        <Flag on={exam[flag.key]} label={flag.label} />
                      </TableCell>
                    ))}
                    <TableCell className="whitespace-nowrap text-xs">
                      {edited ? (
                        <>
                          <div>Cr: {exam.createdBy}</div>
                          <div>Mo: {exam.modifiedBy}</div>
                        </>
                      ) : (
                        exam.createdBy
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs tabular-nums">
                      {edited ? (
                        <>
                          <div>Cr: {stamp(exam.createdAt)}</div>
                          <div>Mo: {stamp(exam.modifiedAt)}</div>
                        </>
                      ) : (
                        stamp(exam.createdAt)
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={exam.status} />
                    </TableCell>
                    <TableCell>
                      <TermExamActions exam={exam} returnTo={returnTo} surface={surface} />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No term exams match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Flag({ on, label }: { on: TermExam[(typeof flagColumns)[number]["key"]]; label: string }) {
  return on ? (
    <CheckIcon className="mx-auto size-4 text-green-600 dark:text-green-400" aria-label={`${label}: yes`} />
  ) : (
    <MinusIcon className="mx-auto size-4 text-muted-foreground/60" aria-label={`${label}: no`} />
  )
}
