import type { LetterGrade } from "@/lib/institutes"
import type { Student } from "@/lib/students"
import { examLetterGrades, examStudents, isActiveMark, takesSubject, type TermExamStudentMark } from "@/lib/term-exam-marks"
import type { TermExam, TermExamSubject } from "@/lib/term-exams"

// Legacy RptSummary/ResultAnalysis ("Subject Result Analysis in Details",
// TermExamStudentMarksService.LoadSubjectResultAnalysisList): for each
// subject of an exam, how many students' marks fall in each letter grade's
// range — per marked part (theory, CQ, MCQ, practical) and for the subject
// total — and how many were absent. Reads the saved marks, as the legacy
// does, though it too asks for the merit list first.
//
// Where the legacy is off, this follows what it means to show:
// - The subject total's range is out of the subject's full marks; the
//   legacy adds the whole total on top of the parts when there is a theory.
// - Marks count by percentage, so a fraction such as 39.5 of 50 still lands
//   in a grade; the legacy compares with whole-number ranges and drops it.
// - A student with no marks at all is absent in every part too, so each
//   part's total matches the subject's.

export const analysisParts = [
  { key: "theoryMarks", label: "Theory" },
  { key: "cqMarks", label: "CQ" },
  { key: "mcqMarks", label: "MCQ" },
  { key: "practicalMarks", label: "Practical" },
] as const
export type AnalysisPartKey = (typeof analysisParts)[number]["key"]

// A grade's range as marks out of `full`: floored, and one short of the
// grade above where they would meet (legacy NormalizeMark).
export type MarksRange = { min: number; max: number }

export type AnalysisColumn = {
  full: number
  // One per grade, in AnalysisSubject.grades' order.
  ranges: MarksRange[]
  counts: number[]
  absent: number
}

export type AnalysisSubject = {
  subjectId: number
  // The parts the subject is marked in, each with its full marks.
  parts: (AnalysisColumn & { key: AnalysisPartKey; label: string })[]
  summary: AnalysisColumn
  total: number
}

export type ResultAnalysis = {
  // Best first.
  grades: LetterGrade[]
  subjects: AnalysisSubject[]
}

function marksRanges(grades: LetterGrade[], full: number): MarksRange[] {
  const ranges = grades.map((g) => ({
    min: Math.floor((g.minMarks * full) / 100),
    max: Math.floor((g.maxMarks * full) / 100),
  }))
  ranges.forEach((r, i) => {
    if (i > 0 && r.max === ranges[i - 1].min && r.min < r.max) r.max--
  })
  return ranges
}

// The grade a mark out of `full` falls in: the best whose minimum it
// reaches, so marks between two ranges go to the lower one.
function gradeIndex(grades: LetterGrade[], mark: number, full: number) {
  const percent = (mark * 100) / full
  const index = grades.findIndex((g) => percent >= g.minMarks)
  return index >= 0 ? index : grades.length - 1
}

function column(grades: LetterGrade[], full: number): AnalysisColumn {
  return { full, ranges: marksRanges(grades, full), counts: grades.map(() => 0), absent: 0 }
}

export function resultAnalysis(
  exam: TermExam,
  students: Student[],
  marks: TermExamStudentMark[],
  options: { sectionId?: number; subjectId?: number }
): ResultAnalysis {
  const grades = examLetterGrades(exam).sort((a, b) => b.minMarks - a.minMarks || a.rank - b.rank)
  const enrolled = examStudents(exam, students).filter(
    ({ enrolment: e }) => options.sectionId == null || e.sectionId === options.sectionId
  )
  const markOf = new Map(
    marks
      .filter((m) => m.termExamId === exam.id && isActiveMark(m))
      .map((m) => [`${m.studentId}|${m.subjectId}`, m])
  )

  const examSubjects = exam.subjects.filter((s) => options.subjectId == null || s.subjectId === options.subjectId)
  const subjects = examSubjects.map((s: TermExamSubject): AnalysisSubject => {
    const parts = analysisParts
      .filter((p) => s[p.key] > 0)
      .map((p) => ({ ...p, ...column(grades, s[p.key]) }))
    const summary = column(grades, s.totalMarks)
    let total = 0

    for (const { student, enrolment: e } of enrolled) {
      if (!takesSubject(e, s.subjectId)) continue
      total++
      const mark = markOf.get(`${student.id}|${s.subjectId}`)
      let sat = false
      for (const part of parts) {
        const obtained = mark?.[part.key]
        if (obtained == null) {
          part.absent++
          continue
        }
        sat = true
        if (grades.length) part.counts[gradeIndex(grades, obtained, part.full)]++
      }
      if (!mark || !sat) summary.absent++
      else if (grades.length) summary.counts[gradeIndex(grades, mark.totalMarks, summary.full)]++
    }
    return { subjectId: s.subjectId, parts, summary, total }
  })

  return { grades, subjects }
}

// Share of the subject's students, as the legacy's two-decimal percentage.
export const analysisPercent = (count: number, total: number) =>
  total ? String(Math.round((count * 10000) / total) / 100) : "-"
