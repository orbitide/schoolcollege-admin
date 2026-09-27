"use client"

import * as React from "react"
import Link from "next/link"
import { CalculatorIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
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
  branchStore,
  classStore,
  groupStore,
  sectionStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import { academicMediums } from "@/lib/institutes"
import { useStudents } from "@/lib/students"
import { useTermExamAnswers } from "@/lib/term-exam-answers"
import {
  recalculateMarks,
  recalculationTargets,
  rescoredMarks,
  useTermExamMarks,
} from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"

// Legacy "Marks Recalculation" (TermExamStudentMarks/MarksRecalculation):
// after a correct answer key is fixed, score one subject's uploaded MCQ
// answer sheets on that set code again, so their MCQ marks, answer counts
// and totals follow the new key.
export function MarksRecalculation() {
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const students = useStudents()
  const marks = useTermExamMarks()
  const answers = useTermExamAnswers()
  const name = useStudentLookups()

  const [instituteId, setInstituteId] = React.useState(
    institutes.length === 1 ? String(institutes[0].id) : ""
  )
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const subjectList = subjectStore.useList(iid)

  const [filter, setFilter] = React.useState({ medium: "", class: "", year: "", group: "", branch: "" })
  const [sectionId, setSectionId] = React.useState("")
  const [examId, setExamId] = React.useState("")
  const [subjectId, setSubjectId] = React.useState("")
  const [setCode, setSetCode] = React.useState("")
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({})
  const [confirming, setConfirming] = React.useState(false)

  const selectedClass = classes.find((c) => String(c.id) === filter.class)
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const is = (value: number | null, key: keyof typeof filter) => !filter[key] || String(value) === filter[key]
  const sectionOptions = sections.filter(
    (s) =>
      s.status === "Active" &&
      String(s.classId) === filter.class &&
      (s.branchId == null || is(s.branchId, "branch")) &&
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
      is(e.branchId, "branch")
  )
  const exam = examOptions.find((e) => String(e.id) === examId)
  // Only MCQ papers have answer sheets to score.
  const subjectOptions = (exam?.subjects ?? []).filter((s) => s.mcqMarks > 0)
  const subject = subjectOptions.find((s) => String(s.subjectId) === subjectId)
  const code = setCode.trim().toUpperCase()

  function setStructure(updates: Partial<typeof filter>) {
    setFilter((current) => ({ ...current, ...updates }))
    setSectionId("")
    setExamId("")
    setSubjectId("")
  }

  const subjectLabel = (id: number) => {
    const s = subjectList.find((x) => x.id === id)
    return s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : name("subject", id)
  }

  const subjectKeys = answers.filter((a) => exam && subject && a.termExamId === exam.id && a.subjectId === subject.subjectId)
  const answerKey = subjectKeys.find((a) => a.setCode.trim().toUpperCase() === code)

  // Legacy MarksRecalculationCount, kept live, plus what would change.
  const scope = React.useMemo(() => {
    if (!exam || !subject || !code) return null
    const targets = recalculationTargets(
      exam,
      { subjectId: subject.subjectId, sectionId: sectionId ? Number(sectionId) : null, setCode: code },
      students
    )
    const rescored = answerKey ? rescoredMarks(exam, subject.subjectId, targets.withSheet, answerKey.answer) : []
    return { ...targets, changed: rescored.filter((r) => r.changed).length }
    // `marks` so the counts follow saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, subject, sectionId, code, students, answerKey, marks])

  function check() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!exam) next.exam = "Select a term exam."
    else if (!exam.editEnable) next.exam = `${exam.name} is restricted to make any changes.`
    if (!subject) next.subject = "Select a subject."
    if (!code) next.setCode = "Enter the set code."
    else if (subject && !answerKey) next.setCode = `No correct answer saved for set ${code}.`
    else if (scope && !scope.onSet.length) next.setCode = `No student marks found on set ${code}.`
    else if (scope && !scope.withSheet.length) next.setCode = `None of the marks on set ${code} have an answer sheet to score.`
    setErrors(next)
    if (Object.keys(next).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    setConfirming(true)
  }

  function recalculate() {
    if (!exam || !subject || !institute || !scope || !answerKey) return
    setConfirming(false)
    try {
      const result = recalculateMarks(exam, institute, subject.subjectId, scope.withSheet, answerKey.answer, user.name)
      toast.success(`${result.recalculated} data recalculated`, {
        description: result.changed
          ? `${result.changed} students' MCQ marks changed. Generate the merit list again to update positions.`
          : "No MCQ marks changed.",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The marks could not be recalculated.")
    }
  }

  const skipped = scope ? scope.onSet.length - scope.withSheet.length : 0

  return (
    <form
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
      onSubmit={(event) => {
        event.preventDefault()
        check()
      }}
    >
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Term Exam Marks Recalculation</CardTitle>
          <CardDescription>
            Score a subject&apos;s MCQ answer sheets on one set code again against its{" "}
            <Link href="/term-exam/correct-answers" className="underline underline-offset-4">
              correct answers
            </Link>
            , after the key is corrected.
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
                setStructure({ medium: "", class: "", year: "", group: "", branch: "" })
              }}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
              error={errors.institute}
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
          <FilterField
            label="Section"
            value={sectionId}
            onChange={setSectionId}
            options={sectionOptions.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!filter.class}
          />
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
            required
            value={subjectId}
            onChange={setSubjectId}
            options={subjectOptions.map((s) => ({ value: String(s.subjectId), label: subjectLabel(s.subjectId) }))}
            placeholder={exam ? (subjectOptions.length ? "Select subject" : "No MCQ subject") : "Select a term exam first"}
            error={errors.subject}
            disabled={!exam}
          />
          <Field data-invalid={!!errors.setCode}>
            <FieldLabel htmlFor="recalc-set">
              Set code
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id="recalc-set"
              maxLength={1}
              placeholder="e.g. A"
              className="uppercase"
              value={setCode}
              onChange={(e) => setSetCode(e.target.value)}
              aria-invalid={!!errors.setCode}
              disabled={!subject}
            />
            {subject && (
              <FieldDescription className="flex flex-wrap items-center gap-1.5">
                {subjectKeys.length ? (
                  <>
                    Keys saved for set
                    {subjectKeys.map((k) => (
                      <Badge
                        key={k.id}
                        variant={k.setCode.trim().toUpperCase() === code ? "default" : "secondary"}
                        className="cursor-pointer"
                        onClick={() => setSetCode(k.setCode)}
                      >
                        {k.setCode}
                      </Badge>
                    ))}
                  </>
                ) : (
                  "No correct answers saved for this subject."
                )}
              </FieldDescription>
            )}
            <FieldError>{errors.setCode}</FieldError>
          </Field>
        </CardContent>
        <CardFooter className="flex-wrap items-center justify-between gap-3 border-t">
          <div className="flex flex-col gap-1 text-sm text-muted-foreground">
            {scope ? (
              <>
                <p>
                  <span className="text-2xl font-semibold text-foreground tabular-nums">{scope.withSheet.length}</span>{" "}
                  answer sheet(s) on set {code}
                  {answerKey && scope.withSheet.length > 0 && ` · ${scope.changed} will change`}
                </p>
                {skipped > 0 && (
                  <p className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
                    <TriangleAlertIcon className="size-3.5" />
                    {skipped} mark(s) on set {code} were uploaded without an answer sheet and are left as they are.
                  </p>
                )}
              </>
            ) : (
              <p>Select a subject and set code to count the answer sheets.</p>
            )}
          </div>
          <Button type="submit" disabled={!subject}>
            <CalculatorIcon />
            Recalculate
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recalculate set {code} marks?</AlertDialogTitle>
            <AlertDialogDescription>
              {scope?.withSheet.length} answer sheet(s) of {subject ? subjectLabel(subject.subjectId) : "the subject"} in{" "}
              {exam?.fullName}
              {sectionId ? `, section ${name("section", Number(sectionId))}` : ""} will be scored again against the
              set {code} correct answers; {scope?.changed ?? 0} student(s)&apos; MCQ marks change. Pass status is
              regenerated afterwards.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={recalculate}>Recalculate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
