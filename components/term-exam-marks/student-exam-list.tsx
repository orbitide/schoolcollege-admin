"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, PencilIcon, SearchIcon } from "lucide-react"

import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import {
  branchStore,
  classStore,
  groupStore,
  letterGradeStore,
  sectionStore,
  shiftStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions, sectionGenders } from "@/lib/institutes"
import { useMeritLists, type MeritResult } from "@/lib/merit-lists"
import { studentTypes, useStudents, type Enrolment, type Student } from "@/lib/students"
import { useTeachers } from "@/lib/teachers"
import { getTermExamStudentInfo } from "@/lib/term-exam-marks"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

const resultStatuses = ["Passed", "Failed", "Absent"] as const
type ResultStatus = (typeof resultStatuses)[number]

const sorts = [
  { value: "roll", label: "Roll" },
  { value: "total", label: "Total marks" },
  { value: "gpa", label: "GPA" },
  { value: "gpaWithoutOptional", label: "GPA without optional" },
  { value: "failed", label: "Failed subjects" },
  { value: "group", label: "Merit position (group)" },
  { value: "section", label: "Merit position (section)" },
] as const

type Row = {
  key: string
  exam: TermExam
  result: MeritResult
  student?: Student
  enrolment?: Enrolment
  status: ResultStatus
  sectionGender: string
  teachers: string
  info: ReturnType<typeof getTermExamStudentInfo>
}

function resultStatus(result: MeritResult): ResultStatus {
  if (!result.isPresent) return "Absent"
  return result.failedSubjectCount === 0 ? "Passed" : "Failed"
}

const byRoll = (a: Row, b: Row) =>
  a.result.roll.localeCompare(b.result.roll, undefined, { numeric: true })

// Descending, or ascending for merit positions where 0 (none) goes last.
function sortRows(rows: Row[], sort: string) {
  const position = (p: number) => (p > 0 ? p : Number.POSITIVE_INFINITY)
  const compare: Record<string, (a: Row, b: Row) => number> = {
    total: (a, b) => b.result.totalMarks - a.result.totalMarks,
    gpa: (a, b) => b.result.gpa - a.result.gpa,
    gpaWithoutOptional: (a, b) => b.result.gpaWithoutOptional - a.result.gpaWithoutOptional,
    failed: (a, b) => b.result.failedSubjectCount - a.result.failedSubjectCount,
    group: (a, b) => position(a.result.groupPosition) - position(b.result.groupPosition),
    section: (a, b) => position(a.result.sectionPosition) - position(b.result.sectionPosition),
  }
  const by = compare[sort]
  return [...rows].sort(
    (a, b) =>
      (by ? by(a, b) : 0) ||
      a.exam.instituteId - b.exam.instituteId ||
      a.exam.classId - b.exam.classId ||
      a.exam.rank - b.exam.rank ||
      byRoll(a, b)
  )
}

// Legacy "Manage existing student exam" (TermExamStudent/Manage): each
// student's result in each term exam, as the last merit list generation left
// it, narrowed by institute, academic structure, exam and result. Edit opens
// the student's marks in Edit Student Marks.
export function StudentExamList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const meritLists = useMeritLists()
  const students = useStudents()
  const teachers = useTeachers()
  const sections = sectionStore.useAll()
  const letterGrades = letterGradeStore.useAll()
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

  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(0)
  const needle = query.trim().toLowerCase()

  const allowed = new Set(institutes.map((i) => i.id))
  const examById = new Map(exams.map((e) => [e.id, e]))
  const studentById = new Map(students.map((s) => [s.id, s]))
  const sectionById = new Map(sections.map((s) => [s.id, s]))
  const instituteById = new Map(institutes.map((i) => [i.id, i]))

  // Every result of every generated merit list the user may see.
  const allRows: Row[] = meritLists.flatMap((list) => {
    const exam = examById.get(list.termExamId)
    if (!exam || !allowed.has(exam.instituteId)) return []
    return list.results.map((result) => {
      const student = studentById.get(result.studentId)
      const enrolment = student?.enrolments.find(
        (e) => e.classId === exam.classId && e.yearId === exam.yearId
      )
      const sectionTeachers = teachers
        .filter(
          (t) =>
            t.status === "Active" &&
            t.sections.some((s) => s.sectionId === result.sectionId && s.yearId === exam.yearId)
        )
        .map((t) => t.name)
      return {
        key: `${exam.id}:${result.studentId}`,
        exam,
        result,
        student,
        enrolment,
        status: resultStatus(result),
        sectionGender: sectionById.get(result.sectionId)?.gender ?? "",
        teachers: sectionTeachers.join(", "),
        info: getTermExamStudentInfo(exam, result.studentId),
      }
    })
  })

  const is = (value: number | null | undefined, key: string) =>
    !param(key) || String(value) === param(key)
  const withheld = param("withheld")
  const filtered = allRows.filter(
    (row) =>
      (!institute || row.exam.instituteId === institute.id) &&
      (!medium || (row.enrolment?.medium ?? row.exam.medium) === medium) &&
      is(row.exam.classId, "class") &&
      is(row.exam.yearId, "year") &&
      is(row.result.groupId, "group") &&
      is(row.enrolment?.branchId, "branch") &&
      (!param("version") || row.enrolment?.version === param("version")) &&
      is(row.enrolment?.shiftId, "shift") &&
      is(row.result.sectionId, "section") &&
      is(row.exam.id, "exam") &&
      (!param("type") || row.enrolment?.studentType === param("type")) &&
      (!param("gender") || row.sectionGender === param("gender")) &&
      (!param("result") || row.status === param("result")) &&
      (!param("grade") || row.result.letterGrade === param("grade")) &&
      (!withheld || row.info.isWithheld === (withheld === "1")) &&
      (!needle ||
        row.result.roll.toLowerCase().includes(needle) ||
        (row.student?.name.toLowerCase().includes(needle) ?? false))
  )
  const sort = param("sort")
  const rows = sortRows(filtered, sort)

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const pageRows = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
    setPage(0)
  }

  const clearStructure = {
    medium: "",
    class: "",
    year: "",
    group: "",
    branch: "",
    version: "",
    shift: "",
    section: "",
    exam: "",
    grade: "",
    gender: "",
  }
  const examOptions = exams.filter(
    (e) =>
      e.instituteId === iid &&
      e.status !== "Deleted" &&
      is(e.classId, "class") &&
      is(e.yearId, "year") &&
      (!medium || !e.medium || e.medium === medium)
  )
  const sectionOptions = sections.filter(
    (s) =>
      s.instituteId === iid &&
      s.status !== "Deleted" &&
      is(s.classId, "class") &&
      (!param("branch") || s.branchId == null || String(s.branchId) === param("branch")) &&
      (!param("shift") || s.shiftId == null || String(s.shiftId) === param("shift"))
  )
  const gradeOptions = [
    ...new Set(
      letterGrades
        .filter((g) => g.instituteId === iid && g.status === "Active" && (!medium || !g.medium || g.medium === medium))
        .map((g) => g.name)
    ),
  ]

  // Exams that have results but no merit list yet, to point the user at
  // Generate Merit List (the legacy only has TermExamStudent rows after it).
  const generated = new Set(meritLists.map((l) => l.termExamId))
  const pending = exams.filter(
    (e) =>
      allowed.has(e.instituteId) &&
      (!institute || e.instituteId === institute.id) &&
      e.status === "Active" &&
      !generated.has(e.id)
  ).length

  // Optional columns only show when some listed row uses them, as the
  // legacy grid hides its all-"-" columns.
  const uses = (key: "enableBranch" | "enableMedium" | "enableVersion" | "enableShift" | "enableSectionGender" | "enableGroup") =>
    rows.some((row) => instituteById.get(row.exam.instituteId)?.[key])
  const show = {
    institute: !institute,
    branch: uses("enableBranch") && rows.some((r) => r.enrolment?.branchId != null),
    medium: uses("enableMedium") && rows.some((r) => r.enrolment?.medium),
    version: uses("enableVersion") && rows.some((r) => r.enrolment?.version),
    shift: uses("enableShift") && rows.some((r) => r.enrolment?.shiftId != null),
    group: uses("enableGroup") && rows.some((r) => r.result.groupId != null),
    gender: uses("enableSectionGender"),
  }
  const columnCount = 23 + Object.values(show).filter(Boolean).length

  const editHref = (row: Row) =>
    `/term-exam-marks/edit?${new URLSearchParams({
      institute: String(row.exam.instituteId),
      class: String(row.exam.classId),
      year: String(row.exam.yearId),
      exam: String(row.exam.id),
      roll: row.result.roll,
    })}`
  const dash = (value: number) => (value > 0 ? value : "—")

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Manage Student Exam</CardTitle>
          <CardDescription>
            Each student&apos;s result in each term exam, as the last merit list generation
            calculated it.
            {pending > 0 && (
              <>
                {" "}
                {pending} active exam{pending === 1 ? " has" : "s have"} no merit list yet —{" "}
                <Link href="/term-exam/merit-list" className="text-foreground underline underline-offset-4">
                  generate it
                </Link>{" "}
                to list {pending === 1 ? "its" : "their"} students here.
              </>
            )}
          </CardDescription>
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
              onChange={(v) => setParam({ medium: v, class: "", group: "", section: "", exam: "", grade: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          {institute && (
            <FilterField
              label="Class"
              value={param("class")}
              onChange={(v) => setParam({ class: v, group: "", section: "", exam: "" })}
              options={classes
                .filter((c) => !medium || !c.medium || c.medium === medium)
                .map((c) => ({ value: String(c.id), label: c.name }))}
              allLabel="All classes"
            />
          )}
          {institute && (
            <FilterField
              label="Academic year"
              value={param("year")}
              onChange={(v) => setParam({ year: v, exam: "" })}
              options={years.map((y) => ({ value: String(y.id), label: y.name }))}
              allLabel="All years"
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
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v, section: "" })}
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
              onChange={(v) => setParam({ shift: v, section: "" })}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          {institute && (
            <FilterField
              label="Section"
              value={param("section")}
              onChange={(v) => setParam({ section: v })}
              options={sectionOptions.map((s) => ({
                value: String(s.id),
                label: param("class") ? s.name : `${name("class", s.classId)} ${s.name}`,
              }))}
              allLabel="All sections"
            />
          )}
          {institute?.enableSectionGender && (
            <FilterField
              label="Gender"
              value={param("gender")}
              onChange={(v) => setParam({ gender: v })}
              options={sectionGenders.map((g) => ({ value: g, label: g }))}
              allLabel="All genders"
            />
          )}
          {institute && (
            <FilterField
              label="Term exam"
              value={param("exam")}
              onChange={(v) => setParam({ exam: v })}
              options={examOptions.map((e) => ({
                value: String(e.id),
                label: param("class") ? e.fullName : `${e.fullName} (${name("class", e.classId)})`,
              }))}
              allLabel="All exams"
            />
          )}
          <FilterField
            label="Student type"
            value={param("type")}
            onChange={(v) => setParam({ type: v })}
            options={studentTypes.map((t) => ({ value: t, label: t }))}
            allLabel="All student types"
          />
          <FilterField
            label="Result"
            value={param("result")}
            onChange={(v) => setParam({ result: v })}
            options={resultStatuses.map((r) => ({ value: r, label: r }))}
            allLabel="All results"
          />
          {institute && (
            <FilterField
              label="Letter grade"
              value={param("grade")}
              onChange={(v) => setParam({ grade: v })}
              options={gradeOptions.map((g) => ({ value: g, label: g }))}
              allLabel="All letter grades"
            />
          )}
          <FilterField
            label="Withheld status"
            value={withheld}
            onChange={(v) => setParam({ withheld: v })}
            options={[
              { value: "1", label: "Only withheld" },
              { value: "0", label: "Not withheld" },
            ]}
            allLabel="All withheld status"
          />
          <FilterField
            label="Sort by"
            value={sort || "roll"}
            onChange={(v) => setParam({ sort: v === "roll" ? "" : v })}
            options={sorts.map((s) => ({ value: s.value, label: s.label }))}
          />
          <div className="flex flex-col justify-end">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setPage(0)
                }}
                placeholder="Search roll or name"
                aria-label="Search roll or name"
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
              {show.branch && <TableHead>Branch</TableHead>}
              {show.medium && <TableHead>Medium</TableHead>}
              <TableHead>Class</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Student&apos;s name</TableHead>
              {show.version && <TableHead>Version</TableHead>}
              {show.shift && <TableHead>Shift</TableHead>}
              {show.group && <TableHead>Group</TableHead>}
              {show.gender && <TableHead>Gender</TableHead>}
              <TableHead>Section</TableHead>
              <TableHead>Section teacher</TableHead>
              <TableHead>Result</TableHead>
              <TableHead className="text-right">Total marks</TableHead>
              <TableHead className="text-right">GPA</TableHead>
              <TableHead className="text-right">GPA w/o optional</TableHead>
              <TableHead>Letter grade</TableHead>
              <TableHead className="text-center">Golden</TableHead>
              <TableHead className="text-right">Failed subjects</TableHead>
              <TableHead className="text-right">Merit (group)</TableHead>
              <TableHead className="text-right">Merit (section)</TableHead>
              <TableHead>Auto remarks</TableHead>
              <TableHead className="text-right">Working days</TableHead>
              <TableHead className="text-right">Attended</TableHead>
              <TableHead className="text-center">Withheld</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row, index) => {
                const { exam, result, enrolment, info } = row
                return (
                  <TableRow key={row.key} className={cn(row.status === "Absent" && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {current * PAGE_SIZE + index + 1}
                    </TableCell>
                    {show.institute && (
                      <TableCell className="whitespace-nowrap">
                        {(() => {
                          const i = instituteById.get(exam.instituteId)
                          return i ? i.shortName || i.name : "—"
                        })()}
                      </TableCell>
                    )}
                    {show.branch && <TableCell>{name("branch", enrolment?.branchId)}</TableCell>}
                    {show.medium && <TableCell>{enrolment?.medium || "—"}</TableCell>}
                    <TableCell className="whitespace-nowrap">{name("class", exam.classId)}</TableCell>
                    <TableCell>{name("year", exam.yearId)}</TableCell>
                    <TableCell className="whitespace-nowrap">{exam.fullName}</TableCell>
                    <TableCell className="tabular-nums">{result.roll}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {row.student ? (
                        <Link
                          href={`/students/${row.student.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {row.student.name}
                        </Link>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    {show.version && <TableCell>{enrolment?.version || "—"}</TableCell>}
                    {show.shift && <TableCell>{name("shift", enrolment?.shiftId)}</TableCell>}
                    {show.group && <TableCell>{name("group", result.groupId)}</TableCell>}
                    {show.gender && <TableCell>{row.sectionGender || "—"}</TableCell>}
                    <TableCell>{name("section", result.sectionId)}</TableCell>
                    <TableCell className="min-w-32 whitespace-normal">{row.teachers || "—"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={row.status === "Failed" ? "destructive" : "outline"}
                        className={cn(row.status === "Absent" && "text-muted-foreground")}
                      >
                        {row.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {result.isPresent ? result.totalMarks : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {exam.calculateGpa && result.isPresent ? result.gpa.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {exam.calculateGpa && result.isPresent ? result.gpaWithoutOptional.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell>{result.letterGrade || "—"}</TableCell>
                    <TableCell className="text-center">{result.isGolden ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {result.isPresent ? result.failedSubjectCount : "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{dash(result.groupPosition)}</TableCell>
                    <TableCell className="text-right tabular-nums">{dash(result.sectionPosition)}</TableCell>
                    <TableCell className="whitespace-nowrap">{result.remarks || "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{info.totalWorkingDays}</TableCell>
                    <TableCell className="text-right tabular-nums">{info.totalAttend}</TableCell>
                    <TableCell className="text-center">{info.isWithheld ? "Yes" : "No"}</TableCell>
                    <TableCell className="min-w-32 whitespace-normal">{info.remarks || "—"}</TableCell>
                    <TableCell>
                      <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground">
                        <Link href={editHref(row)}>
                          <PencilIcon />
                          <span className="sr-only">Edit marks of roll {result.roll}</span>
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  {allRows.length
                    ? "No student results match these filters."
                    : "No merit list has been generated yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {rows.length} result{rows.length === 1 ? "" : "s"}
        </span>
        {pages > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">
              Page {current + 1} of {pages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={current === 0}
              onClick={() => setPage(current - 1)}
            >
              <ChevronLeftIcon />
              <span className="sr-only">Previous page</span>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-8"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
            >
              <ChevronRightIcon />
              <span className="sr-only">Next page</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
