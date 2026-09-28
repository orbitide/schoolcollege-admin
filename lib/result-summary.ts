import { academicVersions, type AcademicGroup, type LetterGrade, type Section } from "@/lib/institutes"
import type { MeritList } from "@/lib/merit-lists"
import type { Student } from "@/lib/students"
import { examLetterGrades, examStudents } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptSummary/ResultSummary ("Result at a glance",
// TermExamStudentRepository.LoadStudentResultSummary): per section of the
// exam, how many students it has, how many sat, passed, failed or were
// absent, and how many passed with each grade. Works on the exam's merit
// list, so it needs one generated.

export type ResultCounts = {
  total: number
  appeared: number
  passed: number
  failed: number
  absent: number
  // Passed students per grade, in the order of ResultSummary.grades.
  grades: number[]
}

export type ResultSummaryRow = ResultCounts & {
  sectionId: number
  groupId: number | null
  version: string
}

export type ResultSummary = {
  // The passing grades (grade point above 0), best first.
  grades: LetterGrade[]
  rows: ResultSummaryRow[]
  total: ResultCounts
}

const emptyCounts = (grades: number): ResultCounts => ({
  total: 0,
  appeared: 0,
  passed: 0,
  failed: 0,
  absent: 0,
  grades: Array(grades).fill(0),
})

// Legacy "Passed Percentage": passed out of those who sat.
export const passPercent = (c: ResultCounts) => (c.appeared ? (c.passed * 100) / c.appeared : 0)

export function resultSummary(
  exam: TermExam,
  list: MeritList,
  students: Student[],
  sections: Section[],
  groups: AcademicGroup[]
): ResultSummary {
  const grades = examLetterGrades(exam)
    .filter((g) => g.gradePoint > 0)
    .sort((a, b) => b.gradePoint - a.gradePoint || a.rank - b.rank)
  const results = new Map(list.results.map((r) => [r.studentId, r]))
  const sectionOf = new Map(sections.map((s) => [s.id, s]))
  const rows = new Map<number, ResultSummaryRow>()

  // Everyone enrolled counts in the total, even without a result (legacy
  // LEFT JOIN); students without a section are left out, as there.
  for (const { student, enrolment: e } of examStudents(exam, students)) {
    if (e.sectionId == null) continue
    let row = rows.get(e.sectionId)
    if (!row) {
      const section = sectionOf.get(e.sectionId)
      row = {
        ...emptyCounts(grades.length),
        sectionId: e.sectionId,
        // The section's group and version, as the legacy groups by them.
        groupId: section?.groupId ?? e.groupId,
        version: section?.version || e.version,
      }
      rows.set(e.sectionId, row)
    }
    row.total++
    const result = results.get(student.id)
    if (!result) continue
    if (!result.isPresent) {
      row.absent++
      continue
    }
    row.appeared++
    if (result.failedSubjectCount > 0) {
      row.failed++
      continue
    }
    row.passed++
    const grade = grades.findIndex((g) => g.name === result.letterGrade)
    if (grade >= 0) row.grades[grade]++
  }

  // Legacy order: group, version, then section.
  const groupRank = new Map(groups.map((g) => [g.id, g.rank]))
  const rank = (id: number | null, ranks: Map<number, number>) =>
    id == null ? Infinity : (ranks.get(id) ?? Infinity)
  const sectionRank = new Map(sections.map((s) => [s.id, s.rank]))
  const ordered = [...rows.values()].sort(
    (a, b) =>
      rank(a.groupId, groupRank) - rank(b.groupId, groupRank) ||
      academicVersions.indexOf(a.version as never) - academicVersions.indexOf(b.version as never) ||
      rank(a.sectionId, sectionRank) - rank(b.sectionId, sectionRank)
  )

  const total = emptyCounts(grades.length)
  for (const row of ordered) {
    total.total += row.total
    total.appeared += row.appeared
    total.passed += row.passed
    total.failed += row.failed
    total.absent += row.absent
    row.grades.forEach((count, i) => (total.grades[i] += count))
  }
  return { grades, rows: ordered, total }
}

// Legacy ResultSummaryAjax's checks, in its words; null when the report can
// be shown.
export function resultSummaryProblem(exam: TermExam | undefined, list: MeritList | undefined) {
  if (!exam) return "Select an Exam"
  if (!list) return `${exam.name} merit list generation incomplete`
  return null
}
