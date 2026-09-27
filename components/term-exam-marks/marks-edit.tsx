"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { SearchIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, useStudentLookups } from "@/components/students/student-lookups"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import {
  branchStore,
  classStore,
  groupStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { useStudents, type Enrolment, type Student } from "@/lib/students"
import {
  editableFields,
  editStudentMarks,
  examStudents,
  getTermExamMarks,
  getTermExamStudentInfo,
  isActiveMark,
  MarkEditError,
  takesSubject,
  type MarkEdit,
  type TermExamStudentMark,
} from "@/lib/term-exam-marks"
import { useTermExams, type TermExam, type TermExamSubject } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

import {
  liveMark,
  MarkInput,
  markForm,
  readMarkForm,
  type EditField,
  type LiveMark,
  type MarkForm,
} from "@/components/term-exam-marks/mark-edit-fields"

type InfoForm = { totalWorkingDays: string; totalAttend: string; isWithheld: boolean; remarks: string }
type Loaded = { exam: TermExam; student: Student; enrolment: Enrolment; subjects: TermExamSubject[] }

// Legacy "Edit Student Marks" (TermExamStudentMarks/MarksEdit): find one
// student of a term exam by roll, then correct their marks subject by
// subject, with grace marks where the exam allows them, and their
// attendance and result notes. Saving regenerates the exam's pass status.
export function MarksEdit() {
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
  const [examId, setExamId] = React.useState(param("exam"))
  const [roll, setRoll] = React.useState(param("roll"))
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  const [loaded, setLoaded] = React.useState<Loaded | null>(null)
  const [form, setForm] = React.useState<Record<number, MarkForm>>({})
  const [info, setInfo] = React.useState<InfoForm>({ totalWorkingDays: "", totalAttend: "", isWithheld: false, remarks: "" })
  const [marks, setMarks] = React.useState<Map<number, TermExamStudentMark>>(new Map())

  const selectedClass = classes.find((c) => String(c.id) === filter.class)
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const is = (value: number | null, key: keyof typeof filter) => !filter[key] || String(value) === filter[key]
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

  function setStructure(updates: Partial<typeof filter>) {
    setFilter((current) => ({ ...current, ...updates }))
    setExamId("")
    setLoaded(null)
  }

  const subjectLabel = (id: number) => {
    const s = subjectList.find((x) => x.id === id)
    return s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : name("subject", id)
  }

  function open(target: Loaded) {
    const own = new Map(
      getTermExamMarks()
        .filter((m) => m.termExamId === target.exam.id && m.studentId === target.student.id && isActiveMark(m))
        .map((m) => [m.subjectId, m])
    )
    const saved = getTermExamStudentInfo(target.exam, target.student.id)
    setMarks(own)
    setForm(Object.fromEntries(target.subjects.map((s) => [s.subjectId, markForm(own.get(s.subjectId))])))
    setInfo({
      totalWorkingDays: String(saved.totalWorkingDays),
      totalAttend: String(saved.totalAttend),
      isWithheld: saved.isWithheld,
      remarks: saved.remarks,
    })
    setLoaded(target)
  }

  // Legacy LoadStudentTermExamMarks.
  function search() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!exam) next.exam = "Select a term exam."
    const wanted = roll.trim()
    if (!/^\d+$/.test(wanted) || Number(wanted) <= 0) next.roll = "Enter a valid student roll."
    const found = exam && !next.roll ? examStudents(exam, students).find((x) => x.enrolment.classRoll === wanted) : undefined
    if (exam && !next.roll && !found) next.roll = "No student with this roll sits this exam."
    setErrors(next)
    if (Object.keys(next).length || !exam || !found) {
      setLoaded(null)
      return
    }
    open({
      exam,
      student: found.student,
      enrolment: found.enrolment,
      subjects: exam.subjects.filter((s) => takesSubject(found.enrolment, s.subjectId)),
    })
  }

  // A link with the exam and roll (as the legacy "Edit" button sends) opens
  // the student straight away.
  const autoOpened = React.useRef(false)
  React.useEffect(() => {
    if (autoOpened.current || !exam || !param("roll")) return
    autoOpened.current = true
    search()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam])

  const current = (s: TermExamSubject) => liveMark(form[s.subjectId], marks.get(s.subjectId))

  function update() {
    if (!loaded || !institute) return
    const { exam: target, student, enrolment, subjects } = loaded
    const next: Record<string, string> = {}
    const edits: MarkEdit[] = []
    for (const s of subjects) {
      const { edit, invalid } = readMarkForm(form[s.subjectId], s.subjectId, editableFields(target, s))
      for (const f of invalid) next[`${s.subjectId}.${f}`] = "Enter 0 or more."
      edits.push(edit)
    }
    const days = Number(info.totalWorkingDays || 0)
    const attend = Number(info.totalAttend || 0)
    if (!Number.isInteger(days) || days < 0) next.totalWorkingDays = "Enter a whole number of 0 or more."
    if (!Number.isInteger(attend) || attend < 0) next.totalAttend = "Enter a whole number of 0 or more."
    else if (attend > days) next.totalAttend = "Can't be more than the working days."
    setErrors(next)
    if (Object.keys(next).length) return toast.error("Check the highlighted fields.")

    try {
      const result = editStudentMarks(
        target,
        institute,
        { studentId: student.id, roll: enrolment.classRoll, optionalSubjectId: enrolment.optionalSubjectId },
        edits,
        { totalWorkingDays: days, totalAttend: attend, isWithheld: info.isWithheld, remarks: info.remarks },
        user.name
      )
      toast.success(result.message, {
        description: result.saved ? `${result.saved} subject marks saved. Generate the merit list again to update positions.` : undefined,
      })
      open(loaded)
    } catch (error) {
      if (error instanceof MarkEditError) {
        setErrors({ [`${error.subjectId}.${error.field}`]: error.message })
        toast.error(`${subjectLabel(error.subjectId)}: ${error.message}`)
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
            <CardTitle className="text-lg">Student Term Exam Marks Edit</CardTitle>
            <CardDescription>
              Find a student by roll to correct their marks. MCQ marks come from the answer
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
              label="Term exam"
              required
              value={examId}
              onChange={(v) => {
                setExamId(v)
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
            <Field data-invalid={!!errors.roll}>
              <FieldLabel htmlFor="student-roll">
                Student {classRollLabel(institute).toLowerCase()}
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <Input
                id="student-roll"
                inputMode="numeric"
                placeholder="Enter roll"
                value={roll}
                onChange={(event) => setRoll(event.target.value)}
                disabled={!exam}
                aria-invalid={!!errors.roll}
              />
              <FieldError>{errors.roll}</FieldError>
            </Field>
          </CardContent>
          <CardFooter className="justify-end border-t">
            <Button type="submit" disabled={!exam}>
              <SearchIcon />
              Search
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
              <CardTitle className="text-lg">{loaded.student.name}</CardTitle>
              <CardDescription>
                {loaded.exam.fullName} · Roll {loaded.enrolment.classRoll} · Section{" "}
                {name("section", loaded.enrolment.sectionId)}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {!loaded.exam.editEnable && (
                <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
                  <TriangleAlertIcon className="size-4 text-amber-600" />
                  This term exam is not editable. Turn on &quot;Edit enable&quot; on the exam to change marks.
                </p>
              )}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Field data-invalid={!!errors.totalWorkingDays}>
                  <FieldLabel htmlFor="working-days">Total working days</FieldLabel>
                  <Input
                    id="working-days"
                    type="number"
                    min={0}
                    value={info.totalWorkingDays}
                    onChange={(e) => setInfo((c) => ({ ...c, totalWorkingDays: e.target.value }))}
                    aria-invalid={!!errors.totalWorkingDays}
                  />
                  <FieldError>{errors.totalWorkingDays}</FieldError>
                </Field>
                <Field data-invalid={!!errors.totalAttend}>
                  <FieldLabel htmlFor="total-attend">Total attend</FieldLabel>
                  <Input
                    id="total-attend"
                    type="number"
                    min={0}
                    value={info.totalAttend}
                    onChange={(e) => setInfo((c) => ({ ...c, totalAttend: e.target.value }))}
                    aria-invalid={!!errors.totalAttend}
                  />
                  <FieldError>{errors.totalAttend}</FieldError>
                </Field>
                <Field orientation="horizontal" className="self-end pb-2">
                  <Checkbox
                    id="withheld"
                    checked={info.isWithheld}
                    onCheckedChange={(checked) => setInfo((c) => ({ ...c, isWithheld: checked === true }))}
                  />
                  <FieldLabel htmlFor="withheld">Result withheld</FieldLabel>
                </Field>
                <Field className="sm:col-span-2 lg:col-span-4">
                  <FieldLabel htmlFor="remarks">Remarks</FieldLabel>
                  <Textarea
                    id="remarks"
                    rows={2}
                    value={info.remarks}
                    onChange={(e) => setInfo((c) => ({ ...c, remarks: e.target.value }))}
                  />
                </Field>
              </div>
              <MarksTable
                loaded={loaded}
                form={form}
                errors={errors}
                current={current}
                subjectLabel={subjectLabel}
                onChange={(subjectId, field, value) =>
                  setForm((c) => ({ ...c, [subjectId]: { ...c[subjectId], [field]: value } }))
                }
              />
            </CardContent>
            <CardFooter className="justify-end gap-2 border-t">
              <Button type="button" variant="outline" onClick={() => setLoaded(null)}>
                Back
              </Button>
              <Button type="submit" disabled={!loaded.exam.editEnable || !loaded.subjects.length}>
                Update
              </Button>
            </CardFooter>
          </Card>
        </form>
      )}
    </div>
  )
}

// Legacy _marksEditPartial: one row per subject the student takes, with the
// exam's parts as columns and red where a mark is below its pass marks or
// was never uploaded.
function MarksTable({
  loaded,
  form,
  errors,
  current,
  subjectLabel,
  onChange,
}: {
  loaded: Loaded
  form: Record<number, MarkForm>
  errors: Record<string, string | undefined>
  current: (s: TermExamSubject) => LiveMark
  subjectLabel: (id: number) => string
  onChange: (subjectId: number, field: EditField, value: string) => void
}) {
  const { exam, subjects } = loaded
  const grace = exam.hasGraceMarks
  const has = {
    theory: subjects.some((s) => s.theoryMarks > 0),
    cq: subjects.some((s) => s.cqMarks > 0),
    mcq: subjects.some((s) => s.mcqMarks > 0),
    practical: subjects.some((s) => s.practicalMarks > 0),
  }
  const partSpan = grace ? 3 : 2

  if (!subjects.length)
    return <p className="text-sm text-muted-foreground">This student takes none of the exam&apos;s subjects.</p>

  function input(s: TermExamSubject, field: EditField, full: number, low: boolean) {
    return (
      <MarkInput
        label={`${subjectLabel(s.subjectId)} ${field}`}
        value={form[s.subjectId][field]}
        full={full}
        low={low}
        error={errors[`${s.subjectId}.${field}`]}
        onChange={(value) => onChange(s.subjectId, field, value)}
      />
    )
  }

  const dash = <span className="text-muted-foreground">-</span>
  const part = (
    s: TermExamSubject,
    full: number,
    pass: number,
    obtained: number | null,
    graceMarks: number,
    uploaded: boolean,
    field: EditField | null,
    graceField: EditField
  ) => {
    if (!full) return Array.from({ length: partSpan }, (_, i) => <TableCell key={i} className="text-center">{dash}</TableCell>)
    const low = !uploaded || (obtained ?? 0) + graceMarks < pass
    return [
      <TableCell key="o" className={cn("text-center", !field && "font-semibold", !field && low && "text-destructive")}>
        {field ? input(s, field, full, low) : uploaded ? (obtained ?? 0) : 0}
      </TableCell>,
      ...(grace ? [<TableCell key="g" className="text-center">{input(s, graceField, full, low)}</TableCell>] : []),
      <TableCell key="t" className={cn("text-center font-semibold", low && "text-destructive")}>
        {uploaded || obtained != null ? (obtained ?? 0) + graceMarks : 0}
      </TableCell>,
    ]
  }
  const subHeads = (key: string) => [
    <TableHead key={`${key}o`} className="text-center">Obtained</TableHead>,
    ...(grace ? [<TableHead key={`${key}g`} className="text-center">Grace</TableHead>] : []),
    <TableHead key={`${key}t`} className="text-center">Total</TableHead>,
  ]

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead rowSpan={2} className="text-center">Sl</TableHead>
            <TableHead rowSpan={2}>Subject</TableHead>
            <TableHead rowSpan={2}>Pass marks</TableHead>
            {has.theory && <TableHead colSpan={partSpan} className="text-center">Theory</TableHead>}
            {has.cq && <TableHead colSpan={partSpan} className="text-center">CQ</TableHead>}
            {has.mcq && <TableHead colSpan={partSpan} className="text-center">MCQ</TableHead>}
            {has.practical && <TableHead rowSpan={2} className="text-center">Practical</TableHead>}
            {exam.hasAssignmentMarks && <TableHead rowSpan={2} className="text-center">Assignment</TableHead>}
            {exam.hasAttendanceMarks && <TableHead rowSpan={2} className="text-center">Attendance</TableHead>}
            <TableHead rowSpan={2} className="text-center">Total mark</TableHead>
          </TableRow>
          <TableRow>
            {has.theory && subHeads("theory")}
            {has.cq && subHeads("cq")}
            {has.mcq && subHeads("mcq")}
          </TableRow>
        </TableHeader>
        <TableBody>
          {subjects.map((s, i) => {
            const m = current(s)
            const passes = [
              ["Theory", s.theoryMarks, s.theoryPassMarks],
              ["CQ", s.cqMarks, s.cqPassMarks],
              ["MCQ", s.mcqMarks, s.mcqPassMarks],
              ["Practical", s.practicalMarks, s.practicalPassMarks],
            ].filter(([, full, pass]) => Number(full) > 0 && Number(pass) > 0)
            return (
              <TableRow key={s.subjectId}>
                <TableCell className="text-center">{i + 1}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">{subjectLabel(s.subjectId)}</TableCell>
                <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                  {passes.map(([label, , pass]) => (
                    <div key={label}>
                      {label}: <b className="text-foreground">{pass}</b>
                    </div>
                  ))}
                </TableCell>
                {has.theory && part(s, s.theoryMarks, s.theoryPassMarks, m.theoryMarks, m.theoryGraceMarks, m.uploaded, "theoryMarks", "theoryGraceMarks")}
                {has.cq && part(s, s.cqMarks, s.cqPassMarks, m.cqMarks, m.cqGraceMarks, m.uploaded, "cqMarks", "cqGraceMarks")}
                {has.mcq && part(s, s.mcqMarks, s.mcqPassMarks, m.mcqMarks, m.mcqGraceMarks, m.uploaded, null, "mcqGraceMarks")}
                {has.practical && (
                  <TableCell className="text-center">
                    {s.practicalMarks
                      ? input(s, "practicalMarks", s.practicalMarks, !m.uploaded || (m.practicalMarks ?? 0) < s.practicalPassMarks)
                      : dash}
                  </TableCell>
                )}
                {exam.hasAssignmentMarks && (
                  <TableCell className="text-center">
                    {exam.assignmentMarks ? input(s, "assignmentMarks", exam.assignmentMarks, !m.uploaded) : dash}
                  </TableCell>
                )}
                {exam.hasAttendanceMarks && (
                  <TableCell className="text-center">
                    {exam.attendanceMarks ? input(s, "attendanceMarks", exam.attendanceMarks, !m.uploaded) : dash}
                  </TableCell>
                )}
                <TableCell
                  className={cn(
                    "text-center font-semibold",
                    (!m.uploaded || m.totalMarks < s.totalPassMarks) && "text-destructive"
                  )}
                  title={`Out of ${s.totalMarks}, pass ${s.totalPassMarks}`}
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
