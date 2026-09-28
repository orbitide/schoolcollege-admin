import type { Institute } from "@/lib/institutes"
import type {
  BoardResult,
  Enrolment,
  Gender,
  PublicExam,
  Student,
  StudentType,
} from "@/lib/students"

/**
 * Legacy Student/StudentDynamicReport (StudentListConstant +
 * Partial/_DynamicReport): pick the information to show, filter the
 * students, then print a paged table (with extra blank columns and
 * signature lines) or export it to Excel.
 */

// Names for everything a column shows (id → name), from the stores.
export type ReportLookups = {
  name: (
    kind:
      | "class"
      | "section"
      | "year"
      | "branch"
      | "shift"
      | "group"
      | "house"
      | "category"
      | "session"
      | "subject"
      | "district",
    id: number | null | undefined
  ) => string
  subjectCode: (id: number) => string
}

type Ctx = { student: Student; enrolment: Enrolment; lookups: ReportLookups }

export type ReportColumn = {
  key: string
  label: string
  // Text for the cell ("" is shown as "-", as in the legacy report).
  value: (ctx: Ctx) => string
  // Only offered when the institute uses the structure.
  when?: (institute: Institute) => boolean
}

const board =
  (exam: PublicExam, field: keyof BoardResult) =>
  ({ student }: Ctx) =>
    student.board[exam]?.[field] ?? ""

// The five public exams' board columns, in the legacy order and wording
// (HSC and A Level have no EIIN).
const boardColumns: ReportColumn[] = (
  [
    ["JSC", "Jsc"],
    ["SSC", "Ssc"],
    ["HSC", "Hsc"],
    ["O Level", "OLevel"],
    ["A Level", "ALevel"],
  ] as const
).flatMap(([exam, key]) =>
  (
    [
      ["board", "Board"],
      ["roll", "Board Roll"],
      ["registrationNo", "Registration"],
      ["passingYear", "Passing Year"],
      ["gpa", "GPA"],
      ["totalMarks", "Total Marks"],
      ["eiin", "EIIN"],
    ] as const
  )
    .filter(([field]) => field !== "eiin" || (exam !== "HSC" && exam !== "A Level"))
    .map(([field, label]) => ({
      key: `${key}${label.replace(/\s/g, "")}`,
      label: `${exam} ${label}`,
      value: board(exam, field),
    }))
)

// In the legacy StudentListConstant order; Branch, Shift, Medium, Year,
// Religion, Email, Present Address and Admission Date are additions.
export const reportColumns: ReportColumn[] = [
  { key: "Roll", label: "Class Roll", value: ({ enrolment }) => enrolment.classRoll },
  { key: "StudentIdentityNo", label: "Student ID", value: ({ student }) => String(student.studentIdentificationNo) },
  { key: "Image", label: "Image", value: ({ student }) => student.imageUrl },
  { key: "FullName", label: "Full Name", value: ({ student }) => student.name },
  { key: "Gender", label: "Gender", value: ({ student }) => student.gender },
  { key: "AcademicClass", label: "Class", value: ({ enrolment, lookups }) => lookups.name("class", enrolment.classId) },
  { key: "Section", label: "Section", value: ({ enrolment, lookups }) => lookups.name("section", enrolment.sectionId) },
  { key: "Group", label: "Group", value: ({ enrolment, lookups }) => lookups.name("group", enrolment.groupId), when: (i) => i.enableGroup },
  { key: "Version", label: "Version", value: ({ enrolment }) => enrolment.version, when: (i) => i.enableVersion },
  { key: "Branch", label: "Branch", value: ({ enrolment, lookups }) => lookups.name("branch", enrolment.branchId), when: (i) => i.enableBranch },
  { key: "Shift", label: "Shift", value: ({ enrolment, lookups }) => lookups.name("shift", enrolment.shiftId), when: (i) => i.enableShift },
  { key: "Medium", label: "Medium", value: ({ enrolment }) => enrolment.medium, when: (i) => i.enableMedium },
  { key: "Year", label: "Academic Year", value: ({ enrolment, lookups }) => lookups.name("year", enrolment.yearId) },
  { key: "StudentType", label: "Type", value: ({ enrolment }) => enrolment.studentType },
  { key: "FatherName", label: "Father's Name", value: ({ student }) => student.fatherName },
  { key: "MotherName", label: "Mother's Name", value: ({ student }) => student.motherName },
  { key: "Mobile", label: "Mobile", value: ({ student }) => student.primaryMobile },
  { key: "GuardianMobile", label: "Guardian's Mobile", value: ({ student }) => student.guardianMobile },
  { key: "FatherMobile", label: "Father's Mobile", value: ({ student }) => student.fatherMobile },
  { key: "MotherMobile", label: "Mother's Mobile", value: ({ student }) => student.motherMobile },
  { key: "TotalSubjects", label: "Total Subject(s)", value: ({ enrolment }) => (enrolment.subjectIds.length ? String(enrolment.subjectIds.length) : "") },
  { key: "Subjects", label: "Subjects", value: ({ enrolment, lookups }) => enrolment.subjectIds.map(lookups.subjectCode).join(" ") },
  { key: "FourthSubject", label: "4th Subject", value: ({ enrolment, lookups }) => (enrolment.optionalSubjectId != null ? lookups.subjectCode(enrolment.optionalSubjectId) : "") },
  { key: "DateOfBirth", label: "Date of Birth", value: ({ student }) => student.dateOfBirth },
  { key: "BankId", label: "Bank ID", value: ({ enrolment }) => enrolment.bankId },
  { key: "House", label: "House", value: ({ enrolment, lookups }) => lookups.name("house", enrolment.houseId), when: (i) => i.enableStudentHouse },
  { key: "Category", label: "Student Category", value: ({ student, lookups }) => lookups.name("category", student.categoryId), when: (i) => i.enableStudentCategory },
  { key: "BloodGroup", label: "Blood Group", value: ({ student }) => student.bloodGroup },
  { key: "Religion", label: "Religion", value: ({ student }) => student.religion },
  { key: "AcademicSession", label: "Academic Session", value: ({ enrolment, lookups }) => (enrolment.sessionId != null ? lookups.name("session", enrolment.sessionId) : "") },
  { key: "Email", label: "Email", value: ({ student }) => student.email },
  { key: "PresentAddress", label: "Present Address", value: ({ student }) => student.presentAddress },
  { key: "HomeDistrict", label: "Home District", value: ({ student, lookups }) => lookups.name("district", student.districtId) },
  ...boardColumns,
  { key: "AdmissionDate", label: "Admission Date", value: ({ student }) => student.admittedAt },
]

// Labels that follow the institute's own wording.
export function columnLabel(column: ReportColumn, institute?: Institute) {
  if (column.key === "Roll") return institute?.classRollLabel.trim() || column.label
  if (column.key === "StudentIdentityNo") return institute?.studentIdLabel.trim() || column.label
  if (column.key === "House") return institute?.studentHouseLabel.trim() || column.label
  if (column.key === "Category") return institute?.studentCategoryLabel.trim() || column.label
  return column.label
}

export const studentStatuses = ["current", "previous", "all"] as const
export type StudentStatus = (typeof studentStatuses)[number]

export type ReportFilter = {
  instituteId: number
  branchId?: number | null
  medium?: string
  classId?: number | null
  groupId?: number | null
  shiftId?: number | null
  yearId?: number | null
  sectionId?: number | null
  version?: string
  studentType?: StudentType | ""
  gender?: Gender | ""
  // Current: enrolled in the institute's current year. Previous: not.
  status: StudentStatus
}

// Everything the print page needs, carried in its URL.
export type ReportConfig = {
  filter: ReportFilter
  columns: string[]
  orientation: "portrait" | "landscape"
  title: string
  extraFields: string[]
  rowsPerPage: number
  signatures: string[]
}

export const DEFAULT_TITLE = "Dynamic Student Report"
export const DEFAULT_ROWS_PER_PAGE = 45
export const DEFAULT_COLUMNS = ["Roll", "StudentIdentityNo", "FullName", "Gender", "AcademicClass", "Section", "FatherName", "Mobile"]

export function encodeConfig(config: ReportConfig) {
  return encodeURIComponent(JSON.stringify(config))
}

export function decodeConfig(value: string | null): ReportConfig | null {
  if (!value) return null
  try {
    const config = JSON.parse(decodeURIComponent(value)) as ReportConfig
    return config?.filter && Array.isArray(config.columns) ? config : null
  } catch {
    return null
  }
}

export type ReportRow = { student: Student; enrolment: Enrolment }

// The students the report lists, each with the enrolment it describes: the
// chosen year's, else the current year's, else their latest.
export function reportRows(
  students: Student[],
  filter: ReportFilter,
  currentYearId: number | undefined,
  classRank: Map<number, number>,
  sectionName: (id: number | null) => string
): ReportRow[] {
  const same = <T>(wanted: T | null | undefined, actual: T) =>
    wanted == null || wanted === "" || wanted === actual
  const rows: ReportRow[] = []
  for (const student of students) {
    if (student.instituteId !== filter.instituteId) continue
    const current = student.enrolments.find((e) => e.yearId === currentYearId)
    if (filter.status === "current" && !current) continue
    if (filter.status === "previous" && current) continue
    const enrolment = filter.yearId
      ? student.enrolments.find((e) => e.yearId === filter.yearId)
      : (current ?? student.enrolments[student.enrolments.length - 1])
    if (!enrolment) continue
    if (
      !same(filter.branchId, enrolment.branchId) ||
      !same(filter.medium, enrolment.medium) ||
      !same(filter.classId, enrolment.classId) ||
      !same(filter.groupId, enrolment.groupId) ||
      !same(filter.shiftId, enrolment.shiftId) ||
      !same(filter.sectionId, enrolment.sectionId) ||
      !same(filter.version, enrolment.version) ||
      !same(filter.studentType, enrolment.studentType) ||
      !same(filter.gender, student.gender)
    ) {
      continue
    }
    rows.push({ student, enrolment })
  }
  // Class order, then section, then roll.
  return rows.sort(
    (a, b) =>
      (classRank.get(a.enrolment.classId) ?? 0) - (classRank.get(b.enrolment.classId) ?? 0) ||
      sectionName(a.enrolment.sectionId).localeCompare(sectionName(b.enrolment.sectionId)) ||
      a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
  )
}

export function selectedColumns(keys: string[]) {
  return keys
    .map((key) => reportColumns.find((column) => column.key === key))
    .filter((column): column is ReportColumn => column != null)
}
