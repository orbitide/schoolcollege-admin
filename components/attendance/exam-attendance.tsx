"use client"

import * as React from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ClipboardListIcon } from "lucide-react"

import { AttendanceSheet, savedKey } from "@/components/attendance/attendance-sheet"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { examAttendanceSheet, saveExamAttendance, useExamAttendance } from "@/lib/exam-attendance"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { todayIso } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { useTermExams } from "@/lib/term-exams"

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
  const user = useCurrentUser()
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
  // Legacy LoadTermExam(isEditable: true, isOnlinePublish: false): only
  // exams still open for editing and not published online, latest result
  // first. Attendance of a locked exam would no longer match its results.
  const classExams = exams.filter(
    (e) =>
      e.status === "Active" &&
      e.instituteId === iid &&
      e.classId === selectedClass?.id &&
      String(e.yearId) === year &&
      (!medium || !e.medium || e.medium === medium)
  )
  const examOptions = classExams
    .filter((e) => e.editEnable && !e.onlinePublished)
    .sort((a, b) => b.resultPublish.localeCompare(a.resultPublish))
  const lockedExams = classExams.length - examOptions.length
  const exam = examOptions.find((e) => String(e.id) === param("exam"))
  const subject = exam?.subjects.find((s) => String(s.subjectId) === param("subject"))
  const subjectName = (id: number) => {
    const s = subjects.find((x) => x.id === id)
    return s ? `${s.name}${s.code ? ` (${s.code})` : ""}` : String(id)
  }
  // Subjects already taken for the exam, marked in the subject list.
  const takenSubjects = new Set(
    exam ? records.filter((r) => r.termExamId === exam.id).map((r) => r.subjectId) : []
  )

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
              selectedClass && year ? (examOptions.length ? "Select term exam" : "No open exam") : "Select class and year first"
            }
            disabled={!selectedClass || !year}
          />
          <FilterField
            label="Subject"
            required
            value={param("subject")}
            onChange={(v) => setParam({ subject: v })}
            options={(exam?.subjects ?? []).map((s) => ({
              value: String(s.subjectId),
              label: `${subjectName(s.subjectId)}${takenSubjects.has(s.subjectId) ? " · taken" : ""}`,
            }))}
            placeholder={exam ? "Select subject" : "Select a term exam first"}
            disabled={!exam}
          />
        </CardContent>
      </Card>

      {ready ? (
        <AttendanceSheet
          key={`${exam.id}|${subject.subjectId}|${param("section")}|${param("branch")}|${param("shift")}|${param("group")}|${param("version")}|${savedKey(rows)}`}
          institute={institute}
          rows={rows}
          title={`${exam.fullName} · ${subjectName(subject.subjectId)}`}
          context={`${selectedClass.name}${section ? `, Section ${section.name}` : ", all sections"}`}
          note={
            exam.examStart && exam.examStart > todayIso()
              ? `This exam starts on ${exam.examStart}.`
              : undefined
          }
          emptyText="No active student here takes this subject."
          // Legacy lists each student's section when the whole class shows.
          sectionName={
            section ? undefined : (id) => sections.find((s) => s.id === id)?.name ?? "—"
          }
          onSave={(entries) => saveExamAttendance(exam, subject.subjectId, entries, user.name)}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <ClipboardListIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">Select the {missing.join(", ")}.</p>
            <p className="text-sm text-muted-foreground">
              The students who take the subject are listed here to take exam attendance.
            </p>
            {selectedClass && lockedExams > 0 && (
              <p className="text-sm text-muted-foreground">
                {lockedExams} exam{lockedExams === 1 ? " is" : "s are"} hidden because editing is off or
                results are published online.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
