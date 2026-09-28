"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import type { Section } from "@/lib/institutes"

// Legacy SchoolCollege Teacher (+ TeacherSection, TeacherSubject): a teacher
// of one institute, the sections they take and the subjects they teach.
// Deleting only marks the teacher "Deleted" (it can be retrieved); a
// permanent delete removes it.

export const teacherStatuses = ["Active", "Inactive", "Deleted"] as const
export type TeacherStatus = (typeof teacherStatuses)[number]

// One "Add Section" row. Structures the institute doesn't use are null / "".
export type TeacherSection = {
  branchId: number | null
  medium: string
  classId: number
  version: string
  yearId: number
  shiftId: number | null
  gender: Section["gender"] | ""
  groupId: number | null
  sectionId: number
}

export type Teacher = {
  id: number
  instituteId: number
  rank: number
  name: string
  teacherCode: string
  email: string
  mobile: string
  // A login was made for the teacher (institute's "Create user account on
  // teacher registration"). The password itself belongs to the backend.
  hasAccount: boolean
  // The admin-panel user who signs in as this teacher (legacy
  // Teacher.NccUser); null when none is linked. The teacher form doesn't
  // edit it, so it isn't part of TeacherInput.
  userId: number | null
  subjectIds: number[]
  sections: TeacherSection[]
  status: TeacherStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type TeacherInput = Omit<
  Teacher,
  "id" | "rank" | "userId" | "status" | "createdBy" | "createdAt" | "modifiedBy" | "modifiedAt"
>

const now = () => new Date().toISOString()
const seedUser = "Super Admin"

// Seeded sections of institute 1: id n is class ⌈n/2⌉, branch 1, shift 1 for
// section A and shift 2 for section B, in academic year 2026 (id 2).
function seedSection(sectionId: number): TeacherSection {
  return {
    branchId: 1,
    medium: "",
    classId: Math.ceil(sectionId / 2),
    version: "",
    yearId: 2,
    shiftId: sectionId % 2 ? 1 : 2,
    gender: "",
    groupId: null,
    sectionId,
  }
}

function seedTeacher(
  id: number,
  name: string,
  teacherCode: string,
  mobile: string,
  subjectIds: number[],
  sectionIds: number[],
  extra: Partial<Teacher> = {}
): Teacher {
  return {
    id,
    instituteId: 1,
    rank: id,
    name,
    teacherCode,
    email: `${name.split(" ")[0].toLowerCase()}@school.edu.bd`,
    mobile,
    hasAccount: false,
    userId: null,
    subjectIds,
    sections: sectionIds.map(seedSection),
    status: "Active",
    createdBy: seedUser,
    createdAt: "2026-01-05T10:00:00.000Z",
    modifiedBy: seedUser,
    modifiedAt: "2026-01-05T10:00:00.000Z",
    ...extra,
  }
}

const seed: Teacher[] = [
  seedTeacher(1, "Abdul Karim", "T-1001", "01711000001", [1], [1, 2, 3], {
    hasAccount: true,
    userId: 7,
  }),
  seedTeacher(2, "Salma Begum", "T-1002", "01811000002", [2], [3, 4, 5, 6]),
  seedTeacher(3, "Mahmudul Hasan", "T-1003", "01911000003", [3, 4], [7, 8, 9, 10], {
    modifiedAt: "2026-03-12T08:15:00.000Z",
  }),
  seedTeacher(4, "Farhana Akter", "T-1004", "01611000004", [4], [9], {
    status: "Inactive",
  }),
]

// In-memory dummy store shared by the teacher pages for the browser session.
// Replace with API calls once the backend endpoints exist.
let teachers: Teacher[] = seed
const listeners = new Set<() => void>()

function emit(next: Teacher[]) {
  logChanges("Teacher", teachers, next)
  teachers = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useTeachers() {
  return React.useSyncExternalStore(
    subscribe,
    () => teachers,
    () => seed
  )
}

export function useTeacher(id: number) {
  return useTeachers().find((teacher) => teacher.id === id)
}

export function getTeachers() {
  return teachers
}

// The institute's teachers that hold a rank (every one not deleted).
function ranked(all: Teacher[], instituteId: number) {
  return all.filter((t) => t.instituteId === instituteId && t.status !== "Deleted")
}

export function maxTeacherRank(instituteId: number) {
  return Math.max(0, ...ranked(teachers, instituteId).map((t) => t.rank))
}

// The legacy duplicate checks: one name (and one code) per institute.
function isDuplicate(
  key: "name" | "teacherCode",
  instituteId: number,
  value: string,
  exceptId?: number
) {
  const needle = value.trim().toLowerCase()
  return ranked(teachers, instituteId).some(
    (t) => t.id !== exceptId && t[key].trim().toLowerCase() === needle
  )
}

export function isDuplicateTeacherName(instituteId: number, name: string, exceptId?: number) {
  return isDuplicate("name", instituteId, name, exceptId)
}

export function isDuplicateTeacherCode(instituteId: number, code: string, exceptId?: number) {
  return isDuplicate("teacherCode", instituteId, code, exceptId)
}

export function addTeacher(input: TeacherInput, user: string) {
  const stamp = now()
  const teacher: Teacher = {
    ...input,
    userId: null,
    id: Math.max(0, ...teachers.map((t) => t.id)) + 1,
    rank: maxTeacherRank(input.instituteId) + 1,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...teachers, teacher])
  return teacher
}

function patch(id: number, changes: Partial<Teacher>, user: string) {
  emit(
    teachers.map((t) =>
      t.id === id ? { ...t, ...changes, modifiedBy: user, modifiedAt: now() } : t
    )
  )
}

export function updateTeacher(id: number, input: TeacherInput, user: string) {
  patch(id, input, user)
}

// Active ⇄ Inactive.
export function toggleTeacherStatus(id: number, user: string) {
  const teacher = teachers.find((t) => t.id === id)
  if (!teacher || teacher.status === "Deleted") return
  patch(id, { status: teacher.status === "Active" ? "Inactive" : "Active" }, user)
}

// Close the gap a teacher leaves in its institute's ranks.
function withoutRank(all: Teacher[], teacher: Teacher) {
  return all.map((t) =>
    t.instituteId === teacher.instituteId && t.status !== "Deleted" && t.rank > teacher.rank
      ? { ...t, rank: t.rank - 1 }
      : t
  )
}

// Soft delete; the legacy "Retrieve" brings it back as active, last in rank.
export function deleteTeacher(id: number, user: string) {
  const teacher = teachers.find((t) => t.id === id)
  if (!teacher || teacher.status === "Deleted") return
  emit(withoutRank(teachers, teacher))
  patch(id, { status: "Deleted" }, user)
}

export function retrieveTeacher(id: number, user: string) {
  const teacher = teachers.find((t) => t.id === id)
  if (!teacher || teacher.status !== "Deleted") return
  patch(id, { status: "Active", rank: maxTeacherRank(teacher.instituteId) + 1 }, user)
}

export function deleteTeacherPermanently(id: number) {
  const teacher = teachers.find((t) => t.id === id)
  if (!teacher) return
  const rest = teachers.filter((t) => t.id !== id)
  emit(teacher.status === "Deleted" ? rest : withoutRank(rest, teacher))
}

// Legacy UpdateRank: move the teacher to `newRank` (1..max) within its
// institute, shifting the teachers in between by one.
export function setTeacherRank(id: number, newRank: number, user: string) {
  const teacher = teachers.find((t) => t.id === id)
  if (!teacher || teacher.status === "Deleted") return
  const old = teacher.rank
  if (newRank === old) return
  const [low, high, step] = newRank < old ? [newRank, old - 1, 1] : [old + 1, newRank, -1]
  const stamp = now()
  emit(
    teachers.map((t) => {
      if (t.id === id) return { ...t, rank: newRank, modifiedBy: user, modifiedAt: stamp }
      if (
        t.instituteId === teacher.instituteId &&
        t.status !== "Deleted" &&
        t.rank >= low &&
        t.rank <= high
      ) {
        return { ...t, rank: t.rank + step }
      }
      return t
    })
  )
}

export function removeInstituteTeachers(instituteId: number) {
  emit(teachers.filter((t) => t.instituteId !== instituteId))
}
