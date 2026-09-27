"use client"

import * as React from "react"

import { getStudents, type Enrolment, type Student } from "@/lib/students"
import { getTermExams, type TermExam, type TermExamSubject } from "@/lib/term-exams"

// Legacy SchoolCollege TermExamStudentMarks: what one student got in one
// subject of a term exam. A part is null when it was never entered, so a
// later upload that leaves it out keeps it (legacy
// StudentTermExamMarksCalculation).

export type TermExamStudentMark = {
  id: number
  termExamId: number
  studentId: number
  subjectId: number
  roll: string
  isOptional: boolean
  theoryMarks: number | null
  cqMarks: number | null
  mcqMarks: number | null
  practicalMarks: number | null
  attendanceMarks: number | null
  assignmentMarks: number | null
  setCode: string
  mcqCorrectAnswer: number | null
  mcqWrongAnswer: number | null
  mcqNotAnswer: number | null
  mcqAnswer: string
  examinerCode: string
  totalMarks: number
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

// The fields an upload row can set; left out (undefined) means "keep".
export type MarkUpload = Pick<TermExamStudentMark, "termExamId" | "studentId" | "subjectId" | "roll" | "isOptional"> &
  Partial<
    Pick<
      TermExamStudentMark,
      | "theoryMarks"
      | "cqMarks"
      | "mcqMarks"
      | "practicalMarks"
      | "attendanceMarks"
      | "assignmentMarks"
      | "setCode"
      | "mcqCorrectAnswer"
      | "mcqWrongAnswer"
      | "mcqNotAnswer"
      | "mcqAnswer"
      | "examinerCode"
    >
  >

// Legacy GetTotalTermExamStudentSubjectMarks.
export function markTotal(m: Pick<TermExamStudentMark, "theoryMarks" | "cqMarks" | "mcqMarks" | "practicalMarks" | "attendanceMarks" | "assignmentMarks">) {
  return (
    (m.theoryMarks ?? 0) +
    (m.cqMarks ?? 0) +
    (m.mcqMarks ?? 0) +
    (m.practicalMarks ?? 0) +
    (m.attendanceMarks ?? 0) +
    (m.assignmentMarks ?? 0)
  )
}

// The exam's students (legacy LoadStudents): active, enrolled in its class
// and year, and in its structure where it sets one.
export function examStudents(exam: TermExam, students: Student[] = getStudents()) {
  return students.flatMap((student) => {
    if (student.instituteId !== exam.instituteId || student.status !== "Active") return []
    const enrolment = student.enrolments.find(
      (en) =>
        en.classId === exam.classId &&
        en.yearId === exam.yearId &&
        (!exam.medium || en.medium === exam.medium) &&
        (exam.groupId == null || en.groupId === exam.groupId) &&
        (exam.branchId == null || en.branchId === exam.branchId) &&
        (!exam.version || en.version === exam.version) &&
        (exam.shiftId == null || en.shiftId === exam.shiftId)
    )
    return enrolment ? [{ student, enrolment }] : []
  })
}

// Whether the student takes the subject; an enrolment without a subject
// list takes all of the exam's subjects.
export function takesSubject(enrolment: Enrolment, subjectId: number) {
  return !enrolment.subjectIds.length || enrolment.subjectIds.includes(subjectId)
}

// ---- Seed ----
// Made-up but stable marks for the seeded exams, so merit lists and reports
// have something to work on before anyone uploads.

function hash(...values: number[]) {
  let h = 2166136261
  for (const v of values) {
    h ^= v
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967295
}

function samplePart(marks: number, examId: number, studentId: number, subjectId: number, part: number) {
  if (!marks) return null
  // Mostly 45–98 %, with the odd weak paper.
  const r = hash(examId, studentId, subjectId, part)
  const percent = r < 0.08 ? 15 + r * 200 : 45 + r * 53
  return Math.min(marks, Math.round((marks * percent) / 100))
}

const seedUser = "Super Admin"

function seedMarks(): TermExamStudentMark[] {
  const marks: TermExamStudentMark[] = []
  for (const exam of getTermExams()) {
    if (exam.status !== "Active") continue
    for (const { student, enrolment } of examStudents(exam)) {
      // About one student in twelve missed the exam.
      if (!enrolment.classRoll || hash(exam.id, student.id, 99) < 0.08) continue
      for (const s of exam.subjects) {
        if (!takesSubject(enrolment, s.subjectId)) continue
        const parts = {
          theoryMarks: samplePart(s.theoryMarks, exam.id, student.id, s.subjectId, 1),
          cqMarks: samplePart(s.cqMarks, exam.id, student.id, s.subjectId, 2),
          mcqMarks: samplePart(s.mcqMarks, exam.id, student.id, s.subjectId, 3),
          practicalMarks: samplePart(s.practicalMarks, exam.id, student.id, s.subjectId, 4),
          attendanceMarks: null,
          assignmentMarks: null,
        }
        marks.push({
          id: marks.length + 1,
          termExamId: exam.id,
          studentId: student.id,
          subjectId: s.subjectId,
          roll: enrolment.classRoll,
          isOptional: enrolment.optionalSubjectId === s.subjectId,
          ...parts,
          setCode: s.mcqMarks ? "A" : "",
          mcqCorrectAnswer: parts.mcqMarks,
          mcqWrongAnswer: null,
          mcqNotAnswer: null,
          mcqAnswer: "",
          examinerCode: "",
          totalMarks: markTotal(parts),
          createdBy: seedUser,
          createdAt: `${exam.examEnd}T12:00:00.000Z`,
          modifiedBy: seedUser,
          modifiedAt: `${exam.examEnd}T12:00:00.000Z`,
        })
      }
    }
  }
  return marks
}

// ---- Store ----
// In-memory for the browser session, like the term exams. Seeded on first
// use, once the students and exams exist.

let seeded: TermExamStudentMark[] | null = null
let marks: TermExamStudentMark[] | null = null
const listeners = new Set<() => void>()

const seed = () => (seeded ??= seedMarks())
export function getTermExamMarks() {
  return (marks ??= seed())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTermExamMarks() {
  return React.useSyncExternalStore(subscribe, getTermExamMarks, seed)
}

// Legacy SaveRawBatch: each row replaces the student's saved marks for that
// subject, keeping any part the upload left out, or is added. Returns how
// many were saved.
export function saveTermExamMarks(rows: MarkUpload[], user: string) {
  const stamp = new Date().toISOString()
  const current = getTermExamMarks()
  const byKey = new Map(current.map((m) => [`${m.termExamId}:${m.studentId}:${m.subjectId}`, m]))
  let nextId = Math.max(0, ...current.map((m) => m.id)) + 1
  const changed = new Map<number, TermExamStudentMark>()
  const added: TermExamStudentMark[] = []

  for (const row of rows) {
    const old = byKey.get(`${row.termExamId}:${row.studentId}:${row.subjectId}`)
    const defined = Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== undefined)
    ) as MarkUpload
    const base: TermExamStudentMark = old ?? {
      id: nextId++,
      termExamId: row.termExamId,
      studentId: row.studentId,
      subjectId: row.subjectId,
      roll: row.roll,
      isOptional: row.isOptional,
      theoryMarks: null,
      cqMarks: null,
      mcqMarks: null,
      practicalMarks: null,
      attendanceMarks: null,
      assignmentMarks: null,
      setCode: "",
      mcqCorrectAnswer: null,
      mcqWrongAnswer: null,
      mcqNotAnswer: null,
      mcqAnswer: "",
      examinerCode: "",
      totalMarks: 0,
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    }
    const next = { ...base, ...defined, modifiedBy: user, modifiedAt: stamp }
    next.totalMarks = markTotal(next)
    if (old) changed.set(old.id, next)
    else added.push(next)
    byKey.set(`${row.termExamId}:${row.studentId}:${row.subjectId}`, next)
  }

  marks = [...current.map((m) => changed.get(m.id) ?? m), ...added]
  listeners.forEach((listener) => listener())
  return changed.size + added.length
}

// Full marks per part of an exam subject, for checking uploads.
export const markParts = [
  { key: "theoryMarks", label: "Theory marks", full: (s: TermExamSubject) => s.theoryMarks },
  { key: "cqMarks", label: "CQ marks", full: (s: TermExamSubject) => s.cqMarks },
  { key: "mcqMarks", label: "MCQ marks", full: (s: TermExamSubject) => s.mcqMarks },
  { key: "practicalMarks", label: "Practical marks", full: (s: TermExamSubject) => s.practicalMarks },
] as const
