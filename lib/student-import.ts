import type { Institute } from "@/lib/institutes"
import {
  genders,
  MOBILE_ERROR,
  MOBILE_PATTERN,
  studentTypes,
  type Enrolment,
  type Gender,
  type Student,
  type StudentInput,
  type StudentType,
} from "@/lib/students"

/**
 * Legacy Student/ImportExcel (StudentController.ImportExcel +
 * Partial/_StudentSelectedData): students of one class and year from a
 * spreadsheet. The office maps the sheet's columns to fields, then each row
 * is matched by Student ID — an existing student is updated, a new one is
 * created — and gets an enrolment in the chosen class and year. Branch,
 * section, group, shift, session, house and district are matched by name;
 * subjects by space-separated subject codes.
 *
 * Rows with a problem are reported (row, column, message) and left out; the
 * rest import. A class roll repeated inside the sheet stops the whole import,
 * as in the legacy import.
 */

export type ImportFieldKey =
  | "classRoll"
  | "branch"
  | "version"
  | "group"
  | "shift"
  | "section"
  | "session"
  | "studentType"
  | "subjects"
  | "optionalSubject"
  | "bankId"
  | "house"
  | "studentId"
  | "name"
  | "fatherName"
  | "motherName"
  | "gender"
  | "dateOfBirth"
  | "primaryMobile"
  | "fatherMobile"
  | "motherMobile"
  | "guardianMobile"
  | "district"

export type ImportField = {
  key: ImportFieldKey
  label: string
  group: "Academic Information" | "Basic Information"
  // Header texts that map to this field automatically (lower case).
  aliases: string[]
  // Only offered when the institute uses the structure.
  when?: (institute: Institute) => boolean
  required?: (institute: Institute) => boolean
}

// In the legacy mapping partial's order.
export const importFields: ImportField[] = [
  { key: "classRoll", label: "Class roll", group: "Academic Information", aliases: ["roll", "class roll", "classroll"], when: (i) => i.showClassRoll, required: (i) => i.showClassRoll },
  { key: "branch", label: "Branch", group: "Academic Information", aliases: ["branch"], when: (i) => i.enableBranch },
  { key: "version", label: "Version", group: "Academic Information", aliases: ["version", "academic version"], when: (i) => i.enableVersion },
  { key: "group", label: "Group", group: "Academic Information", aliases: ["group", "academic group", "subject group"], when: (i) => i.enableGroup },
  { key: "shift", label: "Shift", group: "Academic Information", aliases: ["shift"], when: (i) => i.enableShift },
  { key: "section", label: "Section", group: "Academic Information", aliases: ["section", "academic section"] },
  { key: "session", label: "Academic session", group: "Academic Information", aliases: ["session", "academic session", "student session"] },
  { key: "studentType", label: "Student type", group: "Academic Information", aliases: ["type", "student type"] },
  { key: "subjects", label: "Subjects (codes)", group: "Academic Information", aliases: ["subject", "subjects", "subject code", "subject codes", "compulsory"] },
  { key: "optionalSubject", label: "Optional subject (code)", group: "Academic Information", aliases: ["optional", "optional subject", "4th subject"] },
  { key: "bankId", label: "Bank ID", group: "Academic Information", aliases: ["bank id", "bankid", "bank"] },
  { key: "house", label: "House", group: "Academic Information", aliases: ["house", "student house"], when: (i) => i.enableStudentHouse },
  { key: "studentId", label: "Student ID", group: "Basic Information", aliases: ["student id", "studentid", "id", "student identification no", "identification no"], required: (i) => !i.enableAutoIncrementStudentId },
  { key: "name", label: "Student name", group: "Basic Information", aliases: ["name", "student name", "full name"] },
  { key: "fatherName", label: "Father's name", group: "Basic Information", aliases: ["father", "father's name", "fathers name", "father name"] },
  { key: "motherName", label: "Mother's name", group: "Basic Information", aliases: ["mother", "mother's name", "mothers name", "mother name"] },
  { key: "gender", label: "Gender", group: "Basic Information", aliases: ["gender", "sex"] },
  { key: "dateOfBirth", label: "Date of birth", group: "Basic Information", aliases: ["dob", "date of birth", "birth date", "birthday"] },
  { key: "primaryMobile", label: "Primary mobile", group: "Basic Information", aliases: ["mobile", "primary mobile", "phone"] },
  { key: "fatherMobile", label: "Father's mobile", group: "Basic Information", aliases: ["father's mobile", "fathers mobile", "father mobile"] },
  { key: "motherMobile", label: "Mother's mobile", group: "Basic Information", aliases: ["mother's mobile", "mothers mobile", "mother mobile"] },
  { key: "guardianMobile", label: "Guardian's mobile", group: "Basic Information", aliases: ["guardian's mobile", "guardians mobile", "guardian mobile"] },
  { key: "district", label: "Home district", group: "Basic Information", aliases: ["district", "home district"] },
]

export type Mapping = Partial<Record<ImportFieldKey, number>>

export type Cell = string | number | boolean | Date | null
export type SheetRows = Cell[][]

const clean = (value: string) => value.trim().toLowerCase().replace(/[\s_]+/g, " ")

// Maps each field to the first column whose header matches its label or an alias.
export function autoMap<K extends string>(
  headers: Cell[],
  fields: { key: K; label: string; aliases: string[] }[]
): Partial<Record<K, number>> {
  const mapping: Partial<Record<K, number>> = {}
  const used = new Set<number>()
  for (const field of fields) {
    const names = [clean(field.label), ...field.aliases]
    const index = headers.findIndex(
      (header, i) => !used.has(i) && header != null && names.includes(clean(String(header)))
    )
    if (index >= 0) {
      mapping[field.key] = index
      used.add(index)
    }
  }
  return mapping
}

// Excel column letters: 0 → A, 26 → AA.
export function columnLetter(index: number) {
  let letter = ""
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letter = String.fromCharCode(65 + ((n - 1) % 26)) + letter
  }
  return letter
}

// A small CSV reader (quoted fields, "" escapes, CRLF) for the template.
export function parseCsv(text: string): SheetRows {
  const rows: SheetRows = []
  let row: Cell[] = []
  let field = ""
  let quoted = false
  const input = text.replace(/^﻿/, "")
  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ",") {
      row.push(field)
      field = ""
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && input[i + 1] === "\n") i++
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => String(cell ?? "").trim()))
}

export function csvTemplate(fields: ImportField[]) {
  const quote = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
  const header = fields.map((f) => quote(f.label)).join(",")
  const sample = fields
    .map((f) => {
      const examples: Partial<Record<ImportFieldKey, string>> = {
        classRoll: "1001",
        section: "A",
        studentType: "Regular",
        subjects: "BAN ENG MATH",
        name: "Rahim Uddin",
        fatherName: "Karim Uddin",
        motherName: "Amena Begum",
        gender: "Male",
        dateOfBirth: "2011-03-15",
        primaryMobile: "01711000000",
        district: "Dhaka",
      }
      return quote(examples[f.key] ?? "")
    })
    .join(",")
  return `${header}\r\n${sample}\r\n`
}

// Everything a row's names and codes are matched against.
export type ImportLookups = {
  branches: { id: number; name: string }[]
  shifts: { id: number; name: string }[]
  groups: { id: number; name: string }[]
  sections: {
    id: number
    name: string
    branchId: number | null
    shiftId: number | null
    version: string
    groupId: number | null
  }[]
  sessions: { id: number; name: string }[]
  houses: { id: number; name: string }[]
  districts: { id: number; name: string }[]
  versions: readonly string[]
  // The class's subject list for the year: code → subject and whether it is
  // compulsory (compulsory subjects are always given).
  subjects: { id: number; code: string; compulsory: boolean }[]
}

export type ImportTarget = {
  institute: Institute
  classId: number
  yearId: number
  medium: string
  // Next ID for new students when the institute numbers them itself.
  nextStudentId: number
}

export type ImportError = { row: number; column?: string; message: string }

export type ImportPlan = {
  creates: StudentInput[]
  updates: { id: number; input: Partial<StudentInput> }[]
  errors: ImportError[]
  // Set when a problem stops the whole import (duplicate rolls in the sheet).
  fatal?: string
}

function text(cell: Cell | undefined) {
  if (cell == null) return ""
  if (cell instanceof Date) return cell.toISOString().slice(0, 10)
  return String(cell).trim()
}

// A date cell, or text as YYYY-MM-DD, DD/MM/YYYY or DD-MM-YYYY. "" when
// empty, undefined when unreadable.
function parseDate(cell: Cell | undefined): string | undefined {
  if (cell instanceof Date && !Number.isNaN(cell.getTime())) return cell.toISOString().slice(0, 10)
  const value = text(cell)
  if (!value) return ""
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value)
  const local = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(value)
  const parts = iso ? [iso[1], iso[2], iso[3]] : local ? [local[3], local[2], local[1]] : null
  if (!parts) return undefined
  const [y, m, d] = parts
  const date = `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`
  const parsed = new Date(`${date}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date) ? date : undefined
}

const byName = <T extends { name: string }>(list: T[], value: string) =>
  list.find((item) => item.name.trim().toLowerCase() === value.toLowerCase())

export function planImport({
  rows,
  mapping,
  target,
  lookups,
  students,
}: {
  // Data rows only (the header row removed); row numbers count from 2.
  rows: SheetRows
  mapping: Mapping
  target: ImportTarget
  lookups: ImportLookups
  students: Student[]
}): ImportPlan {
  const { institute } = target
  const plan: ImportPlan = { creates: [], updates: [], errors: [] }
  const label = (key: ImportFieldKey) => importFields.find((f) => f.key === key)!.label
  const cellOf = (row: Cell[], key: ImportFieldKey) =>
    mapping[key] == null ? undefined : row[mapping[key]!]
  const has = (key: ImportFieldKey) => mapping[key] != null

  // A class roll twice in the sheet stops everything (legacy behaviour).
  if (institute.showClassRoll && has("classRoll")) {
    const seen = new Map<string, number>()
    const repeated = new Set<string>()
    for (const row of rows) {
      const roll = text(cellOf(row, "classRoll")).toLowerCase()
      if (!roll) continue
      seen.set(roll, (seen.get(roll) ?? 0) + 1)
      if (seen.get(roll)! > 1) repeated.add(text(cellOf(row, "classRoll")))
    }
    if (repeated.size) {
      plan.fatal = `Duplicate student found in this sheet. Duplicate count: ${repeated.size}, Roll: ${[...repeated].join(", ")}.`
      return plan
    }
  }

  const ownStudents = students.filter((s) => s.instituteId === institute.id)
  const idsInSheet = new Set<number>()
  let nextId = target.nextStudentId
  // IDs typed in the sheet are reserved before any are handed out.
  for (const row of rows) {
    const typed = Number(text(cellOf(row, "studentId")))
    if (Number.isInteger(typed) && typed > 0) idsInSheet.add(typed)
  }
  const reserved = new Set([...idsInSheet, ...ownStudents.map((s) => s.studentIdentificationNo)])
  const takeNextId = () => {
    while (reserved.has(nextId)) nextId++
    reserved.add(nextId)
    return nextId
  }
  const seenIds = new Set<number>()
  // Rolls held in this class and year by students other than the row's own.
  const rollOwner = new Map<string, number>()
  for (const student of ownStudents) {
    for (const e of student.enrolments) {
      if (e.classId === target.classId && e.yearId === target.yearId && e.classRoll) {
        rollOwner.set(e.classRoll.trim().toLowerCase(), student.id)
      }
    }
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const errors: ImportError[] = []
    const fail = (key: ImportFieldKey | undefined, message: string) =>
      errors.push({ row: rowNumber, column: key ? label(key) : undefined, message })

    // ---- Student ID: finds the student to update, or numbers a new one.
    let sid: number | null = null
    const rawId = text(cellOf(row, "studentId"))
    if (rawId) {
      sid = Number(rawId)
      if (!Number.isInteger(sid) || sid < 1) fail("studentId", "Invalid student ID.")
    } else if (!institute.enableAutoIncrementStudentId) {
      fail("studentId", "Student ID not found.")
    }
    if (sid != null && seenIds.has(sid)) fail("studentId", "This student ID appears earlier in the sheet.")
    const existing = sid != null ? ownStudents.find((s) => s.studentIdentificationNo === sid) : undefined

    // ---- Basic information
    const name = text(cellOf(row, "name"))
    if (!existing && !name) fail("name", "Student name is required for a new student.")

    let gender: Gender | undefined
    const rawGender = text(cellOf(row, "gender")).toLowerCase()
    if (rawGender) {
      gender =
        genders.find((g) => g.toLowerCase() === rawGender) ??
        (rawGender === "m" ? "Male" : rawGender === "f" ? "Female" : undefined)
      if (!gender) fail("gender", `Gender must be ${genders.join(", ")}.`)
    } else if (!existing) {
      fail("gender", "Gender is required for a new student.")
    }

    const dob = has("dateOfBirth") ? parseDate(cellOf(row, "dateOfBirth")) : ""
    if (dob === undefined) fail("dateOfBirth", "Unreadable date; use YYYY-MM-DD or DD/MM/YYYY.")

    const mobile = (key: "primaryMobile" | "fatherMobile" | "motherMobile" | "guardianMobile") => {
      const value = text(cellOf(row, key)).replace(/[\s-]/g, "")
      if (value && !MOBILE_PATTERN.test(value)) fail(key, MOBILE_ERROR)
      return value
    }
    const mobiles = {
      primaryMobile: mobile("primaryMobile"),
      fatherMobile: mobile("fatherMobile"),
      motherMobile: mobile("motherMobile"),
      guardianMobile: mobile("guardianMobile"),
    }

    const districtName = text(cellOf(row, "district"))
    const district = districtName ? byName(lookups.districts, districtName) : undefined
    if (districtName && !district) fail("district", `No district named "${districtName}".`)

    // ---- Academic information
    const pick = <T extends { id: number; name: string }>(key: ImportFieldKey, list: T[], what: string) => {
      const value = text(cellOf(row, key))
      if (!value) return undefined
      const found = byName(list, value)
      if (!found) fail(key, `No ${what} named "${value}".`)
      return found
    }
    const branch = institute.enableBranch ? pick("branch", lookups.branches, "branch") : undefined
    const shift = institute.enableShift ? pick("shift", lookups.shifts, "shift") : undefined
    const group = institute.enableGroup ? pick("group", lookups.groups, "group in this class") : undefined
    const session = pick("session", lookups.sessions, "session")
    const house = institute.enableStudentHouse ? pick("house", lookups.houses, "house") : undefined

    let version = ""
    const rawVersion = text(cellOf(row, "version"))
    if (institute.enableVersion && rawVersion) {
      version =
        lookups.versions.find(
          (v) => v.toLowerCase() === rawVersion.toLowerCase() || v.toLowerCase().startsWith(rawVersion.toLowerCase())
        ) ?? ""
      if (!version) fail("version", `Version must be ${lookups.versions.join(" or ")}.`)
    }

    // The section is matched by name within the class, narrowed by the
    // row's branch, shift, version and group.
    let section: ImportLookups["sections"][number] | undefined
    const sectionName = text(cellOf(row, "section"))
    if (sectionName) {
      const fits = lookups.sections.filter(
        (s) =>
          s.name.trim().toLowerCase() === sectionName.toLowerCase() &&
          (!branch || s.branchId === branch.id) &&
          (!shift || s.shiftId === shift.id) &&
          (!version || s.version === version) &&
          (!group || s.groupId == null || s.groupId === group.id)
      )
      section = fits[0]
      if (!section) fail("section", `No section "${sectionName}" in this class${branch || shift || version ? " for that branch/shift/version" : ""}.`)
      else if (fits.length > 1) fail("section", `Several sections are named "${sectionName}"; add the branch or shift column.`)
    }

    let studentType: StudentType | undefined
    const rawType = text(cellOf(row, "studentType"))
    if (rawType) {
      studentType = studentTypes.find((t) => t.toLowerCase() === rawType.toLowerCase())
      if (!studentType) fail("studentType", `Student type must be ${studentTypes.join(" or ")}.`)
    }

    const codes = (key: ImportFieldKey) =>
      text(cellOf(row, key))
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((code) => {
          const subject = lookups.subjects.find((s) => s.code.toLowerCase() === code.toLowerCase())
          if (!subject) fail(key, `Subject code "${code}" isn't in this class's subjects for the year.`)
          return subject
        })
        .filter((s) => s != null)
    const listed = codes("subjects")
    const optional = codes("optionalSubject")[0]
    if ((listed.length || optional) && !lookups.subjects.length) {
      fail("subjects", "This class has no subject list for the year; add Class Year Subjects first.")
    }

    // An existing student without a roll in the sheet keeps the one they
    // have for the year, which must be free in this class too.
    const previous = existing?.enrolments.find((e) => e.yearId === target.yearId)
    const roll = text(cellOf(row, "classRoll")) || previous?.classRoll || ""
    if (institute.showClassRoll) {
      if (!roll) fail("classRoll", "Class roll is required.")
      const owner = roll ? rollOwner.get(roll.toLowerCase()) : undefined
      if (owner != null && owner !== existing?.id) fail("classRoll", `Roll ${roll} already belongs to another student in this class and year.`)
    }

    if (errors.length) {
      plan.errors.push(...errors)
      return
    }
    if (sid != null) seenIds.add(sid)

    // ---- Build the student and the enrolment for the class and year.
    const subjectIds = [
      ...new Set([
        ...lookups.subjects.filter((s) => s.compulsory).map((s) => s.id),
        ...listed.map((s) => s.id),
        ...(optional ? [optional.id] : []),
      ]),
    ]
    const enrolment: Enrolment = {
      yearId: target.yearId,
      medium: target.medium,
      classId: target.classId,
      sectionId: section?.id ?? (previous?.classId === target.classId ? previous.sectionId : null),
      branchId: section?.branchId ?? branch?.id ?? previous?.branchId ?? null,
      shiftId: section?.shiftId ?? shift?.id ?? previous?.shiftId ?? null,
      version: section?.version || version || previous?.version || "",
      groupId: section?.groupId ?? group?.id ?? previous?.groupId ?? null,
      sessionId: session?.id ?? previous?.sessionId ?? null,
      houseId: house?.id ?? previous?.houseId ?? null,
      classRoll: roll,
      studentType: studentType ?? previous?.studentType ?? "Regular",
      bankId: text(cellOf(row, "bankId")) || previous?.bankId || "",
      subjectIds: lookups.subjects.length ? subjectIds : (previous?.subjectIds ?? []),
      optionalSubjectId: optional?.id ?? previous?.optionalSubjectId ?? null,
    }
    if (roll) rollOwner.set(roll.toLowerCase(), existing?.id ?? -1)

    // Only filled-in cells change an existing student.
    const set = <T>(value: T | undefined | "", fallback?: T) =>
      value === undefined || value === "" ? fallback : value
    const basic = {
      name: set(name, existing?.name),
      fatherName: set(text(cellOf(row, "fatherName")), existing?.fatherName),
      motherName: set(text(cellOf(row, "motherName")), existing?.motherName),
      gender: set(gender, existing?.gender),
      dateOfBirth: set(dob, existing?.dateOfBirth),
      districtId: district?.id ?? existing?.districtId ?? null,
      primaryMobile: set(mobiles.primaryMobile, existing?.primaryMobile) ?? "",
      fatherMobile: set(mobiles.fatherMobile, existing?.fatherMobile) ?? "",
      motherMobile: set(mobiles.motherMobile, existing?.motherMobile) ?? "",
      guardianMobile: set(mobiles.guardianMobile, existing?.guardianMobile) ?? "",
    }

    if (existing) {
      plan.updates.push({
        id: existing.id,
        input: {
          ...basic,
          enrolments: [...existing.enrolments.filter((e) => e.yearId !== target.yearId), enrolment],
        },
      })
    } else {
      plan.creates.push({
        instituteId: institute.id,
        studentIdentificationNo: sid ?? takeNextId(),
        name: basic.name ?? "",
        gender: basic.gender ?? "Male",
        dateOfBirth: basic.dateOfBirth ?? "",
        bloodGroup: "",
        religion: "",
        primaryMobile: basic.primaryMobile ?? "",
        districtId: basic.districtId,
        categoryId: null,
        imageUrl: "",
        email: "",
        presentAddress: "",
        isSameAs: true,
        permanentAddress: "",
        medicalHistory: "",
        hobby: "",
        fatherName: basic.fatherName ?? "",
        fatherMobile: basic.fatherMobile ?? "",
        fatherEmail: "",
        fatherProfession: "",
        motherName: basic.motherName ?? "",
        motherMobile: basic.motherMobile ?? "",
        motherEmail: "",
        motherProfession: "",
        guardianName: "",
        guardianMobile: basic.guardianMobile ?? "",
        guardianRelation: "",
        guardianAddress: "",
        primaryCommunicationPerson: "Father",
        board: {},
        enrolments: [enrolment],
        status: "Active",
      })
    }
  })

  return plan
}
