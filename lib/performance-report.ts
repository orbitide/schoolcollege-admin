import type { AcademicClass, ClassYearSubject, Institute } from "@/lib/institutes"
import type { MeritList, MeritResult } from "@/lib/merit-lists"
import type { Enrolment, Student } from "@/lib/students"
import { subjectKinds, tabulation, type SubjectKind, type TabulationStudent } from "@/lib/tabulation"
import type { TermExamStudentMark } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy RptResult/PerformanceReport (TermExamStudentService.LoadPerformanceRpt,
// Partial/_performanceReport): one student's results across the exams of
// their class and the class before it (in any year) — the exams shown in the
// year book, published online, with the student in their merit list — each
// part of each subject, the term result, and a GPA line from their board
// exams through each exam.

export type PerformanceExam = {
  exam: TermExam
  result: MeritResult
  // The student's row of the exam's tabulation: cells per subject and part.
  row: TabulationStudent
}

export type PerformanceReport = {
  student: Student
  enrolment: Enrolment
  exams: PerformanceExam[]
  // Every subject any of the exams has for the student, as columns.
  subjects: { subjectId: number; kind: SubjectKind }[]
  // Board exam GPAs, oldest first (legacy JSC, SSC, HSC or O/A Level).
  boardGpas: { label: string; gpa: string }[]
}

// Why there is no report, in the legacy's words; null when there is one.
export function performanceProblem(roll: string) {
  if (!roll) return "Enter Roll"
  if (!/^\d+$/.test(roll)) return "Enter valid Roll"
  return null
}

export function performanceReport(
  institute: Institute,
  academicClass: AcademicClass,
  yearId: number,
  roll: string,
  data: {
    students: Student[]
    exams: TermExam[]
    meritLists: MeritList[]
    marks: TermExamStudentMark[]
    classYearSubjects: ClassYearSubject[]
    subjectRank: (id: number) => number
  }
): PerformanceReport | null {
  let found: { student: Student; enrolment: Enrolment } | undefined
  for (const student of data.students) {
    if (student.instituteId !== institute.id || student.status !== "Active") continue
    const enrolment = student.enrolments.find(
      (e) => e.classId === academicClass.id && e.yearId === yearId && e.classRoll.trim() === roll
    )
    if (enrolment) found = { student, enrolment }
  }
  if (!found) return null
  const { student, enrolment } = found

  const classIds = new Set([academicClass.id, ...(academicClass.previousClassId != null ? [academicClass.previousClassId] : [])])
  const listOf = new Map(data.meritLists.map((l) => [l.termExamId, l]))
  const exams = data.exams
    .filter(
      (e) =>
        e.instituteId === institute.id &&
        e.status === "Active" &&
        classIds.has(e.classId) &&
        e.showInYearBook &&
        e.onlinePublished
    )
    .sort((a, b) => a.examStart.localeCompare(b.examStart) || a.id - b.id)
    .flatMap((exam): PerformanceExam[] => {
      const list = listOf.get(exam.id)
      const result = list?.results.find((r) => r.studentId === student.id)
      if (!list || !result) return []
      const row = tabulation(exam, list, {
        institute,
        students: [student],
        marks: data.marks,
        classYearSubjects: data.classYearSubjects,
        sectionId: result.sectionId,
        exceptAllAbsent: false,
        displayGrace: false,
      }).students[0]
      return row ? [{ exam, result, row }] : []
    })

  // A subject's block is the one it has in the latest exam.
  const kindOf = new Map<number, SubjectKind>()
  for (const { row } of exams) for (const s of row.subjects) kindOf.set(s.subjectId, s.kind)
  const order = subjectKinds.map((k) => k.key)
  const subjects = [...kindOf]
    .map(([subjectId, kind]) => ({ subjectId, kind }))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || data.subjectRank(a.subjectId) - data.subjectRank(b.subjectId))

  const english = institute.enableMedium && enrolment.medium === "English Medium"
  const boards = english
    ? ([["O Level", "O-Level"], ["A Level", "A-Level"]] as const)
    : ([["JSC", "JSC"], ["SSC", "SSC"], ["HSC", "HSC"]] as const)
  const boardGpas = boards.flatMap(([exam, label]) => {
    const gpa = student.board[exam]?.gpa.trim()
    return gpa ? [{ label, gpa }] : []
  })

  return { student, enrolment, exams, subjects, boardGpas }
}
