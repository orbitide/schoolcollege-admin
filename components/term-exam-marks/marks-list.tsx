"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, SearchIcon, UploadIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { useStudentLookups } from "@/components/students/student-lookups"
import { MarkActions } from "@/components/term-exam-marks/mark-actions"
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
import {
  branchStore,
  classStore,
  groupStore,
  letterGradeStore,
  sectionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { studentTypes, useStudents, type Enrolment, type Student } from "@/lib/students"
import { useTermExamMarks, type TermExamStudentMark } from "@/lib/term-exam-marks"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const PAGE_SIZE = 50

const resultOptions = ["Passed", "Failed", "Not calculated"] as const
const statusOptions = [
  { value: "", label: "Active & inactive" },
  { value: "Active", label: "Active" },
  { value: "Inactive", label: "Inactive" },
  { value: "Deleted", label: "Deleted" },
]

type Row = {
  mark: TermExamStudentMark
  exam: TermExam | undefined
  student: Student | undefined
  enrolment: Enrolment | undefined
}

const show = (value: number | null) => (value == null ? "—" : value)

// A part as "obtained" or "obtained + grace".
function withGrace(obtained: number | null, grace: number) {
  if (obtained == null && !grace) return "—"
  return grace ? `${obtained ?? 0} + ${grace}` : obtained
}

// Legacy "Student Marks Manage Admin" (TermExamStudentMarks/ManageAdmin):
// every uploaded mark, one row per student and subject, filterable by the
// exam's structure, section, subject, result and grade, with details, the
// Edit Student Marks link and the status / delete actions.
export function MarksList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const marks = useTermExamMarks()
  const exams = useTermExams()
  const students = useStudents()
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
  const sections = sectionStore.useList(iid)
  const grades = letterGradeStore.useList(iid)
  const allSubjects = subjectStore.useAll()
  const allClasses = classStore.useAll()

  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const examOptions = exams.filter(
    (e) =>
      e.status !== "Deleted" &&
      e.instituteId === iid &&
      (!param("class") || String(e.classId) === param("class")) &&
      (!param("year") || String(e.yearId) === param("year"))
  )
  const exam = examOptions.find((e) => String(e.id) === param("exam"))

  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(0)
  const needle = query.trim().toLowerCase()

  const allowed = new Set(institutes.map((i) => i.id))
  const instituteOf = new Map(institutes.map((i) => [i.id, i]))
  const examById = new Map(exams.map((e) => [e.id, e]))
  const studentById = new Map(students.map((s) => [s.id, s]))
  const subjectById = new Map(allSubjects.map((s) => [s.id, s]))
  const classById = new Map(allClasses.map((c) => [c.id, c]))

  const rows = React.useMemo(() => {
    const is = (value: number | null | undefined, key: string) => !param(key) || String(value) === param(key)
    const status = param("status")
    const result = param("result")
    return marks
      .map((mark): Row => {
        const e = examById.get(mark.termExamId)
        const student = studentById.get(mark.studentId)
        const enrolment = e && student?.enrolments.find((en) => en.classId === e.classId && en.yearId === e.yearId)
        return { mark, exam: e, student, enrolment }
      })
      .filter(({ mark, exam: e, student, enrolment }) => {
        if (!e || !allowed.has(e.instituteId)) return false
        if (institute && e.instituteId !== institute.id) return false
        if (status ? mark.status !== status : mark.status === "Deleted") return false
        if (param("medium") && e.medium && e.medium !== param("medium")) return false
        if (!is(e.classId, "class") || !is(e.yearId, "year") || !is(e.id, "exam")) return false
        if (!is(mark.subjectId, "subject")) return false
        if (param("group") && !is(enrolment?.groupId, "group")) return false
        if (param("branch") && !is(enrolment?.branchId, "branch")) return false
        if (param("shift") && !is(enrolment?.shiftId, "shift")) return false
        if (param("version") && enrolment?.version !== param("version")) return false
        if (param("section") && !is(enrolment?.sectionId, "section")) return false
        if (param("type") && enrolment?.studentType !== param("type")) return false
        if (param("grade") && mark.letterGrade !== param("grade")) return false
        if (result === "Not calculated" && mark.isPassCalculated) return false
        if (result === "Passed" && !(mark.isPassCalculated && mark.isPass)) return false
        if (result === "Failed" && !(mark.isPassCalculated && !mark.isPass)) return false
        if (needle && !mark.roll.toLowerCase().includes(needle) && !student?.name.toLowerCase().includes(needle))
          return false
        return true
      })
      .sort(
        (a, b) =>
          a.mark.termExamId - b.mark.termExamId ||
          Number(a.mark.roll) - Number(b.mark.roll) ||
          a.mark.roll.localeCompare(b.mark.roll) ||
          (subjectById.get(a.mark.subjectId)?.rank ?? 0) - (subjectById.get(b.mark.subjectId)?.rank ?? 0)
      )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marks, exams, students, allSubjects, searchParams, institute, needle])

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const pageRows = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)
  const returnTo = searchParams.toString() ? `${pathname}?${searchParams}` : pathname

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
  const clearStructure = { medium: "", class: "", group: "", year: "", branch: "", version: "", shift: "", section: "", exam: "", subject: "", grade: "" }

  // Structure columns only show when a listed mark's institute uses them.
  const uses = (flag: "enableMedium" | "enableBranch" | "enableVersion" | "enableShift") =>
    pageRows.some((r) => r.exam && instituteOf.get(r.exam.instituteId)?.[flag])
  const showCol = {
    institute: !institute,
    branch: uses("enableBranch"),
    version: uses("enableVersion"),
    shift: uses("enableShift"),
    mcq: pageRows.some((r) => r.mark.mcqMarks != null || r.mark.mcqAnswer),
  }
  const columnCount = 16 + Object.values(showCol).filter(Boolean).length

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Student Marks Manage (Admin)</CardTitle>
            <CardDescription>
              Every uploaded mark, one row per student and subject. Deleted marks are hidden
              unless you pick the &quot;Deleted&quot; status.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href="/term-exam-marks/upload">
              <UploadIcon data-icon="inline-start" />
              Upload marks
            </Link>
          </Button>
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
              label="Academic medium"
              value={param("medium")}
              onChange={(v) => setParam({ medium: v })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            value={param("class")}
            onChange={(v) => setParam({ class: v, group: "", section: "", exam: "", subject: "" })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="All classes"
            disabled={!institute}
          />
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          <FilterField
            label="Academic year"
            value={param("year")}
            onChange={(v) => setParam({ year: v, exam: "", subject: "" })}
            options={years.map((y) => ({ value: String(y.id), label: y.name }))}
            allLabel="All years"
            disabled={!institute}
          />
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
              label="Academic version"
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
          <FilterField
            label="Section"
            value={param("section")}
            onChange={(v) => setParam({ section: v })}
            options={sections
              .filter((s) => s.status === "Active" && String(s.classId) === param("class"))
              .map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!param("class")}
          />
          <FilterField
            label="Student type"
            value={param("type")}
            onChange={(v) => setParam({ type: v })}
            options={studentTypes.map((t) => ({ value: t, label: t }))}
            allLabel="All types"
          />
          <FilterField
            label="Term exam"
            value={param("exam")}
            onChange={(v) => setParam({ exam: v, subject: "" })}
            options={examOptions.map((e) => ({ value: String(e.id), label: e.fullName }))}
            allLabel="All exams"
            disabled={!institute}
          />
          <FilterField
            label="Subject"
            value={param("subject")}
            onChange={(v) => setParam({ subject: v })}
            options={(exam?.subjects ?? []).map((s) => ({
              value: String(s.subjectId),
              label: subjectById.get(s.subjectId)?.name ?? name("subject", s.subjectId),
            }))}
            allLabel="All subjects"
            disabled={!exam}
          />
          <FilterField
            label="Result"
            value={param("result")}
            onChange={(v) => setParam({ result: v })}
            options={resultOptions.map((r) => ({ value: r, label: r }))}
            allLabel="All results"
          />
          <FilterField
            label="Letter grade"
            value={param("grade")}
            onChange={(v) => setParam({ grade: v })}
            options={[...new Set(grades.filter((g) => g.status === "Active").map((g) => g.name))].map((g) => ({
              value: g,
              label: g,
            }))}
            allLabel="All grades"
            disabled={!institute}
          />
          <FilterField
            label="Status"
            value={param("status")}
            onChange={(v) => setParam({ status: v })}
            options={statusOptions.filter((o) => o.value)}
            allLabel={statusOptions[0].label}
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
                placeholder="Search roll or student name"
                aria-label="Search marks"
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
              {showCol.institute && <TableHead>Institute</TableHead>}
              <TableHead>Class</TableHead>
              {showCol.branch && <TableHead>Branch</TableHead>}
              {showCol.version && <TableHead>Version</TableHead>}
              {showCol.shift && <TableHead>Shift</TableHead>}
              <TableHead>Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Section</TableHead>
              <TableHead>Term exam</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-center">Theory</TableHead>
              <TableHead className="text-center">CQ</TableHead>
              <TableHead className="text-center">Practical</TableHead>
              <TableHead className="text-center">MCQ</TableHead>
              {showCol.mcq && <TableHead className="text-center">MCQ C / N / W · Set</TableHead>}
              <TableHead className="text-center">Total</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map(({ mark: m, exam: e, student, enrolment }, index) => {
                const owner = e ? instituteOf.get(e.instituteId) : undefined
                const subjectName = subjectById.get(m.subjectId)?.name ?? name("subject", m.subjectId)
                const deleted = m.status === "Deleted"
                return (
                  <TableRow key={m.id} className={cn(deleted && "text-muted-foreground")}>
                    <TableCell className="tabular-nums text-muted-foreground">{current * PAGE_SIZE + index + 1}</TableCell>
                    {showCol.institute && <TableCell className="whitespace-nowrap">{owner?.name ?? "—"}</TableCell>}
                    <TableCell className="whitespace-nowrap">
                      {e ? classById.get(e.classId)?.name : "—"}
                      {e && <span className="block text-xs text-muted-foreground">{name("year", e.yearId)}</span>}
                    </TableCell>
                    {showCol.branch && (
                      <TableCell>{owner?.enableBranch ? name("branch", enrolment?.branchId) : "—"}</TableCell>
                    )}
                    {showCol.version && (
                      <TableCell>{owner?.enableVersion ? enrolment?.version || "—" : "—"}</TableCell>
                    )}
                    {showCol.shift && (
                      <TableCell>{owner?.enableShift ? name("shift", enrolment?.shiftId) : "—"}</TableCell>
                    )}
                    <TableCell className="tabular-nums">{m.roll}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {student?.name ?? "—"}
                      {enrolment && (
                        <span className="block text-xs text-muted-foreground">{enrolment.studentType}</span>
                      )}
                    </TableCell>
                    <TableCell>{name("section", enrolment?.sectionId)}</TableCell>
                    <TableCell className="whitespace-nowrap">{e?.name ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {subjectName}
                      {m.isOptional && (
                        <Badge variant="outline" className="ml-1.5 px-1 text-[10px]">
                          Optional
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{withGrace(m.theoryMarks, m.theoryGraceMarks)}</TableCell>
                    <TableCell className="text-center tabular-nums">{withGrace(m.cqMarks, m.cqGraceMarks)}</TableCell>
                    <TableCell className="text-center tabular-nums">{show(m.practicalMarks)}</TableCell>
                    <TableCell className="text-center tabular-nums">{withGrace(m.mcqMarks, m.mcqGraceMarks)}</TableCell>
                    {showCol.mcq && (
                      <TableCell className="text-center text-xs tabular-nums whitespace-nowrap text-muted-foreground">
                        {m.mcqAnswer || m.mcqCorrectAnswer != null
                          ? `${show(m.mcqCorrectAnswer)} / ${show(m.mcqNotAnswer)} / ${show(m.mcqWrongAnswer)}`
                          : "—"}
                        {m.setCode && ` · ${m.setCode}`}
                      </TableCell>
                    )}
                    <TableCell className="text-center font-medium tabular-nums">{m.totalMarks}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {m.isPassCalculated ? (
                        <span className={cn(!m.isPass && "text-destructive")}>
                          {m.isPass ? "Passed" : "Failed"}
                          {m.letterGrade && ` · ${m.letterGrade}`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Not calculated</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                      {m.modifiedBy}
                      <span className="block">{stamp(m.modifiedAt)}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={m.status} />
                    </TableCell>
                    <TableCell>
                      <MarkActions
                        mark={m}
                        exam={e}
                        label={`Roll ${m.roll} · ${subjectName}`}
                        returnTo={returnTo}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No marks match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="text-muted-foreground">
          {rows.length} mark{rows.length === 1 ? "" : "s"}
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
