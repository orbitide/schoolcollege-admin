import { examAttendanceSheet, type ExamAttendance } from "@/lib/exam-attendance"
import { academicVersions } from "@/lib/institutes"
import type { Student } from "@/lib/students"
import { examStudents } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptAttendance/ExamAttendanceSummaryReport ("Exam Attendance at a
// glance", ExamStudentAttendanceService.LoadExamAttendanceSummaryReportDetails):
// per section of an exam — under its group and version — its students and,
// per subject, how many sat (or were absent), out of those whose
// attendance was taken.

export type SubjectCount = { present: number; absent: number; taken: number }

export type ExamAttendanceSummaryRow = {
  sectionId: number
  groupId: number | null
  version: string
  students: number
  // Keyed by subject id; missing when nobody in the row takes it.
  subjects: Map<number, SubjectCount>
}

export type ExamAttendanceSummary = {
  subjectIds: number[]
  rows: ExamAttendanceSummaryRow[]
  students: number
  subjects: Map<number, SubjectCount>
}

const empty = (): SubjectCount => ({ present: 0, absent: 0, taken: 0 })

export function examAttendanceSummary(
  exam: TermExam,
  records: ExamAttendance[],
  students: Student[],
  narrow: { sectionId?: number; groupId?: number; version?: string },
  ranks: { group: Map<number, number>; section: Map<number, number> }
): ExamAttendanceSummary {
  const rows = new Map<string, ExamAttendanceSummaryRow>()
  const rowFor = (sectionId: number, groupId: number | null, version: string) => {
    const key = `${sectionId}|${groupId}|${version}`
    let row = rows.get(key)
    if (!row) {
      row = { sectionId, groupId, version, students: 0, subjects: new Map() }
      rows.set(key, row)
    }
    return row
  }

  // Every student of the exam in the row counts in Total Student.
  for (const { enrolment: e } of examStudents(exam, students)) {
    if (e.sectionId == null) continue
    if (narrow.sectionId != null && e.sectionId !== narrow.sectionId) continue
    if (narrow.groupId != null && e.groupId !== narrow.groupId) continue
    if (narrow.version && e.version !== narrow.version) continue
    rowFor(e.sectionId, e.groupId, e.version).students++
  }

  const total = new Map<number, SubjectCount>()
  for (const s of exam.subjects) {
    for (const { enrolment: e, record } of examAttendanceSheet(exam, s.subjectId, narrow, records, students)) {
      if (!record || e.sectionId == null) continue
      const row = rowFor(e.sectionId, e.groupId, e.version)
      const c = row.subjects.get(s.subjectId) ?? empty()
      const t = total.get(s.subjectId) ?? empty()
      for (const x of [c, t]) {
        x.taken++
        if (record.isPresent) x.present++
        else x.absent++
      }
      row.subjects.set(s.subjectId, c)
      total.set(s.subjectId, t)
    }
  }

  const rank = (map: Map<number, number>, id: number | null) => (id == null ? 1e9 : (map.get(id) ?? 1e9 - 1))
  const versionRank = (v: string) => {
    const i = academicVersions.indexOf(v as never)
    return i < 0 ? 1e9 : i
  }
  const ordered = [...rows.values()].sort(
    (a, b) =>
      rank(ranks.group, a.groupId) - rank(ranks.group, b.groupId) ||
      versionRank(a.version) - versionRank(b.version) ||
      rank(ranks.section, a.sectionId) - rank(ranks.section, b.sectionId)
  )
  return {
    subjectIds: exam.subjects.map((s) => s.subjectId),
    rows: ordered,
    students: ordered.reduce((sum, r) => sum + r.students, 0),
    subjects: total,
  }
}
