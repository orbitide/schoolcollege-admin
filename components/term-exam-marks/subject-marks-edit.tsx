"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { SearchIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import {
  liveMark,
  MarkInput,
  markForm,
  readMarkForm,
  type EditField,
  type MarkForm,
} from "@/components/term-exam-marks/mark-edit-fields"
import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
  sectionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { useStudents, type Enrolment, type Student } from "@/lib/students"
import {
  editableFields,
  editSubjectMarks,
  examStudents,
  getTermExamMarks,
  isActiveMark,
  MarkEditError,
  takesSubject,
  type EditTarget,
  type MarkEdit,
  type TermExamStudentMark,
} from "@/lib/term-exam-marks"
import { useTermExams, type TermExam, type TermExamSubject } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

type Loaded = {
  exam: TermExam
  sectionId: number
  subject: TermExamSubject
  rows: { student: Student; enrolment: Enrolment }[]
}

// Legacy "Subject Marks Edit" (TermExamStudentMarks/SubjectMarksEdit): one
// subject's marks for every student of a section who takes it, so a
// teacher can correct a whole paper at once. Absent students (no marks
// uploaded) can be given marks here too. Saving regenerates the exam's pass
// status.
export function SubjectMarksEdit() {
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const students = useStudents()
  const name = useStudentLookups()

  const param = (key: string) => searchParams.get(key) ?? ""
  const [instituteId, setInstituteId] = React.useState(
    institutes.length === 1 ? String(institutes[0].id) : param("institute")
  )
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const subjectList = subjectStore.useList(iid)

  const [filter, setFilter] = React.useState({
    medium: "",
    class: param("class"),
    year: param("year"),
    group: "",
    branch: "",
    version: "",
    shift: "",
  })
  const [sectionId, setSectionId] = React.useState(param("section"))
  const [examId, setExamId] = React.useState(param("exam"))
  const [subjectId, setSubjectId] = React.useState(param("subject"))
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [form, setForm] = React.useState<Record<number, MarkForm>>({})
  const [marks, setMarks] = React.useState<Map<number, TermExamStudentMark>>(new Map())

  const selectedClass = classes.find((c) => String(c.id) === filter.class)
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const is = (value: number | null, key: keyof typeof filter) => !filter[key] || String(value) === filter[key]
  // Legacy LoadAllSection: the class's sections in the chosen structure.
  const sectionOptions = sections.filter(
    (s) =>
      s.status === "Active" &&
      String(s.classId) === filter.class &&
      (s.branchId == null || is(s.branchId, "branch")) &&
      (s.shiftId == null || is(s.shiftId, "shift")) &&
      (!s.version || !filter.version || s.version === filter.version) &&
      (s.groupId == null || is(s.groupId, "group"))
  )
  const examOptions = exams.filter(
    (e) =>
      e.status === "Active" &&
      e.instituteId === iid &&
      String(e.classId) === filter.class &&
      String(e.yearId) === filter.year &&
      (!filter.medium || e.medium === filter.medium) &&
      is(e.groupId, "group") &&
      is(e.branchId, "branch") &&
      (!filter.version || e.version === filter.version) &&
      is(e.shiftId, "shift")
  )
  const exam = examOptions.find((e) => String(e.id) === examId)
  const section = sectionOptions.find((s) => String(s.id) === sectionId)
  const examSubject = exam?.subjects.find((s) => String(s.subjectId) === subjectId)

  function setStructure(updates: Partial<typeof filter>) {
    setFilter((current) => ({ ...current, ...updates }))
    setSectionId("")
    setExamId("")
    setSubjectId("")
    setLoaded(null)
  }

  const subjectLabel = (id: number) => {
    const s = subjectList.find((x) => x.id === id)
    return s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : name("subject", id)
  }

  function open(target: Loaded) {
    const own = new Map(
      getTermExamMarks()
        .filter((m) => m.termExamId === target.exam.id && m.subjectId === target.subject.subjectId && isActiveMark(m))
        .map((m) => [m.studentId, m])
    )
    setMarks(own)
    setForm(Object.fromEntries(target.rows.map((r) => [r.student.id, markForm(own.get(r.student.id))])))
    setLoaded(target)
  }

  // Legacy LoadSubjectTermExamMarks: the section's students who take the
  // subject, by roll, with their marks if uploaded.
  function search() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!section) next.section = "Select a section."
    if (!exam) next.exam = "Select a term exam."
    if (!examSubject) next.subject = "Select a subject."
    setErrors(next)
    if (!exam || !section || !examSubject || Object.keys(next).length) {
      setLoaded(null)
      return
    }
    const rows = examStudents(exam, students)
      .filter((x) => x.enrolment.sectionId === section.id && takesSubject(x.enrolment, examSubject.subjectId))
      .sort(
        (a, b) =>
          Number(a.enrolment.classRoll) - Number(b.enrolment.classRoll) ||
          a.enrolment.classRoll.localeCompare(b.enrolment.classRoll)
      )
    open({ exam, sectionId: section.id, subject: examSubject, rows })
  }

  // A link with the section, exam and subject opens the list straight away.
  const autoOpened = React.useRef(false)
  React.useEffect(() => {
    if (autoOpened.current || !exam || !section || !examSubject) return
    autoOpened.current = true
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, section, examSubject])

  function update() {
    if (!loaded || !institute) return
    const { exam: target, subject, rows } = loaded
    const fields = editableFields(target, subject)
    const next: Record<string, string> = {}
    const edits: { student: EditTarget; edit: MarkEdit }[] = []
    for (const { student, enrolment } of rows) {
      const { edit, invalid } = readMarkForm(form[student.id], subject.subjectId, fields)
      for (const f of invalid) next[`${student.id}.${f}`] = "Enter 0 or more."
      edits.push({
        student: { studentId: student.id, roll: enrolment.classRoll, optionalSubjectId: enrolment.optionalSubjectId },
        edit,
      })
    }
    setErrors(next)
    if (Object.keys(next).length) return toast.error("Check the highlighted marks.")

    try {
      const result = editSubjectMarks(target, institute, edits, user.name)
      if (!result.saved) return toast.info(result.message)
      toast.success(result.message, {
        description: `${result.saved} students' marks saved. Generate the merit list again to update positions.`,
      })
      open(loaded)
    } catch (error) {
      if (error instanceof MarkEditError) {
        setErrors({ [`${error.studentId}.${error.field}`]: error.message })
        const row = rows.find((r) => r.student.id === error.studentId)
        toast.error(`Roll ${row?.enrolment.classRoll ?? "?"}: ${error.message}`)
      } else {
        toast.error(error instanceof Error ? error.message : "Marks edit failed.")
      }
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          search()
        }}
      >
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Term Exam Subject Marks Edit</CardTitle>
            <CardDescription>
              Correct one subject&apos;s marks for a whole section. MCQ marks come from the answer
              sheet; only their grace marks can be changed here.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {institutes.length > 1 && (
              <FilterField
                label="Institute"
                required
                value={instituteId}
                onChange={(v) => {
                  setInstituteId(v)
                  setStructure({ medium: "", class: "", year: "", group: "", branch: "", version: "", shift: "" })
                }}
                options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
                placeholder="Select institute"
                error={errors.institute}
              />
            )}
            {institute?.enableMedium && (
              <FilterField
                label="Academic medium"
                value={filter.medium}
                onChange={(v) => setStructure({ medium: v, class: "", group: "" })}
                options={academicMediums.map((m) => ({ value: m, label: m }))}
                allLabel="All mediums"
              />
            )}
            <FilterField
              label="Class"
              required
              value={filter.class}
              onChange={(v) => setStructure({ class: v, group: "" })}
              options={classes
                .filter((c) => !filter.medium || !c.medium || c.medium === filter.medium)
                .map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder={institute ? "Select class" : "Select an institute first"}
              error={errors.class}
              disabled={!institute}
            />
            <FilterField
              label="Academic year"
              required
              value={filter.year}
              onChange={(v) => setStructure({ year: v })}
              options={years.map((y) => ({ value: String(y.id), label: y.name }))}
              placeholder={institute ? "Select year" : "Select an institute first"}
              error={errors.year}
              disabled={!institute}
            />
            {classGroups.length > 0 && (
              <FilterField
                label="Academic group"
                value={filter.group}
                onChange={(v) => setStructure({ group: v })}
                options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
                allLabel="All groups"
              />
            )}
            {institute?.enableBranch && (
              <FilterField
                label="Branch"
                value={filter.branch}
                onChange={(v) => setStructure({ branch: v })}
                options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                allLabel="All branches"
              />
            )}
            {institute?.enableVersion && (
              <FilterField
                label="Academic version"
                value={filter.version}
                onChange={(v) => setStructure({ version: v })}
                options={academicVersions.map((v) => ({ value: v, label: v }))}
                allLabel="All versions"
              />
            )}
            {institute?.enableShift && (
              <FilterField
                label="Shift"
                value={filter.shift}
                onChange={(v) => setStructure({ shift: v })}
                options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
                allLabel="All shifts"
              />
            )}
            <FilterField
              label="Section"
              required
              value={sectionId}
              onChange={(v) => {
                setSectionId(v)
                setLoaded(null)
              }}
              options={sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder={filter.class ? (sectionOptions.length ? "Select section" : "No section") : "Select a class first"}
              error={errors.section}
              disabled={!filter.class}
            />
            <FilterField
              label="Term exam"
              required
              value={examId}
              onChange={(v) => {
                setExamId(v)
                setSubjectId("")
                setLoaded(null)
              }}
              options={examOptions.map((e) => ({ value: String(e.id), label: e.fullName }))}
              placeholder={
                filter.class && filter.year
                  ? examOptions.length
                    ? "Select term exam"
                    : "No active exam"
                  : "Select class and year first"
              }
              error={errors.exam}
              disabled={!filter.class || !filter.year}
            />
            <FilterField
              label="Subject"
              required
              value={subjectId}
              onChange={(v) => {
                setSubjectId(v)
                setLoaded(null)
              }}
              options={(exam?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectLabel(s.subjectId) }))}
              placeholder={exam ? "Select subject" : "Select a term exam first"}
              error={errors.subject}
              disabled={!exam}
            />
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={!exam}>
              <SearchIcon />
              Load marks
            </Button>
          </CardFooter>
        </Card>
      </form>

      {loaded && (
        <form
          onSubmit={(event) => {
            event.preventDefault()
            update()
          }}
        >
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-lg">{subjectLabel(loaded.subject.subjectId)}</CardTitle>
              <CardDescription>
                {loaded.exam.fullName} · Section {name("section", loaded.sectionId)} · {loaded.rows.length}{" "}
                {loaded.rows.length === 1 ? "student" : "students"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {!loaded.exam.editEnable && (
                <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  <TriangleAlertIcon className="size-4 text-amber-600" />
                  This term exam is not editable. Turn on &quot;Edit enable&quot; on the exam to change marks.
                </p>
              )}
              {loaded.rows.length ? (
                <SubjectMarksTable
                  loaded={loaded}
                  form={form}
                  marks={marks}
                  errors={errors}
                  onChange={(studentId, field, value) =>
                    setForm((c) => ({ ...c, [studentId]: { ...c[studentId], [field]: value } }))
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  No active student in this section takes this subject.
                </p>
              )}
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setLoaded(null)}>
                Back
              </Button>
              <Button type="submit" disabled={!loaded.exam.editEnable || !loaded.rows.length}>
                Update
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}

// Legacy _subjectMarksEditPartial: one row per student, the subject's parts
// as columns with full and pass marks in the header. Part totals show "A"
// for a student with no marks uploaded (absent).
function SubjectMarksTable({
  loaded,
  form,
  marks,
  errors,
  onChange,
}: {
  loaded: Loaded
  form: Record<number, MarkForm>
  marks: Map<number, TermExamStudentMark>
  errors: Record<string, string | undefined>
  onChange: (studentId: number, field: EditField, value: string) => void
}) {
  const { exam, subject: s, rows } = loaded
  const grace = exam.hasGraceMarks
  const partSpan = grace ? 3 : 2
  const parts = [
    { label: "Theory", full: s.theoryMarks, pass: s.theoryPassMarks, obtained: "theoryMarks", grace: "theoryGraceMarks" },
    { label: "CQ", full: s.cqMarks, pass: s.cqPassMarks, obtained: "cqMarks", grace: "cqGraceMarks" },
    { label: "MCQ", full: s.mcqMarks, pass: s.mcqPassMarks, obtained: null, grace: "mcqGraceMarks" },
  ] as const
  const shownParts = parts.filter((p) => p.full > 0)
  const limits = (full: number, pass?: number) => (
    <div className="text-xs font-normal text-muted-foreground italic">
      (T:{full}
      {pass != null && `, P:${pass}`})
    </div>
  )

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="text-center">Sl</TableHead>
            <TableHead rowSpan={2}>Student</TableHead>
            <TableHead rowSpan={2} className="text-center">Roll</TableHead>
            {shownParts.map((p) => (
              <TableHead key={p.label} colSpan={partSpan} className="text-center">
                {p.label}
                {limits(p.full, p.pass)}
              </TableHead>
            ))}
            {s.practicalMarks > 0 && (
              <TableHead rowSpan={2} className="text-center">
                Practical
                {limits(s.practicalMarks, s.practicalPassMarks)}
              </TableHead>
            )}
            {exam.hasAssignmentMarks && (
              <TableHead rowSpan={2} className="text-center">
                Assignment
                {limits(exam.assignmentMarks)}
              </TableHead>
            )}
            {exam.hasAttendanceMarks && (
              <TableHead rowSpan={2} className="text-center">
                Attendance
                {limits(exam.attendanceMarks)}
              </TableHead>
            )}
            <TableHead rowSpan={2} className="text-center">
              Total mark
              {s.totalMarks > 0 && limits(s.totalMarks, s.totalPassMarks)}
            </TableHead>
          </TableRow>
          <TableRow>
            {shownParts.flatMap((p) => [
              <TableHead key={`${p.label}o`} className="text-center">Obtained</TableHead>,
              ...(grace ? [<TableHead key={`${p.label}g`} className="text-center">Grace</TableHead>] : []),
              <TableHead key={`${p.label}t`} className="text-center">Total</TableHead>,
            ])}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(({ student, enrolment }, i) => {
            const m = liveMark(form[student.id], marks.get(student.id))
            const input = (field: EditField, full: number, low: boolean) => (
              <MarkInput
                label={`Roll ${enrolment.classRoll} ${field}`}
                value={form[student.id][field]}
                full={full}
                low={low}
                error={errors[`${student.id}.${field}`]}
                onChange={(value) => onChange(student.id, field, value)}
              />
            )
            return (
              <TableRow key={student.id}>
                <TableCell className="text-center">{i + 1}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{student.name}</TableCell>
                <TableCell className="text-center">{enrolment.classRoll}</TableCell>
                {shownParts.flatMap((p) => {
                  const obtained = p.obtained ? m[p.obtained] : m.mcqMarks
                  const graceMarks = m[p.grace]
                  const low = !m.uploaded || (obtained ?? 0) + graceMarks < p.pass
                  const entered = m.uploaded || obtained != null || graceMarks > 0
                  return [
                    <TableCell
                      key={`${p.label}o`}
                      className={cn("text-center", !p.obtained && "font-semibold", !p.obtained && low && "text-destructive")}
                    >
                      {p.obtained ? input(p.obtained, p.full, low) : m.uploaded ? (obtained ?? 0) : "A"}
                    </TableCell>,
                    ...(grace
                      ? [<TableCell key={`${p.label}g`} className="text-center">{input(p.grace, p.full, low)}</TableCell>]
                      : []),
                    <TableCell key={`${p.label}t`} className={cn("text-center font-semibold", low && "text-destructive")}>
                      {entered ? (obtained ?? 0) + graceMarks : "A"}
                    </TableCell>,
                  ]
                })}
                {s.practicalMarks > 0 && (
                  <TableCell className="text-center">
                    {input("practicalMarks", s.practicalMarks, !m.uploaded || (m.practicalMarks ?? 0) < s.practicalPassMarks)}
                  </TableCell>
                )}
                {exam.hasAssignmentMarks && (
                  <TableCell className="text-center">
                    {input("assignmentMarks", exam.assignmentMarks, !m.uploaded)}
                  </TableCell>
                )}
                {exam.hasAttendanceMarks && (
                  <TableCell className="text-center">
                    {input("attendanceMarks", exam.attendanceMarks, !m.uploaded)}
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    "text-center font-semibold",
                    (!m.uploaded || m.totalMarks < s.totalPassMarks) && "text-destructive"
                  )}
                >
                  {m.totalMarks}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
