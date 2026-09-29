"use client"

import * as React from "react"
import Link from "next/link"
import {
  CircleAlertIcon,
  CircleCheckIcon,
  KeyRoundIcon,
  LoaderIcon,
  ScanLineIcon,
  TriangleAlertIcon,
  UploadIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { subjectStore } from "@/lib/academic-store"
import { useCurrentUser } from "@/lib/current-user"
import { checkOmrRows, type CheckedOmrRow } from "@/lib/omr-check"
import { FAINT, readOmrSheet, toGray, type OmrReading } from "@/lib/omr-scan"
import { omrLayout } from "@/lib/omr-template"
import { mcqQuestionCount, useGeneratedPapers } from "@/lib/question-papers"
import { useStudents } from "@/lib/students"
import { saveAnswerKeys, useTermExamAnswers } from "@/lib/term-exam-answers"
import { saveTermExamMarks } from "@/lib/term-exam-marks"
import { cn } from "@/lib/utils"

// Scans are read at this size (the longer side): enough for the bubbles,
// quick to process.
const WORK_SIZE = 1600
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/bmp", "image/gif"]

type ScanRow = {
  id: number
  fileName: string
  // The picture as read (a JPEG data URL at the working size).
  image: string
  width: number
  height: number
  reading?: OmrReading
  error?: string
  roll: string
  setCode: string
  answers: string
  // Flags the teacher hasn't dealt with: cleared once the row is edited.
  flagged: boolean
}

let nextRowId = 1

async function readFile(file: File, questions: number): Promise<Omit<ScanRow, "id">> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, WORK_SIZE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d", { willReadFrequently: true })
  if (!context) throw new Error("This browser can't read images.")
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()
  const image = canvas.toDataURL("image/jpeg", 0.8)
  const base = { fileName: file.name, image, width, height, roll: "", setCode: "", answers: "", flagged: false }
  try {
    const reading = readOmrSheet(toGray(context.getImageData(0, 0, width, height).data, width, height), omrLayout(questions))
    return {
      ...base,
      reading,
      roll: reading.roll,
      setCode: reading.setCode,
      answers: reading.answers.join(","),
      flagged: reading.flags.some((f) => f.reason !== "blank" || f.field === "set"),
    }
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : "The sheet couldn't be read." }
  }
}

const splitAnswers = (text: string, questions: number) => {
  const parts = text.split(",").map((a) => a.trim().toUpperCase())
  return Array.from({ length: questions }, (_, i) => parts[i] ?? "")
}

// Term Exam Marks › OMR Scan: read the exam's OMR sheets (scans or phone
// photos of the sheets OMR Sheet prints) in the browser, check and correct
// what was read, then save the MCQ answers, set codes and marks, scored
// against each set's answer key. Or read one sheet filled in as an answer
// key. Pictures stay in this tab; nothing is uploaded.
export function OmrScan() {
  const f = useExamReportFilter({ meritList: false })
  const exam = f.chosen
  const user = useCurrentUser()
  const subjects = subjectStore.useAll()
  const students = useStudents()
  const keys = useTermExamAnswers()
  const papers = useGeneratedPapers()
  const mcqSubjects = (exam?.subjects ?? []).filter((s) => s.mcqMarks > 0)
  const subjectRow = mcqSubjects.find((s) => String(s.subjectId) === f.param("subject"))
  const mode = f.param("mode") === "key" ? "key" : "sheets"
  const questions = exam && subjectRow ? mcqQuestionCount(exam, subjectRow.subjectId, papers) : 0
  const [rows, setRows] = React.useState<ScanRow[]>([])
  const [busy, setBusy] = React.useState<{ done: number; total: number } | null>(null)
  const [viewing, setViewing] = React.useState<ScanRow | null>(null)
  const [saved, setSaved] = React.useState<number | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scope = `${exam?.id}:${subjectRow?.subjectId}:${mode}`
  const [scopeOf, setScopeOf] = React.useState(scope)
  // A different exam, subject or mode starts a new batch.
  if (scope !== scopeOf) {
    setScopeOf(scope)
    setRows([])
    setSaved(null)
  }

  const checked: CheckedOmrRow[] =
    exam && subjectRow && mode === "sheets"
      ? checkOmrRows(
          exam,
          subjectRow.subjectId,
          rows.map((r) =>
            r.error
              ? { roll: "", setCode: "", answers: [], flagged: false }
              : { roll: r.roll, setCode: r.setCode, answers: splitAnswers(r.answers, questions), flagged: r.flagged }
          ),
          students,
          keys
        ).map((c, i) => (rows[i].error ? { status: "error" as const, messages: [rows[i].error!] } : c))
      : []
  const counts = {
    ok: checked.filter((c) => c.status === "ok").length,
    warning: checked.filter((c) => c.status === "warning").length,
    error: checked.filter((c) => c.status === "error").length,
  }

  async function add(files: File[]) {
    if (!exam || !subjectRow) return
    const images = files.filter((file) => IMAGE_TYPES.includes(file.type))
    if (images.length < files.length) toast.warning("Only JPEG, PNG, WebP, BMP and GIF pictures can be read (save PDFs or HEIC photos as JPEG).")
    if (!images.length) return
    const list = mode === "key" ? images.slice(0, 1) : images
    setSaved(null)
    setBusy({ done: 0, total: list.length })
    const added: ScanRow[] = []
    for (const [i, file] of list.entries()) {
      try {
        added.push({ id: nextRowId++, ...(await readFile(file, questions)) })
      } catch {
        toast.error(`${file.name} couldn't be opened.`)
      }
      setBusy({ done: i + 1, total: list.length })
      // Let the progress bar paint between sheets.
      await new Promise((resolve) => setTimeout(resolve))
    }
    setRows((current) => (mode === "key" ? added : [...current, ...added]))
    setBusy(null)
  }

  function update(id: number, changes: Partial<ScanRow>) {
    setRows((current) => current.map((r) => (r.id === id ? { ...r, ...changes, flagged: false } : r)))
  }

  function save() {
    const uploads = checked.flatMap((c) => (c.upload ? [c.upload] : []))
    if (!uploads.length) return toast.error("No sheet is ready to save.")
    const count = saveTermExamMarks(uploads, user.name)
    toast.success(`${count} student${count === 1 ? "'s" : "s'"} MCQ marks saved`, {
      description: counts.error ? `${counts.error} sheet${counts.error === 1 ? "" : "s"} with errors left for you to fix.` : "Generate the merit list again to update results.",
    })
    setSaved(count)
    // Keep only the sheets that couldn't be saved.
    setRows((current) => current.filter((_, i) => !checked[i]?.upload))
  }

  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? `Subject ${id}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">OMR Scan</CardTitle>
            <CardDescription>
              Read OMR sheets from scans or phone photos, check them, and save the MCQ marks. The pictures stay in this browser tab.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href="/term-exam/omr-sheet">Print OMR sheets</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Subject"
            required
            value={subjectRow ? String(subjectRow.subjectId) : ""}
            onChange={(v) => f.setParam({ subject: v })}
            options={mcqSubjects.map((s) => ({ value: String(s.subjectId), label: subjectName(s.subjectId) }))}
            placeholder={exam && !mcqSubjects.length ? "No MCQ subject" : "Select subject"}
            disabled={!exam}
          />
          <FilterField
            label="Reading"
            value={mode}
            onChange={(v) => f.setParam({ mode: v === "key" ? "key" : "" })}
            options={[
              { value: "sheets", label: "Students' answer sheets" },
              { value: "key", label: "An answer key sheet" },
            ]}
          />
        </CardContent>
      </Card>

      {!exam || !subjectRow ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          Select the exam and an MCQ subject.
        </p>
      ) : (
        <>
          <div
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors",
              busy ? "opacity-70" : "hover:border-primary/50"
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              if (!busy) void add([...e.dataTransfer.files])
            }}
          >
            <ScanLineIcon className="size-8 text-muted-foreground" />
            <div className="text-sm">
              {mode === "key" ? (
                <>Drop the picture of one sheet filled in with the correct answers (fill the set bubble too).</>
              ) : (
                <>
                  Drop scans or photos of the {subjectName(subjectRow.subjectId)} sheets here — {questions} questions each.
                </>
              )}
              <p className="mt-1 text-xs text-muted-foreground">
                Scan at 150–300 dpi, or photograph the whole sheet flat in good light, all four corner squares in view.
              </p>
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={IMAGE_TYPES.join(",")}
              multiple={mode !== "key"}
              hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])]
                e.target.value = ""
                void add(files)
              }}
            />
            <Button type="button" size="sm" onClick={() => inputRef.current?.click()} disabled={!!busy}>
              {busy ? <LoaderIcon className="animate-spin" data-icon="inline-start" /> : <UploadIcon data-icon="inline-start" />}
              {busy ? `Reading ${busy.done} of ${busy.total}…` : mode === "key" ? "Choose the key sheet" : "Choose pictures"}
            </Button>
            {busy && <Progress value={(busy.done / busy.total) * 100} className="w-64" />}
          </div>

          {saved != null && !rows.length && (
            <p className="flex items-center gap-2 text-sm text-emerald-600">
              <CircleCheckIcon className="size-4" />
              {saved} marks saved. See them in{" "}
              <Link href="/term-exam-marks" className="underline underline-offset-4">
                Student Marks Manage
              </Link>{" "}
              or the{" "}
              <Link href={`/reports/mcq-mark-checker?exam=${exam.id}`} className="underline underline-offset-4">
                MCQ Mark Checker
              </Link>
              .
            </p>
          )}

          {mode === "key" && rows[0] && (
            <KeySheet
              row={rows[0]}
              questions={questions}
              onChange={(changes) => update(rows[0].id, changes)}
              onView={() => setViewing(rows[0])}
              onSave={() => {
                const setCode = rows[0].setCode.trim().toUpperCase()
                const answer = splitAnswers(rows[0].answers, questions).join(",")
                const existed = keys.some((k) => k.termExamId === exam.id && k.subjectId === subjectRow.subjectId && k.setCode.trim().toUpperCase() === setCode)
                saveAnswerKeys([{ termExamId: exam.id, subjectId: subjectRow.subjectId, setCode, answer }], user.name)
                toast.success(`${existed ? "Answer key replaced" : "Answer key saved"} for set ${setCode}`)
                setRows([])
              }}
            />
          )}

          {mode === "sheets" && rows.length > 0 && (
            <Card>
              <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
                <div className="flex flex-col gap-1">
                  <CardTitle className="text-base">Check the readings</CardTitle>
                  <CardDescription>
                    {counts.ok} ready · {counts.warning} to look at · {counts.error} with errors. Fix a roll, set or answer by typing
                    over it; answers are comma-separated, blank for none.
                  </CardDescription>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => setRows([])}>
                  Clear all
                </Button>
              </CardHeader>
              <CardContent className="overflow-x-auto p-0">
                <Table>
                  <TableHeader className="bg-muted">
                    <TableRow>
                      <TableHead className="w-10">#</TableHead>
                      <TableHead className="w-20">Sheet</TableHead>
                      <TableHead className="w-28">Roll</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="w-16">Set</TableHead>
                      <TableHead>Answers</TableHead>
                      <TableHead className="text-right">Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((row, i) => {
                      const c = checked[i]
                      return (
                        <TableRow key={row.id} className={cn(c?.status === "error" && "bg-destructive/5")}>
                          <TableCell className="tabular-nums text-muted-foreground">{i + 1}</TableCell>
                          <TableCell>
                            <button type="button" onClick={() => setViewing(row)} title={row.fileName} className="block overflow-hidden rounded border">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={row.image} alt={row.fileName} className="h-16 w-12 object-cover" />
                            </button>
                          </TableCell>
                          <TableCell>
                            <Input
                              value={row.roll}
                              onChange={(e) => update(row.id, { roll: e.target.value })}
                              disabled={!!row.error}
                              aria-label="Roll"
                              className="h-8 font-mono"
                            />
                          </TableCell>
                          <TableCell className="text-sm">{c?.studentName ?? "—"}</TableCell>
                          <TableCell>
                            <Input
                              value={row.setCode}
                              onChange={(e) => update(row.id, { setCode: e.target.value.toUpperCase() })}
                              disabled={!!row.error}
                              aria-label="Set code"
                              className="h-8 w-12 text-center font-mono"
                            />
                          </TableCell>
                          <TableCell className="min-w-72">
                            <Input
                              value={row.answers}
                              onChange={(e) => update(row.id, { answers: e.target.value.toUpperCase() })}
                              disabled={!!row.error}
                              aria-label="Answers"
                              className="h-8 font-mono text-xs"
                            />
                            {row.flagged && row.reading && <FlagList reading={row.reading} />}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c?.score ? (
                              <span title={`${c.score.correct} right, ${c.score.wrong} wrong, ${c.score.notAnswered} blank`}>
                                <span className="font-semibold">{c.score.marks}</span>
                                <span className="block text-xs text-muted-foreground">
                                  {c.score.correct}/{c.score.wrong}/{c.score.notAnswered}
                                </span>
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="max-w-64 whitespace-normal">
                            <StatusCell checked={c} />
                          </TableCell>
                          <TableCell>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}
                            >
                              <XIcon />
                              <span className="sr-only">Remove</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
              <CardFooter className="flex-wrap justify-between gap-3 border-t">
                <span className="text-xs text-muted-foreground">
                  Under the marks: right / wrong / blank. Saving replaces these students&apos; MCQ marks for the subject.
                </span>
                <Button type="button" onClick={save} disabled={!counts.ok && !counts.warning}>
                  <CircleCheckIcon data-icon="inline-start" />
                  Save {counts.ok + counts.warning} sheet{counts.ok + counts.warning === 1 ? "" : "s"}
                </Button>
              </CardFooter>
            </Card>
          )}
        </>
      )}

      <SheetDialog row={viewing} onClose={() => setViewing(null)} />
    </div>
  )
}

function StatusCell({ checked }: { checked?: CheckedOmrRow }) {
  if (!checked) return null
  const icon =
    checked.status === "ok" ? (
      <CircleCheckIcon className="size-4 text-emerald-600" />
    ) : checked.status === "warning" ? (
      <TriangleAlertIcon className="size-4 text-amber-600" />
    ) : (
      <CircleAlertIcon className="size-4 text-destructive" />
    )
  return (
    <div className="flex items-start gap-1.5 text-xs">
      <span className="mt-0.5 shrink-0">{icon}</span>
      <span>{checked.messages.length ? checked.messages.join("; ") : "Ready"}</span>
    </div>
  )
}

function FlagList({ reading }: { reading: OmrReading }) {
  const flags = reading.flags.filter((f) => f.reason !== "blank" || f.field === "set")
  if (!flags.length) return null
  const label = (f: OmrReading["flags"][number]) =>
    `${f.field === "answer" ? `Q${f.index + 1}` : f.field === "roll" ? `roll digit ${f.index + 1}` : "set"} ${
      f.reason === "multiple" ? "two marks" : f.reason === "faint" ? "faint" : "blank"
    }`
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {flags.slice(0, 8).map((f, i) => (
        <Badge key={i} variant="outline" className="border-amber-500/40 bg-amber-500/10 text-[10px] text-amber-700 dark:text-amber-300">
          {label(f)}
        </Badge>
      ))}
      {flags.length > 8 && <span className="text-[10px] text-muted-foreground">+{flags.length - 8} more</span>}
    </div>
  )
}

function KeySheet({
  row,
  questions,
  onChange,
  onView,
  onSave,
}: {
  row: ScanRow
  questions: number
  onChange: (changes: Partial<ScanRow>) => void
  onView: () => void
  onSave: () => void
}) {
  const answers = splitAnswers(row.answers, questions)
  const setCode = row.setCode.trim().toUpperCase()
  const blanks = answers.filter((a) => !a).length
  const problem = row.error
    ? row.error
    : !/^[ABCD]$/.test(setCode)
      ? "Fill in one set code (A–D)."
      : answers.some((a) => !/^[ABCD]{0,1}$/.test(a))
        ? "A key question has more than one mark; correct it below (use A|B in Manage Correct Answer for either)."
        : null
  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-base">Answer key read from {row.fileName}</CardTitle>
          <CardDescription>
            {blanks ? `${blanks} question${blanks === 1 ? " is" : "s are"} blank on the key. ` : ""}Check it against the paper before saving.
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onView}>
          View sheet
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Set</span>
          <Input value={row.setCode} onChange={(e) => onChange({ setCode: e.target.value.toUpperCase() })} className="h-8 w-14 text-center font-mono" />
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {answers.map((a, i) => (
            <label key={i} className="flex items-center gap-1 text-xs">
              <span className="w-6 text-right tabular-nums text-muted-foreground">{i + 1}.</span>
              <Input
                value={a}
                onChange={(e) => {
                  const next = [...answers]
                  next[i] = e.target.value.toUpperCase()
                  onChange({ answers: next.join(",") })
                }}
                className={cn("h-7 w-10 px-1 text-center font-mono", (!a || a.length > 1) && "border-amber-500")}
              />
            </label>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex-wrap justify-between gap-3 border-t">
        <span className={cn("text-sm", problem ? "text-destructive" : "text-muted-foreground")}>{problem ?? "It replaces any key saved for this set."}</span>
        <Button type="button" onClick={onSave} disabled={!!problem}>
          <KeyRoundIcon data-icon="inline-start" />
          Save key for set {/^[ABCD]$/.test(setCode) ? setCode : "…"}
        </Button>
      </CardFooter>
    </Card>
  )
}

// The picture as it was read: marked bubbles green, faint ones amber, the
// corner squares found in red.
function SheetDialog({ row, onClose }: { row: ScanRow | null; onClose: () => void }) {
  return (
    <Dialog open={!!row} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{row?.fileName}</DialogTitle>
          <DialogDescription>
            {row?.error ?? "Green: read as marked. Amber: faint, worth a look. Red: the corner squares found."}
          </DialogDescription>
        </DialogHeader>
        {row && (
          <div className="relative w-full">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={row.image} alt={row.fileName} className="block w-full" />
            {row.reading && (
              <svg viewBox={`0 0 ${row.width} ${row.height}`} className="absolute inset-0 size-full">
                {row.reading.corners.map((c, i) => (
                  <circle key={`c${i}`} cx={c.x} cy={c.y} r={row.width / 60} fill="none" stroke="#dc2626" strokeWidth={row.width / 300} />
                ))}
                {row.reading.bubbles
                  .filter((b) => b.marked || b.score >= FAINT)
                  .map((b, i) => (
                    <circle
                      key={i}
                      cx={b.at.x}
                      cy={b.at.y}
                      r={row.width / 110}
                      fill="none"
                      stroke={b.marked ? "#16a34a" : "#d97706"}
                      strokeWidth={row.width / 400}
                    />
                  ))}
              </svg>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
