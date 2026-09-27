"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import readXlsxFile from "read-excel-file/browser"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  FileSpreadsheetIcon,
  KeyboardIcon,
  WandSparklesIcon,
} from "lucide-react"
import { toast } from "sonner"

import { useStudentLookups } from "@/components/students/student-lookups"
import { correctAnswersHref } from "@/components/term-exams/correct-answer-list"
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { classStore, subjectStore } from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"
import {
  answerTypes,
  buildAnswer,
  findAnswerKey,
  mcqSubjects,
  parseAnswer,
  saveAnswerKeys,
  splitAnswerText,
  updateAnswerKey,
  useTermExamAnswers,
  type AnswerCell,
  type AnswerType,
  type TermExamAnswer,
  type TermExamAnswerInput,
} from "@/lib/term-exam-answers"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

type Mode = "field" | "file"
type Row = unknown[]
type Workbook = { fileName: string; sheets: { name: string; rows: Row[] }[] }

// Radix Select can't use "" as a value.
const NONE = "__none"

// Legacy TermExamSubjectCorrectAnswer/CreateEdit: add the answer key of a
// term exam subject and set by hand, or many at once from an Excel sheet.
// Editing always works on one key by hand.
export function CorrectAnswerForm({
  answerId,
  instituteId,
  classId,
  examId,
  returnTo,
}: {
  answerId?: number
  instituteId?: number
  classId?: number
  examId?: number
  returnTo?: string
}) {
  const answers = useTermExamAnswers()
  const exams = useTermExams()
  const institutes = useAccessibleInstitutes()
  const listHref = returnTo?.startsWith("/") ? returnTo : correctAnswersHref
  const existing = answerId ? answers.find((a) => a.id === answerId) : undefined
  const existingExam = existing && exams.find((e) => e.id === existing.termExamId)

  if (answerId && (!existing || !existingExam)) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Correct answer not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to correct answers</Link>
        </Button>
      </div>
    )
  }

  const presetExam = existingExam ?? exams.find((e) => e.id === examId)
  const initialInstitute =
    institutes.find((i) => i.id === (presetExam?.instituteId ?? instituteId)) ??
    (institutes.length === 1 ? institutes[0] : undefined)

  return (
    <AnswerForm
      key={answerId ?? "new"}
      existing={existing}
      institutes={institutes}
      initialInstitute={initialInstitute}
      initialClassId={presetExam?.classId ?? classId}
      initialExam={presetExam}
      listHref={listHref}
    />
  )
}

function AnswerForm({
  existing,
  institutes,
  initialInstitute,
  initialClassId,
  initialExam,
  listHref,
}: {
  existing?: TermExamAnswer
  institutes: Institute[]
  initialInstitute?: Institute
  initialClassId?: number
  initialExam?: TermExam
  listHref: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const exams = useTermExams()
  const name = useStudentLookups()
  const isNew = !existing

  const str = (value: number | null | undefined) => (value == null ? "" : String(value))
  const [instituteId, setInstituteId] = React.useState(str(initialInstitute?.id))
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const subjects = subjectStore.useList(iid)
  const [classId, setClassId] = React.useState(str(initialClassId))
  const [examId, setExamId] = React.useState(str(initialExam?.id))
  const [mode, setMode] = React.useState<Mode>("field")
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})

  const classExams = exams.filter(
    (e) =>
      (e.status !== "Deleted" || e.id === existing?.termExamId) &&
      e.instituteId === iid &&
      String(e.classId) === classId
  )
  const exam = classExams.find((e) => String(e.id) === examId)
  const examSubjects = mcqSubjects(exam)

  // By hand.
  const [subjectId, setSubjectId] = React.useState(str(existing?.subjectId))
  const [setCode, setSetCode] = React.useState(existing?.setCode ?? "")
  const questions = examSubjects.find((s) => String(s.subjectId) === subjectId)?.questions ?? 0
  const [cells, setCells] = React.useState<AnswerCell[]>(() =>
    existing ? parseAnswer(existing.answer, questions) : []
  )
  // Keep one cell per question when the subject (or its question count) changes.
  const shownCells =
    cells.length === questions
      ? cells
      : Array.from({ length: questions }, (_, i) => cells[i] ?? { type: "option" as const, value: "" })

  // From file.
  const [workbook, setWorkbook] = React.useState<Workbook | null>(null)
  const [sheetIndex, setSheetIndex] = React.useState(0)
  const [reading, setReading] = React.useState(false)
  const [columns, setColumns] = React.useState({ subject: "", set: "", answer: "" })
  const sheet = workbook?.sheets[sheetIndex]
  const headers = (sheet?.rows[0] ?? []).map((cell) => text(cell))

  const fileRows = React.useMemo(
    () =>
      sheet && exam
        ? checkSheet(sheet.rows, columns, exam, subjects)
        : [],
    [sheet, columns, exam, subjects]
  )
  const fileErrors = fileRows.filter((row) => row.error).length

  function resetBelow(level: "institute" | "class" | "exam") {
    if (level === "institute") setClassId("")
    if (level !== "exam") setExamId("")
    setSubjectId("")
    setCells([])
    setErrors({})
  }

  function selectSheet(book: Workbook, index: number) {
    setSheetIndex(index)
    setColumns(autoMap((book.sheets[index]?.rows[0] ?? []).map((c) => text(c))))
  }

  async function readFile(file: File) {
    setReading(true)
    setErrors((current) => ({ ...current, file: undefined }))
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

  function setCell(index: number, cell: AnswerCell) {
    setCells(shownCells.map((c, i) => (i === index ? cell : c)))
  }

  function quickFill(value: string) {
    const parts = splitAnswerText(value)
    if (!parts.length) return
    setCells(
      shownCells.map((cell, i) => {
        const part = parts[i]
        if (part == null) return cell
        const special = answerTypes.find((t) => t.code && t.code === part)
        return special ? { type: special.value, value: part } : { type: "option", value: part }
      })
    )
    toast.success(`Filled ${Math.min(parts.length, questions)} of ${questions} answers`)
  }

  function save() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!classId) next.class = "Select a class."
    if (!exam) next.exam = "Select a term exam."

    if (mode === "file") {
      if (!workbook) next.file = "Choose an Excel file."
      else if (!columns.subject) next.subjectColumn = "Select the subject code column."
      else if (!columns.set) next.setColumn = "Select the set code column."
      setErrors(next)
      if (Object.keys(next).length) return toast.error("Check the highlighted fields.")
      if (!fileRows.length) return toast.error("The sheet has no answer rows.")
      if (fileErrors) return toast.error(`Fix the ${fileErrors} row${fileErrors === 1 ? "" : "s"} with problems first.`)
      const { added, updated } = saveAnswerKeys(
        fileRows.map((row) => ({
          termExamId: exam!.id,
          subjectId: row.subjectId!,
          setCode: row.setCode,
          answer: row.answer,
        })),
        user.name
      )
      toast.success(`Correct answers uploaded: ${added} added, ${updated} updated`)
      router.push(listHref)
      return
    }

    if (!subjectId) next.subject = "Select a subject."
    if (!setCode.trim()) next.setCode = "Enter the set code."
    const missing = shownCells
      .map((cell, i) => (cell.type === "option" && !cell.value.trim() ? i + 1 : 0))
      .filter(Boolean)
    if (subjectId && missing.length)
      next.answers = `Enter the answer for question${missing.length === 1 ? "" : "s"} ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? "…" : ""}.`
    const input: TermExamAnswerInput = {
      termExamId: exam?.id ?? 0,
      subjectId: Number(subjectId),
      setCode: setCode.trim(),
      answer: buildAnswer(shownCells),
    }
    if (!isNew && !next.setCode && findAnswerKey(input, existing.id))
      next.setCode = "This exam subject already has a correct answer for this set."
    setErrors(next)
    if (Object.keys(next).length) return toast.error("Check the highlighted fields.")

    if (isNew) {
      const { updated } = saveAnswerKeys([input], user.name)
      toast.success(updated ? "Correct answer replaced" : "Correct answer added")
    } else {
      updateAnswerKey(existing.id, input, user.name)
      toast.success("Correct answer updated")
    }
    router.push(listHref)
  }

  const replacing =
    isNew && mode === "field" && exam && subjectId && setCode.trim()
      ? findAnswerKey({ termExamId: exam.id, subjectId: Number(subjectId), setCode, answer: "" })
      : undefined
  const filled = shownCells.filter((c) => c.type !== "option" || c.value.trim()).length
  const headerOptions = headers
    .map((header, index) => ({ value: String(index), label: header || `Column ${index + 1}` }))

  return (
    <form
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        save()
      }}
    >
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">
              {isNew ? "Add Term Exam Subject Correct Answer" : "Edit Term Exam Subject Correct Answer"}
            </CardTitle>
            <CardDescription>
              The MCQ answer key of an exam subject for one question set.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={listHref}>Manage correct answers</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={instituteId}
              onChange={(v) => {
                setInstituteId(v)
                resetBelow("institute")
              }}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
              error={errors.institute}
              disabled={!isNew}
            />
          )}
          <FilterField
            label="Class"
            required
            value={classId}
            onChange={(v) => {
              setClassId(v)
              resetBelow("class")
            }}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={institute ? "Select class" : "Select an institute first"}
            error={errors.class}
            disabled={!institute || !isNew}
          />
          <FilterField
            label="Term exam"
            required
            value={examId}
            onChange={(v) => {
              setExamId(v)
              resetBelow("exam")
            }}
            options={classExams.map((e) => ({ value: String(e.id), label: e.fullName }))}
            placeholder={classId ? "Select term exam" : "Select a class first"}
            error={errors.exam}
            disabled={!classId || !isNew}
          />
          {isNew && (
            <Field>
              <FieldLabel>Upload type</FieldLabel>
              <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)}>
                <TabsList className="w-full">
                  <TabsTrigger value="field">
                    <KeyboardIcon />
                    From field
                  </TabsTrigger>
                  <TabsTrigger value="file">
                    <FileSpreadsheetIcon />
                    From file
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </Field>
          )}
          {exam && examSubjects.length === 0 && (
            <p className="col-span-full flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
              <CircleAlertIcon className="size-4 shrink-0" />
              This exam has no MCQ subjects, so it needs no correct answers.
            </p>
          )}
        </CardContent>
      </Card>

      {mode === "field" ? (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Answers</CardTitle>
            <CardDescription>
              One entry per MCQ question. Use a special type to give or take the marks for a
              question whatever the student answered.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FilterField
                label="Subject"
                required
                value={subjectId}
                onChange={(v) => {
                  setSubjectId(v)
                  setCells([])
                }}
                options={examSubjects.map((s) => ({
                  value: String(s.subjectId),
                  label: `${name("subject", s.subjectId)} (${s.questions} questions)`,
                }))}
                placeholder={exam ? "Select subject" : "Select a term exam first"}
                error={errors.subject}
                disabled={!exam}
              />
              <Field data-invalid={!!errors.setCode}>
                <FieldLabel htmlFor="set-code">
                  Set code
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="set-code"
                  value={setCode}
                  onChange={(event) => setSetCode(event.target.value)}
                  placeholder="e.g. A"
                  aria-invalid={!!errors.setCode}
                />
                <FieldError>{errors.setCode}</FieldError>
              </Field>
              {questions > 0 && <QuickFill onFill={quickFill} />}
            </div>

            {replacing && (
              <p className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
                <CircleAlertIcon className="size-4 shrink-0" />
                Set {replacing.setCode} of this subject already has a correct answer. Saving
                replaces it.
              </p>
            )}

            {questions > 0 ? (
              <>
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-muted-foreground">
                    Type an answer and the cursor moves to the next question.
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium tabular-nums",
                      filled === questions
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {filled}/{questions} filled
                  </span>
                </div>
                <AnswerGrid cells={shownCells} onChange={setCell} />
                {errors.answers && <p className="text-sm text-destructive">{errors.answers}</p>}
              </>
            ) : (
              <p className="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">
                Select a term exam and subject to enter its answers.
              </p>
            )}
          </CardContent>
          <FormFooter listHref={listHref} label={isNew ? "Save correct answer" : "Update correct answer"} />
        </Card>
      ) : (
        <Card>
          <CardHeader className="border-b">
            <CardTitle>Excel file</CardTitle>
            <CardDescription>
              One row per subject and set. Put the answers in one column (e.g. “A,B,C,D” or
              “ABCD”), or in columns headed 1, 2, 3… one per question.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field data-invalid={!!errors.file} className="sm:col-span-2">
                <FieldLabel htmlFor="answer-file">
                  Excel file
                  <span className="text-destructive" aria-hidden>
                    *
                  </span>
                </FieldLabel>
                <Input
                  id="answer-file"
                  type="file"
                  accept=".xlsx"
                  disabled={reading}
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) readFile(file)
                  }}
                />
                <FieldDescription>
                  {reading ? "Reading…" : workbook ? workbook.fileName : ".xlsx only"}
                </FieldDescription>
                <FieldError>{errors.file}</FieldError>
              </Field>
              {workbook && (
                <FilterField
                  label="Sheet"
                  required
                  value={String(sheetIndex)}
                  onChange={(v) => selectSheet(workbook, Number(v))}
                  options={workbook.sheets.map((s, i) => ({ value: String(i), label: s.name }))}
                />
              )}
            </div>

            {sheet && (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <ColumnField
                  label="Subject code column"
                  required
                  value={columns.subject}
                  onChange={(v) => setColumns({ ...columns, subject: v })}
                  options={headerOptions}
                  error={errors.subjectColumn}
                />
                <ColumnField
                  label="Set code column"
                  required
                  value={columns.set}
                  onChange={(v) => setColumns({ ...columns, set: v })}
                  options={headerOptions}
                  error={errors.setColumn}
                />
                <ColumnField
                  label="Correct answer column"
                  value={columns.answer}
                  onChange={(v) => setColumns({ ...columns, answer: v })}
                  options={headerOptions}
                  noneLabel="Question columns (1, 2, 3…)"
                />
              </div>
            )}

            {sheet && exam && columns.subject && columns.set && (
              <div className="flex flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-medium">{fileRows.length} rows</span>
                  {fileErrors ? (
                    <span className="flex items-center gap-1 text-destructive">
                      <CircleAlertIcon className="size-4" />
                      {fileErrors} with problems
                    </span>
                  ) : fileRows.length ? (
                    <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                      <CircleCheckIcon className="size-4" />
                      All rows ready
                    </span>
                  ) : null}
                </div>
                <div className="max-h-96 overflow-auto rounded-lg border">
                  <Table>
                    <TableHeader className="sticky top-0 bg-muted">
                      <TableRow>
                        <TableHead className="w-14">Row</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Set</TableHead>
                        <TableHead>Answers</TableHead>
                        <TableHead>Check</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fileRows.map((row) => (
                        <TableRow key={row.row} className={cn(row.error && "bg-destructive/5")}>
                          <TableCell className="tabular-nums text-muted-foreground">{row.row}</TableCell>
                          <TableCell className="whitespace-nowrap">
                            {row.subjectId ? name("subject", row.subjectId) : row.subjectCode || "—"}
                          </TableCell>
                          <TableCell className="font-mono">{row.setCode || "—"}</TableCell>
                          <TableCell className="max-w-md truncate font-mono text-xs">
                            {row.answer || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {row.error ? (
                              <span className="text-destructive">{row.error}</span>
                            ) : (
                              <span className="text-emerald-700 dark:text-emerald-400">
                                {row.exists ? "Replaces saved key" : "New"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
          <FormFooter listHref={listHref} label="Upload correct answers" />
        </Card>
      )}
    </form>
  )
}

function FormFooter({ listHref, label }: { listHref: string; label: string }) {
  return (
    <CardFooter className="justify-end gap-2 border-t">
      <Button asChild variant="outline">
        <Link href={listHref}>Back</Link>
      </Button>
      <Button type="submit">{label}</Button>
    </CardFooter>
  )
}

// Paste a whole key at once instead of typing it question by question.
function QuickFill({ onFill }: { onFill: (value: string) => void }) {
  const [value, setValue] = React.useState("")
  return (
    <Field className="sm:col-span-2">
      <FieldLabel htmlFor="quick-fill">Quick fill</FieldLabel>
      <div className="flex gap-2">
        <Input
          id="quick-fill"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault()
              onFill(value)
            }
          }}
          placeholder="ABCD… or A,B,C,D (+ − $ allowed)"
          className="font-mono"
        />
        <Button type="button" variant="secondary" onClick={() => onFill(value)}>
          <WandSparklesIcon data-icon="inline-start" />
          Fill
        </Button>
      </div>
    </Field>
  )
}

// Three columns of questions, as the legacy page lays them out.
function AnswerGrid({
  cells,
  onChange,
}: {
  cells: AnswerCell[]
  onChange: (index: number, cell: AnswerCell) => void
}) {
  const inputs = React.useRef<(HTMLInputElement | null)[]>([])
  const focusNext = (from: number) => {
    for (let i = from + 1; i < cells.length; i++) {
      const next = inputs.current[i]
      if (next && !next.disabled) {
        next.focus()
        next.select()
        return
      }
    }
  }

  return (
    <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2 xl:grid-cols-3">
      {cells.map((cell, index) => {
        const special = cell.type !== "option"
        return (
          <div
            key={index}
            className={cn(
              "flex items-center gap-2 rounded-lg border p-1.5 transition-colors",
              special
                ? "border-amber-500/40 bg-amber-500/5"
                : cell.value
                  ? "border-emerald-500/30 bg-emerald-500/5"
                  : "bg-background"
            )}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold tabular-nums">
              {index + 1}
            </span>
            <Select
              value={cell.type}
              onValueChange={(type) => {
                const t = answerTypes.find((a) => a.value === type)!
                onChange(index, { type: type as AnswerType, value: t.code })
              }}
            >
              <SelectTrigger size="sm" className="min-w-0 flex-1" aria-label={`Question ${index + 1} type`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {answerTypes.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              ref={(el) => {
                inputs.current[index] = el
              }}
              value={cell.value}
              disabled={special}
              maxLength={3}
              aria-label={`Question ${index + 1} answer`}
              onChange={(event) => {
                const value = event.target.value.toUpperCase()
                onChange(index, { type: "option", value })
                if (value.length === 1) focusNext(index)
              }}
              className="h-8 w-14 text-center font-mono font-semibold uppercase"
            />
          </div>
        )
      })}
    </div>
  )
}

function ColumnField({
  label,
  required,
  value,
  onChange,
  options,
  noneLabel,
  error,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  noneLabel?: string
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
          <SelectItem value={NONE}>{noneLabel ?? "Select column"}</SelectItem>
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

const text = (cell: unknown) => (cell == null ? "" : String(cell).trim())
const header = (value: string) => value.toLowerCase().replace(/[\s_-]+/g, "")

// Guess the columns from their headers.
function autoMap(headers: string[]) {
  const find = (...names: string[]) => {
    const index = headers.findIndex((h) => names.includes(header(h)))
    return index < 0 ? "" : String(index)
  }
  return {
    subject: find("subjectcode", "subject", "code"),
    set: find("setcode", "set"),
    answer: find("answer", "answers", "correctanswer", "key"),
  }
}

type FileRow = {
  row: number
  subjectCode: string
  subjectId?: number
  setCode: string
  answer: string
  exists: boolean
  error?: string
}

// Legacy CreateEdit (From File), with each row checked up front instead of
// stopping at the first problem.
function checkSheet(
  rows: Row[],
  columns: { subject: string; set: string; answer: string },
  exam: TermExam,
  subjects: { id: number; code: string }[]
): FileRow[] {
  if (!columns.subject || !columns.set) return []
  const headers = (rows[0] ?? []).map((c) => text(c))
  const examSubjects = mcqSubjects(exam)
  const seen = new Set<string>()

  return rows.slice(1).map((cells, index) => {
    const subjectCode = text(cells[Number(columns.subject)])
    const setCode = text(cells[Number(columns.set)])
    const result: FileRow = { row: index + 2, subjectCode, setCode, answer: "", exists: false }

    const subject = subjects.find((s) => s.code.toLowerCase() === subjectCode.toLowerCase())
    const examSubject = subject && examSubjects.find((s) => s.subjectId === subject.id)
    if (!subjectCode) return { ...result, error: "No subject code." }
    if (!subject) return { ...result, error: `Unknown subject code ${subjectCode}.` }
    result.subjectId = subject.id
    if (!examSubject) return { ...result, error: `${subjectCode} has no MCQ in this exam.` }
    if (!setCode) return { ...result, error: "No set code." }

    const parts = columns.answer
      ? splitAnswerText(text(cells[Number(columns.answer)]))
      : Array.from({ length: examSubject.questions }, (_, q) => {
          const column = headers.indexOf(String(q + 1))
          return column < 0 ? "" : text(cells[column]).toUpperCase()
        })
    result.answer = parts.join(",")
    if (!parts.some(Boolean)) return { ...result, error: "No correct answer." }
    if (parts.length !== examSubject.questions)
      return { ...result, error: `${parts.length} answers for ${examSubject.questions} questions.` }
    const blank = parts.findIndex((p) => !p)
    if (blank >= 0) return { ...result, error: `No answer for question ${blank + 1}.` }

    const key = `${subject.id}:${setCode.toLowerCase()}`
    if (seen.has(key)) return { ...result, error: "Same subject and set as an earlier row." }
    seen.add(key)
    result.exists = !!findAnswerKey({ termExamId: exam.id, subjectId: subject.id, setCode, answer: "" })
    return result
  })
}
