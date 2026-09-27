"use client"

import * as React from "react"

import { yearStore } from "@/lib/academic-store"
import type { Institute, RecordStatus, publicExams } from "@/lib/institutes"

// Students and their yearly enrolments, as in the legacy SchoolCollege
// Student + StudentClass + StudentClassSubject. In-memory dummy store for the
// browser session; replace with API calls once the backend endpoints exist.

export const genders = ["Male", "Female", "Other"] as const
export const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const
export const religions = ["Islam", "Hinduism", "Christianity", "Buddhism", "Other"] as const
export const communicationPersons = ["Father", "Mother", "Guardian"] as const
export const studentTypes = ["Regular", "Irregular"] as const

export type Gender = (typeof genders)[number]
export type CommunicationPerson = (typeof communicationPersons)[number]
export type StudentType = (typeof studentTypes)[number]
export type PublicExam = (typeof publicExams)[number]

// Bangladeshi mobile numbers, with or without the 88 country code
// (legacy CreateEditStudentViewModel: ^(88)?01[12-9]\d{8}$).
export const MOBILE_PATTERN = /^(88)?01[1-9]\d{8}$/
export const MOBILE_ERROR = "Please enter proper mobile number (8801xxxxxxxxx, 01xxxxxxxxx)."

export type BoardResult = {
  passingYear: string
  board: string
  roll: string
  registrationNo: string
  gpa: string
  totalMarks: string
  eiin: string
}

// A student's place in one academic year (legacy StudentClass). Branch,
// shift, version and group come from the section when it sets them.
// Ids are null and strings "" when the institute doesn't use that structure.
export type Enrolment = {
  yearId: number
  medium: string
  classId: number
  sectionId: number | null
  branchId: number | null
  shiftId: number | null
  version: string
  groupId: number | null
  sessionId: number | null
  houseId: number | null
  classRoll: string
  studentType: StudentType
  bankId: string
  // Subjects the student takes that year; `optionalSubjectId` is the
  // 4th subject among them, if any.
  subjectIds: number[]
  optionalSubjectId: number | null
  // Set once the student has been moved on from this enrolment by a bulk
  // Student Transfer (legacy StudentClass.IsTransfer).
  transferred?: boolean
}

export type Student = {
  id: number
  instituteId: number
  studentIdentificationNo: number
  name: string
  gender: Gender
  dateOfBirth: string
  bloodGroup: string
  religion: string
  primaryMobile: string
  districtId: number | null
  categoryId: number | null
  imageUrl: string
  // Personal information
  email: string
  presentAddress: string
  isSameAs: boolean
  permanentAddress: string
  medicalHistory: string
  hobby: string
  // Parents and guardian
  fatherName: string
  fatherMobile: string
  fatherEmail: string
  fatherProfession: string
  motherName: string
  motherMobile: string
  motherEmail: string
  motherProfession: string
  guardianName: string
  guardianMobile: string
  guardianRelation: string
  guardianAddress: string
  primaryCommunicationPerson: CommunicationPerson
  board: Partial<Record<PublicExam, BoardResult>>
  enrolments: Enrolment[]
  status: RecordStatus
  admittedAt: string
}

export type StudentInput = Omit<Student, "id" | "admittedAt">

// ---- Seed: 30 students of institute 1, six per class, in 2026 ----

const boys = ["Arif", "Fahim", "Rakib", "Tanvir", "Sakib", "Imran", "Nayeem", "Rifat", "Siam", "Tamim", "Mahin", "Rayhan", "Hasib", "Shuvo", "Ashik"]
const girls = ["Nusrat", "Sadia", "Tasnim", "Mim", "Riya", "Jannat", "Lamia", "Farzana", "Sumaiya", "Anika", "Nabila", "Tahmina", "Raisa", "Maliha", "Sharmin"]
const surnames = ["Hossain", "Rahman", "Ahmed", "Islam", "Chowdhury", "Sarker", "Karim", "Uddin", "Akter", "Hasan"]
const fathers = ["Abdul", "Mizanur", "Shahidul", "Nurul", "Rafiqul", "Kamal", "Jahangir", "Anwar"]
const mothers = ["Rokeya", "Salma", "Nasrin", "Shirin", "Parvin", "Rehana", "Jesmin", "Kohinoor"]
const professions = ["Business", "Service", "Teacher", "Farmer", "Engineer", "Doctor"]
const areas = ["Mirpur", "Uttara", "Dhanmondi", "Mohammadpur", "Badda", "Gulshan"]

function mobile(n: number) {
  return `017${String(10000000 + n * 7919).slice(-8)}`
}

function seedStudent(index: number): Student {
  const classId = Math.floor(index / 6) + 1 // Class Six (1) … Class Ten (5)
  const inClass = index % 6
  const section = inClass % 2 // A or B
  const girl = index % 2 === 1
  const first = girl ? girls[index % girls.length] : boys[index % boys.length]
  const surname = surnames[index % surnames.length]
  const fatherName = `${fathers[index % fathers.length]} ${surname}`
  const grouped = classId >= 4
  const area = areas[index % areas.length]
  const address = `House ${10 + index}, Road ${1 + (index % 9)}, ${area}, Dhaka`
  return {
    id: index + 1,
    instituteId: 1,
    studentIdentificationNo: 26001 + index,
    name: `${first} ${surname}`,
    gender: girl ? "Female" : "Male",
    dateOfBirth: `${2015 - classId}-${String(1 + (index % 12)).padStart(2, "0")}-${String(1 + (index % 27)).padStart(2, "0")}`,
    bloodGroup: bloodGroups[index % bloodGroups.length],
    religion: index % 7 === 3 ? "Hinduism" : "Islam",
    primaryMobile: mobile(index + 1),
    districtId: 1,
    categoryId: index % 10 === 4 ? 2 : 1,
    imageUrl: "",
    email: "",
    presentAddress: address,
    isSameAs: true,
    permanentAddress: address,
    medicalHistory: "",
    hobby: ["Reading", "Football", "Drawing", "Cricket", ""][index % 5],
    fatherName,
    fatherMobile: mobile(index + 1),
    fatherEmail: "",
    fatherProfession: professions[index % professions.length],
    motherName: `${mothers[index % mothers.length]} Begum`,
    motherMobile: mobile(index + 101),
    motherEmail: "",
    motherProfession: "Homemaker",
    guardianName: "",
    guardianMobile: "",
    guardianRelation: "",
    guardianAddress: "",
    primaryCommunicationPerson: "Father",
    board:
      classId === 5
        ? {
            JSC: {
              passingYear: "2024",
              board: "Dhaka",
              roll: String(210000 + index),
              registrationNo: String(1910000000 + index),
              gpa: ["5.00", "4.83", "4.50"][index % 3],
              totalMarks: "",
              eiin: "108888",
            },
          }
        : {},
    enrolments: [
      {
        yearId: 2,
        medium: "",
        classId,
        sectionId: (classId - 1) * 2 + section + 1,
        branchId: 1,
        shiftId: section + 1,
        version: "",
        groupId: grouped ? (inClass % 3) + 1 : null,
        sessionId: null,
        houseId: (index % 4) + 1,
        classRoll: String(classId * 100 + 500 + inClass + 1),
        studentType: "Regular",
        bankId: "",
        // Class Nine and Ten have a Class Year Subject with four subjects.
        subjectIds: grouped ? [1, 2, 3, 4] : [],
        optionalSubjectId: null,
      },
    ],
    status: index === 29 ? "Inactive" : "Active",
    admittedAt: "2026-01-05",
  }
}

const seedStudents: Student[] = Array.from({ length: 30 }, (_, i) => seedStudent(i))

// ---- Store ----

let students: Student[] = seedStudents
const listeners = new Set<() => void>()

function emit(next: Student[]) {
  students = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useStudents() {
  return React.useSyncExternalStore(
    subscribe,
    () => students,
    () => seedStudents
  )
}

export function useStudent(id: number) {
  return useStudents().find((student) => student.id === id)
}

export function addStudent(input: StudentInput) {
  const student: Student = {
    ...input,
    id: Math.max(0, ...students.map((s) => s.id)) + 1,
    admittedAt: new Date().toISOString().slice(0, 10),
  }
  emit([...students, student])
  return student
}

export function updateStudent(id: number, input: StudentInput) {
  emit(students.map((s) => (s.id === id ? { ...s, ...input } : s)))
}

export function setStudentStatus(id: number, status: RecordStatus) {
  emit(students.map((s) => (s.id === id ? { ...s, status } : s)))
}

export function removeStudent(id: number) {
  emit(students.filter((s) => s.id !== id))
}

// Legacy "Student Clear" (StudentRepository.GetStudentQuery +
// ParmanentDeleteStudent): the students of an institute with an enrolment in
// the chosen year that fits every filter given. Unset filters match all.
export type ClearFilter = {
  instituteId: number
  yearId: number
  branchId?: number | null
  medium?: string
  classId?: number | null
  groupId?: number | null
  version?: string
  shiftId?: number | null
  sectionId?: number | null
}

export function matchesClearFilter(student: Student, filter: ClearFilter) {
  if (student.instituteId !== filter.instituteId) return false
  const same = <T>(wanted: T | null | undefined, actual: T) =>
    wanted == null || wanted === "" || wanted === actual
  return student.enrolments.some(
    (e) =>
      e.yearId === filter.yearId &&
      same(filter.branchId, e.branchId) &&
      same(filter.medium, e.medium) &&
      same(filter.classId, e.classId) &&
      same(filter.groupId, e.groupId) &&
      same(filter.version, e.version) &&
      same(filter.shiftId, e.shiftId) &&
      same(filter.sectionId, e.sectionId)
  )
}

// Legacy "Student Transfer" (StudentController.TransferStudent): moves the
// chosen students of one section into a class/year/section, e.g. promoting
// Class Nine 2026 to Class Ten 2027. Each gets a new enrolment keeping their
// roll, house, type and bank ID (and subjects when asked); the old enrolment
// is marked transferred. Students no longer in the source section, already
// enrolled in the target year, or whose roll is taken there are skipped and
// reported by roll (or ID when the institute hides rolls).
export type EnrolmentPlace = {
  yearId: number
  classId: number
  sectionId: number
  medium?: string
  branchId?: number | null
  shiftId?: number | null
  version?: string
  groupId?: number | null
}

export type BulkTransfer = {
  instituteId: number
  from: EnrolmentPlace
  to: Required<EnrolmentPlace> & { hasGroups: boolean }
  withSubjects: boolean
  byRoll: boolean
  // Chosen students, with a group for those who need one in the new class.
  students: { id: number; groupId?: number | null }[]
}

export function fitsPlace(e: Enrolment, place: EnrolmentPlace) {
  const same = <T>(wanted: T | null | undefined, actual: T) =>
    wanted == null || wanted === "" || wanted === actual
  return (
    e.yearId === place.yearId &&
    e.classId === place.classId &&
    e.sectionId === place.sectionId &&
    same(place.medium, e.medium) &&
    same(place.branchId, e.branchId) &&
    same(place.version, e.version) &&
    same(place.groupId, e.groupId)
  )
}

export function transferStudents(transfer: BulkTransfer) {
  const result = {
    transferred: 0,
    notFound: [] as string[],
    alreadyExist: [] as string[],
    rollTaken: [] as string[],
  }
  const { to } = transfer
  const yearRank = new Map(
    yearStore.getList(transfer.instituteId).map((year) => [year.id, year.rank])
  )
  const wanted = new Map(transfer.students.map((s) => [s.id, s]))
  // Rolls already used in the target class and year.
  const takenRolls = new Set(
    students.flatMap((s) =>
      s.instituteId === transfer.instituteId
        ? s.enrolments
            .filter((e) => e.classId === to.classId && e.yearId === to.yearId)
            .map((e) => e.classRoll.trim().toLowerCase())
        : []
    )
  )

  const next = students.map((student) => {
    const pick = wanted.get(student.id)
    if (!pick || student.instituteId !== transfer.instituteId) return student
    const from = student.enrolments.find((e) => fitsPlace(e, transfer.from))
    const label = (roll?: string) =>
      transfer.byRoll && roll ? roll : String(student.studentIdentificationNo)
    if (!from) {
      result.notFound.push(label())
      return student
    }
    if (student.enrolments.some((e) => e.yearId === to.yearId)) {
      result.alreadyExist.push(label(from.classRoll))
      return student
    }
    const roll = from.classRoll.trim().toLowerCase()
    if (transfer.byRoll && roll && takenRolls.has(roll)) {
      result.rollTaken.push(label(from.classRoll))
      return student
    }
    takenRolls.add(roll)
    result.transferred++

    const enrolment: Enrolment = {
      yearId: to.yearId,
      medium: to.medium || from.medium,
      classId: to.classId,
      sectionId: to.sectionId,
      branchId: to.branchId ?? from.branchId,
      shiftId: to.shiftId ?? from.shiftId,
      version: to.version || from.version,
      groupId: to.hasGroups ? (pick.groupId ?? to.groupId ?? from.groupId) : null,
      sessionId: null,
      houseId: from.houseId,
      classRoll: from.classRoll,
      studentType: from.studentType,
      bankId: from.bankId,
      subjectIds: transfer.withSubjects ? from.subjectIds : [],
      optionalSubjectId: transfer.withSubjects ? from.optionalSubjectId : null,
    }
    return {
      ...student,
      enrolments: [
        ...student.enrolments.map((e) => (e === from ? { ...e, transferred: true } : e)),
        enrolment,
      ].sort((a, b) => (yearRank.get(a.yearId) ?? 0) - (yearRank.get(b.yearId) ?? 0)),
    }
  })
  if (result.transferred) emit(next)
  return result
}

// Permanently deletes these students with every enrolment and subject.
export function removeStudents(ids: number[]) {
  const doomed = new Set(ids)
  emit(students.filter((s) => !doomed.has(s.id)))
}

export function removeInstituteStudents(instituteId: number) {
  emit(students.filter((s) => s.instituteId !== instituteId))
}

// ---- Rules (legacy StudentService) ----

// The next ID for an auto-incrementing institute: one past the highest used,
// and never below the institute's configured start.
export function nextStudentId(institute: Institute) {
  const used = students
    .filter((s) => s.instituteId === institute.id)
    .map((s) => s.studentIdentificationNo)
  const start = institute.autoIncrementStudentIdStartFrom ?? 1
  return Math.max(start, ...used.map((id) => id + 1))
}

export function isStudentIdTaken(instituteId: number, id: number, exceptId?: number) {
  return students.some(
    (s) => s.instituteId === instituteId && s.id !== exceptId && s.studentIdentificationNo === id
  )
}

// A class roll is unique within one class of one academic year.
export function isRollTaken(
  instituteId: number,
  classId: number,
  yearId: number,
  roll: string,
  exceptId?: number
) {
  const wanted = roll.trim().toLowerCase()
  return students.some(
    (s) =>
      s.instituteId === instituteId &&
      s.id !== exceptId &&
      s.enrolments.some(
        (e) =>
          e.classId === classId &&
          e.yearId === yearId &&
          e.classRoll.trim().toLowerCase() === wanted
      )
  )
}

// Legacy "Add Previous Student" search (StudentClassService.GetByRoll /
// GetByIdentification): the one student enrolled in that class and year
// with this class roll, or this student ID when the institute hides rolls.
// Medium, branch and version narrow the match when the institute uses them.
export function findPreviousStudent(query: {
  instituteId: number
  classId: number
  yearId: number
  rollOrId: string
  byRoll: boolean
  medium?: string
  branchId?: number | null
  version?: string
}) {
  const wanted = query.rollOrId.trim().toLowerCase()
  if (!wanted) return undefined
  for (const student of students) {
    if (student.instituteId !== query.instituteId) continue
    if (!query.byRoll && String(student.studentIdentificationNo) !== wanted) continue
    const enrolment = student.enrolments.find(
      (e) =>
        e.classId === query.classId &&
        e.yearId === query.yearId &&
        (!query.byRoll || e.classRoll.trim().toLowerCase() === wanted) &&
        (!query.medium || e.medium === query.medium) &&
        (query.branchId == null || e.branchId === query.branchId) &&
        (!query.version || e.version === query.version)
    )
    if (enrolment) return { student, enrolment }
  }
  return undefined
}

// The enrolment for the institute's current academic year, else the latest.
export function currentEnrolment(student: Student): Enrolment | undefined {
  const current = yearStore
    .getList(student.instituteId)
    .find((year) => year.isCurrent)
  return (
    student.enrolments.find((e) => e.yearId === current?.id) ??
    student.enrolments[student.enrolments.length - 1]
  )
}

// "Used by 12 students." for setup records students point at, so they
// can't be deleted from under them.
export function studentsUsing(
  instituteId: number | null,
  matches: (student: Student, enrolment?: Enrolment) => boolean
) {
  const count = students.filter(
    (s) =>
      (instituteId === null || s.instituteId === instituteId) &&
      (matches(s) || s.enrolments.some((e) => matches(s, e)))
  ).length
  if (!count) return undefined
  return `Used by ${count} student${count === 1 ? "" : "s"}.`
}
