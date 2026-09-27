"use client"

import * as React from "react"
import { TrashIcon, TriangleAlertIcon } from "lucide-react"
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
import {
  branchStore,
  classStore,
  groupStore,
  sectionStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums } from "@/lib/institutes"
import { useStudents } from "@/lib/students"
import { clearMarks, uploadedMarks, useTermExamMarks } from "@/lib/term-exam-marks"
import { useTermExams } from "@/lib/term-exams"

// Legacy "Marks Clear" (TermExamStudentMarks/ClearMarks): permanently delete
// a term exam's uploaded marks — all of them, or one section's and/or one
// subject's — so they can be uploaded again from scratch.
export function MarksClear() {
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

  // Legacy MarksCount, kept live instead of behind a button.
  const targets = React.useMemo(
    () =>
      exam
        ? uploadedMarks(
            exam,
            { subjectId: subjectId ? Number(subjectId) : null, sectionId: sectionId ? Number(sectionId) : null },
            students
          )
        : [],
    // `marks` so the count follows clears and uploads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [exam, subjectId, sectionId, students, marks]
  )
  const studentCount = new Set(targets.map((m) => m.studentId)).size

  const scopeText = [
    subjectId ? subjectLabel(Number(subjectId)) : "every subject",
    sectionId ? `section ${name("section", Number(sectionId))}` : "every section",
  ].join(", ")

  function check() {
    const next: Record<string, string> = {}
    if (!institute) next.institute = "Select an institute."
    if (!filter.class) next.class = "Select a class."
    if (!filter.year) next.year = "Select an academic year."
    if (!exam) next.exam = "Select a term exam."
    else if (!exam.editEnable) next.exam = `${exam.name} is restricted to make any changes.`
    else if (!targets.length) next.exam = "No uploaded marks to clear."
    setErrors(next)
    if (Object.keys(next).length) {
      toast.error(next.exam && Object.keys(next).length === 1 ? next.exam : "Check the highlighted fields.")
      return
    }
    setConfirming(true)
  }

  function clear() {
    if (!exam) return
    setConfirming(false)
    try {
      const count = clearMarks(exam, targets)
      toast.success("All marks cleared", {
        description: `${count} marks deleted from ${exam.fullName}. Generate the merit list again to update results.`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The marks could not be cleared.")
    }
  }

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
          <CardTitle className="text-lg">Term Exam Marks Clear</CardTitle>
          <CardDescription>
            Permanently delete a term exam&apos;s uploaded marks, so they can be uploaded again.
            Leave section and subject empty to clear the whole exam.
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
            value={subjectId}
            onChange={setSubjectId}
            options={(exam?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectLabel(s.subjectId) }))}
            allLabel="All subjects"
            disabled={!exam}
          />
        </CardContent>
        <CardFooter className="flex-wrap items-center justify-between gap-3 border-t">
          <p className="text-sm text-muted-foreground">
            {exam ? (
              <>
                <span className="text-2xl font-semibold text-foreground tabular-nums">{targets.length}</span> marks
                {targets.length > 0 && ` of ${studentCount} student(s)`} to clear
              </>
            ) : (
              "Select a term exam to count its marks."
            )}
          </p>
          <Button type="submit" variant="destructive" disabled={!exam || !targets.length}>
            <TrashIcon />
            Marks Clear
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <TriangleAlertIcon className="size-5 text-destructive" />
              Clear {targets.length} marks permanently?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The uploaded marks of {studentCount} student(s) in {exam?.fullName} ({scopeText}) will be
              deleted. This cannot be undone; they have to be uploaded again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={clear}>
              Clear marks
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </form>
  )
}
