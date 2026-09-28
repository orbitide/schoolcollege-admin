import { academicVersions, type AcademicGroup, type Section } from "@/lib/institutes"
import type { MeritList } from "@/lib/merit-lists"
import type { Student } from "@/lib/students"
import { examStudents, takesSubject } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptSummary/FailedSummary ("Subject wise failed Statistics",
// TermExamStudentMarksRepository.LoadTermExamStudentFailedSummary): per
// section, and per subject within it, how many students take it, failed it
// or were absent from it, with a table per academic group. Works on the
// exam's merit list, so it needs one generated.
//
// Where the legacy is off, this follows what it means to show:
// - "Without Optional" leaves each student's optional subject out; the
//   legacy SQL filters the other way round, counting optional takers absent.
// - A section's Total Failed / Absent count its students (failed any counted
//   subject / sat none), not the worst single subject's count.
// - Subject cells line up by subject, not by position in the section's list.

export type FailedCounts = { total: number; failed: number; absent: number }

export type FailedSummaryRow = FailedCounts & {
  sectionId: number
  groupId: number | null
  version: string
  // By subject id; a subject nobody in the section takes has no entry.
  subjects: Map<number, FailedCounts>
}

export type FailedSummaryTable = {
  groupId: number | null
  // The exam's subjects someone in the table takes, in the exam's order.
  subjectIds: number[]
  rows: FailedSummaryRow[]
  total: FailedCounts & { subjects: Map<number, FailedCounts> }
}

export type FailedSummary = {
  tables: FailedSummaryTable[]
  // Across the tables when there are several; its subjects are those in
  // more than one table, as the legacy grand total shows.
  grandTotal?: FailedCounts & { subjectIds: number[]; subjects: Map<number, FailedCounts> }
}

const emptyCounts = (): FailedCounts => ({ total: 0, failed: 0, absent: 0 })

function add(into: FailedCounts, c: FailedCounts) {
  into.total += c.total
  into.failed += c.failed
  into.absent += c.absent
}

function addSubject(into: Map<number, FailedCounts>, subjectId: number, c: FailedCounts) {
  const counts = into.get(subjectId) ?? emptyCounts()
  add(counts, c)
  into.set(subjectId, counts)
}

export function failedSummary(
  exam: TermExam,
  list: MeritList,
  students: Student[],
  sections: Section[],
  groups: AcademicGroup[],
  options: { grouped: boolean; withoutOptional: boolean }
): FailedSummary {
  const results = new Map(list.results.map((r) => [r.studentId, r]))
  const sectionOf = new Map(sections.map((s) => [s.id, s]))
  const rows = new Map<number, FailedSummaryRow>()

  // Everyone enrolled counts, even without a result (legacy LEFT JOIN);
  // students without a section are left out, as there.
  for (const { student, enrolment: e } of examStudents(exam, students)) {
    if (e.sectionId == null) continue
    let row = rows.get(e.sectionId)
    if (!row) {
      const section = sectionOf.get(e.sectionId)
      row = {
        ...emptyCounts(),
        sectionId: e.sectionId,
        // The section's group and version, as the legacy groups by them.
        groupId: section?.groupId ?? e.groupId,
        version: section?.version || e.version,
        subjects: new Map(),
      }
      rows.set(e.sectionId, row)
    }

    const marks = new Map((results.get(student.id)?.marks ?? []).map((m) => [m.subjectId, m]))
    let counted = 0
    let failed = false
    let sat = false
    for (const { subjectId } of exam.subjects) {
      if (!takesSubject(e, subjectId)) continue
      if (options.withoutOptional && e.optionalSubjectId === subjectId) continue
      const mark = marks.get(subjectId)
      const cell = { total: 1, failed: mark && !mark.isPass ? 1 : 0, absent: mark ? 0 : 1 }
      addSubject(row.subjects, subjectId, cell)
      counted++
      if (mark) sat = true
      if (cell.failed) failed = true
    }
    if (!counted) continue
    row.total++
    if (!sat) row.absent++
    else if (failed) row.failed++
  }

  // Legacy order: group, version, then section.
  const sectionRank = new Map(sections.map((s) => [s.id, s.rank]))
  const ordered = [...rows.values()]
    .filter((r) => r.total > 0)
    .sort(
      (a, b) =>
        academicVersions.indexOf(a.version as never) - academicVersions.indexOf(b.version as never) ||
        (sectionRank.get(a.sectionId) ?? Infinity) - (sectionRank.get(b.sectionId) ?? Infinity)
    )

  // A table per group when the class has groups, else one for the class.
  const byGroup = new Map<string, FailedSummaryRow[]>()
  for (const row of ordered) {
    const key = options.grouped ? String(row.groupId) : "class"
    byGroup.set(key, [...(byGroup.get(key) ?? []), row])
  }
  const examOrder = exam.subjects.map((s) => s.subjectId)
  const groupRank = new Map(groups.map((g) => [g.id, g.rank]))
  const rank = (id: number | null) => (id == null ? Infinity : (groupRank.get(id) ?? Infinity))
  const tables = [...byGroup.values()].map((groupRows): FailedSummaryTable => {
    const total = { ...emptyCounts(), subjects: new Map<number, FailedCounts>() }
    for (const row of groupRows) {
      add(total, row)
      for (const [subjectId, c] of row.subjects) addSubject(total.subjects, subjectId, c)
    }
    return {
      groupId: options.grouped ? groupRows[0].groupId : null,
      subjectIds: examOrder.filter((id) => total.subjects.has(id)),
      rows: groupRows,
      total,
    }
  })
  tables.sort((a, b) => rank(a.groupId) - rank(b.groupId))

  if (tables.length < 2) return { tables }
  const grandTotal = { ...emptyCounts(), subjectIds: [] as number[], subjects: new Map<number, FailedCounts>() }
  for (const table of tables) {
    add(grandTotal, table.total)
    for (const [subjectId, c] of table.total.subjects) addSubject(grandTotal.subjects, subjectId, c)
  }
  grandTotal.subjectIds = examOrder.filter((id) => tables.filter((t) => t.total.subjects.has(id)).length > 1)
  return { tables, grandTotal }
}

