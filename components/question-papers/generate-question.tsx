"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CircleAlertIcon, DicesIcon, TriangleAlertIcon, WandSparklesIcon } from "lucide-react"
import { toast } from "sonner"

import { ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { subjectStore } from "@/lib/academic-store"
import { useCurrentUser } from "@/lib/current-user"
import { questionChapterStore, questionLevels, useQuestions, type QuestionLevel, type QuestionType } from "@/lib/question-bank"
import {
  availability,
  blueprintProblem,
  defaultSettings,
  eligibleQuestions,
  generatePaper,
  keysInTheWay,
  MAX_SETS,
  newSeed,
  paperFor,
  paperRequirement,
  SET_CODES,
  useGeneratedPapers,
  type BlueprintRow,
  type GeneratedPaper,
  type PaperSettings,
} from "@/lib/question-papers"
import { useTermExamAnswers } from "@/lib/term-exam-answers"
import type { TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

export const GENERATED_PAPERS_HREF = "/term-exam/generated-questions"

// Term Exam › Generate Question (legacy TermExamQuestionManager Generate,
// with the Question Basic settings on the same page): pick the exam,
// subject and MCQ or CQ, set the paper up, say how many questions each
// chapter and level gives, and generate the sets.
export function GenerateQuestion() {
  const f = useExamReportFilter({ meritList: false })
  const exam = f.chosen
  const subjects = subjectStore.useList(f.institute?.id ?? -1)
  const examSubjects = (exam?.subjects ?? []).filter((s) => s.mcqMarks > 0 || s.cqMarks > 0)
  const subject = examSubjects.find((s) => String(s.subjectId) === f.param("subject"))
  const types: QuestionType[] = subject
    ? [...(subject.mcqMarks > 0 ? (["MCQ"] as const) : []), ...(subject.cqMarks > 0 ? (["CQ"] as const) : [])]
    : []
  const type = types.find((t) => t === f.param("type")) ?? types[0]
  const papers = useGeneratedPapers()
  const existing = exam && subject && type ? paperFor(exam.id, subject.subjectId, type, papers) : undefined
  const name = new Map(subjects.map((s) => [s.id, s.name]))

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Generate Question</CardTitle>
            <CardDescription>
              Draw question sets from the approved questions of the bank. MCQ sets write their answer keys to Manage Correct Answer.
            </CardDescription>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link href={GENERATED_PAPERS_HREF}>Manage generated question</Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Subject"
            required
            value={subject ? String(subject.subjectId) : ""}
            onChange={(v) => f.setParam({ subject: v, type: "" })}
            options={examSubjects.map((s) => ({ value: String(s.subjectId), label: name.get(s.subjectId) ?? `Subject ${s.subjectId}` }))}
            placeholder={exam && !examSubjects.length ? "No MCQ or CQ subject" : "Select subject"}
            disabled={!exam}
          />
          <FilterField
            label="Question type"
            required
            value={type ?? ""}
            onChange={(v) => f.setParam({ type: v })}
            options={types.map((t) => ({ value: t, label: t === "CQ" ? "CQ (creative)" : "MCQ" }))}
            placeholder="Select type"
            disabled={!types.length}
          />
        </CardContent>
      </Card>

      {exam && subject && type ? (
        <GenerateForm
          key={`${exam.id}:${subject.subjectId}:${type}:${existing?.id ?? "new"}`}
          exam={exam}
          subjectId={subject.subjectId}
          subjectName={name.get(subject.subjectId) ?? ""}
          type={type}
          existing={existing}
        />
      ) : (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <CircleAlertIcon className="size-4 shrink-0" />
          Select the exam, subject and question type.
        </p>
      )}
    </div>
  )
}

const cellKey = (chapterId: number, level: QuestionLevel) => `${chapterId}:${level}`

function GenerateForm({
  exam,
  subjectId,
  subjectName,
  type,
  existing,
}: {
  exam: TermExam
  subjectId: number
  subjectName: string
  type: QuestionType
  existing?: GeneratedPaper
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const questions = useQuestions()
  // Re-renders when a key changes, for the overwrite warning.
  useTermExamAnswers()
  const chapters = questionChapterStore
    .useList(exam.instituteId)
    .filter((c) => c.classId === exam.classId && c.subjectId === subjectId && c.parentId == null)
  const [settings, setSettings] = React.useState<PaperSettings>(() => existing?.settings ?? defaultSettings(exam, subjectId, type))
  const [counts, setCounts] = React.useState<Record<string, string>>(() =>
    Object.fromEntries((existing?.blueprint ?? []).map((r) => [cellKey(r.chapterId, r.level), String(r.count)]))
  )
  const [seed, setSeed] = React.useState(() => existing?.seed ?? newSeed())

  const requirement = paperRequirement(exam, subjectId, type, settings)
  const eligible = eligibleQuestions(exam, subjectId, type, settings, requirement, questions)
  const available = availability(eligible)
  const blueprint: BlueprintRow[] = chapters.flatMap((c) =>
    questionLevels.map((level) => ({
      chapterId: c.id,
      level,
      count: Math.max(0, Math.floor(Number(counts[cellKey(c.id, level)]) || 0)),
    }))
  )
  const total = blueprint.reduce((sum, r) => sum + r.count, 0)
  const totalAvailable = chapters.reduce((sum, c) => sum + questionLevels.reduce((s, l) => s + available.get(c.id, l), 0), 0)
  // A CQ paper offers a few more questions than are answered.
  const target =
    type === "MCQ" ? requirement.questions : Math.min(totalAvailable, requirement.questions + Math.ceil(requirement.questions / 3))
  const problem = blueprintProblem({ exam, subjectId, type, settings, blueprint })
  const approved = existing?.status === "Approved"
  const inTheWay =
    type === "MCQ" && !existing ? keysInTheWay(exam.id, subjectId, settings.totalSets).map((k) => k.setCode.toUpperCase()) : []

  function set<K extends keyof PaperSettings>(key: K, value: PaperSettings[K]) {
    setSettings((s) => ({ ...s, [key]: value }))
  }

  // Spreads the questions over the chapters and levels that have any, one
  // at a time in turn, never more than a cell holds.
  function fill() {
    const cells = chapters.flatMap((c) => questionLevels.map((level) => ({ key: cellKey(c.id, level), max: available.get(c.id, level) })))
    const next: Record<string, number> = {}
    let remaining = target
    while (remaining > 0) {
      let moved = false
      for (const cell of cells) {
        if (!remaining) break
        if ((next[cell.key] ?? 0) < cell.max) {
          next[cell.key] = (next[cell.key] ?? 0) + 1
          remaining--
          moved = true
        }
      }
      if (!moved) break
    }
    setCounts(Object.fromEntries(Object.entries(next).map(([k, v]) => [k, String(v)])))
    if (remaining) toast.warning(`Only ${target - remaining} approved questions fit; add more to the bank.`)
  }

  function generate() {
    try {
      const paper = generatePaper({ exam, subjectId, type, settings, blueprint, seed }, user.name)
      toast.success(`${paper.sets.length} set${paper.sets.length === 1 ? "" : "s"} generated`, {
        description: type === "MCQ" ? `Answer keys for set ${paper.sets.map((s) => s.setCode).join(", ")} saved.` : undefined,
      })
      router.push(`${GENERATED_PAPERS_HREF}/${paper.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The paper couldn't be generated.")
    }
  }

  const levelTotal = (level: QuestionLevel) => blueprint.filter((r) => r.level === level).reduce((s, r) => s + r.count, 0)

  return (
    <>
      {existing && (
        <div
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-lg border px-4 py-3 text-sm",
            approved ? "border-amber-500/40 bg-amber-500/10" : "bg-muted/40"
          )}
        >
          <TriangleAlertIcon className="size-4 shrink-0" />
          {approved
            ? `The ${subjectName} ${type} paper is approved. Reopen it before generating again.`
            : `The ${subjectName} ${type} paper was generated before; generating again replaces it${type === "MCQ" ? " and its answer keys" : ""}.`}
          <Link href={`${GENERATED_PAPERS_HREF}/${existing.id}`} className="font-medium underline underline-offset-4">
            Open the paper
          </Link>
        </div>
      )}

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Paper settings</CardTitle>
          <CardDescription>
            {requirement.error
              ? requirement.error
              : type === "MCQ"
                ? `${requirement.marks} MCQ marks: ${requirement.questions} questions of ${settings.mcqMarksPerQuestion} mark${settings.mcqMarksPerQuestion === 1 ? "" : "s"}.`
                : `${requirement.marks} CQ marks: students answer ${requirement.questions} questions of ${requirement.perQuestion} marks; offer at least ${requirement.questions}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField
            label="Sets"
            required
            value={String(settings.totalSets)}
            onChange={(v) => set("totalSets", Number(v))}
            options={Array.from({ length: MAX_SETS }, (_, i) => ({
              value: String(i + 1),
              label: `${i + 1} (${SET_CODES.slice(0, i + 1).join(", ")})`,
            }))}
          />
          <Field>
            <FieldLabel htmlFor="duration">Duration (minutes)</FieldLabel>
            <Input
              id="duration"
              type="number"
              min={5}
              step={5}
              value={settings.durationMinutes}
              onChange={(e) => set("durationMinutes", Number(e.target.value))}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="pages">Target pages</FieldLabel>
            <Input
              id="pages"
              type="number"
              min={1}
              max={10}
              value={settings.targetPages}
              onChange={(e) => set("targetPages", Number(e.target.value))}
            />
            <FieldDescription>The print view can shrink the font to fit.</FieldDescription>
          </Field>
          {type === "MCQ" ? (
            <Field>
              <FieldLabel htmlFor="per-mcq">Marks per question</FieldLabel>
              <Input
                id="per-mcq"
                type="number"
                min={0.5}
                step={0.5}
                value={settings.mcqMarksPerQuestion}
                onChange={(e) => set("mcqMarksPerQuestion", Number(e.target.value))}
              />
            </Field>
          ) : (
            <Field>
              <FieldLabel htmlFor="answer-count">Questions to answer</FieldLabel>
              <Input
                id="answer-count"
                type="number"
                min={1}
                value={settings.cqAnswerCount}
                onChange={(e) => set("cqAnswerCount", Number(e.target.value))}
              />
            </Field>
          )}
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">
              Language<span className="text-destructive">*</span>
            </legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={settings.bangla} onCheckedChange={(on) => set("bangla", on === true)} />
                Bangla
              </Label>
              <Label className="flex items-center gap-2 font-normal">
                <Checkbox checked={settings.english} onCheckedChange={(on) => set("english", on === true)} />
                English
              </Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Both: only questions written in both languages are used, and either version can be printed.
            </p>
          </fieldset>
          <Field>
            <FieldLabel htmlFor="seed">Seed</FieldLabel>
            <div className="flex gap-2">
              <Input
                id="seed"
                type="number"
                min={1}
                value={seed}
                onChange={(e) => setSeed(Math.max(1, Math.floor(Number(e.target.value)) || 1))}
              />
              <Button type="button" variant="outline" size="icon" title="New seed" onClick={() => setSeed(newSeed())}>
                <DicesIcon />
                <span className="sr-only">New seed</span>
              </Button>
            </div>
            <FieldDescription>The same seed and blueprint give the same sets.</FieldDescription>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-base">Blueprint</CardTitle>
            <CardDescription>
              How many questions each chapter and level gives; the grey number is how many approved ones it has
              {type === "MCQ" ? " (a stimulus counts each question under it)" : ` of ${requirement.perQuestion} marks`}.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setCounts({})}>
              Clear
            </Button>
            <Button type="button" variant="secondary" size="sm" onClick={fill} disabled={!totalAvailable || !!requirement.error}>
              <WandSparklesIcon data-icon="inline-start" />
              Fill {target} automatically
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {chapters.length ? (
            <Table>
              <TableHeader className="bg-muted">
                <TableRow>
                  <TableHead>Chapter</TableHead>
                  {questionLevels.map((level) => (
                    <TableHead key={level} className="text-center">
                      {level}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {chapters.map((chapter) => {
                  const rowTotal = blueprint.filter((r) => r.chapterId === chapter.id).reduce((s, r) => s + r.count, 0)
                  return (
                    <TableRow key={chapter.id}>
                      <TableCell className="font-medium">{chapter.name}</TableCell>
                      {questionLevels.map((level) => {
                        const key = cellKey(chapter.id, level)
                        const max = available.get(chapter.id, level)
                        const over = (Number(counts[key]) || 0) > max
                        return (
                          <TableCell key={level} className="text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <Input
                                type="number"
                                min={0}
                                max={max}
                                value={counts[key] ?? ""}
                                onChange={(e) => setCounts((c) => ({ ...c, [key]: e.target.value }))}
                                disabled={!max && !counts[key]}
                                aria-label={`${chapter.name} ${level}`}
                                aria-invalid={over}
                                className="h-8 w-16 text-center tabular-nums"
                              />
                              <span className={cn("w-6 text-left text-xs tabular-nums", over ? "text-destructive" : "text-muted-foreground")}>
                                /{max}
                              </span>
                            </div>
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-right font-medium tabular-nums">{rowTotal || "—"}</TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell>Total</TableCell>
                  {questionLevels.map((level) => (
                    <TableCell key={level} className="text-center tabular-nums">
                      {levelTotal(level) || "—"}
                    </TableCell>
                  ))}
                  <TableCell className={cn("text-right tabular-nums", problem ? "text-destructive" : "text-emerald-600")}>
                    {total} / {type === "MCQ" ? requirement.questions : `≥${requirement.questions}`}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          ) : (
            <p className="p-6 text-sm text-muted-foreground">
              No chapter of {subjectName} for this class yet.{" "}
              <Link href="/questions/chapters" className="font-medium text-foreground underline underline-offset-4">
                Add chapters
              </Link>
            </p>
          )}
        </CardContent>
        <CardFooter className="flex-wrap justify-between gap-3 border-t">
          <div className="flex flex-col gap-1 text-sm">
            {problem && (
              <span className="flex items-center gap-2 text-destructive">
                <CircleAlertIcon className="size-4 shrink-0" />
                {problem}
              </span>
            )}
            {!problem && inTheWay.length > 0 && (
              <span className="flex items-center gap-2 text-amber-600">
                <TriangleAlertIcon className="size-4 shrink-0" />
                Set {inTheWay.join(", ")} already {inTheWay.length === 1 ? "has an answer key" : "have answer keys"}; generating
                replaces {inTheWay.length === 1 ? "it" : "them"}.
              </span>
            )}
          </div>
          <Button type="button" onClick={generate} disabled={!!problem || approved}>
            <WandSparklesIcon data-icon="inline-start" />
            {existing ? "Generate again" : "Generate"}
          </Button>
        </CardFooter>
      </Card>
    </>
  )
}
