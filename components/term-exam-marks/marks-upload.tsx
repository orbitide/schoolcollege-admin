"use client"

import * as React from "react"
import readXlsxFile from "read-excel-file/browser"
import writeExcelFile from "write-excel-file/browser"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  DownloadIcon,
  TriangleAlertIcon,
  UploadIcon,
} from "lucide-react"
import { toast } from "sonner"

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
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
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
import { useStudents } from "@/lib/students"
import {
  examStudents,
  markParts,
  saveTermExamMarks,
  takesSubject,
  type MarkUpload,
} from "@/lib/term-exam-marks"
import { classYearExamSubjects, useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

type Row = unknown[]
type Workbook = { fileName: string; sheets: { name: string; rows: Row[] }[] }

// Radix Select can't use "" as a value.
const NONE = "__none"
const MAX_ROWS_SHOWN = 300

// The sheet columns an upload can map (legacy _marksUploadSelectedData).
const columnFields = [
  { key: "roll", label: "Roll", required: true, headers: ["roll", "classroll", "studentroll"] },
  { key: "subjectCode", label: "Subject code", required: true, headers: ["subjectcode", "subject", "code"] },
  { key: "theoryMarks", label: "Theory marks", part: "theoryMarks", headers: ["theory", "theorymarks"] },
  { key: "cqMarks", label: "CQ marks", part: "cqMarks", headers: ["cq", "cqmarks", "written"] },
  { key: "practicalMarks", label: "Practical marks", part: "practicalMarks", headers: ["practical", "practicalmarks"] },
  { key: "examinerCode", label: "Examiner code", headers: ["examiner", "examinercode", "teachercode"] },
  { key: "mcqMarks", label: "MCQ marks", part: "mcqMarks", headers: ["mcq", "mcqmarks"] },
  { key: "setCode", label: "Set code", mcq: true, headers: ["set", "setcode"] },
  { key: "mcqCorrectAnswer", label: "MCQ correct answered", mcq: true, headers: ["correct", "mcqcorrect", "mcqcorrectanswer", "mcqcorrectanswered"] },
  { key: "mcqWrongAnswer", label: "MCQ wrong answered", mcq: true, headers: ["wrong", "mcqwrong", "mcqwronganswer", "mcqwronganswered"] },
  { key: "mcqNotAnswer", label: "MCQ not answered", mcq: true, headers: ["notanswered", "mcqnotanswer", "mcqnotanswered"] },
  { key: "mcqAnswer", label: "MCQ answer", mcq: true, headers: ["answer", "mcqanswer", "answers"] },
  { key: "attendanceMarks", label: "Attendance marks", exam: "hasAttendanceMarks", headers: ["attendance", "attendancemarks"] },
  { key: "assignmentMarks", label: "Assignment marks", exam: "hasAssignmentMarks", headers: ["assignment", "assignmentmarks"] },
] as const

type ColumnKey = (typeof columnFields)[number]["key"]
type Columns = Partial<Record<ColumnKey, string>>

// Legacy "Upload Term Exam Marks" (TermExamStudentMarks/MarksUpload): read a
// sheet of marks for one term exam, map its columns, check every row, then
// save the good ones and report the rest.
export function MarksUpload() {
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const students = useStudents()
  const name = useStudentLookups()

  const [instituteId, setInstituteId] = React.useState(
    institutes.length === 1 ? String(institutes[0].id) : ""
  )
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const subjects = subjectStore.useList(iid)

  const [filter, setFilter] = React.useState({
    medium: "",
    class: "",
    year: "",
    group: "",
    branch: "",
    version: "",
    shift: "",
  })
  const [examId, setExamId] = React.useState("")
  const [subjectId, setSubjectId] = React.useState("")
  const [workbook, setWorkbook] = React.useState<Workbook | null>(null)
  const [fileKey, setFileKey] = React.useState(0)
  const [sheetIndex, setSheetIndex] = React.useState(0)
  const [reading, setReading] = React.useState(false)
  const [columns, setColumns] = React.useState<Columns>({})
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  const [lastUpload, setLastUpload] = React.useState<{ saved: number; problems: CheckedRow[]; exam: TermExam } | null>(null)

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

  const sheet = workbook?.sheets[sheetIndex]
  const headers = (sheet?.rows[0] ?? []).map((cell) => text(cell))
  const shownFields = columnFields.filter((f) => {
    if (!exam) return false
    if ("part" in f) return exam.subjects.some((s) => markParts.find((p) => p.key === f.part)!.full(s) > 0)
    if ("mcq" in f) return exam.subjects.some((s) => s.mcqMarks > 0)
    if ("exam" in f) return exam[f.exam]
    return true
  })

  const checked = React.useMemo(
    () =>
      sheet && exam && columns.roll && columns.subjectCode
        ? checkMarksSheet(sheet.rows, columns, {
            exam,
            subjectId: subjectId ? Number(subjectId) : null,
            subjects,
            students: examStudents(exam, students),
          })
        : [],
    [sheet, exam, columns, subjectId, subjects, students]
  )
  const counts = {
    error: checked.filter((r) => r.status === "error").length,
    warning: checked.filter((r) => r.status === "warning").length,
  }
  const ready = checked.length - counts.error

  function setStructure(updates: Partial<typeof filter>) {
    setFilter((current) => ({ ...current, ...updates }))
    setExamId("")
    setSubjectId("")
  }

  function selectSheet(book: Workbook, index: number) {
    setSheetIndex(index)
    setColumns(autoMap((book.sheets[index]?.rows[0] ?? []).map((c) => text(c))))
  }

  async function readFile(file: File) {
    setReading(true)
    setErrors((current) => ({ ...current, file: undefined }))
    setLastUpload(null)
    try {
      if (!/\.xlsx$/i.test(file.name)) throw new Error("Choose an Excel (.xlsx) file.")
      const sheets = await readXlsxFile(file)
      const book: Workbook = {
        fileName: file.name,
        sheets: sheets.map(({ sheet: sheetName, data }) => ({
          name: sheetName,
          rows: (data as Row[]).filter((row) => row.some((cell) => text(cell) !== "")),
        })),
      }
      if (!book.sheets.length) throw new Error("The file has no sheets.")
      setWorkbook(book)
      selectSheet(book, 0)
    } catch (error) {
      setWorkbook(null)
      setErrors((current) => ({
        ...current,
        file: error instanceof Error ? error.message : "The file could not be read.",
      }))
    } finally {
      setReading(false)
    }
  }

  function upload() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!exam) next.exam = "Select a term exam."
    if (!workbook) next.file = "Choose an Excel file."
    else if (!columns.roll) next.roll = "Select the roll column."
    else if (!columns.subjectCode) next.subjectCode = "Select the subject code column."
    setErrors(next)
    if (Object.keys(next).length) return toast.error("Check the highlighted fields.")
    if (!ready) return toast.error("No valid marks found.")

    const saved = saveTermExamMarks(
      checked.flatMap((r) => (r.upload ? [r.upload] : [])),
      user.name
    )
    const problems = checked.filter((r) => r.status !== "ok")
    toast.success(`Total ${saved} marks uploaded successfully`, {
      description: problems.length
        ? `${counts.error} rows skipped, ${counts.warning} saved with warnings.`
        : "Generate the merit list again to update results.",
    })
    setLastUpload({ saved, problems, exam: exam! })
    setWorkbook(null)
    setFileKey((k) => k + 1)
  }

  const headerOptions = headers.map((header, index) => ({
    value: String(index),
    label: header || `Column ${index + 1}`,
  }))

  return (
    <form
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        upload()
      }}
    >
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Upload Term Exam Marks</CardTitle>
          <CardDescription>
            One row per student and subject. Parts you don&apos;t map keep the marks already
            saved, so you can upload CQ and MCQ from separate sheets.
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
              setSubjectId("")
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
            value={subjectId}
            onChange={setSubjectId}
            options={(exam?.subjects ?? []).map((s) => ({
              value: String(s.subjectId),
              label: name("subject", s.subjectId),
            }))}
            allLabel="All subjects"
            disabled={!exam}
          />
          <Field data-invalid={!!errors.file} className="sm:col-span-2">
            <FieldLabel htmlFor="marks-file">
              Excel file
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              key={fileKey}
              id="marks-file"
              type="file"
              accept=".xlsx"
              disabled={!exam || reading}
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) readFile(file)
              }}
            />
            <FieldDescription>
              {!exam ? "Select a term exam first" : reading ? "Reading…" : workbook ? workbook.fileName : ".xlsx only"}
            </FieldDescription>
            <FieldError>{errors.file}</FieldError>
          </Field>
          {workbook && (
            <FilterField
              label="Sheet"
              required
              value={String(sheetIndex)}
              onChange={(v) => selectSheet(workbook, Number(v))}
              options={workbook.sheets.map((s, i) => ({ value: String(i), label: `${s.name} (${Math.max(0, s.rows.length - 1)} rows)` }))}
            />
          )}
        </CardContent>
      </Card>

      {lastUpload && <UploadResult result={lastUpload} onClose={() => setLastUpload(null)} />}

      {sheet && exam && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Map columns</CardTitle>
            <CardDescription>
              Which sheet column holds each value. Columns were guessed from their headers; leave
              a part as “Not in sheet” to keep its saved marks.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {shownFields.map((f) => (
                <ColumnField
                  key={f.key}
                  label={f.label}
                  required={"required" in f}
                  value={columns[f.key] ?? ""}
                  onChange={(v) => setColumns({ ...columns, [f.key]: v })}
                  options={headerOptions}
                  error={errors[f.key]}
                />
              ))}
            </div>

            {columns.roll && columns.subjectCode && (
              <CheckedRows rows={checked} counts={counts} />
            )}
          </CardContent>
          <CardFooter className="justify-end gap-2 border-t">
            <span className="mr-auto text-sm text-muted-foreground">
              {checked.length
                ? `${ready} of ${checked.length} rows will be saved`
                : "Map the roll and subject code columns to check the sheet."}
            </span>
            <Button type="submit" disabled={!ready}>
              <UploadIcon data-icon="inline-start" />
              Upload marks
            </Button>
          </CardFooter>
        </Card>
      )}
    </form>
  )
}

function CheckedRows({
  rows,
  counts,
}: {
  rows: CheckedRow[]
  counts: { error: number; warning: number }
}) {
  const name = useStudentLookups()
  const [show, setShow] = React.useState<"all" | "problems">("all")
  const visible = (show === "problems" ? rows.filter((r) => r.status !== "ok") : rows).slice(0, MAX_ROWS_SHOWN)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium">{rows.length} rows</span>
        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
          <CircleCheckIcon className="size-4" />
          {rows.length - counts.error - counts.warning} ready
        </span>
        {counts.warning > 0 && (
          <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
            <TriangleAlertIcon className="size-4" />
            {counts.warning} saved with warnings
          </span>
        )}
        {counts.error > 0 && (
          <span className="flex items-center gap-1 text-destructive">
            <CircleAlertIcon className="size-4" />
            {counts.error} will be skipped
          </span>
        )}
        {(counts.error > 0 || counts.warning > 0) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => setShow(show === "all" ? "problems" : "all")}
          >
            {show === "all" ? "Show problems only" : "Show all rows"}
          </Button>
        )}
      </div>
      <div className="max-h-[28rem] overflow-auto rounded-lg border">
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-muted">
            <TableRow>
              <TableHead className="w-14">Row</TableHead>
              <TableHead>Roll</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead className="text-right">Theory</TableHead>
              <TableHead className="text-right">CQ</TableHead>
              <TableHead className="text-right">MCQ</TableHead>
              <TableHead className="text-right">Practical</TableHead>
              <TableHead>Check</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((r) => (
              <TableRow
                key={r.row}
                className={cn(
                  r.status === "error" && "bg-destructive/5",
                  r.status === "warning" && "bg-amber-500/5"
                )}
              >
                <TableCell className="tabular-nums text-muted-foreground">{r.row}</TableCell>
                <TableCell className="tabular-nums">{r.roll || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">{r.studentName || "—"}</TableCell>
                <TableCell className="whitespace-nowrap">
                  {r.subjectId ? name("subject", r.subjectId) : r.subjectCode || "—"}
                </TableCell>
                {(["theoryMarks", "cqMarks", "mcqMarks", "practicalMarks"] as const).map((key) => (
                  <TableCell key={key} className="text-right tabular-nums">
                    {r.upload?.[key] ?? <span className="text-muted-foreground/60">—</span>}
                  </TableCell>
                ))}
                <TableCell className="text-xs">
                  {r.status === "ok" ? (
                    <span className="text-emerald-700 dark:text-emerald-400">OK</span>
                  ) : (
                    <span className={r.status === "error" ? "text-destructive" : "text-amber-700 dark:text-amber-400"}>
                      {r.messages.join("; ")}
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {rows.length > MAX_ROWS_SHOWN && (
        <p className="text-xs text-muted-foreground">Showing the first {MAX_ROWS_SHOWN} rows.</p>
      )}
    </div>
  )
}

function UploadResult({
  result,
  onClose,
}: {
  result: { saved: number; problems: CheckedRow[]; exam: TermExam }
  onClose: () => void
}) {
  const skipped = result.problems.filter((r) => r.status === "error").length
  return (
    <Card className="border-emerald-500/40 bg-emerald-500/5">
      <CardContent className="flex flex-wrap items-center gap-3">
        <CircleCheckIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
        <div className="flex flex-col">
          <span className="font-medium">
            Total {result.saved} marks uploaded for {result.exam.fullName}
          </span>
          <span className="text-sm text-muted-foreground">
            {result.problems.length
              ? `${skipped} rows skipped and ${result.problems.length - skipped} saved with warnings.`
              : "Every row was saved."}{" "}
            Generate the merit list again to update results.
          </span>
        </div>
        <div className="ml-auto flex gap-2">
          {result.problems.length > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => downloadProblems(result.problems, result.exam)}>
              <DownloadIcon data-icon="inline-start" />
              Problem rows
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Dismiss
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ColumnField({
  label,
  required,
  value,
  onChange,
  options,
  error,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  error?: string
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Select value={value || NONE} onValueChange={(v) => onChange(v === NONE ? "" : v)}>
        <SelectTrigger id={id} className="w-full" aria-invalid={!!error}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>{required ? "Select column" : "Not in sheet"}</SelectItem>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// The legacy error file: each problem row with what was wrong.
async function downloadProblems(rows: CheckedRow[], exam: TermExam) {
  const bold = (value: string) => ({ value, fontWeight: "bold" as const })
  const data = [
    [bold(`Marks upload problems · ${exam.fullName}`)],
    [],
    ["Row", "Roll", "Subject code", "Result", "Problem"].map(bold),
    ...rows.map((r) => [
      r.row,
      r.roll || null,
      r.subjectCode || null,
      r.status === "error" ? "Skipped" : "Saved",
      r.messages.join("; "),
    ]),
  ]
  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")
  await writeExcelFile(data, {
    columns: [{ width: 8 }, { width: 12 }, { width: 14 }, { width: 10 }, { width: 60 }],
  }).toFile(`Marks_Upload_Problems_${stamp}.xlsx`)
}

// ---- Checking ----

const text = (cell: unknown) => (cell == null ? "" : String(cell).trim())
const header = (value: string) => value.toLowerCase().replace(/[\s_\-.]+/g, "")

function autoMap(headers: string[]): Columns {
  const used = new Set<number>()
  const columns: Columns = {}
  for (const f of columnFields) {
    const index = headers.findIndex((h, i) => !used.has(i) && (f.headers as readonly string[]).includes(header(h)))
    if (index >= 0) {
      used.add(index)
      columns[f.key] = String(index)
    }
  }
  return columns
}

type CheckedRow = {
  row: number
  roll: string
  subjectCode: string
  subjectId?: number
  studentName?: string
  status: "ok" | "warning" | "error"
  messages: string[]
  upload?: MarkUpload
}

// Legacy isValidAnswerString: only A–D and commas, at most four letters an
// answer; E too, for five-option sheets (Admission Test).
const validAnswer = (answer: string) => /^[,A-E]*$/.test(answer) && answer.split(",").every((a) => a.length <= 5)

// Legacy MarksUpload (POST), with every row checked up front. Problems that
// stop a row (legacy errorRowList "false") skip it; the others are saved
// and reported.
export function checkMarksSheet(
  rows: Row[],
  columns: Columns,
  ctx: {
    exam: TermExam
    subjectId: number | null
    subjects: { id: number; code: string }[]
    students: ReturnType<typeof examStudents>
  }
): CheckedRow[] {
  const { exam } = ctx
  const headers = (rows[0] ?? []).map((c) => text(c))
  const label = (key: ColumnKey) => headers[Number(columns[key])] || columnFields.find((f) => f.key === key)!.label
  const cell = (cells: Row, key: ColumnKey) => (columns[key] ? text(cells[Number(columns[key])]) : undefined)
  const byRoll = new Map(ctx.students.map((s) => [s.enrolment.classRoll.trim(), s]))
  const perQuestion = new Map(
    classYearExamSubjects(exam.instituteId, exam.classId, exam.yearId, exam.medium, exam.groupId).map((s) => [
      s.subject.subjectId,
      s.perMcq || 1,
    ])
  )
  const firstRowOf = new Map<string, CheckedRow>()

  return rows.slice(1).map((cells, index): CheckedRow => {
    const result: CheckedRow = {
      row: index + 2,
      roll: cell(cells, "roll") ?? "",
      subjectCode: cell(cells, "subjectCode") ?? "",
      status: "ok",
      messages: [],
    }
    const stop = (message: string) => ({ ...result, status: "error" as const, messages: [...result.messages, message] })
    const warn = (message: string) => {
      result.messages.push(message)
      if (result.status === "ok") result.status = "warning"
    }

    // Subject
    const subject = ctx.subjects.find((s) => s.code.toLowerCase() === result.subjectCode.toLowerCase())
    const examSubject = subject && exam.subjects.find((s) => s.subjectId === subject.id)
    if (!examSubject || (ctx.subjectId != null && examSubject.subjectId !== ctx.subjectId))
      return stop("Subject Code Error")
    result.subjectId = examSubject.subjectId

    // Roll
    if (!/^\d+$/.test(result.roll) || Number(result.roll) <= 0) return stop("No Roll")
    const found = byRoll.get(result.roll)
    if (!found) return stop("Invalid Roll")
    result.studentName = found.student.name
    if (!takesSubject(found.enrolment, examSubject.subjectId)) return stop("Student didn't taken this subject")

    const upload: MarkUpload = {
      termExamId: exam.id,
      studentId: found.student.id,
      subjectId: examSubject.subjectId,
      roll: result.roll,
      isOptional: found.enrolment.optionalSubjectId === examSubject.subjectId,
    }

    // Examiner code (there are no teacher records to check it against yet).
    const examiner = cell(cells, "examinerCode")
    if (examiner !== undefined) {
      if (!examiner) warn(`No ${label("examinerCode")}`)
      upload.examinerCode = examiner
    }

    // A number cell: blank keeps the saved value; otherwise 0…max.
    const number = (key: ColumnKey, max?: number) => {
      const raw = cell(cells, key)
      if (raw === undefined || raw === "") return { value: undefined }
      const value = Number(raw)
      if (!Number.isFinite(value) || value < 0) return { error: `Invalid ${label(key)}` }
      if (max != null && value > max) return { error: `${label(key)} ${value} is more than ${max}` }
      return { value }
    }

    for (const part of markParts) {
      const full = part.full(examSubject)
      if (!full || part.key === "mcqMarks") continue
      const r = number(part.key, full)
      if (r.error) return stop(r.error)
      upload[part.key] = r.value
    }

    if (examSubject.mcqMarks > 0) {
      let acceptable = Math.floor(examSubject.mcqMarks / (perQuestion.get(examSubject.subjectId) ?? 1))
      let total = 0
      let answered = 0
      let hasAnswer = false
      // A blank answer keeps the saved one, like any blank cell (the legacy
      // rejected the whole row).
      const answer = (cell(cells, "mcqAnswer") ?? "").replace(/\s/g, "").toUpperCase()
      if (answer) {
        if (!validAnswer(answer)) return stop(`Invalid ${label("mcqAnswer")} pattern`)
        const parts = answer.split(",")
        acceptable = Math.min(acceptable, parts.length)
        const accepted = parts.slice(0, acceptable)
        total = acceptable
        answered = accepted.filter(Boolean).length
        upload.mcqAnswer = accepted.join(",")
        hasAnswer = true
      }

      const mcq = number("mcqMarks", examSubject.mcqMarks)
      if (mcq.error) return stop(mcq.error)
      if (mcq.value !== undefined) {
        if (hasAnswer && mcq.value > answered) return stop(`${label("mcqMarks")} count greater than ${label("mcqAnswer")} count`)
        upload.mcqMarks = mcq.value
      }

      const setCode = cell(cells, "setCode")
      if (setCode !== undefined) {
        if (!setCode) warn(`empty ${label("setCode")}`)
        upload.setCode = setCode
      }

      const correct = number("mcqCorrectAnswer")
      if (correct.error) return stop(correct.error)
      if (correct.value !== undefined) {
        if (hasAnswer && correct.value > answered) return stop(`${label("mcqCorrectAnswer")} count greater than ${label("mcqAnswer")} count`)
        if (mcq.value === undefined) return stop(`Map MCQ marks before uploading ${label("mcqCorrectAnswer")}`)
        if (correct.value > mcq.value) return stop(`${label("mcqCorrectAnswer")} is greater than ${label("mcqMarks")}`)
        upload.mcqCorrectAnswer = correct.value
      }

      const wrong = number("mcqWrongAnswer")
      if (wrong.error) return stop(wrong.error)
      if (wrong.value !== undefined) {
        if (hasAnswer && wrong.value > answered) return stop(`${label("mcqWrongAnswer")} count greater than ${label("mcqAnswer")}`)
        if (mcq.value !== undefined && wrong.value > mcq.value) return stop(`${label("mcqWrongAnswer")} is greater than ${label("mcqMarks")}`)
        upload.mcqWrongAnswer = wrong.value
      }

      const notAnswered = number("mcqNotAnswer")
      if (notAnswered.error) return stop(notAnswered.error)
      if (notAnswered.value !== undefined) {
        if (hasAnswer && notAnswered.value !== total - answered)
          return stop(`${label("mcqNotAnswer")} count doesn't match ${label("mcqAnswer")}`)
        upload.mcqNotAnswer = notAnswered.value
      }
    }

    if (exam.hasAttendanceMarks) {
      const r = number("attendanceMarks", exam.attendanceMarks)
      if (r.error) return stop(r.error)
      upload.attendanceMarks = r.value
    }
    if (exam.hasAssignmentMarks) {
      const r = number("assignmentMarks", exam.assignmentMarks)
      if (r.error) return stop(r.error)
      upload.assignmentMarks = r.value
    }

    // Duplicate roll + subject: both rows are skipped, as in the legacy.
    const key = `${result.roll}:${examSubject.subjectId}`
    const first = firstRowOf.get(key)
    if (first) {
      if (first.status !== "error") {
        first.status = "error"
        first.messages = ["Duplicate Roll"]
        first.upload = undefined
      }
      return stop("Duplicate Roll")
    }
    result.upload = upload
    firstRowOf.set(key, result)
    return result
  })
}

