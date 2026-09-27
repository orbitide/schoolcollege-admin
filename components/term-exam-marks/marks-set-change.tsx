"use client"

import * as React from "react"
import { ArrowRightIcon, TriangleAlertIcon } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
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
import {
  changeSetCode,
  parseRolls,
  setCodeTargets,
  useTermExamMarks,
} from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"

// Legacy "Student Marks Set Change" (TermExamStudentMarks/
// StudentMarksSetChange): when students' MCQ sheets were uploaded under the
// wrong question set, move their marks of one subject from the old set code
// to the new one — for a section or everyone, and for listed rolls or all.
export function MarksSetChange() {
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const exams = useTermExams()
  const students = useStudents()
  const marks = useTermExamMarks()
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
  const [rollText, setRollText] = React.useState("")
  const [oldSetCode, setOldSetCode] = React.useState("")
  const [newSetCode, setNewSetCode] = React.useState("")
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
  // Set codes only belong to MCQ papers.
  const subjectOptions = (exam?.subjects ?? []).filter((s) => s.mcqMarks > 0)
  const subject = subjectOptions.find((s) => String(s.subjectId) === subjectId)
  const rolls = parseRolls(rollText)

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

  // Legacy StudentCount, kept live instead of behind a Count button.
  const scope = React.useMemo(
    () =>
      exam && subject && rolls
        ? setCodeTargets(
            exam,
            {
              subjectId: subject.subjectId,
              sectionId: sectionId ? Number(sectionId) : null,
              rolls,
              oldSetCode: oldSetCode.trim() || undefined,
            },
            students
          )
        : null,
    // `marks` so the counts follow saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam, subject, sectionId, rollText, oldSetCode, students, marks]
  )
  const setCounts = new Map<string, number>()
  for (const m of scope?.inScope ?? []) {
    const code = m.setCode.trim() || "—"
    setCounts.set(code, (setCounts.get(code) ?? 0) + 1)
  }

  function check() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!exam) next.exam = "Select a term exam."
    else if (!exam.editEnable) next.exam = `${exam.name} is restricted to make any changes.`
    if (!subject) next.subject = "Select a subject."
    if (rolls === null) next.rolls = "Use roll numbers separated by commas."
    if (!oldSetCode.trim()) next.oldSetCode = "Enter the old set code."
    if (!newSetCode.trim()) next.newSetCode = "Enter the new set code."
    else if (oldSetCode.trim() && oldSetCode.trim().toUpperCase() === newSetCode.trim().toUpperCase())
      next.newSetCode = "Old and new set code can't be the same."
    if (!Object.keys(next).length && scope) {
      if (rolls?.length && scope.invalidRolls.length === rolls.length) next.rolls = "No valid student found."
      else if (!scope.marks.length) next.oldSetCode = `No student marks found on set code ${oldSetCode.trim().toUpperCase()}.`
    }
    setErrors(next)
    if (Object.keys(next).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    setConfirming(true)
  }

  function submit() {
    if (!exam || !scope) return
    setConfirming(false)
    try {
      const changed = changeSetCode(exam, scope.marks, newSetCode, user.name)
      toast.success(`${changed} student(s) set code changed.`, {
        description: scope.invalidRolls.length
          ? `${scope.invalidRolls.join(", ")} roll(s) are invalid and were skipped.`
          : undefined,
      })
      setOldSetCode("")
      setNewSetCode("")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The set code could not be changed.")
    }
  }

  const oldCode = oldSetCode.trim().toUpperCase()
  const newCode = newSetCode.trim().toUpperCase()

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
          <CardTitle className="text-lg">Term Exam Student Marks Set Change</CardTitle>
          <CardDescription>
            Move students&apos; marks of one subject from one question set code to another. Only the
            set code changes; MCQ marks are not rescored.
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
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Set code</CardTitle>
          <CardDescription>
            {subject && scope
              ? setCounts.size
                ? "Uploaded marks in scope by set code:"
                : "No marks uploaded for this subject in scope."
              : "Select a term exam and subject to see its set codes."}
            {setCounts.size > 0 && (
              <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                {[...setCounts].sort(([a], [b]) => a.localeCompare(b)).map(([code, count]) => (
                  <Badge key={code} variant="secondary">
                    {code}: {count}
                  </Badge>
                ))}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.rolls} className="sm:col-span-2">
              <FieldLabel htmlFor="set-rolls">Student roll(s)</FieldLabel>
              <Textarea
                id="set-rolls"
                rows={2}
                placeholder="Comma separated, e.g. 1, 4, 12. Leave empty for every student."
                value={rollText}
                onChange={(e) => setRollText(e.target.value)}
                aria-invalid={!!errors.rolls}
              />
              {scope && scope.invalidRolls.length > 0 && !errors.rolls && (
                <FieldDescription className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
                  <TriangleAlertIcon className="size-3.5" />
                  {scope.invalidRolls.join(", ")} roll(s) have no marks for this subject and will be skipped.
                </FieldDescription>
              )}
              <FieldError>{errors.rolls}</FieldError>
            </Field>
            <Field data-invalid={!!errors.oldSetCode}>
              <FieldLabel htmlFor="old-set">
                Old set code
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <Input
                id="old-set"
                maxLength={1}
                placeholder="e.g. A"
                className="uppercase"
                value={oldSetCode}
                onChange={(e) => setOldSetCode(e.target.value)}
                aria-invalid={!!errors.oldSetCode}
              />
              <FieldError>{errors.oldSetCode}</FieldError>
            </Field>
            <Field data-invalid={!!errors.newSetCode}>
              <FieldLabel htmlFor="new-set">
                New set code
                <span className="text-destructive" aria-hidden>
                  *
                </span>
              </FieldLabel>
              <Input
                id="new-set"
                maxLength={1}
                placeholder="e.g. B"
                className="uppercase"
                value={newSetCode}
                onChange={(e) => setNewSetCode(e.target.value)}
                aria-invalid={!!errors.newSetCode}
              />
              <FieldError>{errors.newSetCode}</FieldError>
            </Field>
          </div>
          <div className="flex min-w-40 flex-col items-center justify-center rounded-lg border bg-muted/40 px-6 py-4 text-center">
            <div className="text-4xl font-semibold tabular-nums">{scope && oldSetCode.trim() ? scope.marks.length : "-"}</div>
            <div className="text-sm text-muted-foreground">
              {oldSetCode.trim() ? `Students on set ${oldCode}` : "Students"}
            </div>
          </div>
        </CardContent>
        <CardFooter className="justify-end border-t">
          <Button type="submit" disabled={!subject}>
            Change set code
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              Change set {oldCode} <ArrowRightIcon className="size-4" /> {newCode}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {scope?.marks.length} student(s) of {subject ? subjectLabel(subject.subjectId) : "the subject"} in{" "}
              {exam?.fullName}
              {sectionId ? `, section ${name("section", Number(sectionId))}` : ""} will have their set code
              changed. Their MCQ marks stay as they are.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={submit}>Change set code</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
