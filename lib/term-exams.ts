"use client"

import * as React from "react"

import { classYearSubjectStore } from "@/lib/academic-store"
import { logChanges } from "@/lib/common-log"
import { capabilitiesFor, type AccessSurface } from "@/lib/access"
import type { ClassYearSubjectDetail } from "@/lib/institutes"

// Legacy SchoolCollege TermExam (+ TermExamSubject, TermExamDependent): an
// exam a class sits in an academic year, with the subjects it covers and how
// each is marked. Deleting only marks the exam "Deleted" (it can be
// retrieved); a permanent delete removes it.

export const termExamStatuses = ["Active", "Inactive", "Deleted"] as const
export type TermExamStatus = (typeof termExamStatuses)[number]

// The marked parts of an exam subject, as [marks, pass marks] field pairs.
export const examMarkParts = [
  { label: "Theory", marks: "theoryMarks", pass: "theoryPassMarks" },
  { label: "CQ", marks: "cqMarks", pass: "cqPassMarks" },
  { label: "MCQ", marks: "mcqMarks", pass: "mcqPassMarks" },
  { label: "Practical", marks: "practicalMarks", pass: "practicalPassMarks" },
] as const

export type TermExamSubject = {
  subjectId: number
  theoryMarks: number
  theoryPassMarks: number
  cqMarks: number
  cqPassMarks: number
  mcqMarks: number
  mcqPassMarks: number
  practicalMarks: number
  practicalPassMarks: number
  totalMarks: number
  // Entered separately; not always the sum of the part pass marks.
  totalPassMarks: number
}

// Dates are ISO "YYYY-MM-DD". Optional structures are null / "" when unset,
// which means "all" (e.g. every branch) as in the legacy exam.
export type TermExam = {
  id: number
  instituteId: number
  rank: number
  medium: string
  classId: number
  groupId: number | null
  yearId: number
  branchId: number | null
  version: string
  shiftId: number | null
  name: string
  // Name plus the academic year, e.g. "Half Yearly - 2026".
  fullName: string
  examStart: string
  examEnd: string
  resultPublish: string
  parentExamId: number | null
  totalWorkingDays: number
  hasAttendanceMarks: boolean
  attendanceMarks: number
  hasAssignmentMarks: boolean
  assignmentMarks: number
  calculateGpa: boolean
  editEnable: boolean
  multiPaperCalculation: boolean
  onlinePublished: boolean
  showInYearBook: boolean
  hasGraceMarks: boolean
  parentExamWithoutOptional: boolean
  subjects: TermExamSubject[]
  dependentExamIds: number[]
  status: TermExamStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

// Admin may always edit an exam; Manage only while its "Edit enable" is on
// (legacy ManageAjax); View never.
export function canEditExam(exam: TermExam, surface: AccessSurface) {
  return capabilitiesFor(surface, { resource: "term-exam", softDelete: true }).edit && (surface === "Admin" || exam.editEnable)
}

export type TermExamInput = Omit<
  TermExam,
  "id" | "rank" | "status" | "createdBy" | "createdAt" | "modifiedBy" | "modifiedAt"
>

function fromDetail(detail: ClassYearSubjectDetail): TermExamSubject {
  return {
    subjectId: detail.subjectId,
    theoryMarks: detail.theoryMarks,
    theoryPassMarks: detail.theoryPassMarks,
    cqMarks: detail.cqMarks,
    cqPassMarks: detail.cqPassMarks,
    mcqMarks: detail.mcqMarks,
    mcqPassMarks: detail.mcqPassMarks,
    practicalMarks: detail.practicalMarks,
    practicalPassMarks: detail.practicalPassMarks,
    totalMarks:
      detail.theoryMarks + detail.cqMarks + detail.mcqMarks + detail.practicalMarks,
    totalPassMarks:
      detail.theoryPassMarks +
      detail.cqPassMarks +
      detail.mcqPassMarks +
      detail.practicalPassMarks,
  }
}

// The subjects a class takes in a year (legacy LoadTermExamSubject), marked
// as the class-year subject set has them. With a group, only that group's
// subjects and the common ones; without, every subject once.
export function classYearExamSubjects(
  instituteId: number,
  classId: number,
  yearId: number,
  medium: string,
  groupId: number | null
) {
  const sets = classYearSubjectStore
    .getList(instituteId)
    .filter(
      (set) =>
        set.classId === classId &&
        set.yearId === yearId &&
        set.status === "Active" &&
        (!medium || !set.medium || set.medium === medium)
    )
  const seen = new Map<number, { subject: TermExamSubject; perMcq: number }>()
  for (const set of sets) {
    for (const detail of set.details) {
      if (groupId != null && detail.groupId != null && detail.groupId !== groupId) continue
      if (!seen.has(detail.subjectId)) {
        seen.set(detail.subjectId, {
          subject: fromDetail(detail),
          perMcq: detail.mcqMarksPerQuestion,
        })
      }
    }
  }
  return [...seen.values()]
}

const now = () => new Date().toISOString()
const seedUser = "Super Admin"

function seedExam(
  id: number,
  name: string,
  classId: number,
  [examStart, examEnd, resultPublish]: [string, string, string],
  extra: Partial<TermExam> = {}
): TermExam {
  const set = classYearSubjectStore.getList(1).find((s) => s.classId === classId)
  return {
    id,
    instituteId: 1,
    rank: id,
    medium: "",
    classId,
    groupId: null,
    yearId: 2,
    branchId: null,
    version: "",
    shiftId: null,
    name,
    fullName: `${name} - 2026`,
    examStart,
    examEnd,
    resultPublish,
    parentExamId: null,
    totalWorkingDays: 0,
    hasAttendanceMarks: false,
    attendanceMarks: 0,
    hasAssignmentMarks: false,
    assignmentMarks: 0,
    calculateGpa: true,
    editEnable: true,
    multiPaperCalculation: false,
    onlinePublished: false,
    showInYearBook: false,
    hasGraceMarks: false,
    parentExamWithoutOptional: false,
    subjects: set ? set.details.map(fromDetail) : [],
    dependentExamIds: [],
    status: "Active",
    createdBy: seedUser,
    createdAt: "2026-01-10T09:30:00.000Z",
    modifiedBy: seedUser,
    modifiedAt: "2026-01-10T09:30:00.000Z",
    ...extra,
  }
}

const seed: TermExam[] = [
  seedExam(1, "Half Yearly", 4, ["2026-06-01", "2026-06-15", "2026-06-30"], {
    onlinePublished: true,
    showInYearBook: true,
    totalWorkingDays: 110,
    hasAttendanceMarks: true,
    attendanceMarks: 5,
  }),
  seedExam(2, "Annual", 4, ["2026-11-20", "2026-12-05", "2026-12-20"], {
    parentExamId: 1,
  }),
  seedExam(3, "Test Exam", 5, ["2026-09-01", "2026-09-14", "2026-09-25"], {
    hasGraceMarks: true,
  }),
]

// In-memory dummy store shared by the term exam pages for the browser session.
// Replace with API calls once the backend endpoints exist.
let exams: TermExam[] = seed
const listeners = new Set<() => void>()

function emit(next: TermExam[]) {
  logChanges("TermExam", exams, next)
  exams = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTermExams() {
  return React.useSyncExternalStore(
    subscribe,
    () => exams,
    () => seed
  )
}

export function useTermExam(id: number) {
  return useTermExams().find((exam) => exam.id === id)
}

export function getTermExams() {
  return exams
}

// Exams that could be this one's parent (legacy LoadParentTermExam): active
// exams of the same institute, class, year and structure.
export function parentExamOptions(
  all: TermExam[],
  exam: Pick<
    TermExam,
    "instituteId" | "medium" | "classId" | "groupId" | "yearId" | "branchId" | "version" | "shiftId"
  >,
  exceptId?: number
) {
  return all.filter(
    (e) =>
      e.id !== exceptId &&
      e.status === "Active" &&
      e.instituteId === exam.instituteId &&
      e.classId === exam.classId &&
      e.yearId === exam.yearId &&
      e.medium === exam.medium &&
      e.groupId === exam.groupId &&
      e.branchId === exam.branchId &&
      e.version === exam.version &&
      e.shiftId === exam.shiftId
  )
}

// Exams this one can depend on (legacy LoadDependentTermExam): the class's
// other active exams.
export function dependentExamOptions(
  all: TermExam[],
  instituteId: number,
  classId: number,
  exceptId?: number
) {
  return all.filter(
    (e) =>
      e.id !== exceptId &&
      e.status === "Active" &&
      e.instituteId === instituteId &&
      e.classId === classId
  )
}

// The legacy duplicate check: one name per institute, class, year and structure.
export function isDuplicateExamName(input: TermExamInput, exceptId?: number) {
  const name = input.name.trim().toLowerCase()
  return parentExamOptions(
    exams.filter((e) => e.status !== "Deleted"),
    input,
    exceptId
  ).some((e) => e.name.trim().toLowerCase() === name)
}

export function addTermExam(input: TermExamInput, user: string) {
  const siblings = exams.filter((e) => e.instituteId === input.instituteId)
  const stamp = now()
  const exam: TermExam = {
    ...input,
    id: Math.max(0, ...exams.map((e) => e.id)) + 1,
    rank: Math.max(0, ...siblings.map((e) => e.rank)) + 1,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...exams, exam])
  return exam
}

function patch(id: number, changes: Partial<TermExam>, user: string) {
  emit(
    exams.map((e) =>
      e.id === id ? { ...e, ...changes, modifiedBy: user, modifiedAt: now() } : e
    )
  )
}

export function updateTermExam(id: number, input: TermExamInput, user: string) {
  patch(id, input, user)
}

// Active ⇄ Inactive.
export function toggleTermExamStatus(id: number, user: string) {
  const exam = exams.find((e) => e.id === id)
  if (!exam || exam.status === "Deleted") return
  patch(id, { status: exam.status === "Active" ? "Inactive" : "Active" }, user)
}

export function toggleOnlinePublished(id: number, user: string) {
  const exam = exams.find((e) => e.id === id)
  if (exam) patch(id, { onlinePublished: !exam.onlinePublished }, user)
}

// Soft delete; the legacy "Retrive" brings it back as active.
export function deleteTermExam(id: number, user: string) {
  patch(id, { status: "Deleted", onlinePublished: false }, user)
}

export function retrieveTermExam(id: number, user: string) {
  patch(id, { status: "Active" }, user)
}

// Also drops it as a parent or dependency of other exams.
export function deleteTermExamPermanently(id: number) {
  emit(
    exams
      .filter((e) => e.id !== id)
      .map((e) =>
        e.parentExamId === id || e.dependentExamIds.includes(id)
          ? {
              ...e,
              parentExamId: e.parentExamId === id ? null : e.parentExamId,
              dependentExamIds: e.dependentExamIds.filter((d) => d !== id),
            }
          : e
      )
  )
}

export function removeInstituteTermExams(instituteId: number) {
  emit(exams.filter((e) => e.instituteId !== instituteId))
}
