"use client"

import * as React from "react"

import { letterGradeStore } from "@/lib/academic-store"
import { seedInstitutes, type Institute, type LetterGrade } from "@/lib/institutes"
import { getStudents, type Enrolment, type Student } from "@/lib/students"
import { getTermExamAnswers } from "@/lib/term-exam-answers"
import { classYearExamSubjects, getTermExams, type TermExam, type TermExamSubject } from "@/lib/term-exams"

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
  // Added on top of the obtained marks by Edit Student Marks, when the exam
  // has grace marks.
  theoryGraceMarks: number
  cqGraceMarks: number
  mcqGraceMarks: number
  setCode: string
  mcqCorrectAnswer: number | null
  mcqWrongAnswer: number | null
  mcqNotAnswer: number | null
  mcqAnswer: string
  examinerCode: string
  totalMarks: number
  // Set by Pass Fail ReGenerate; an upload clears isPassCalculated.
  isPassCalculated: boolean
  isPass: boolean
  gpa: number
  // The GPA counted in results; the optional subject's is reduced.
  finalGpa: number
  letterGrade: string
  // Only active marks count anywhere (results, merit lists, the bulk mark
  // tools); "Deleted" can be retrieved from Student Marks Manage.
  status: MarkStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export const markStatuses = ["Active", "Inactive", "Deleted"] as const
export type MarkStatus = (typeof markStatuses)[number]

export const isActiveMark = (m: Pick<TermExamStudentMark, "status">) => m.status === "Active"

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

const notCalculated = { isPassCalculated: false, isPass: false, gpa: 0, finalGpa: 0, letterGrade: "" }

type MarkParts = Pick<TermExamStudentMark, "theoryMarks" | "cqMarks" | "mcqMarks" | "practicalMarks"> &
  Partial<Pick<TermExamStudentMark, "theoryGraceMarks" | "cqGraceMarks" | "mcqGraceMarks">>

// Legacy GetTotalTermExamStudentSubjectMarks: obtained plus grace marks.
export function markTotal(m: MarkParts & Pick<TermExamStudentMark, "attendanceMarks" | "assignmentMarks">) {
  return (
    (m.theoryMarks ?? 0) +
    (m.theoryGraceMarks ?? 0) +
    (m.cqMarks ?? 0) +
    (m.cqGraceMarks ?? 0) +
    (m.mcqMarks ?? 0) +
    (m.mcqGraceMarks ?? 0) +
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

// Where the subject has a set A answer key, an answer sheet with about the
// sampled MCQ marks right (then wrong or blank), scored so the marks match
// the sheet. Otherwise only the counts, as if uploaded without sheets.
function sampleSheet(examId: number, studentId: number, s: TermExamSubject, mcqMarks: number | null) {
  const key = getTermExamAnswers().find((a) => a.termExamId === examId && a.subjectId === s.subjectId && a.setCode === "A")
  if (!key || mcqMarks == null)
    return { mcqMarks, mcqCorrectAnswer: mcqMarks, mcqWrongAnswer: null, mcqNotAnswer: null, mcqAnswer: "" }
  const options = ["A", "B", "C", "D"]
  const sheet = key.answer
    .split(",")
    .slice(0, s.mcqMarks)
    .map((answer, i) => {
      if (i < mcqMarks) return answer === "+" || answer === "$" || answer === "-" ? "A" : answer.split("|")[0]
      if (hash(examId, studentId, s.subjectId, 50 + i) < 0.25) return ""
      return options.find((o) => o !== answer) ?? "A"
    })
    .join(",")
  const score = scoreMcq(key.answer, sheet, s.mcqMarks, 1)!
  return {
    mcqMarks: score.marks,
    mcqCorrectAnswer: score.correct,
    mcqWrongAnswer: score.wrong,
    mcqNotAnswer: score.notAnswered,
    mcqAnswer: sheet,
  }
}

function seedMarks(): TermExamStudentMark[] {
  const marks: TermExamStudentMark[] = []
  for (const exam of getTermExams()) {
    if (exam.status !== "Active") continue
    for (const { student, enrolment } of examStudents(exam)) {
      // About one student in twelve missed the exam.
      if (!enrolment.classRoll || hash(exam.id, student.id, 99) < 0.08) continue
      for (const s of exam.subjects) {
        if (!takesSubject(enrolment, s.subjectId)) continue
        const mcq = sampleSheet(exam.id, student.id, s, samplePart(s.mcqMarks, exam.id, student.id, s.subjectId, 3))
        const parts = {
          theoryMarks: samplePart(s.theoryMarks, exam.id, student.id, s.subjectId, 1),
          cqMarks: samplePart(s.cqMarks, exam.id, student.id, s.subjectId, 2),
          mcqMarks: mcq.mcqMarks,
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
          theoryGraceMarks: 0,
          cqGraceMarks: 0,
          mcqGraceMarks: 0,
          setCode: s.mcqMarks ? "A" : "",
          mcqCorrectAnswer: mcq.mcqCorrectAnswer,
          mcqWrongAnswer: mcq.mcqWrongAnswer,
          mcqNotAnswer: mcq.mcqNotAnswer,
          mcqAnswer: mcq.mcqAnswer,
          examinerCode: "",
          totalMarks: markTotal(parts),
          ...notCalculated,
          status: "Active",
          createdBy: seedUser,
          createdAt: `${exam.examEnd}T12:00:00.000Z`,
          modifiedBy: seedUser,
          modifiedAt: `${exam.examEnd}T12:00:00.000Z`,
        })
      }
    }
  }
  // Exams whose result publish date has passed (the seeded Half Yearly and
  // Test Exam) have had Pass Fail ReGenerate run, so they start with merit
  // lists; the Annual is still to come.
  const today = new Date().toLocaleDateString("en-CA")
  return getTermExams()
    .filter((exam) => exam.status === "Active" && exam.resultPublish <= today)
    .reduce((all, exam) => {
      const institute = seedInstitutes.find((i) => i.id === exam.instituteId)
      return institute ? withPassStatus(all, exam, institute).marks : all
    }, marks)
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

// A mark with nothing entered yet.
function blankMark(
  id: number,
  key: Pick<TermExamStudentMark, "termExamId" | "studentId" | "subjectId" | "roll" | "isOptional">,
  user: string,
  stamp: string
): TermExamStudentMark {
  return {
    id,
    termExamId: key.termExamId,
    studentId: key.studentId,
    subjectId: key.subjectId,
    roll: key.roll,
    isOptional: key.isOptional,
    theoryMarks: null,
    cqMarks: null,
    mcqMarks: null,
    practicalMarks: null,
    attendanceMarks: null,
    assignmentMarks: null,
    theoryGraceMarks: 0,
    cqGraceMarks: 0,
    mcqGraceMarks: 0,
    setCode: "",
    mcqCorrectAnswer: null,
    mcqWrongAnswer: null,
    mcqNotAnswer: null,
    mcqAnswer: "",
    examinerCode: "",
    totalMarks: 0,
    ...notCalculated,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
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
    const existing = byKey.get(`${row.termExamId}:${row.studentId}:${row.subjectId}`)
    // An inactive or deleted mark starts afresh, as legacy adds a new row.
    const old = existing && isActiveMark(existing) ? existing : undefined
    const defined = Object.fromEntries(
      Object.entries(row).filter(([, value]) => value !== undefined)
    ) as MarkUpload
    const base = old ?? blankMark(existing?.id ?? nextId++, row, user, stamp)
    const next = { ...base, ...defined, ...notCalculated, modifiedBy: user, modifiedAt: stamp }
    next.totalMarks = markTotal(next)
    if (existing) changed.set(existing.id, next)
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

// ---- Pass status ----

// Legacy IsPassTermExam: every marked part (with its grace marks) and the
// total reach their pass marks.
export function markIsPass(s: TermExamSubject, m: MarkParts & Pick<TermExamStudentMark, "totalMarks">) {
  return (
    (!s.theoryMarks || (m.theoryMarks ?? 0) + (m.theoryGraceMarks ?? 0) >= s.theoryPassMarks) &&
    (!s.cqMarks || (m.cqMarks ?? 0) + (m.cqGraceMarks ?? 0) >= s.cqPassMarks) &&
    (!s.mcqMarks || (m.mcqMarks ?? 0) + (m.mcqGraceMarks ?? 0) >= s.mcqPassMarks) &&
    (!s.practicalMarks || (m.practicalMarks ?? 0) >= s.practicalPassMarks) &&
    m.totalMarks >= s.totalPassMarks
  )
}

// Legacy GetStudentTermExamMarksLetterGrade: the grade whose marks range
// holds the percentage; a fail gets the lowest grade.
export function markGrade(grades: LetterGrade[], percent: number, pass: boolean) {
  const lowest = [...grades].sort((a, b) => a.gradePoint - b.gradePoint)[0]
  if (!pass) return lowest
  return grades.find((g) => percent >= g.minMarks && percent <= g.maxMarks) ?? lowest
}

export function examLetterGrades(exam: TermExam) {
  return letterGradeStore
    .getList(exam.instituteId)
    .filter((g) => g.status === "Active" && (!g.medium || !exam.medium || g.medium === exam.medium))
}

// Legacy IsPassReGenerate: the exam has marks and all of them are calculated.
export function isPassRegenerated(examId: number, all: TermExamStudentMark[] = getTermExamMarks()) {
  const own = all.filter((m) => m.termExamId === examId && isActiveMark(m))
  return own.length > 0 && own.every((m) => m.isPassCalculated)
}

// Legacy RegeneratePassStatus (CalculatePassFailWithGrade): recheck each of
// the exam's marks for pass/fail, grade and GPA. Returns how many marks were
// calculated, or throws the legacy message when there are none.
export function regeneratePassStatus(exam: TermExam, institute: Institute) {
  const current = getTermExamMarks()
  const own = current.filter((m) => m.termExamId === exam.id && isActiveMark(m))
  if (!own.length) throw new Error("No student marks uploaded")
  if (!exam.subjects.length) throw new Error("Exam subject(s) not found")

  const calculated = withPassStatus(current, exam, institute)
  marks = calculated.marks
  listeners.forEach((listener) => listener())
  return calculated.count
}

// The marks with the exam's active ones rechecked; the rest as they were.
function withPassStatus(all: TermExamStudentMark[], exam: TermExam, institute: Institute) {
  const grades = examLetterGrades(exam)
  const subtraction = institute.configuration.optionalGpaSubtraction
  const subjects = new Map(exam.subjects.map((s) => [s.subjectId, s]))
  let count = 0
  const marks = all.map((m) => {
    if (m.termExamId !== exam.id || !isActiveMark(m)) return m
    const s = subjects.get(m.subjectId)
    if (!s) return m
    const pass = markIsPass(s, m)
    const grade =
      exam.calculateGpa && grades.length
        ? markGrade(grades, s.totalMarks ? (m.totalMarks * 100) / s.totalMarks : 0, pass)
        : undefined
    const gpa = grade?.gradePoint ?? 0
    count++
    return {
      ...m,
      isPassCalculated: true,
      isPass: pass,
      gpa,
      finalGpa: m.isOptional ? Math.max(0, gpa - subtraction) : gpa,
      letterGrade: grade?.name ?? "",
    }
  })
  return { marks, count }
}

// ---- Edit Student Marks ----

// Legacy TermExamStudent: a student's attendance and result notes for one
// term exam. Unsaved students get the exam's working days.
export type TermExamStudentInfo = {
  totalWorkingDays: number
  totalAttend: number
  isWithheld: boolean
  remarks: string
}

const studentInfo = new Map<string, TermExamStudentInfo>()

export function getTermExamStudentInfo(exam: TermExam, studentId: number): TermExamStudentInfo {
  return (
    studentInfo.get(`${exam.id}:${studentId}`) ?? {
      totalWorkingDays: exam.totalWorkingDays,
      totalAttend: 0,
      isWithheld: false,
      remarks: "",
    }
  )
}

// What Edit Student Marks can change for one subject. MCQ marks come from
// the answer sheet, so only their grace marks are editable.
export type MarkEdit = Pick<
  TermExamStudentMark,
  | "subjectId"
  | "theoryMarks"
  | "cqMarks"
  | "practicalMarks"
  | "attendanceMarks"
  | "assignmentMarks"
  | "theoryGraceMarks"
  | "cqGraceMarks"
  | "mcqGraceMarks"
>

// The student a mark edit is for.
export type EditTarget = { studentId: number; roll: string; optionalSubjectId: number | null }

// A mark over its full marks; `studentId`, `subjectId` and `field` name the
// input to highlight.
export class MarkEditError extends Error {
  studentId: number
  subjectId: number
  field: keyof MarkEdit
  constructor(message: string, studentId: number, subjectId: number, field: keyof MarkEdit) {
    super(message)
    this.studentId = studentId
    this.subjectId = subjectId
    this.field = field
  }
}

// The fields of a subject's mark the exam lets you edit.
export function editableFields(exam: TermExam, s: TermExamSubject) {
  const fields: (keyof MarkEdit)[] = []
  if (s.theoryMarks) fields.push("theoryMarks")
  if (s.cqMarks) fields.push("cqMarks")
  if (exam.hasGraceMarks) {
    if (s.theoryMarks) fields.push("theoryGraceMarks")
    if (s.cqMarks) fields.push("cqGraceMarks")
    if (s.mcqMarks) fields.push("mcqGraceMarks")
  }
  if (s.practicalMarks) fields.push("practicalMarks")
  if (exam.hasAssignmentMarks) fields.push("assignmentMarks")
  if (exam.hasAttendanceMarks) fields.push("attendanceMarks")
  return fields
}

const graceField = (f: keyof MarkEdit) => f.endsWith("GraceMarks")

// Legacy MapStudentsExamMark + isMarksChangedOrInserted + the single-student
// SaveRawBatch checks: the marks the edits change or add, checked against
// the full marks. Throws a MarkEditError on the first mark over its limit.
function changedMarks(exam: TermExam, rows: { student: EditTarget; edit: MarkEdit }[], user: string) {
  if (!exam.editEnable) throw new Error("This term exam is not editable.")
  const stamp = new Date().toISOString()
  const current = getTermExamMarks()
  const saved = new Map(
    current.filter((m) => m.termExamId === exam.id).map((m) => [`${m.studentId}:${m.subjectId}`, m])
  )
  const subjects = new Map(exam.subjects.map((s) => [s.subjectId, s]))
  let nextId = Math.max(0, ...current.map((m) => m.id)) + 1
  const changed: TermExamStudentMark[] = []

  for (const { student, edit } of rows) {
    const s = subjects.get(edit.subjectId)
    if (!s) throw new Error(`Invalid subject for this student [Student Roll: ${student.roll}]`)
    const existing = saved.get(`${student.studentId}:${edit.subjectId}`)
    // An inactive or deleted mark counts as none; saving starts it afresh.
    const old = existing && isActiveMark(existing) ? existing : undefined
    const fields = editableFields(exam, s)
    if (!fields.some((f) => (edit[f] ?? (graceField(f) ? 0 : null)) !== (old ? old[f] : graceField(f) ? 0 : null)))
      continue

    const next: TermExamStudentMark = old
      ? { ...old }
      : blankMark(
          existing?.id ?? nextId++,
          {
            termExamId: exam.id,
            studentId: student.studentId,
            subjectId: edit.subjectId,
            roll: student.roll,
            isOptional: student.optionalSubjectId === edit.subjectId,
          },
          user,
          stamp
        )
    for (const f of fields) {
      const value = edit[f] as number | null
      // Legacy clamps negative marks to 0.
      ;(next as Record<string, unknown>)[f] = graceField(f) ? Math.max(0, value ?? 0) : value == null ? null : Math.max(0, value)
    }
    next.totalMarks = markTotal(next)

    const fail = (message: string, field: keyof MarkEdit) =>
      new MarkEditError(message, student.studentId, s.subjectId, field)
    const over = (obtained: number | null, grace: number, full: number) => obtained != null && obtained + grace > full
    if (over(next.theoryMarks, next.theoryGraceMarks, s.theoryMarks))
      throw fail("Theory marks is greater than term exam subject's Theory marks.", "theoryMarks")
    if (over(next.cqMarks, next.cqGraceMarks, s.cqMarks))
      throw fail("CQ marks is greater than term exam subject's CQ marks.", "cqMarks")
    if (over(next.practicalMarks, 0, s.practicalMarks))
      throw fail("Practical marks is greater than term exam subject's Practical marks.", "practicalMarks")
    if (over(next.mcqMarks ?? (next.mcqGraceMarks ? 0 : null), next.mcqGraceMarks, s.mcqMarks))
      throw fail("MCQ marks is greater than term exam subject's MCQ marks.", "mcqGraceMarks")
    if (exam.hasAssignmentMarks && over(next.assignmentMarks, 0, exam.assignmentMarks))
      throw fail("Assignment marks is greater than term exam's Assignment marks.", "assignmentMarks")
    if (exam.hasAttendanceMarks && over(next.attendanceMarks, 0, exam.attendanceMarks))
      throw fail("Attendance marks is greater than term exam's Attendance marks.", "attendanceMarks")
    if (next.totalMarks > s.totalMarks)
      throw fail("Total marks is greater than term exam subject's Total marks.", fields[0])

    changed.push({ ...next, ...notCalculated, modifiedBy: user, modifiedAt: stamp })
  }
  return changed
}

// Save checked marks, then regenerate the exam's pass status.
function saveChanged(exam: TermExam, institute: Institute, changed: TermExamStudentMark[]) {
  const current = getTermExamMarks()
  const byId = new Map(changed.map((m) => [m.id, m]))
  const existing = new Set(current.map((m) => m.id))
  marks = [...current.map((m) => byId.get(m.id) ?? m), ...changed.filter((m) => !existing.has(m.id))]
  listeners.forEach((listener) => listener())
  regeneratePassStatus(exam, institute)
}

// Legacy MarksEdit (POST): save the student's exam info, then the subjects
// whose marks changed, then regenerate the exam's pass status. Throws a
// MarkEditError, saving nothing, when a mark is over its full marks.
export function editStudentMarks(
  exam: TermExam,
  institute: Institute,
  student: EditTarget,
  edits: MarkEdit[],
  info: TermExamStudentInfo,
  user: string
) {
  const changed = changedMarks(exam, edits.map((edit) => ({ student, edit })), user)
  studentInfo.set(`${exam.id}:${student.studentId}`, {
    totalWorkingDays: info.totalWorkingDays,
    totalAttend: info.totalAttend,
    isWithheld: info.isWithheld,
    remarks: info.remarks.trim(),
  })
  if (!changed.length) return { saved: 0, message: "Student info updated. No mark changed." }
  saveChanged(exam, institute, changed)
  return { saved: changed.length, message: "Data updated. Pass fail status assigned." }
}

// Legacy SubjectMarksEdit (POST): one subject's marks for a section's
// students. Only changed marks are saved, and nothing is saved when any
// mark is over its full marks.
export function editSubjectMarks(
  exam: TermExam,
  institute: Institute,
  rows: { student: EditTarget; edit: MarkEdit }[],
  user: string
) {
  const changed = changedMarks(exam, rows, user)
  if (!changed.length) return { saved: 0, message: "No marks updated." }
  saveChanged(exam, institute, changed)
  return { saved: changed.length, message: "Data updated. Pass fail status assigned." }
}

// ---- Student Marks Set Change ----

// Legacy splitRollFromString: comma separated rolls, spaces ignored, each
// once. Returns null when the text has anything but digits, "-" and commas.
export function parseRolls(text: string) {
  const compact = text.replace(/\s+/g, "")
  if (!compact) return []
  if (!/^[-,0-9]+$/.test(compact)) return null
  return [...new Set(compact.split(",").filter(Boolean))]
}

const sameSet = (a: string, b: string) => a.trim().toUpperCase() === b.trim().toUpperCase()

// Legacy StudentCount / LoadUploadedMarksBySubject: the subject's uploaded
// marks, in one section or all, for the given rolls or everyone, and with
// the old set code when given. `invalidRolls` are the asked-for rolls with
// no marks uploaded for the subject there.
export function setCodeTargets(
  exam: TermExam,
  options: { subjectId: number; sectionId: number | null; rolls: string[]; oldSetCode?: string },
  students: Student[] = getStudents()
) {
  const uploaded = uploadedMarks(exam, options, students)
  const inRolls = options.rolls.length ? uploaded.filter((m) => options.rolls.includes(m.roll)) : uploaded
  const withRoll = new Set(inRolls.map((m) => m.roll))
  const marks = options.oldSetCode ? inRolls.filter((m) => sameSet(m.setCode, options.oldSetCode!)) : inRolls
  return {
    // Every uploaded mark in scope, for showing the current set codes.
    inScope: inRolls,
    marks,
    invalidRolls: options.rolls.filter((roll) => !withRoll.has(roll)),
  }
}

// Legacy ChangeSetCode: relabel the marks with the new set code. MCQ marks
// are not rescored; use the correct answers and re-upload for that.
export function changeSetCode(exam: TermExam, targets: TermExamStudentMark[], newSetCode: string, user: string) {
  if (!exam.editEnable) throw new Error(`${exam.name} is restricted to make any changes`)
  const stamp = new Date().toISOString()
  const ids = new Set(targets.map((m) => m.id))
  const code = newSetCode.trim().toUpperCase()
  marks = getTermExamMarks().map((m) =>
    ids.has(m.id) ? { ...m, setCode: code, modifiedBy: user, modifiedAt: stamp } : m
  )
  listeners.forEach((listener) => listener())
  return ids.size
}

// ---- Marks Clear ----

// Legacy LoadUploadedMarksBySubject: an exam's uploaded marks, for one
// subject or all and one section or all.
export function uploadedMarks(
  exam: TermExam,
  options: { subjectId: number | null; sectionId: number | null },
  students: Student[] = getStudents()
) {
  const sectionOf =
    options.sectionId == null
      ? null
      : new Map(examStudents(exam, students).map((x) => [x.student.id, x.enrolment.sectionId]))
  return getTermExamMarks().filter(
    (m) =>
      m.termExamId === exam.id &&
      isActiveMark(m) &&
      (options.subjectId == null || m.subjectId === options.subjectId) &&
      (!sectionOf || sectionOf.get(m.studentId) === options.sectionId)
  )
}

// Legacy ClearMarks: permanently delete the marks. Returns how many.
export function clearMarks(exam: TermExam, targets: TermExamStudentMark[]) {
  if (!exam.editEnable) throw new Error(`${exam.name} is restricted to make any changes`)
  const ids = new Set(targets.map((m) => m.id))
  marks = getTermExamMarks().filter((m) => !ids.has(m.id))
  listeners.forEach((listener) => listener())
  return ids.size
}

// ---- Subject Grace Marks ----

// Legacy GraceType: "Up to pass" lifts a part no higher than its pass
// marks; "Total" up to its full marks.
export const graceTypes = ["Up to pass", "Total"] as const
export type GraceType = (typeof graceTypes)[number]

// Legacy ResultType, less Absence: admin has no exam attendance, and a
// student without marks is the absent one, so grace only goes to students
// whose marks are uploaded.
export const graceResultTypes = ["All", "Pass", "Failed"] as const
export const graceSubjectTypes = ["All", "Compulsory", "Optional"] as const

export type GraceAmounts = { theory: number | null; cq: number | null; mcq: number | null }

// Legacy GetGraceMarks: the grace that takes the obtained marks up to the
// cap, never more than asked for nor below 0.
export function graceFor(cap: number, obtained: number | null, grace: number) {
  return Math.max(0, Math.min(grace, cap - (obtained ?? 0)))
}

// Legacy LoadTermExamStudentMarksForGrace: the subject's uploaded marks in
// scope, by the subject's current pass status and by optional or not.
export function graceTargets(
  exam: TermExam,
  options: {
    subjectId: number
    sectionId: number | null
    result: (typeof graceResultTypes)[number]
    subjectType: (typeof graceSubjectTypes)[number]
  },
  students: Student[] = getStudents()
) {
  const s = exam.subjects.find((x) => x.subjectId === options.subjectId)
  if (!s) return []
  return uploadedMarks(exam, options, students).filter(
    (m) =>
      (options.subjectType === "All" || m.isOptional === (options.subjectType === "Optional")) &&
      (options.result === "All" || markIsPass(s, m) === (options.result === "Pass"))
  )
}

// Each target with the grace marks it would get.
export function graceMarksFor(exam: TermExam, subjectId: number, targets: TermExamStudentMark[], graceType: GraceType, amounts: GraceAmounts) {
  const s = exam.subjects.find((x) => x.subjectId === subjectId)!
  const upToPass = graceType === "Up to pass"
  return targets.map((m) => {
    const next = { ...m }
    if (amounts.theory != null) next.theoryGraceMarks = graceFor(upToPass ? s.theoryPassMarks : s.theoryMarks, m.theoryMarks, amounts.theory)
    if (amounts.cq != null) next.cqGraceMarks = graceFor(upToPass ? s.cqPassMarks : s.cqMarks, m.cqMarks, amounts.cq)
    if (amounts.mcq != null) next.mcqGraceMarks = graceFor(upToPass ? s.mcqPassMarks : s.mcqMarks, m.mcqMarks, amounts.mcq)
    next.totalMarks = markTotal(next)
    return next
  })
}

// Legacy SubjectGraceMarks (POST): set the grace marks, replacing any the
// students had for those parts, then regenerate the exam's pass status.
export function applyGraceMarks(
  exam: TermExam,
  institute: Institute,
  subjectId: number,
  targets: TermExamStudentMark[],
  graceType: GraceType,
  amounts: GraceAmounts,
  user: string
) {
  const s = exam.subjects.find((x) => x.subjectId === subjectId)
  if (!exam.editEnable) throw new Error(`${exam.name} is restricted to make any changes`)
  if (!exam.hasGraceMarks) throw new Error(`${exam.name} got no grace marks`)
  if (!s) throw new Error("Invalid subject")
  if (amounts.theory == null && amounts.cq == null && amounts.mcq == null)
    throw new Error("Please enter at least one grace marks.")
  if (amounts.theory != null && !s.theoryMarks) throw new Error("This exam subject has no theory marks to apply grace marks.")
  if (amounts.cq != null && !s.cqMarks) throw new Error("This exam subject has no CQ marks to apply grace marks.")
  if (amounts.mcq != null && !s.mcqMarks) throw new Error("This exam subject has no MCQ marks to apply grace marks.")
  if (!targets.length) throw new Error("No grace marks added.")

  const stamp = new Date().toISOString()
  const updated = new Map(
    graceMarksFor(exam, subjectId, targets, graceType, amounts).map((m) => [
      m.id,
      { ...m, ...notCalculated, modifiedBy: user, modifiedAt: stamp },
    ])
  )
  marks = getTermExamMarks().map((m) => updated.get(m.id) ?? m)
  listeners.forEach((listener) => listener())
  regeneratePassStatus(exam, institute)
  return updated.size
}

// ---- Marks Recalculation ----

// Legacy GetMcqMarksDetails + LoadStudentMcqMarksChecker: score an answer
// sheet against the key, question by question, up to the subject's question
// count. Key entries: an option ("B"), a choice ("B|D", "A| " also accepts a
// blank), "+" always gives the mark, "-" never does, "$" gives it for any
// answer. Returns null when the key or the sheet is empty.
export function scoreMcq(key: string, sheet: string, questions: number, perCorrect: number) {
  if (!key.trim() || !sheet.trim()) return null
  const correctList = key.split(",").map((x) => x.trim().toLowerCase()).slice(0, questions > 0 ? questions : undefined)
  const answered = sheet.split(",").map((x) => x.trim().toLowerCase())
  let correct = 0
  let wrong = 0
  let notAnswered = 0
  for (let i = 0; i < correctList.length && i < answered.length; i++) {
    const answer = correctList[i]
    const given = answered[i]
    if (answer === "-") {
      if (!given) notAnswered++
    } else if (answer === "+") {
      correct++
      if (!given) notAnswered++
    } else if (answer === "$") {
      if (given) correct++
      else notAnswered++
    } else if (answer.includes("|")) {
      const options = answer.split("|")
      if (given) {
        if (options.includes(given)) correct++
        else wrong++
      } else if (options.some((o) => !o.trim())) correct++
      else notAnswered++
    } else if (answer === given) correct++
    else if (!given) notAnswered++
    else wrong++
  }
  return { correct, wrong, notAnswered, marks: correct * perCorrect }
}

// Legacy MarksRecalculation targets: the subject's uploaded marks on the set
// code, in one section or all. `withSheet` are the ones with an answer sheet
// to score; the rest were uploaded as marks only and are left as they are.
export function recalculationTargets(
  exam: TermExam,
  options: { subjectId: number; sectionId: number | null; setCode: string },
  students: Student[] = getStudents()
) {
  const onSet = uploadedMarks(exam, options, students).filter((m) => sameSet(m.setCode, options.setCode))
  return { onSet, withSheet: onSet.filter((m) => m.mcqAnswer.trim()) }
}

// The targets with their answer sheets rescored against the key, and
// whether each one's MCQ result changes.
export function rescoredMarks(exam: TermExam, subjectId: number, targets: TermExamStudentMark[], answerKey: string) {
  const s = exam.subjects.find((x) => x.subjectId === subjectId)
  if (!s) return []
  const perCorrect =
    classYearExamSubjects(exam.instituteId, exam.classId, exam.yearId, exam.medium, exam.groupId).find(
      (x) => x.subject.subjectId === subjectId
    )?.perMcq || 1
  return targets.flatMap((m) => {
    const score = scoreMcq(answerKey, m.mcqAnswer, s.mcqMarks, perCorrect)
    if (!score) return []
    const next = {
      ...m,
      mcqMarks: score.marks,
      mcqCorrectAnswer: score.correct,
      mcqWrongAnswer: score.wrong,
      mcqNotAnswer: score.notAnswered,
    }
    next.totalMarks = markTotal(next)
    const changed =
      next.mcqMarks !== m.mcqMarks ||
      next.mcqCorrectAnswer !== m.mcqCorrectAnswer ||
      next.mcqWrongAnswer !== m.mcqWrongAnswer ||
      next.mcqNotAnswer !== m.mcqNotAnswer
    return [{ mark: next, changed }]
  })
}

// Legacy MarksRecalcutation: rescore the answer sheets against the set's
// correct answers, total the marks again and regenerate the exam's pass
// status. Returns how many marks were recalculated and how many changed.
export function recalculateMarks(
  exam: TermExam,
  institute: Institute,
  subjectId: number,
  targets: TermExamStudentMark[],
  answerKey: string,
  user: string
) {
  if (!exam.editEnable) throw new Error(`${exam.name} is not edit enable`)
  if (!exam.subjects.some((x) => x.subjectId === subjectId)) throw new Error(`Invalid subject for ${exam.name}`)
  if (!targets.length) throw new Error(`No student/subject marks found for ${exam.name}`)
  if (!answerKey.trim()) throw new Error("No correct answer found for this set code")
  const stamp = new Date().toISOString()
  const rescored = rescoredMarks(exam, subjectId, targets, answerKey)
  const updated = new Map(
    rescored.map(({ mark }) => [mark.id, { ...mark, ...notCalculated, modifiedBy: user, modifiedAt: stamp }])
  )
  marks = getTermExamMarks().map((m) => updated.get(m.id) ?? m)
  listeners.forEach((listener) => listener())
  regeneratePassStatus(exam, institute)
  return { recalculated: updated.size, changed: rescored.filter((r) => r.changed).length }
}

// ---- Student Marks Manage ----

export function useTermExamMark(id: number) {
  return useTermExamMarks().find((m) => m.id === id)
}

// Legacy StatusUpdate / Delete / Retrive / PermanentDelete on one mark. A
// status change clears the exam's pass status ("Pass Fail ReGenerate"
// again), since the mark stops or starts counting.
function patchMark(id: number, changes: Partial<TermExamStudentMark>, user: string) {
  const stamp = new Date().toISOString()
  marks = getTermExamMarks().map((m) =>
    m.id === id ? { ...m, ...changes, ...notCalculated, modifiedBy: user, modifiedAt: stamp } : m
  )
  listeners.forEach((listener) => listener())
}

// Active ⇄ Inactive.
export function toggleMarkStatus(id: number, user: string) {
  const mark = getTermExamMarks().find((m) => m.id === id)
  if (!mark || mark.status === "Deleted") return
  patchMark(id, { status: mark.status === "Active" ? "Inactive" : "Active" }, user)
}

export function deleteMark(id: number, user: string) {
  const mark = getTermExamMarks().find((m) => m.id === id)
  if (!mark || mark.status === "Deleted") return
  patchMark(id, { status: "Deleted" }, user)
}

// Brings a deleted mark back as active. (A new upload or edit for the same
// student and subject reuses the deleted mark, so there is never a second.)
export function retrieveMark(id: number, user: string) {
  const mark = getTermExamMarks().find((m) => m.id === id)
  if (!mark || mark.status !== "Deleted") return
  patchMark(id, { status: "Active" }, user)
}

export function deleteMarkPermanently(id: number) {
  marks = getTermExamMarks().filter((m) => m.id !== id)
  listeners.forEach((listener) => listener())
}
