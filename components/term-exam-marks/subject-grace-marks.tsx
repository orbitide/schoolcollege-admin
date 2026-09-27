"use client"

import * as React from "react"
import { TriangleAlertIcon } from "lucide-react"
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
import {
  applyGraceMarks,
  graceMarksFor,
  graceResultTypes,
  graceSubjectTypes,
  graceTargets,
  graceTypes,
  markIsPass,
  useTermExamMarks,
  type GraceAmounts,
  type GraceType,
} from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"

type Part = "theory" | "cq" | "mcq"
const partLabels: Record<Part, string> = { theory: "Theory", cq: "CQ", mcq: "MCQ" }

// Legacy "Grace Marks" (TermExamStudentMarks/SubjectGraceMarks): give one
// subject's students grace marks in bulk — all of them, or only those
// passing or failing it, compulsory or optional — either just enough to
// reach the pass marks or up to the full marks.
export function SubjectGraceMarks() {
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
  const [result, setResult] = React.useState<(typeof graceResultTypes)[number]>("All")
  const [subjectType, setSubjectType] = React.useState<(typeof graceSubjectTypes)[number]>("All")
  const [graceType, setGraceType] = React.useState<GraceType | "">("")
  const [amounts, setAmounts] = React.useState<Record<Part, string>>({ theory: "", cq: "", mcq: "" })
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
  const subject = exam?.subjects.find((s) => String(s.subjectId) === subjectId)
  const parts = subject
    ? (["theory", "cq", "mcq"] as Part[]).filter((p) => (p === "theory" ? subject.theoryMarks : p === "cq" ? subject.cqMarks : subject.mcqMarks) > 0)
    : []

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

  // "" leaves that part's grace as it is; a number (0 too) replaces it.
  const parsed: GraceAmounts = {
    theory: parts.includes("theory") && amounts.theory.trim() !== "" ? Number(amounts.theory) : null,
    cq: parts.includes("cq") && amounts.cq.trim() !== "" ? Number(amounts.cq) : null,
    mcq: parts.includes("mcq") && amounts.mcq.trim() !== "" ? Number(amounts.mcq) : null,
  }
  const amountsValid = Object.values(parsed).every((v) => v == null || (Number.isFinite(v) && v >= 0))

  // Legacy GraceMarkEnableStudentCount, kept live, plus what the grace does.
  const targets = React.useMemo(
    () =>
      exam && subject
        ? graceTargets(
            exam,
            { subjectId: subject.subjectId, sectionId: sectionId ? Number(sectionId) : null, result, subjectType },
            students
          )
        : [],
    // `marks` so the count follows saves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam, subject, sectionId, result, subjectType, students, marks]
  )
  const preview = React.useMemo(() => {
    if (!exam || !subject || !graceType || !amountsValid || Object.values(parsed).every((v) => v == null)) return null
    const after = graceMarksFor(exam, subject.subjectId, targets, graceType, parsed)
    let changed = 0
    let nowPass = 0
    after.forEach((m, i) => {
      const before = targets[i]
      if (m.totalMarks !== before.totalMarks || m.theoryGraceMarks !== before.theoryGraceMarks || m.cqGraceMarks !== before.cqGraceMarks || m.mcqGraceMarks !== before.mcqGraceMarks) changed++
      if (!markIsPass(subject, before) && markIsPass(subject, m)) nowPass++
    })
    return { changed, nowPass }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam, subject, targets, graceType, amounts, amountsValid])

  function check() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!exam) next.exam = "Select a term exam."
    else if (!exam.editEnable) next.exam = `${exam.name} is restricted to make any changes.`
    else if (!exam.hasGraceMarks) next.exam = `${exam.name} got no grace marks. Turn on "Has grace marks" on the exam.`
    if (!subject) next.subject = "Select a subject."
    if (!graceType) next.graceType = "Select a grace type."
    for (const p of parts) {
      const v = parsed[p]
      if (v != null && (!Number.isFinite(v) || v < 0)) next[p] = "Enter 0 or more."
    }
    if (subject && parts.every((p) => parsed[p] == null) && !parts.some((p) => next[p])) next.amounts = "Enter at least one grace marks."
    if (!Object.keys(next).length && !targets.length) next.amounts = "No student in scope has marks for this subject."
    setErrors(next)
    if (Object.keys(next).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    setConfirming(true)
  }

  function apply() {
    if (!exam || !subject || !graceType || !institute) return
    setConfirming(false)
    try {
      const count = applyGraceMarks(exam, institute, subject.subjectId, targets, graceType, parsed, user.name)
      toast.success(`Grace marks updated on ${count} items`, {
        description: "All students' marks result assigned. Generate the merit list again to update positions.",
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Grace marks could not be applied.")
    }
  }

  const graceText = parts
    .filter((p) => parsed[p] != null)
    .map((p) => `${partLabels[p]} ${parsed[p]}`)
    .join(", ")

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
          <CardTitle className="text-lg">Term Exam Grace Marks</CardTitle>
          <CardDescription>
            Give one subject&apos;s students grace marks in bulk. The grace you enter replaces any
            grace they already have for that part.
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
            options={examOptions.map((e) => ({
              value: String(e.id),
              label: e.hasGraceMarks ? e.fullName : `${e.fullName} (no grace marks)`,
            }))}
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
            options={(exam?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectLabel(s.subjectId) }))}
            placeholder={exam ? "Select subject" : "Select a term exam first"}
            error={errors.subject}
            disabled={!exam}
          />
          <FilterField
            label="Result type"
            value={result}
            onChange={(v) => setResult(v as typeof result)}
            options={graceResultTypes.map((r) => ({ value: r, label: r === "All" ? "All" : `${r} in this subject` }))}
          />
          <FilterField
            label="Subject type"
            value={subjectType}
            onChange={(v) => setSubjectType(v as typeof subjectType)}
            options={graceSubjectTypes.map((t) => ({ value: t, label: t }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-base">Grace marks</CardTitle>
          <CardDescription>
            {subject
              ? "Leave a part empty to keep its grace as it is; enter 0 to remove it."
              : "Select a term exam and subject to enter grace marks."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {exam && !exam.hasGraceMarks && (
            <p className="flex items-center gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <TriangleAlertIcon className="size-4 text-amber-600" />
              {exam.name} has no grace marks. Turn on &quot;Has grace marks&quot; on the exam first.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FilterField
              label="Grace type"
              required
              value={graceType}
              onChange={(v) => setGraceType(v as GraceType)}
              options={graceTypes.map((t) => ({ value: t, label: t === "Up to pass" ? "Up to pass marks" : "Up to full marks" }))}
              placeholder="Select grace type"
              error={errors.graceType}
            />
            {parts.map((p) => {
              const full = p === "theory" ? subject!.theoryMarks : p === "cq" ? subject!.cqMarks : subject!.mcqMarks
              const pass = p === "theory" ? subject!.theoryPassMarks : p === "cq" ? subject!.cqPassMarks : subject!.mcqPassMarks
              return (
                <Field key={p} data-invalid={!!errors[p]}>
                  <FieldLabel htmlFor={`grace-${p}`}>{partLabels[p]} grace</FieldLabel>
                  <Input
                    id={`grace-${p}`}
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Keep"
                    value={amounts[p]}
                    onChange={(e) => setAmounts((c) => ({ ...c, [p]: e.target.value }))}
                    aria-invalid={!!errors[p]}
                  />
                  <FieldDescription>
                    Full {full}, pass {pass}
                  </FieldDescription>
                  <FieldError>{errors[p]}</FieldError>
                </Field>
              )
            })}
          </div>
          {errors.amounts && <p className="text-sm text-destructive">{errors.amounts}</p>}
        </CardContent>
        <CardFooter className="flex-wrap items-center justify-between gap-3 border-t">
          <p className="text-sm text-muted-foreground">
            {subject ? (
              <>
                <span className="text-2xl font-semibold text-foreground tabular-nums">{targets.length}</span>{" "}
                student(s) in scope
                {preview && (
                  <>
                    {" "}
                    · {preview.changed} will change · {preview.nowPass} will pass the subject
                  </>
                )}
              </>
            ) : (
              "Select a subject to count its students."
            )}
          </p>
          <Button type="submit" disabled={!subject || !exam?.hasGraceMarks}>
            Apply grace marks
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply grace marks?</AlertDialogTitle>
            <AlertDialogDescription>
              {graceText} grace ({graceType === "Up to pass" ? "up to pass marks" : "up to full marks"}) for{" "}
              {targets.length} student(s) of {subject ? subjectLabel(subject.subjectId) : "the subject"} in{" "}
              {exam?.fullName}
              {sectionId ? `, section ${name("section", Number(sectionId))}` : ""}. It replaces their current grace
              for those parts
              {preview ? `; ${preview.changed} student(s) change and ${preview.nowPass} will pass` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={apply}>Apply</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
