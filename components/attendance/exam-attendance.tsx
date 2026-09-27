"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ClipboardCheckIcon, ClipboardListIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { classRollLabel, studentIdLabel } from "@/components/students/student-lookups"
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
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  sectionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  examAttendanceSheet,
  saveExamAttendance,
  useExamAttendance,
  type ExamAttendanceRow,
} from "@/lib/exam-attendance"
import { academicMediums, academicVersions, type Institute } from "@/lib/institutes"
import { todayIso } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { useTermExams, type TermExam } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

// Legacy "Exam Attendance By Admin" (StudentAttendance/AdminExamAttendance):
// pick a term exam and subject (and optionally a section), tick who sat it,
// and save. Taking it again updates what was saved.
export function ExamAttendance() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const students = useStudents()
  const records = useExamAttendance()
  const exams = useTermExams()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const subjects = subjectStore.useList(iid)

  const year = param("year") || String(years.find((y) => y.isCurrent)?.id ?? "")
  const medium = param("medium")
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const classSections = sections.filter(
    (s) =>
      s.status === "Active" &&
      s.classId === selectedClass?.id &&
      (!param("branch") || s.branchId == null || String(s.branchId) === param("branch")) &&
      (!param("shift") || s.shiftId == null || String(s.shiftId) === param("shift")) &&
      (!param("version") || !s.version || s.version === param("version")) &&
      (!param("group") || s.groupId == null || String(s.groupId) === param("group"))
  )
  const section = classSections.find((s) => String(s.id) === param("section"))
  const examOptions = exams.filter(
    (e) =>
      e.status === "Active" &&
      e.instituteId === iid &&
      e.classId === selectedClass?.id &&
      String(e.yearId) === year &&
      (!medium || !e.medium || e.medium === medium)
  )
  const exam = examOptions.find((e) => String(e.id) === param("exam"))
  const subject = exam?.subjects.find((s) => String(s.subjectId) === param("subject"))
  const subjectName = (id: number) => {
    const s = subjects.find((x) => x.id === id)
    return s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : String(id)
  }

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  const num = (key: string) => (param(key) ? Number(param(key)) : null)
  const ready = institute && selectedClass && year && exam && subject
  const rows = ready
    ? examAttendanceSheet(
        exam,
        subject.subjectId,
        {
          sectionId: section?.id ?? null,
          branchId: num("branch"),
          shiftId: num("shift"),
          groupId: num("group"),
          version: param("version"),
        },
        records,
        students
      )
    : []
  const missing = [
    !institute && "institute",
    !selectedClass && "class",
    !year && "academic year",
    !exam && "term exam",
    !subject && "subject",
  ].filter(Boolean)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Exam Attendance By Admin</CardTitle>
          <CardDescription>
            Pick a term exam and subject, tick the students who sat it, and save. Leave the
            section empty to take the whole class at once.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) =>
                setParam({ institute: v, medium: "", class: "", year: "", group: "", branch: "", version: "", shift: "", section: "", exam: "", subject: "" })
              }
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v, section: "" })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {institute?.enableMedium && (
            <FilterField
              label="Academic medium"
              value={medium}
              onChange={(v) => setParam({ medium: v, class: "", group: "", section: "", exam: "", subject: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <FilterField
            label="Class"
            required
            value={param("class")}
            onChange={(v) => setParam({ class: v, group: "", section: "", exam: "", subject: "" })}
            options={classes
              .filter((c) => c.status === "Active" && (!medium || !c.medium || c.medium === medium))
              .map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={institute ? "Select class" : "Select an institute first"}
            disabled={!institute}
          />
          <FilterField
            label="Academic year"
            required
            value={year}
            onChange={(v) => setParam({ year: v, exam: "", subject: "" })}
            options={years.map((y) => ({ value: String(y.id), label: y.name }))}
            placeholder={institute ? "Select year" : "Select an institute first"}
            disabled={!institute}
          />
          {classGroups.length > 0 && (
            <FilterField
              label="Academic group"
              value={param("group")}
              onChange={(v) => setParam({ group: v, section: "" })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {institute?.enableVersion && (
            <FilterField
              label="Academic version"
              value={param("version")}
              onChange={(v) => setParam({ version: v, section: "" })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
          {institute?.enableShift && (
            <FilterField
              label="Shift"
              value={param("shift")}
              onChange={(v) => setParam({ shift: v, section: "" })}
              options={shifts.map((s) => ({ value: String(s.id), label: s.name }))}
              allLabel="All shifts"
            />
          )}
          <FilterField
            label="Section"
            value={param("section")}
            onChange={(v) => setParam({ section: v })}
            options={classSections.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!selectedClass}
          />
          <FilterField
            label="Term exam"
            required
            value={param("exam")}
            onChange={(v) => setParam({ exam: v, subject: "" })}
            options={examOptions.map((e) => ({ value: String(e.id), label: e.fullName }))}
            placeholder={
              selectedClass && year ? (examOptions.length ? "Select term exam" : "No active exam") : "Select class and year first"
            }
            disabled={!selectedClass || !year}
          />
          <FilterField
            label="Subject"
            required
            value={param("subject")}
            onChange={(v) => setParam({ subject: v })}
            options={(exam?.subjects ?? []).map((s) => ({ value: String(s.subjectId), label: subjectName(s.subjectId) }))}
            placeholder={exam ? "Select subject" : "Select a term exam first"}
            disabled={!exam}
          />
        </CardContent>
      </Card>

      {ready ? (
        <ExamAttendanceSheet
          key={`${exam.id}|${subject.subjectId}|${param("section")}|${param("branch")}|${param("shift")}|${param("group")}|${param("version")}`}
          institute={institute}
          exam={exam}
          subjectId={subject.subjectId}
          rows={rows}
          title={`${exam.fullName} · ${subjectName(subject.subjectId)}`}
          scope={`${selectedClass.name}${section ? `, Section ${section.name}` : ", all sections"}`}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardListIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Select the {missing.join(", ")}.</p>
            <p className="text-sm text-muted-foreground">
              The students who take the subject are listed here to take exam attendance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function ExamAttendanceSheet({
  institute,
  exam,
  subjectId,
  rows,
  title,
  scope,
}: {
  institute: Institute
  exam: TermExam
  subjectId: number
  rows: ExamAttendanceRow[]
  title: string
  scope: string
}) {
  const user = useCurrentUser()
  // What is ticked now; starts from what was saved (unsaved means absent,
  // as in the legacy sheet).
  const [present, setPresent] = React.useState<Record<number, boolean>>(() =>
    Object.fromEntries(rows.map(({ student, record }) => [student.id, record?.isPresent ?? false]))
  )
  const [confirming, setConfirming] = React.useState(false)

  const isPresent = (id: number) => present[id] ?? false
  const presentCount = rows.filter(({ student }) => isPresent(student.id)).length
  const absentCount = rows.length - presentCount
  const taken = rows.filter((row) => row.record)
  const lastSaved = taken
    .map((row) => row.record!)
    .sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt))[0]
  const unsaved = rows.filter(({ student, record }) => record?.isPresent !== isPresent(student.id)).length
  const allPresent = rows.length > 0 && presentCount === rows.length
  const showRoll = institute.showClassRoll
  const actionLabel = taken.length ? "Update attendance" : "Take attendance"
  const notHeld = exam.examStart && exam.examStart > todayIso()

  function toggle(id: number, value = !isPresent(id)) {
    setPresent((current) => ({ ...current, [id]: value }))
  }

  function markAll(value: boolean) {
    setPresent(Object.fromEntries(rows.map(({ student }) => [student.id, value])))
  }

  function save() {
    setConfirming(false)
    try {
      const { added, updated } = saveExamAttendance(
        exam,
        subjectId,
        rows.map(({ student, enrolment }) => ({
          studentId: student.id,
          sectionId: enrolment.sectionId,
          isPresent: isPresent(student.id),
        })),
        user.name
      )
      if (!added && !updated) toast.info("Nothing changed", { description: "The saved attendance already matches." })
      else
        toast.success("Exam attendance taken successfully", {
          description: [added && `${added} added`, updated && `${updated} updated`].filter(Boolean).join(", "),
        })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The attendance could not be saved.")
    }
  }

  const stats = [
    { label: "Total students", value: rows.length, className: "text-foreground" },
    { label: "Present", value: presentCount, className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Absent", value: absentCount, className: "text-rose-600 dark:text-rose-400" },
  ]

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>{title}</CardTitle>
        <CardDescription>
          {scope} ·{" "}
          {lastSaved
            ? `Taken; last saved by ${lastSaved.modifiedBy} at ${lastSaved.modifiedAt.slice(11, 16)} on ${lastSaved.modifiedAt.slice(0, 10)}.`
            : "Exam attendance not taken yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {notHeld && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>This exam starts on {exam.examStart}. You can still take attendance.</span>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <div className="grid flex-1 grid-cols-3 divide-x rounded-lg border">
            {stats.map((stat) => (
              <div key={stat.label} className="flex flex-col items-center gap-0.5 px-2 py-3">
                <span className={cn("text-2xl font-semibold tabular-nums", stat.className)}>{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
            ))}
          </div>
          <Button
            type="button"
            className="h-auto min-h-10 sm:w-48"
            onClick={() => setConfirming(true)}
            disabled={!rows.length}
          >
            <ClipboardCheckIcon data-icon="inline-start" />
            {actionLabel}
          </Button>
        </div>

        {rows.length ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground">
                {unsaved
                  ? `${unsaved} student${unsaved === 1 ? "" : "s"} differ from what is saved.`
                  : "Everything ticked is saved."}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => markAll(true)}>
                  All present
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => markAll(false)}>
                  All absent
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    <TableHead>{showRoll ? classRollLabel(institute) : studentIdLabel(institute)}</TableHead>
                    <TableHead>Student name</TableHead>
                    <TableHead className="w-28">
                      <label className="flex items-center gap-2">
                        <Checkbox
                          checked={allPresent ? true : presentCount > 0 ? "indeterminate" : false}
                          onCheckedChange={(checked) => markAll(checked === true)}
                          aria-label="Mark all present"
                        />
                        Present
                      </label>
                    </TableHead>
                    <TableHead>Saved</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(({ student, enrolment, record }, index) => {
                    const here = isPresent(student.id)
                    return (
                      <TableRow
                        key={student.id}
                        className="cursor-pointer"
                        data-state={here ? "selected" : undefined}
                        onClick={() => toggle(student.id)}
                      >
                        <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="tabular-nums">
                          {showRoll ? enrolment.classRoll || "—" : student.studentIdentificationNo}
                        </TableCell>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell onClick={(event) => event.stopPropagation()}>
                          <Checkbox
                            className="size-5"
                            checked={here}
                            onCheckedChange={(checked) => toggle(student.id, checked === true)}
                            aria-label={`${student.name} present`}
                          />
                        </TableCell>
                        <TableCell>
                          {record ? (
                            <Badge
                              variant="outline"
                              className={
                                record.isPresent
                                  ? "border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                  : "border-rose-500/40 text-rose-700 dark:text-rose-400"
                              }
                            >
                              {record.isPresent ? "Present" : "Absent"}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Not taken</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
            <div className="flex justify-center">
              <Button type="button" onClick={() => setConfirming(true)}>
                <ClipboardCheckIcon data-icon="inline-start" />
                {actionLabel}
              </Button>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active student here takes this subject.
          </p>
        )}
      </CardContent>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Save exam attendance?</AlertDialogTitle>
            <AlertDialogDescription>
              Total present: <strong className="text-foreground">{presentCount}</strong> and total
              absent: <strong className="text-foreground">{absentCount}</strong> for {title}, {scope}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={save}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
