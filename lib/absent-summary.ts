import { academicVersions, type AcademicGroup, type Section } from "@/lib/institutes"
import type { Student } from "@/lib/students"
import { examStudents, isActiveMark, takesSubject, type TermExamStudentMark } from "@/lib/term-exam-marks"
import { examMarkParts, type TermExam } from "@/lib/term-exams"

// Legacy RptSummary/AbsentSummary ("Subject wise absent Statistics",
// TermExamStudentMarksRepository.LoadAbsentSummary): per section and subject
// of an exam, how many of the students taking the subject have no mark in
// each part the exam marks it in, and in any of them ("All"). Works on the
// marks alone, so any exam can be reported, merit list or not. A table per
// academic group when the class has groups.

export type AbsentPart = (typeof examMarkParts)[number]["label"]

export type AbsentCounts = {
  // Null where the exam doesn't mark the subject in that part ("-").
  parts: Record<AbsentPart, number | null>
  all: number
}

export type AbsentSummaryRow = {
  sectionId: number
  version: string
  // The section's students, whatever they take (legacy TotalStudent).
  total: number
  // Keyed by subject id; missing when no one in the section takes it.
  subjects: Map<number, AbsentCounts>
}

export type AbsentSummaryTable = {
  groupId: number | null
  // The subjects anyone in the table takes, in the exam's order.
  subjectIds: number[]
  rows: AbsentSummaryRow[]
  total: number
  // Legacy "Total=": the "All" counts of every section and subject.
  absent: number
  subjectAbsent: Map<number, number>
}

export type AbsentSummary = {
  // The parts the exam marks any subject in: a row each per section.
  parts: AbsentPart[]
  tables: AbsentSummaryTable[]
}

export function absentSummary(
  exam: TermExam,
  options: {
    students: Student[]
    marks: TermExamStudentMark[]
    sections: Section[]
    groups: AcademicGroup[]
    // A table per group (the institute uses groups and the class has them).
    byGroup: boolean
    // Legacy isWithOutOptional: leave out each student's 4th subject.
    withoutOptional: boolean
  }
): AbsentSummary {
  const sectionOf = new Map(options.sections.map((s) => [s.id, s]))
  const markOf = new Map(
    options.marks
      .filter((m) => m.termExamId === exam.id && isActiveMark(m))
      .map((m) => [`${m.studentId}-${m.subjectId}`, m])
  )
  type Row = AbsentSummaryRow & { groupId: number | null }
  const rows = new Map<number, Row>()

  // Students without a section are left out, as the legacy joins on it.
  for (const { student, enrolment: e } of examStudents(exam, options.students)) {
    if (e.sectionId == null) continue
    let row = rows.get(e.sectionId)
    if (!row) {
      const section = sectionOf.get(e.sectionId)
      row = {
        sectionId: e.sectionId,
        groupId: options.byGroup ? (section?.groupId ?? e.groupId) : null,
        version: section?.version || e.version,
        total: 0,
        subjects: new Map(),
      }
      rows.set(e.sectionId, row)
    }
    row.total++
    for (const s of exam.subjects) {
      if (!takesSubject(e, s.subjectId)) continue
      if (options.withoutOptional && e.optionalSubjectId === s.subjectId) continue
      const mark = markOf.get(`${student.id}-${s.subjectId}`)
      let counts = row.subjects.get(s.subjectId)
      if (!counts) {
        counts = {
          parts: Object.fromEntries(examMarkParts.map((p) => [p.label, s[p.marks] > 0 ? 0 : null])) as Record<
            AbsentPart,
            number | null
          >,
          all: 0,
        }
        row.subjects.set(s.subjectId, counts)
      }
      let absent = false
      for (const p of examMarkParts) {
        if (!(s[p.marks] > 0) || (mark && mark[p.marks] != null)) continue
        counts.parts[p.label]!++
        absent = true
      }
      if (absent) counts.all++
    }
  }

  // Legacy order: group, version, then section.
  const rank = (ranks: Map<number, number>, id: number | null) =>
    id == null ? Infinity : (ranks.get(id) ?? Infinity)
  const groupRank = new Map(options.groups.map((g) => [g.id, g.rank]))
  const sectionRank = new Map(options.sections.map((s) => [s.id, s.rank]))
  const ordered = [...rows.values()].sort(
    (a, b) =>
      rank(groupRank, a.groupId) - rank(groupRank, b.groupId) ||
      academicVersions.indexOf(a.version as never) - academicVersions.indexOf(b.version as never) ||
      rank(sectionRank, a.sectionId) - rank(sectionRank, b.sectionId)
  )

  const tables: AbsentSummaryTable[] = []
  for (const { groupId, ...row } of ordered) {
    let table = tables.at(-1)
    if (!table || table.groupId !== groupId) {
      table = { groupId, subjectIds: [], rows: [], total: 0, absent: 0, subjectAbsent: new Map() }
      tables.push(table)
    }
    table.rows.push(row)
    table.total += row.total
    for (const [subjectId, counts] of row.subjects) {
      table.absent += counts.all
      table.subjectAbsent.set(subjectId, (table.subjectAbsent.get(subjectId) ?? 0) + counts.all)
    }
  }
  for (const table of tables)
    table.subjectIds = exam.subjects.map((s) => s.subjectId).filter((id) => table.subjectAbsent.has(id))

  const parts = examMarkParts
    .filter((p) => exam.subjects.some((s) => s[p.marks] > 0))
    .map((p) => p.label)
  return { parts, tables }
}
