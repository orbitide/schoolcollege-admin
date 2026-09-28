"use client"

import * as React from "react"

import type { Building, BuildingRoom } from "@/lib/institutes"
import { roomCapacity } from "@/lib/institutes"
import type { MeritList } from "@/lib/merit-lists"
import type { Enrolment, Student } from "@/lib/students"
import { examStudents, takesSubject } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"

// Legacy SchoolCollege ExamSeatPlan + ExamSeatPlanDetail: where one subject
// of a term exam is sat — the date and time, and for each room used, the
// group and version it seats and the roll range, the rolls handed out in
// order (ExamSeatPlanService.PreviewSeatPlan / GenerateSeatPlan).
// In-memory dummy store for the browser session; replace with API calls
// once the backend endpoints exist.

export type SeatPlanRoom = {
  buildingId: number
  roomId: number
  // How many students the room seats (at most its capacity).
  students: number
  // The group and version whose students it seats; null / "" when the
  // class has no groups or the institute no versions.
  groupId: number | null
  version: string
  rollFrom: string
  rollTo: string
}

export type ExamSeatPlan = {
  id: number
  instituteId: number
  termExamId: number
  subjectId: number
  // The part of the exam the plan is for; null / "" for all of it.
  groupId: number | null
  version: string
  subtitle: string
  // ISO "YYYY-MM-DD" and "HH:MM".
  examDate: string
  startTime: string
  endTime: string
  rooms: SeatPlanRoom[]
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type SeatPlanInput = Omit<ExamSeatPlan, "id" | "createdBy" | "createdAt" | "modifiedBy" | "modifiedAt">

// ---- Store ----

const seedStamp = "2026-05-25T10:00:00.000Z"
// Half Yearly (exam 1), Bangla: Class Nine's six examinees, a group to a room.
const seed: ExamSeatPlan[] = [
  {
    id: 1,
    instituteId: 1,
    termExamId: 1,
    subjectId: 1,
    groupId: null,
    version: "",
    subtitle: "Half Yearly Examination 2026",
    examDate: "2026-06-01",
    startTime: "10:00",
    endTime: "13:00",
    rooms: [
      { buildingId: 1, roomId: 1, students: 2, groupId: 1, version: "", rollFrom: "901", rollTo: "904" },
      { buildingId: 1, roomId: 2, students: 2, groupId: 2, version: "", rollFrom: "902", rollTo: "905" },
      { buildingId: 1, roomId: 3, students: 2, groupId: 3, version: "", rollFrom: "903", rollTo: "906" },
    ],
    createdBy: "Super Admin",
    createdAt: seedStamp,
    modifiedBy: "Super Admin",
    modifiedAt: seedStamp,
  },
]

let plans: ExamSeatPlan[] = seed
const listeners = new Set<() => void>()
const emit = (next: ExamSeatPlan[]) => {
  plans = next
  listeners.forEach((listener) => listener())
}
function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getExamSeatPlans() {
  return plans
}

export function useExamSeatPlans() {
  return React.useSyncExternalStore(subscribe, getExamSeatPlans, () => seed)
}

export function saveExamSeatPlan(input: SeatPlanInput, user: string, id?: number) {
  const stamp = new Date().toISOString()
  if (id != null) {
    emit(plans.map((p) => (p.id === id ? { ...p, ...input, modifiedBy: user, modifiedAt: stamp } : p)))
    return id
  }
  const next = Math.max(0, ...plans.map((p) => p.id)) + 1
  emit([...plans, { ...input, id: next, createdBy: user, createdAt: stamp, modifiedBy: user, modifiedAt: stamp }])
  return next
}

export function deleteExamSeatPlan(id: number) {
  emit(plans.filter((p) => p.id !== id))
}

// The seat plans that seat students in the room (or any room of the building).
export function plansUsingRoom(buildingId: number, roomId?: number) {
  return plans.filter((p) => p.rooms.some((r) => r.buildingId === buildingId && (roomId == null || r.roomId === roomId)))
}

// ---- Students and rolls ----

export type SeatedStudent = { student: Student; enrolment: Enrolment }

const byRoll = (a: SeatedStudent, b: SeatedStudent) =>
  a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })

// Legacy LoadSubjectWiseStudentRoll / LoadSubjectWiseFailedStudentRoll: the
// exam's students who take the subject — for a retake exam, those who
// failed it in the parent exam — in the plan's group and version, in roll order.
export function seatPlanStudents(
  exam: TermExam,
  subjectId: number,
  scope: { groupId: number | null; version: string },
  data: { students: Student[]; meritLists: MeritList[] }
): SeatedStudent[] {
  const failed =
    exam.parentExamId != null
      ? new Set(
          data.meritLists
            .find((l) => l.termExamId === exam.parentExamId)
            ?.results.filter((r) => r.marks.some((m) => m.subjectId === subjectId && !m.isPass) || !r.marks.some((m) => m.subjectId === subjectId))
            .map((r) => r.studentId) ?? []
        )
      : null
  return examStudents(exam, data.students)
    .filter(
      ({ student, enrolment: e }) =>
        e.classRoll.trim() &&
        takesSubject(e, subjectId) &&
        (!failed || failed.has(student.id)) &&
        (scope.groupId == null || e.groupId === scope.groupId) &&
        (!scope.version || e.version === scope.version)
    )
    .sort(byRoll)
}

// The group and version a room seats, as one key (legacy's six lists).
export const bucketOf = (groupId: number | null, version: string, useGroup: boolean, useVersion: boolean) =>
  `${useGroup ? (groupId ?? "") : ""}|${useVersion ? version : ""}`

export type RoomAssignment = { rollFrom: string; rollTo: string; found: number }

// Legacy PreviewSeatPlan / FindAndSetRollToSeatPlan: each room, in order,
// takes the next `students` rolls of its group and version.
export function assignRolls(
  students: SeatedStudent[],
  rooms: Pick<SeatPlanRoom, "students" | "groupId" | "version">[],
  split: { useGroup: boolean; useVersion: boolean }
): RoomAssignment[] {
  const buckets = new Map<string, SeatedStudent[]>()
  for (const s of students) {
    const key = bucketOf(s.enrolment.groupId, s.enrolment.version, split.useGroup, split.useVersion)
    buckets.set(key, [...(buckets.get(key) ?? []), s])
  }
  const taken = new Map<string, number>()
  return rooms.map((room) => {
    const key = bucketOf(room.groupId, room.version, split.useGroup, split.useVersion)
    const skip = taken.get(key) ?? 0
    const seated = (buckets.get(key) ?? []).slice(skip, skip + Math.max(0, room.students))
    taken.set(key, skip + seated.length)
    return {
      rollFrom: seated[0]?.enrolment.classRoll ?? "",
      rollTo: seated.at(-1)?.enrolment.classRoll ?? "",
      found: seated.length,
    }
  })
}

// The rooms a plan can use: every room of the institute's active buildings
// (in the exam's branch, when it has one), building by building.
export function seatPlanRooms(buildings: Building[], branchId: number | null) {
  return buildings
    .filter((b) => b.status === "Active" && (branchId == null || b.branchId == null || b.branchId === branchId))
    .flatMap((building) => building.rooms.map((room) => ({ building, room, capacity: roomCapacity(room) })))
}

export type PlanRoomOption = { building: Building; room: BuildingRoom; capacity: number }

const overlaps = (a: Pick<ExamSeatPlan, "examDate" | "startTime" | "endTime">, b: typeof a) =>
  a.examDate === b.examDate && a.startTime < b.endTime && b.startTime < a.endTime

// Why the plan can't be saved, in the legacy's words where it has them;
// an empty list when it can.
export function seatPlanProblems(
  input: SeatPlanInput,
  context: {
    id?: number
    total: number
    assignments: RoomAssignment[]
    capacityOf: (room: SeatPlanRoom) => number
    roomLabel: (room: SeatPlanRoom) => string
    split: { useGroup: boolean; useVersion: boolean }
    others: ExamSeatPlan[]
    planLabel: (plan: ExamSeatPlan) => string
  }
) {
  const problems: string[] = []
  if (!input.examDate) problems.push("Please select exam date")
  if (!input.startTime) problems.push("Please select exam start time")
  if (!input.endTime) problems.push("Please select exam end time")
  if (input.startTime && input.endTime && input.startTime >= input.endTime)
    problems.push("The exam must end after it starts")
  if (!input.rooms.length) problems.push("Please select at least one room")
  input.rooms.forEach((room, i) => {
    const label = context.roomLabel(room)
    if (context.split.useGroup && room.groupId == null) problems.push(`Select group for ${label}`)
    if (context.split.useVersion && !room.version) problems.push(`Select version for ${label}`)
    if (room.students < 1) problems.push(`Invalid total student found for ${label}`)
    else if (room.students > context.capacityOf(room)) problems.push(`Student Capacity Limit Exceded for ${label}`)
    else if (context.assignments[i] && context.assignments[i].found < room.students)
      problems.push(
        context.assignments[i].found
          ? `Only ${context.assignments[i].found} student${context.assignments[i].found === 1 ? "" : "s"} left for ${label}`
          : `No Students Found for ${label}`
      )
  })
  const seated = context.assignments.reduce((sum, a) => sum + a.found, 0)
  if (input.rooms.length && seated < context.total)
    problems.push(`Please genereate seat plan for all student. Missed: ${context.total - seated} Students.`)
  // A room seats one exam at a time.
  for (const other of context.others) {
    if (other.id === context.id || !overlaps(input, other)) continue
    for (const room of input.rooms)
      if (other.rooms.some((r) => r.buildingId === room.buildingId && r.roomId === room.roomId))
        problems.push(`${context.roomLabel(room)} is already used by ${context.planLabel(other)} at that time`)
  }
  return problems
}
