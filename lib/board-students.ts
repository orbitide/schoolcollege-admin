"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"
import type { EducationBoard } from "@/lib/education-boards"
import type { Cell, SheetRows } from "@/lib/student-import"

/**
 * Legacy SchoolCollege BoardStudent: an SSC passer who can apply for online
 * admission, identified by SSC roll + education board. The office imports
 * them from the board's result sheet (Online Admission › Student Import,
 * StudentAdmission/ImportExcel). In-memory like the rest of admin; replace
 * with API calls once the backend endpoints exist.
 */

export const boardAcademicGroups = ["Science", "Humanities", "Business Studies"] as const
export type BoardAcademicGroup = (typeof boardAcademicGroups)[number]

// Legacy Quota enum (OWN, SQ, GEN, FFQ, EQ).
export const boardQuotas = ["Own", "Special", "General", "Freedom Fighter", "Education"] as const
export type BoardQuota = (typeof boardQuotas)[number]

export type BoardStudent = {
  id: number
  instituteId: number
  branchId: number | null
  // "" when the institute has no mediums / versions.
  medium: string
  yearId: number
  classId: number
  group: BoardAcademicGroup
  version: string
  shiftId: number | null
  quota: BoardQuota | ""
  sscRollNo: string
  sscRegistrationNo: string
  educationBoardId: number
  passingYear: number | null
  name: string
  mobile: string
  gender: "Male" | "Female" | ""
  remarks: string
  isAdmitted: boolean
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

type Stamp = "id" | "isAdmitted" | "createdBy" | "createdAt" | "modifiedBy" | "modifiedAt"
export type BoardStudentInput = Omit<BoardStudent, Stamp>

let boardStudents: BoardStudent[] = []
const seed = boardStudents
const listeners = new Set<() => void>()

function emit(next: BoardStudent[]) {
  logChanges("BoardStudent", boardStudents, next)
  boardStudents = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useBoardStudents() {
  return React.useSyncExternalStore(
    subscribe,
    () => boardStudents,
    () => seed
  )
}

// Legacy SaveStudent: new rows are added, matched rows overwritten, in one go.
export function importBoardStudents(
  creates: BoardStudentInput[],
  updates: { id: number; input: BoardStudentInput }[],
  user: string
) {
  const stamp = new Date().toISOString()
  const byId = new Map(updates.map((u) => [u.id, u.input]))
  let nextId = Math.max(0, ...boardStudents.map((s) => s.id)) + 1
  emit([
    ...boardStudents.map((s) =>
      byId.has(s.id) ? { ...s, ...byId.get(s.id)!, modifiedBy: user, modifiedAt: stamp } : s
    ),
    ...creates.map((input) => ({
      ...input,
      id: nextId++,
      isAdmitted: false,
      createdBy: user,
      createdAt: stamp,
      modifiedBy: user,
      modifiedAt: stamp,
    })),
  ])
}

// ---- Import ----

export type BoardImportFieldKey =
  | "roll"
  | "registration"
  | "board"
  | "passingYear"
  | "group"
  | "version"
  | "shift"
  | "quota"
  | "name"
  | "mobile"
  | "gender"
  | "remarks"

export type BoardImportField = {
  key: BoardImportFieldKey
  label: string
  aliases: string[]
  // Institute-dependent fields (version) decide at use.
  required?: boolean
}

// In the legacy mapping partial's order (_StudentSelectedData.cshtml).
export const boardImportFields: BoardImportField[] = [
  { key: "roll", label: "SSC Roll", aliases: ["roll", "ssc roll", "roll no", "ssc roll no"], required: true },
  { key: "registration", label: "SSC Registration", aliases: ["registration", "reg", "reg no", "registration no", "ssc registration no"] },
  { key: "board", label: "SSC Board", aliases: ["board", "education board", "ssc board"], required: true },
  { key: "passingYear", label: "SSC Passing Year", aliases: ["passing year", "year", "ssc year", "pass year"] },
  { key: "group", label: "Academic Group", aliases: ["group", "academic group"], required: true },
  { key: "version", label: "Academic Version", aliases: ["version", "academic version"] },
  { key: "shift", label: "Shift", aliases: ["shift"] },
  { key: "quota", label: "Quota", aliases: ["quota"] },
  { key: "name", label: "Student Name", aliases: ["name", "student name", "full name"], required: true },
  { key: "mobile", label: "Mobile", aliases: ["mobile", "phone", "mobile no"] },
  { key: "gender", label: "Gender", aliases: ["gender", "sex"] },
  { key: "remarks", label: "Remarks", aliases: ["remarks", "remark", "note"] },
]

export type BoardMapping = Partial<Record<BoardImportFieldKey, number>>

export type BoardImportTarget = {
  instituteId: number
  branchId: number | null
  medium: string
  yearId: number
  classId: number
  versionEnabled: boolean
}

export type BoardImportError = { row: number; column?: string; message: string }

export type BoardImportPlan = {
  creates: BoardStudentInput[]
  updates: { id: number; input: BoardStudentInput }[]
  errors: BoardImportError[]
  // A board + roll repeated in the sheet stops the whole import.
  fatal?: string
}

function text(cell: Cell | undefined) {
  if (cell == null) return ""
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell).trim()
}

const startsWith = (value: string, letter: string) => value.toLowerCase().startsWith(letter)

// Legacy CheckMobileNumber(…, "88"): 01xxxxxxxxx or 8801xxxxxxxxx, stored
// with the 88 prefix. undefined when it isn't a Bangladeshi mobile number.
function normalizeMobile(value: string) {
  const digits = value.replace(/[\s+-]/g, "")
  if (/^01[3-9]\d{8}$/.test(digits)) return `88${digits}`
  if (/^8801[3-9]\d{8}$/.test(digits)) return digits
  return undefined
}

// Legacy ImportExcelStudent: each row is matched by SSC roll + board among
// the institute's board students of that branch, medium and year; a match is
// overwritten, otherwise a board student is added. Rows with a problem are
// reported and skipped.
export function planBoardImport({
  rows,
  mapping,
  target,
  boards,
  shifts,
  existing,
}: {
  // Data rows only (the header row removed); row numbers count from 2.
  rows: SheetRows
  mapping: BoardMapping
  target: BoardImportTarget
  boards: EducationBoard[]
  shifts: { id: number; name: string }[]
  existing: BoardStudent[]
}): BoardImportPlan {
  const plan: BoardImportPlan = { creates: [], updates: [], errors: [] }
  const label = (key: BoardImportFieldKey) => boardImportFields.find((f) => f.key === key)!.label
  const cellOf = (row: Cell[], key: BoardImportFieldKey) =>
    mapping[key] == null ? "" : text(row[mapping[key]!])

  const pool = existing.filter(
    (s) =>
      s.instituteId === target.instituteId &&
      s.branchId === target.branchId &&
      s.medium === target.medium &&
      s.yearId === target.yearId
  )
  const seen = new Map<string, number>()

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const fail = (key: BoardImportFieldKey, message: string) =>
      plan.errors.push({ row: rowNumber, column: label(key), message })

    const roll = cellOf(row, "roll")
    if (!roll) return fail("roll", "Roll Not Found.")
    const boardName = cellOf(row, "board")
    if (!boardName) return fail("board", "Board Not Found.")
    const key = `${boardName.toUpperCase()}:${roll}`
    seen.set(key, (seen.get(key) ?? 0) + 1)

    const board = boards.find((b) => b.name === boardName.toUpperCase())
    if (!board) return fail("board", `'${boardName.toUpperCase()}' this education board not found.`)

    const name = cellOf(row, "name")
    if (!name) return fail("name", "Student Name Not Found.")

    const rawGroup = cellOf(row, "group")
    const group = startsWith(rawGroup, "s")
      ? "Science"
      : startsWith(rawGroup, "h")
        ? "Humanities"
        : startsWith(rawGroup, "b")
          ? "Business Studies"
          : undefined
    if (!group) return fail("group", "Academic Group Not Found.")

    let version = ""
    const rawVersion = cellOf(row, "version")
    if (target.versionEnabled && rawVersion) {
      version = startsWith(rawVersion, "b") ? "Bangla Version" : startsWith(rawVersion, "e") ? "English Version" : ""
      if (!version) return fail("version", "Academic Version Not Found.")
    }

    let shiftId: number | null = null
    const rawShift = cellOf(row, "shift")
    if (rawShift) {
      const shift = shifts.find((s) => s.name.trim().toLowerCase() === rawShift.toLowerCase())
      if (!shift) return fail("shift", `'${rawShift}' this shift not found.`)
      shiftId = shift.id
    }

    let passingYear: number | null = null
    const rawYear = cellOf(row, "passingYear")
    if (rawYear) {
      passingYear = Number(rawYear)
      if (!Number.isInteger(passingYear) || passingYear < 1900 || passingYear > 2100) {
        return fail("passingYear", "Please enter a valid passing year.")
      }
    }

    let mobile = ""
    const rawMobile = cellOf(row, "mobile")
    if (rawMobile) {
      const normalized = normalizeMobile(rawMobile)
      if (!normalized) return fail("mobile", "Please enter proper mobile number (8801xxxxxxxxx).")
      mobile = normalized
    }

    const rawQuota = cellOf(row, "quota")
    const quota: BoardQuota | "" = startsWith(rawQuota, "f")
      ? "Freedom Fighter"
      : startsWith(rawQuota, "s")
        ? "Special"
        : startsWith(rawQuota, "o")
          ? "Own"
          : startsWith(rawQuota, "g")
            ? "General"
            : startsWith(rawQuota, "e")
              ? "Education"
              : ""

    const rawGender = cellOf(row, "gender")
    const gender = !rawGender ? "" : startsWith(rawGender, "f") ? "Female" : "Male"

    const match = pool.find((s) => s.sscRollNo === roll && s.educationBoardId === board.id)
    const input: BoardStudentInput = {
      instituteId: target.instituteId,
      branchId: target.branchId,
      medium: target.medium,
      yearId: target.yearId,
      classId: target.classId,
      group,
      version,
      shiftId,
      quota,
      sscRollNo: roll,
      sscRegistrationNo: cellOf(row, "registration") || (match?.sscRegistrationNo ?? ""),
      educationBoardId: board.id,
      passingYear: passingYear ?? match?.passingYear ?? null,
      name: name.toUpperCase(),
      mobile: mobile || (match?.mobile ?? ""),
      gender: gender || (match?.gender ?? ""),
      remarks: cellOf(row, "remarks") || (match?.remarks ?? ""),
    }
    if (match) plan.updates.push({ id: match.id, input })
    else plan.creates.push(input)
  })

  const repeated = [...seen].filter(([, count]) => count > 1).map(([key]) => key)
  if (repeated.length) {
    plan.fatal = `Duplicate Student Found In This Sheet. Duplicate Count: ${repeated.length}, Roll: ${repeated.join(", ")}.`
  }
  return plan
}
