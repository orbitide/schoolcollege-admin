"use client"

import * as React from "react"
import { flushSync } from "react-dom"
import Link from "next/link"
import { KeyRoundIcon, MinimizeIcon, PrinterIcon, ReplaceIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import {
  GENERATED_PAPERS_RESOURCE,
  PaperActions,
  PaperStatusBadge,
} from "@/components/question-papers/generated-paper-list"
import { GENERATED_PAPERS_HREF } from "@/components/question-papers/generate-question"
import {
  AnswerKeySheet,
  PAPER_CONTENT_MM,
  PAPER_MARGIN_MM,
  paperDuration,
  QuestionPaperSheet,
  type PaperLook,
} from "@/components/question-papers/question-paper-sheet"
import { questionLabel } from "@/components/questions/question-list"
import { QuestionPreview } from "@/components/questions/question-preview"
import { PrintArea } from "@/components/reports/print-area"
import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { subjectStore } from "@/lib/academic-store"
import { capabilitiesFor, permissionCode, surfacesOf, useCan } from "@/lib/access"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { useInstitutes } from "@/lib/institutes-store"
import { difficultyLabel, questionChapterStore, useQuestions, type Question } from "@/lib/question-bank"
import {
  paperLines,
  replaceQuestion,
  replacementCandidates,
  useGeneratedPaper,
  type GeneratedPaper,
} from "@/lib/question-papers"
import { useTermExams } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const MIN_FONT = 8
const MAX_FONT = 16

// Term Exam › Generated question: the paper's sets as they print, in
// either of its languages, with the look (font, columns, answers,
// solutions) chosen here; the font can be shrunk until the paper fits its
// target pages. A draft paper's questions can be replaced, each with a
// reason. Printing happens in this tab (the stores live in its memory).
export function GeneratedPaperDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const paper = useGeneratedPaper(id)
  const institutes = useAccessibleInstitutes()
  const can = useCan()
  const surface = surfacesOf(GENERATED_PAPERS_RESOURCE).find((s) => can(permissionCode(GENERATED_PAPERS_RESOURCE, s))) ?? "View"
  const caps = capabilitiesFor(surface, { resource: GENERATED_PAPERS_RESOURCE, softDelete: true })
  const listHref = returnTo?.startsWith("/") ? returnTo : GENERATED_PAPERS_HREF
  const exams = useTermExams()
  const allInstitutes = useInstitutes()
  const subjects = subjectStore.useAll()

  const visible = paper && institutes.some((i) => i.id === paper.instituteId) && (paper.status !== "Deleted" || caps.restore)
  const exam = paper && exams.find((e) => e.id === paper.termExamId)
  if (!paper || !visible || !exam) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Generated question not found</h2>
        <p className="text-sm text-muted-foreground">It may have been cleared, or the page was reloaded (papers live in this tab for now).</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to generated questions</Link>
        </Button>
      </div>
    )
  }
  return (
    <PaperView
      paper={paper}
      exam={exam}
      subject={subjects.find((s) => s.id === paper.subjectId)}
      institute={allInstitutes.find((i) => i.id === paper.instituteId)}
      caps={caps}
      listHref={listHref}
    />
  )
}

function PaperView({
  paper,
  exam,
  subject,
  institute,
  caps,
  listHref,
}: {
  paper: GeneratedPaper
  exam: NonNullable<ReturnType<typeof useTermExams>[number]>
  subject?: ReturnType<typeof subjectStore.useAll>[number]
  institute?: ReturnType<typeof useInstitutes>[number]
  caps: ReturnType<typeof capabilitiesFor>
  listHref: string
}) {
  const languages = (["bn", "en"] as const).filter((l) => (l === "bn" ? paper.settings.bangla : paper.settings.english))
  const [setCode, setSetCode] = React.useState(paper.sets[0]?.setCode ?? "A")
  const [look, setLook] = React.useState<PaperLook>({
    lang: languages[0] ?? "bn",
    fontSize: paper.type === "MCQ" ? 11 : 12,
    columns: paper.type === "MCQ" ? 2 : 1,
    showAnswer: false,
    showSolution: false,
  })
  const [fitting, setFitting] = React.useState(false)
  const [pages, setPages] = React.useState(0)
  const [printing, setPrinting] = React.useState<"paper" | "key">("paper")
  const [replacing, setReplacing] = React.useState<Question | null>(null)
  const measure = React.useRef<HTMLDivElement>(null)
  const set = paper.sets.find((s) => s.setCode === setCode) ?? paper.sets[0]
  const draft = paper.status === "Draft"
  const target = paper.settings.targetPages

  // Pages the sheet takes at this look, from its drawn height; while
  // fitting, shrink the font half a point at a time until it fits.
  React.useLayoutEffect(() => {
    const el = measure.current
    if (!el) return
    const pxPerMm = el.offsetWidth / PAPER_CONTENT_MM.width
    const next = Math.max(1, Math.ceil(el.offsetHeight / (PAPER_CONTENT_MM.height * pxPerMm)))
    if (next !== pages) setPages(next)
    if (!fitting) return
    if (next > target && look.fontSize > MIN_FONT) setLook((l) => ({ ...l, fontSize: Math.round((l.fontSize - 0.5) * 2) / 2 }))
    else {
      setFitting(false)
      if (next > target) toast.warning(`Even at ${MIN_FONT} pt it takes ${next} pages.`)
    }
  }, [look, setCode, paper, pages, fitting, target])

  function print(what: "paper" | "key") {
    flushSync(() => setPrinting(what))
    window.print()
  }

  const byId = new Map(paper.questions.map((q) => [q.id, q]))
  const inOrder = set.units.map((u) => byId.get(u.questionId)).filter(Boolean) as Question[]
  const firstSerial = new Map<number, number>()
  for (const line of paperLines(paper, set)) if (!firstSerial.has(line.question.id)) firstSerial.set(line.question.id, line.serial)

  const sheet = <QuestionPaperSheet paper={paper} set={set} exam={exam} subject={subject} institute={institute} look={look} />

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
              {subject?.name} · {paper.type}
              <PaperStatusBadge status={paper.status} />
            </CardTitle>
            <CardDescription>
              {exam.fullName} · {paper.sets.length} set{paper.sets.length === 1 ? "" : "s"} · {paperDuration(paper.settings.durationMinutes, "en")}
              {paper.type === "CQ" && ` · answer ${paper.settings.cqAnswerCount}`} · seed {paper.seed} · by {paper.modifiedBy}, {stamp(paper.modifiedAt)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={listHref}>Back</Link>
            </Button>
            {caps.create && paper.status !== "Deleted" && (
              <Button asChild variant="outline" size="sm">
                <Link
                  href={`/term-exam/generate-question?${new URLSearchParams({
                    institute: String(exam.instituteId),
                    class: String(exam.classId),
                    year: String(exam.yearId),
                    exam: String(exam.id),
                    subject: String(paper.subjectId),
                    type: paper.type,
                  })}`}
                >
                  <WandSparklesIcon data-icon="inline-start" />
                  Generate again
                </Link>
              </Button>
            )}
            <PaperActions paper={paper} can={caps} returnTo={listHref} onDetail />
          </div>
        </CardHeader>
        <CardContent className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {paper.sets.length > 1 && (
            <Field className="lg:col-span-2">
              <FieldLabel>Set</FieldLabel>
              <Tabs value={set.setCode} onValueChange={setSetCode}>
                <TabsList>
                  {paper.sets.map((s) => (
                    <TabsTrigger key={s.setCode} value={s.setCode} className="min-w-10">
                      {s.setCode}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Field>
          )}
          {languages.length > 1 && (
            <FilterField
              label="Language"
              value={look.lang}
              onChange={(v) => setLook((l) => ({ ...l, lang: v as "bn" | "en" }))}
              options={[
                { value: "bn", label: "বাংলা" },
                { value: "en", label: "English" },
              ]}
            />
          )}
          <Field>
            <FieldLabel htmlFor="font-size">Font size (pt)</FieldLabel>
            <Input
              id="font-size"
              type="number"
              min={MIN_FONT}
              max={MAX_FONT}
              step={0.5}
              value={look.fontSize}
              onChange={(e) => setLook((l) => ({ ...l, fontSize: Math.min(MAX_FONT, Math.max(MIN_FONT, Number(e.target.value) || MIN_FONT)) }))}
            />
          </Field>
          <FilterField
            label="Columns"
            value={String(look.columns)}
            onChange={(v) => setLook((l) => ({ ...l, columns: v === "2" ? 2 : 1 }))}
            options={[
              { value: "1", label: "One" },
              { value: "2", label: "Two" },
            ]}
          />
          <div className="flex flex-col gap-2 text-sm">
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={look.showAnswer} onCheckedChange={(on) => setLook((l) => ({ ...l, showAnswer: on === true }))} disabled={paper.type === "CQ"} />
              Mark answers
            </Label>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox checked={look.showSolution} onCheckedChange={(on) => setLook((l) => ({ ...l, showSolution: on === true }))} />
              Show solutions
            </Label>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:col-span-2 lg:col-span-6">
            <span className={cn("text-sm", pages > target ? "text-amber-600" : "text-muted-foreground")}>
              About {pages} page{pages === 1 ? "" : "s"} (target {target}).
            </span>
            <Button type="button" variant="outline" size="sm" onClick={() => setFitting(true)} disabled={fitting || pages <= target}>
              <MinimizeIcon data-icon="inline-start" />
              Fit to {target} page{target === 1 ? "" : "s"}
            </Button>
            <span className="flex-1" />
            {paper.type === "MCQ" && (
              <Button type="button" variant="outline" size="sm" onClick={() => print("key")}>
                <KeyRoundIcon data-icon="inline-start" />
                Print answer key
              </Button>
            )}
            <Button type="button" size="sm" onClick={() => print("paper")}>
              <PrinterIcon data-icon="inline-start" />
              Print set {set.setCode}
            </Button>
          </div>
          {!draft && paper.status === "Approved" && (
            <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-6">Approved: reopen it to replace questions.</p>
          )}
          {draft && <p className="text-xs text-amber-600 sm:col-span-2 lg:col-span-6">Draft: check the questions and approve the paper before printing it for the exam.</p>}
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border bg-neutral-100 p-4 dark:bg-neutral-900">
        <div className="mx-auto w-fit bg-white shadow-sm" style={{ padding: `${PAPER_MARGIN_MM}mm` }}>
          <div ref={measure}>{sheet}</div>
        </div>
      </div>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Questions in set {set.setCode}</CardTitle>
          <CardDescription>
            {draft && caps.edit
              ? "Replace a question with another approved one of the same shape; every set and answer key follows."
              : "The questions picked for the paper."}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="w-14">No.</TableHead>
                <TableHead>Question</TableHead>
                <TableHead>Chapter</TableHead>
                <TableHead>Level</TableHead>
                <TableHead>Difficulty</TableHead>
                <TableHead className="w-28" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {inOrder.map((q) => (
                <QuestionRow
                  key={q.id}
                  question={q}
                  serial={firstSerial.get(q.id) ?? 0}
                  canReplace={draft && caps.edit}
                  onReplace={() => setReplacing(q)}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {paper.replacements.length > 0 && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-base">Replacements</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto p-0">
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Replaced</TableHead>
                  <TableHead>With</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paper.replacements.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="tabular-nums">#{r.oldQuestionId}</TableCell>
                    <TableCell className="tabular-nums">#{r.newQuestionId}</TableCell>
                    <TableCell className="max-w-96 whitespace-normal">{r.reason}</TableCell>
                    <TableCell className="whitespace-nowrap text-xs">
                      {r.by}
                      <span className="block text-muted-foreground">{stamp(r.at)}</span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <ReplaceDialog paper={paper} question={replacing} lang={look.lang} onClose={() => setReplacing(null)} />

      <PrintArea pageSize="210mm 297mm" margin={`${PAPER_MARGIN_MM}mm`}>
        {printing === "key" ? (
          <AnswerKeySheet paper={paper} exam={exam} subject={subject} institute={institute} lang={look.lang} />
        ) : (
          sheet
        )}
      </PrintArea>
    </div>
  )
}

function QuestionRow({
  question,
  serial,
  canReplace,
  onReplace,
}: {
  question: Question
  serial: number
  canReplace: boolean
  onReplace: () => void
}) {
  const chapters = questionChapterStore.useAll()
  return (
    <TableRow>
      <TableCell className="tabular-nums">
        {serial}
        {question.type === "MCQ" && question.items.length > 1 && `–${serial + question.items.length - 1}`}
      </TableCell>
      <TableCell className="max-w-96 whitespace-normal">{questionLabel(question, 110)}</TableCell>
      <TableCell className="text-xs">{chapters.find((c) => c.id === question.chapterId)?.name ?? "—"}</TableCell>
      <TableCell className="text-xs">{question.level}</TableCell>
      <TableCell className="text-xs">{difficultyLabel(question.difficulty)}</TableCell>
      <TableCell className="text-right">
        {canReplace && (
          <Button type="button" variant="outline" size="sm" onClick={onReplace}>
            <ReplaceIcon data-icon="inline-start" />
            Replace
          </Button>
        )}
      </TableCell>
    </TableRow>
  )
}

// Legacy Replacement Question: pick another approved question of the same
// shape and say why.
function ReplaceDialog({
  paper,
  question,
  lang,
  onClose,
}: {
  paper: GeneratedPaper
  question: Question | null
  lang: "bn" | "en"
  onClose: () => void
}) {
  const user = useCurrentUser()
  const bank = useQuestions()
  const [pick, setPick] = React.useState<number | null>(null)
  const [reason, setReason] = React.useState("")
  const [opened, setOpened] = React.useState<Question | null>(null)
  if (question !== opened) {
    setOpened(question)
    setPick(null)
    setReason("")
  }
  const candidates = question ? replacementCandidates(paper, question.id, bank) : []
  const sameChapter = candidates.filter((q) => q.chapterId === question?.chapterId)
  const ordered = [...sameChapter, ...candidates.filter((q) => q.chapterId !== question?.chapterId)]

  function save() {
    if (!question || pick == null) return
    try {
      replaceQuestion(paper.id, question.id, pick, reason, user.name)
      toast.success("Question replaced in every set")
      onClose()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The question couldn't be replaced.")
    }
  }

  return (
    <Dialog open={!!question} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Replace question #{question?.id}</DialogTitle>
          <DialogDescription>
            {ordered.length
              ? `${ordered.length} approved question${ordered.length === 1 ? "" : "s"} can take its place; the same chapter first.`
              : "No other approved question of the same shape is free. Add one to the bank first."}
          </DialogDescription>
        </DialogHeader>
        {question && (
          <div className="rounded-md border bg-muted/30 p-3">
            <p className="mb-2 text-xs font-medium text-muted-foreground">Now on the paper</p>
            <QuestionPreview question={question} lang={lang} />
          </div>
        )}
        <div className="flex flex-col gap-2">
          {ordered.map((q) => (
            <label
              key={q.id}
              className={cn(
                "flex cursor-pointer gap-3 rounded-md border p-3 transition-colors hover:bg-muted/50",
                pick === q.id && "border-primary bg-primary/5"
              )}
            >
              <input type="radio" name="replacement" className="mt-1" checked={pick === q.id} onChange={() => setPick(q.id)} />
              <div className="min-w-0 flex-1">
                <p className="mb-1 text-xs text-muted-foreground">
                  #{q.id} · {q.level} · {difficultyLabel(q.difficulty)}
                </p>
                <QuestionPreview question={q} lang={lang} />
              </div>
            </label>
          ))}
        </div>
        <Field>
          <FieldLabel htmlFor="replace-reason">
            Reason<span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea
            id="replace-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Same as last year's paper; a typo in option C"
          />
        </Field>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" onClick={save} disabled={pick == null || !reason.trim()}>
            Replace
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

