"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import { todayIso } from "@/lib/student-attendance"
import { getStudents, type Enrolment, type Student } from "@/lib/students"
import { examStudents, getTermExamMarks, isActiveMark, takesSubject } from "@/lib/term-exam-marks"
import { getTermExams, type TermExam } from "@/lib/term-exams"

// Legacy SchoolCollege ExamStudentAttendance: whether a student sat one
// subject of a term exam. One record per exam, subject and student; taking
// it again updates it. In-memory dummy store for the browser session;
// replace with API calls once the backend endpoints exist.

export type ExamAttendance = {
  id: number
  instituteId: number
  termExamId: number
  subjectId: number
  sectionId: number | null
  studentId: number
  isPresent: boolean
  // ISO "YYYY-MM-DD" the attendance was taken (legacy AttendanceDate).
  date: string
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

// ---- Seed ----
// For the active exams already held, the students who have marks for a
// subject sat it and the rest were absent, so attendance and marks agree.

const seedUser = "Super Admin"

function seedAttendance(): ExamAttendance[] {
  const today = todayIso()
  const marked = new Set(
    getTermExamMarks()
      .filter(isActiveMark)
      .map((m) => `${m.termExamId}:${m.subjectId}:${m.studentId}`)
  )
  const records: ExamAttendance[] = []
  for (const exam of getTermExams()) {
    if (exam.status !== "Active" || !exam.examEnd || exam.examEnd > today) continue
    const at = `${exam.examEnd}T15:00:00`
    for (const { student, enrolment } of examStudents(exam)) {
      if (!enrolment.classRoll) continue
      for (const s of exam.subjects) {
        if (!takesSubject(enrolment, s.subjectId)) continue
        records.push({
          id: records.length + 1,
          instituteId: exam.instituteId,
          termExamId: exam.id,
          subjectId: s.subjectId,
          sectionId: enrolment.sectionId,
          studentId: student.id,
          isPresent: marked.has(`${exam.id}:${s.subjectId}:${student.id}`),
          date: exam.examEnd,
          createdBy: seedUser,
          createdAt: at,
          modifiedBy: seedUser,
          modifiedAt: at,
        })
      }
    }
  }
  return records
}

// ---- Store ----
// Seeded on first use, once the students, exams and marks exist.

let seeded: ExamAttendance[] | null = null
let attendance: ExamAttendance[] | null = null
const listeners = new Set<() => void>()

const seed = () => (seeded ??= seedAttendance())

export function getExamAttendance() {
  return (attendance ??= seed())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useExamAttendance() {
  return React.useSyncExternalStore(subscribe, getExamAttendance, seed)
}

export type ExamAttendanceRow = {
  student: Student
  enrolment: Enrolment
  // The record already taken for the exam subject, if any.
  record?: ExamAttendance
}

// Legacy LoadExamStudentAttendanceDetails: the exam's students who take the
// subject, in one section or all and narrowed by structure, in roll order,
// each with the record when attendance was already taken.
export function examAttendanceSheet(
  exam: TermExam,
  subjectId: number,
  narrow: { sectionId?: number | null; branchId?: number | null; shiftId?: number | null; groupId?: number | null; version?: string },
  records: ExamAttendance[] = getExamAttendance(),
  students: Student[] = getStudents()
): ExamAttendanceRow[] {
  const taken = new Map(
    records
      .filter((r) => r.termExamId === exam.id && r.subjectId === subjectId)
      .map((r) => [r.studentId, r])
  )
  const matches = (value: number | null, wanted: number | null | undefined) => wanted == null || value === wanted
  return examStudents(exam, students)
    .filter(
      ({ enrolment: e }) =>
        takesSubject(e, subjectId) &&
        matches(e.sectionId, narrow.sectionId) &&
        matches(e.branchId, narrow.branchId) &&
        matches(e.shiftId, narrow.shiftId) &&
        matches(e.groupId, narrow.groupId) &&
        (!narrow.version || e.version === narrow.version)
    )
    .map(({ student, enrolment }) => ({ student, enrolment, record: taken.get(student.id) }))
    .sort((a, b) => a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true }))
}

export type ExamAttendanceEntry = { studentId: number; sectionId: number | null; isPresent: boolean }

// Legacy ExamStudentAttendanceService.SaveExamAttendanceByAdmin: adds a
// record for each student without one for the exam subject and updates
// those whose presence changed. Returns how many were added and updated.
export function saveExamAttendance(exam: TermExam, subjectId: number, entries: ExamAttendanceEntry[], user: string) {
  if (!entries.length) throw new Error("There are no students to take attendance for.")
  if (!exam.subjects.some((s) => s.subjectId === subjectId)) throw new Error("Invalid subject for this exam.")

  const current = getExamAttendance()
  const now = new Date().toISOString().slice(0, 19)
  const today = todayIso()
  const existing = new Map(
    current.filter((r) => r.termExamId === exam.id && r.subjectId === subjectId).map((r) => [r.studentId, r])
  )
  let nextId = Math.max(0, ...current.map((r) => r.id)) + 1
  const changed = new Map<number, ExamAttendance>()
  const fresh: ExamAttendance[] = []

  for (const entry of entries) {
    const old = existing.get(entry.studentId)
    if (!old) {
      fresh.push({
        id: nextId++,
        instituteId: exam.instituteId,
        termExamId: exam.id,
        subjectId,
        sectionId: entry.sectionId,
        studentId: entry.studentId,
        isPresent: entry.isPresent,
        date: today,
        createdBy: user,
        createdAt: now,
        modifiedBy: user,
        modifiedAt: now,
      })
    } else if (old.isPresent !== entry.isPresent || old.sectionId !== entry.sectionId) {
      changed.set(old.id, { ...old, isPresent: entry.isPresent, sectionId: entry.sectionId, modifiedBy: user, modifiedAt: now })
    }
  }

  if (changed.size || fresh.length) {
    const next = [...current.map((r) => changed.get(r.id) ?? r), ...fresh]
    logChanges("ExamStudentAttendance", current, next)
    attendance = next
    listeners.forEach((listener) => listener())
  }
  return { added: fresh.length, updated: changed.size }
}
