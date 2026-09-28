import seed from "@/lib/data/institutes.json"

export const instituteTypes = [
  "School",
  "College",
  "School & College",
  "Madrasa",
  "Kindergarten",
] as const
export const plans = ["Basic", "Standard", "Premium"] as const
export const statuses = ["Active", "Trial", "Suspended"] as const
export const billingCycles = ["Monthly", "Yearly"] as const
export const managers = ["Rafiq Hasan", "Nusrat Jahan", "Tanvir Ahmed"] as const
export const weekDays = [
  "Saturday",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
] as const

export type InstituteType = (typeof instituteTypes)[number]
export type Plan = (typeof plans)[number]
export type InstituteStatus = (typeof statuses)[number]
export type BillingCycle = (typeof billingCycles)[number]
export type WeekDay = (typeof weekDays)[number]

// Academic structure the institute uses.
export type InstituteSettings = {
  startDayOfWeek: WeekDay
  weekend: WeekDay[]
  enableBranch: boolean
  enableShift: boolean
  enableGroup: boolean
  enableMedium: boolean
  enableVersion: boolean
  enableSectionGender: boolean
  enableStudentHouse: boolean
  studentHouseLabel: string
  enableStudentCategory: boolean
  studentCategoryLabel: string
  enableAutoIncrementStudentId: boolean
  autoIncrementStudentIdStartFrom: number | null
  studentIdLabel: string
  showClassRoll: boolean
  classRollLabel: string
}

export type Institute = InstituteSettings & {
  id: number
  name: string
  shortName: string
  eiin: string
  type: InstituteType
  subdomain: string
  plan: Plan
  status: InstituteStatus
  billingCycle: BillingCycle
  students: number
  teachers: number
  manager: string
  principal: string
  email: string
  otherEmails: string
  phone: string
  city: string
  address: string
  logoUrl: string
  principalSignatureUrl: string
  configuration: InstituteConfiguration
  joinedAt: string
}

export const roles = ["Teacher", "Class Teacher", "Head Teacher"] as const

// Fixed options picked on academic classes when the institute enables them.
export const academicMediums = ["Bangla Medium", "English Medium"] as const
export const academicVersions = ["Bangla Version", "English Version"] as const

export const recordStatuses = ["Active", "Inactive"] as const
export type RecordStatus = (typeof recordStatuses)[number]

// Ranked, per-institute records such as branches and shifts.
export type AcademicRecord = {
  id: number
  instituteId: number
  name: string
  rank: number
  status: RecordStatus
}

export type Shift = AcademicRecord
export type AcademicSession = AcademicRecord
export type StudentCategory = AcademicRecord

export type Branch = AcademicRecord & {
  code: string
  address: string
}

// A room of a building exams are seated in (legacy BuildingRoom): benches
// in columns, so many students to a bench. Capacity is the product.
export type BuildingRoom = {
  id: number
  // The room number or name, e.g. "101".
  name: string
  totalColumns: number
  benchesPerColumn: number
  studentsPerBench: number
}

export const roomCapacity = (
  room: Pick<BuildingRoom, "totalColumns" | "benchesPerColumn" | "studentsPerBench">
) => room.totalColumns * room.benchesPerColumn * room.studentsPerBench

// Legacy Building: a building (its location) of the institute, in a branch
// when the institute has branches, with its rooms in order.
export type Building = AcademicRecord & {
  branchId: number | null
  rooms: BuildingRoom[]
}

export type AcademicYear = AcademicRecord & {
  code: string
  isCurrent: boolean
}

// Capacity 0 means unlimited.
export type StudentHouse = AcademicRecord & {
  capacity: number
}

// Streams such as Science that a class can be split into.
export type AcademicGroup = AcademicRecord & {
  code: string
  nameBn: string
}

export const publicExams = ["JSC", "SSC", "HSC", "O Level", "A Level"] as const
export const sectionGenders = ["Any", "Male", "Female"] as const

// A level the institute teaches, as in the legacy SchoolCollege AcademicClass.
// `medium` is "" when mediums are off. Testimonial exams are a subset of
// `publicExams`; `groupIds` only apply when `hasSubjectGroup` is on.
export type AcademicClass = AcademicRecord & {
  nameBn: string
  medium: string
  rollStartFrom: string
  previousClassId: number | null
  hasSession: boolean
  hasSubjectGroup: boolean
  groupIds: number[]
  publicExams: string[]
  testimonialExams: string[]
  enableBoardAdmission: boolean
}

// Capacity 0 means unlimited. Ids are null and `version` is "" when that
// structure is turned off for the institute.
export type Section = AcademicRecord & {
  classId: number
  branchId: number | null
  shiftId: number | null
  version: string
  groupId: number | null
  capacity: number
  gender: (typeof sectionGenders)[number]
}

// Catalog defaults; pass marks are between 0 and full marks.
export type Subject = AcademicRecord & {
  nameBn: string
  code: string
  fullMarks: number
  passMarks: number
}

export const subjectTypes = [
  "Compulsory",
  "Elective",
  "Elective/Optional",
  "Optional",
] as const

// One subject a class takes in a year, and how it is marked (legacy
// ClassYearSubjectDetail). Totals are the sums of the parts.
export type ClassYearSubjectDetail = {
  subjectId: number
  subjectType: (typeof subjectTypes)[number]
  // null when the subject is common to every group of the class.
  groupId: number | null
  theoryMarks: number
  theoryPassMarks: number
  cqMarks: number
  cqPassMarks: number
  mcqMarks: number
  mcqPassMarks: number
  mcqMarksPerQuestion: number
  negativeMcqMarks: number
  practicalMarks: number
  practicalPassMarks: number
  classTestMarks: number
  classTestPassMarks: number
  totalMarks: number
  totalPassMarks: number
  isAcceptPartial: boolean
}

// The subjects a class takes in an academic year (legacy ClassYearSubject).
// `name` is a display label such as "Class Nine · 2026".
export type ClassYearSubject = AcademicRecord & {
  medium: string
  classId: number
  yearId: number
  perStudentSubjectCount: number
  details: ClassYearSubjectDetail[]
}

export const holidayTypes = ["Event", "Management", "Gazetted"] as const
export const repetitions = ["Once", "Yearly"] as const

// `medium` is "" when a record applies to all mediums.
export type LetterGrade = AcademicRecord & {
  medium: string
  minMarks: number
  maxMarks: number
  gradePoint: number
  maxGradePoint: number
}

export type ResultRemark = AcademicRecord & {
  medium: string
  minGpa: number
  maxGpa: number
  minMarks: number
  maxMarks: number
  basedOnGrading: boolean
  isGolden: boolean
  minFailCount: number
  maxFailCount: number
}

// Dates are ISO "YYYY-MM-DD" strings.
export type HolidayEvent = AcademicRecord & {
  medium: string
  startDate: string
  endDate: string
  type: (typeof holidayTypes)[number]
  repetition: (typeof repetitions)[number]
  description: string
}

// Per-institute configuration for results, reports, SMS and exams.
export type InstituteConfiguration = {
  optionalGpaSubtraction: number
  maximumGpa: number
  reportHeaderStyle: string
  reportNameStyle: string
  reportLogoWidth: string
  reportHighlightColor: string
  printPageSize: number
  admitCardColor1: string
  admitCardColor2: string
  admitCardFooterText: string
  smsUrl: string
  smsApiKey: string
  smsRate: number
  smsMask: string
  smsBatchSize: number
  smsBatchLoadSize: number
  smsMaxTry: number
  termExamWiseTransfer: boolean
  minImageSize: number
  maxImageSize: number
  examShowAttendance: boolean
  examShowAssignment: boolean
  examShowDependent: boolean
  dayFrom: number
  dayTo: number
  teacherRole: string
  isUserRegistration: boolean
}

export const defaultConfiguration: InstituteConfiguration = {
  optionalGpaSubtraction: 2,
  maximumGpa: 5,
  reportHeaderStyle:
    "margin-top: 0px; margin-bottom: 4px; color:darkblue; font-size:24px; font-weight:bold;",
  reportNameStyle:
    "color:darkred; margin-top: 5px; margin-bottom: 0px; font-size:22px; font-weight:bold;",
  reportLogoWidth: "70px",
  reportHighlightColor: "",
  printPageSize: 0,
  admitCardColor1: "",
  admitCardColor2: "",
  admitCardFooterText:
    "<u>Directions:</u><br />\n1. The examinee must bring the admit card in the examination hall.<br />\n2. The examinee must sign the attendance sheet for each subject in the examination hall otherwise(s)he will be treated as absent in the respective subject(s).",
  smsUrl: "https://api2.onnorokomsms.com/HttpSendSms.ashx",
  smsApiKey: "",
  smsRate: 0.4,
  smsMask: "",
  smsBatchSize: 100,
  smsBatchLoadSize: 4000,
  smsMaxTry: 1,
  termExamWiseTransfer: false,
  minImageSize: 0,
  maxImageSize: 100,
  examShowAttendance: true,
  examShowAssignment: true,
  examShowDependent: false,
  dayFrom: 26,
  dayTo: 25,
  teacherRole: "Teacher",
  isUserRegistration: false,
}

export type InstituteInput = Omit<Institute, "id" | "joinedAt">

// Monthly price per plan in USD (dummy pricing until the billing API exists).
export const planPrices: Record<Plan, number> = {
  Basic: 49,
  Standard: 99,
  Premium: 199,
}

export const planLimits: Record<Plan, { students: number; teachers: number }> =
  {
    Basic: { students: 1000, teachers: 50 },
    Standard: { students: 3000, teachers: 150 },
    Premium: { students: 10000, teachers: 500 },
  }

export const defaultSettings: InstituteSettings = {
  startDayOfWeek: "Saturday",
  weekend: ["Friday"],
  enableBranch: false,
  enableShift: false,
  enableGroup: false,
  enableMedium: false,
  enableVersion: false,
  enableSectionGender: false,
  enableStudentHouse: false,
  studentHouseLabel: "",
  enableStudentCategory: false,
  studentCategoryLabel: "",
  enableAutoIncrementStudentId: false,
  autoIncrementStudentIdStartFrom: null,
  studentIdLabel: "",
  showClassRoll: false,
  classRollLabel: "",
}

// A couple of seed institutes use the optional structures so those screens have data.
const seedSettings: Record<number, Partial<InstituteSettings>> = {
  1: {
    enableBranch: true,
    enableShift: true,
    enableGroup: true,
    enableStudentHouse: true,
    studentHouseLabel: "House",
    enableStudentCategory: true,
    enableAutoIncrementStudentId: true,
    autoIncrementStudentIdStartFrom: 26001,
    studentIdLabel: "Student ID",
    showClassRoll: true,
    classRollLabel: "Class Roll",
  },
  2: { enableShift: true },
}

// Seed rows only carry the SaaS fields; fill in the rest with defaults.
export const seedInstitutes: Institute[] = seed.map((row) => ({
  ...defaultSettings,
  ...seedSettings[row.id],
  shortName: row.subdomain.toUpperCase(),
  eiin: String(100000 + row.id * 1111),
  otherEmails: "",
  logoUrl: "",
  principalSignatureUrl: "",
  configuration: defaultConfiguration,
  ...(row as Omit<
    Institute,
    | keyof InstituteSettings
    | "shortName"
    | "eiin"
    | "otherEmails"
    | "logoUrl"
    | "principalSignatureUrl"
    | "configuration"
  >),
}))

// Monthly revenue for one institute; yearly billing gets two months free.
export function monthlyRevenue(institute: Institute) {
  const price = planPrices[institute.plan]
  return institute.billingCycle === "Yearly" ? (price * 10) / 12 : price
}

const csvColumns: [string, (i: Institute) => string | number][] = [
  ["Name", (i) => i.name],
  ["Short name", (i) => i.shortName],
  ["EIIN", (i) => i.eiin],
  ["Type", (i) => i.type],
  ["Subdomain", (i) => i.subdomain],
  ["Plan", (i) => i.plan],
  ["Status", (i) => i.status],
  ["Students", (i) => i.students],
  ["Teachers", (i) => i.teachers],
  ["Email", (i) => i.email],
  ["Phone", (i) => i.phone],
  ["City", (i) => i.city],
  ["Joined", (i) => i.joinedAt],
]

export function exportInstitutesCsv(rows: Institute[]) {
  const cell = (value: string | number) =>
    `"${String(value).replaceAll('"', '""')}"`
  const lines = [
    csvColumns.map(([label]) => cell(label)).join(","),
    ...rows.map((row) => csvColumns.map(([, pick]) => cell(pick(row))).join(",")),
  ]
  const blob = new Blob([lines.join("\r\n")], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `institutes-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}
