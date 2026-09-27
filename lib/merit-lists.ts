"use client"

import * as React from "react"

import {
  classStore,
  letterGradeStore,
  resultRemarkStore,
} from "@/lib/academic-store"
import type { Institute, LetterGrade } from "@/lib/institutes"
import { examStudents, getTermExamMarks, takesSubject } from "@/lib/term-exam-marks"
import type { TermExam, TermExamSubject } from "@/lib/term-exams"

// Legacy SchoolCollege ResultCalculation/MeritListReGenerate: recheck each
// mark's pass status (TermExamStudentMarksService.RegeneratePassStatus),
// then work out every student's result and their merit positions within
// their group and section (TermExamStudentService.GenerateMeritList).

export type StudentSubjectMark = {
  subjectId: number
  theory: number
  cq: number
  mcq: number
  practical: number
  total: number
  isOptional: boolean
  isPass: boolean
  gpa: number
  // The GPA counted in the result; the optional subject's is reduced.
  finalGpa: number
  letterGrade: string
}

export type MeritResult = {
  studentId: number
  sectionId: number
  groupId: number | null
  roll: string
  isPresent: boolean
  totalMarks: number
  failedSubjectCount: number
  gpa: number
  gpaWithoutOptional: number
  isGolden: boolean
  letterGrade: string
  remarks: string
  // 0 when absent or failed, as in the legacy merit list.
  groupPosition: number
  sectionPosition: number
  marks: StudentSubjectMark[]
}

export type MeritList = {
  termExamId: number
  generatedBy: string
  generatedAt: string
  results: MeritResult[]
}

// ---- Calculation ----

// Legacy IsPassTermExam: every marked part and the total reach their pass marks.
function isPass(s: TermExamSubject, m: { theory: number; cq: number; mcq: number; practical: number; total: number }) {
  return (
    (!s.theoryMarks || m.theory >= s.theoryPassMarks) &&
    (!s.cqMarks || m.cq >= s.cqPassMarks) &&
    (!s.mcqMarks || m.mcq >= s.mcqPassMarks) &&
    (!s.practicalMarks || m.practical >= s.practicalPassMarks) &&
    m.total >= s.totalPassMarks
  )
}

function gradeFor(grades: LetterGrade[], percent: number, pass: boolean) {
  const sorted = [...grades].sort((a, b) => a.gradePoint - b.gradePoint)
  if (!pass) return sorted[0]
  return grades.find((g) => percent >= g.minMarks && percent <= g.maxMarks) ?? sorted[0]
}

const round2 = (n: number) => Math.round(n * 100) / 100

// Legacy merit order: no retakes first, then GPA, golden, total marks, roll.
function meritOrder(calculateGpa: boolean) {
  return (a: MeritResult, b: MeritResult) =>
    (calculateGpa ? b.gpa - a.gpa || Number(b.isGolden) - Number(a.isGolden) : 0) ||
    b.totalMarks - a.totalMarks ||
    a.roll.localeCompare(b.roll, undefined, { numeric: true })
}

export function calculateMeritList(exam: TermExam, institute: Institute): MeritResult[] {
  const grades = letterGradeStore
    .getList(exam.instituteId)
    .filter((g) => g.status === "Active" && (!g.medium || !exam.medium || g.medium === exam.medium))
  const remarks = resultRemarkStore
    .getList(exam.instituteId)
    .filter((r) => r.status === "Active" && (!r.medium || !exam.medium || r.medium === exam.medium))
  const maxGrade = [...grades].sort((a, b) => b.maxGradePoint - a.maxGradePoint)[0]
  const subtraction = institute.configuration.optionalGpaSubtraction

  // The exam's students with their saved marks (none means absent).
  // Students without a section or roll are left out, as the legacy does.
  const enrolled = examStudents(exam).filter(
    ({ enrolment: e }) => e.sectionId != null && e.classRoll.trim()
  )
  const saved = getTermExamMarks().filter((m) => m.termExamId === exam.id)

  const results = enrolled.map(({ student, enrolment: e }): MeritResult => {
    const taken = exam.subjects.filter((s) => takesSubject(e, s.subjectId))
    const bySubject = new Map(taken.map((s) => [s.subjectId, s]))
    const own = saved.filter((m) => m.studentId === student.id && bySubject.has(m.subjectId))
    const marks: StudentSubjectMark[] = own.map((mark) => {
      const m = {
        subjectId: mark.subjectId,
        theory: mark.theoryMarks ?? 0,
        cq: mark.cqMarks ?? 0,
        mcq: mark.mcqMarks ?? 0,
        practical: mark.practicalMarks ?? 0,
        total: mark.totalMarks,
      }
      const s = bySubject.get(m.subjectId)!
      const pass = isPass(s, m)
      const isOptional = mark.isOptional
      const grade = exam.calculateGpa && grades.length
        ? gradeFor(grades, s.totalMarks ? (m.total * 100) / s.totalMarks : 0, pass)
        : undefined
      const gpa = grade?.gradePoint ?? 0
      return {
        ...m,
        isOptional,
        isPass: pass,
        gpa,
        finalGpa: isOptional ? Math.max(0, gpa - subtraction) : gpa,
        letterGrade: grade?.name ?? "",
      }
    })
    const compulsory = marks.filter((m) => !m.isOptional)
    const optional = marks.filter((m) => m.isOptional)
    const compulsoryCount = taken.filter((s) => s.subjectId !== e.optionalSubjectId).length
    const failed = compulsoryCount - compulsory.filter((m) => m.isPass).length
    const totalMarks = marks.reduce((sum, m) => sum + m.total, 0)

    const result: MeritResult = {
      studentId: student.id,
      sectionId: e.sectionId!,
      groupId: e.groupId,
      roll: e.classRoll,
      isPresent: marks.length > 0,
      totalMarks,
      failedSubjectCount: failed,
      gpa: 0,
      gpaWithoutOptional: 0,
      isGolden: false,
      letterGrade: "",
      remarks: "",
      groupPosition: 0,
      sectionPosition: 0,
      marks,
    }

    if (failed === 0 && compulsory.length) {
      if (exam.calculateGpa) {
        const compulsoryGpa = compulsory.reduce((sum, m) => sum + m.finalGpa, 0)
        const optionalGpa = optional.reduce((sum, m) => sum + m.finalGpa, 0)
        result.isGolden = !!maxGrade && compulsory.every((m) => m.finalGpa >= maxGrade.maxGradePoint)
        result.gpaWithoutOptional = round2(compulsoryGpa / compulsory.length)
        result.gpa = round2((compulsoryGpa + optionalGpa) / compulsory.length)
        if (maxGrade && result.gpa > maxGrade.maxGradePoint) result.gpa = maxGrade.maxGradePoint
        result.letterGrade =
          grades.find((g) => g.gradePoint <= result.gpa && g.maxGradePoint >= result.gpa)?.name ?? ""
        result.remarks =
          remarks
            .filter(
              (r) =>
                r.isGolden === result.isGolden &&
                r.minGpa <= result.gpa &&
                r.maxGpa >= result.gpa &&
                r.minFailCount <= failed &&
                r.maxFailCount >= failed
            )
            .sort((a, b) => b.maxFailCount - a.maxFailCount)[0]?.name ?? ""
      } else {
        result.remarks =
          remarks
            .filter((r) => r.minFailCount <= failed && r.maxFailCount >= failed)
            .sort((a, b) => b.maxFailCount - a.maxFailCount)[0]?.name ?? ""
      }
    }
    return result
  })

  // Positions among the students who sat and passed every compulsory subject.
  const ranked = results.filter((r) => r.isPresent && r.failedSubjectCount === 0)
  const order = meritOrder(exam.calculateGpa)
  const rank = (key: (r: MeritResult) => string, set: (r: MeritResult, p: number) => void) => {
    const buckets = new Map<string, MeritResult[]>()
    for (const r of ranked) buckets.set(key(r), [...(buckets.get(key(r)) ?? []), r])
    for (const bucket of buckets.values()) bucket.sort(order).forEach((r, i) => set(r, i + 1))
  }
  // The legacy ranks by academic group only when the class has groups; a
  // class without groups is ranked as one here so it still gets a class merit.
  const cls = classStore.getList(exam.instituteId).find((c) => c.id === exam.classId)
  const grouped = institute.enableGroup && !!cls?.hasSubjectGroup
  rank((r) => (grouped ? String(r.groupId) : "class"), (r, p) => (r.groupPosition = p))
  rank((r) => String(r.sectionId), (r, p) => (r.sectionPosition = p))

  return results
}

// ---- Store ----
// In-memory for the browser session, like the term exams.

let lists: MeritList[] = []
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useMeritLists() {
  return React.useSyncExternalStore(
    subscribe,
    () => lists,
    () => lists
  )
}

// Returns the number of students in the merit list, or throws the legacy
// message when the exam can't be regenerated.
export function generateMeritList(exam: TermExam, institute: Institute, user: string) {
  if (!exam.editEnable) throw new Error(`${exam.name} is not edit enable`)
  const results = calculateMeritList(exam, institute)
  lists = [
    ...lists.filter((l) => l.termExamId !== exam.id),
    { termExamId: exam.id, generatedBy: user, generatedAt: new Date().toISOString(), results },
  ]
  listeners.forEach((listener) => listener())
  return results.length
}
