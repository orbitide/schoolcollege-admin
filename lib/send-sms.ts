import { classStore, sectionStore, subjectStore } from "@/lib/academic-store"
import { getExamAttendance } from "@/lib/exam-attendance"
import type { Institute } from "@/lib/institutes"
import { calculateMeritList, type MeritResult } from "@/lib/merit-lists"
import {
  getSmsMessages,
  normalizeMobile,
  type SmsDraft,
  type SmsReceiver,
} from "@/lib/sms-messages"
import {
  fillTemplate,
  smsLength,
  type SmsAttendanceType,
  type SmsResultType,
  type SmsType,
} from "@/lib/sms-templates"
import { getStudentAttendance, todayIso } from "@/lib/student-attendance"
import { getStudents, type Enrolment, type Student, type StudentType } from "@/lib/students"
import { isPassRegenerated, parseRolls, takesSubject } from "@/lib/term-exam-marks"
import { getTermExams, type TermExam } from "@/lib/term-exams"

// Legacy SmsController LoadSmsStudent + GenerateMessageSmsPendingList: the
// students a Send SMS reaches, each message with its keywords filled for
// the student, and the (unique, valid) mobile numbers of the chosen
// receivers.

// Legacy MarksType, for the "Single Marks Type" keywords of a subject SMS.
export const marksTypes = ["Theory", "CQ", "MCQ", "Practical"] as const
export type MarksType = (typeof marksTypes)[number]

// Admission SMS goes from the admission module, not from Send SMS.
export const sendSmsTypes = ["Notice", "Result", "Attendance", "Exam Attendance"] as const satisfies readonly SmsType[]

export type SendSmsInput = {
  instituteId: number
  branchId: number | null
  medium: string
  classId: number | null
  yearId: number | null
  groupId: number | null
  version: string
  shiftId: number | null
  sectionId: number | null
  studentType: StudentType | ""
  // Comma separated class rolls; empty for everyone.
  rolls: string
  smsType: SmsType | ""
  resultType: SmsResultType | ""
  attendanceType: SmsAttendanceType | ""
  examId: number | null
  subjectId: number | null
  marksType: MarksType | ""
  attendanceDate: string
  skipAlreadySent: boolean
  receivers: SmsReceiver[]
  message: string
}

export const PASS_NOT_CALCULATED =
  "The exam's pass/fail isn't calculated yet. Run Pass Fail ReGenerate (or Generate Merit List) for it first."

// Legacy CheckForm: what is still missing before students can be counted.
export function sendSmsProblems(input: SendSmsInput) {
  const problems: string[] = []
  if (!input.smsType) problems.push("Select the SMS type.")
  if (!input.receivers.length) problems.push("Select at least one receiver.")
  if (!input.classId) problems.push("Select the class.")
  if (!input.yearId) problems.push("Select the academic year.")
  if (input.smsType === "Result") {
    if (!input.examId) problems.push("Select the exam.")
    else if (!isPassRegenerated(input.examId)) {
      // Legacy reads GPA, grades and positions from the generated result.
      problems.push(PASS_NOT_CALCULATED)
    }
    if (!input.resultType) problems.push("Select the result type.")
  }
  if (input.smsType === "Attendance") {
    if (!input.attendanceType) problems.push("Select the attendance type.")
    if (!input.attendanceDate) problems.push("Select the attendance date.")
    else if (input.attendanceDate > todayIso()) problems.push("The attendance date can't be in the future.")
  }
  if (input.smsType === "Exam Attendance") {
    if (!input.examId) problems.push("Select the exam.")
    if (!input.subjectId) problems.push("Select the exam subject.")
    if (!input.attendanceType) problems.push("Select present or absent students.")
  }
  if (parseRolls(input.rolls) === null) problems.push("Rolls may only have numbers and commas.")
  return problems
}

export type SmsBatch = {
  students: number
  mobiles: number
  parts: number
  drafts: (SmsDraft & { studentName: string; roll: string })[]
  // Students who matched but have no valid number for the chosen receivers.
  withoutMobile: number
  // Attendance students left out because they already got that day's SMS.
  alreadySent: number
  // Asked-for rolls that matched no student.
  unknownRolls: string[]
}

type Target = { student: Student; enrolment: Enrolment; result?: MeritResult }

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

// Everything the keywords need that is the same for every student.
function context(input: SendSmsInput, exam?: TermExam) {
  const classes = new Map(classStore.getList(input.instituteId).map((c) => [c.id, c.name]))
  const sections = new Map(sectionStore.getList(input.instituteId).map((s) => [s.id, s.name]))
  const subjects = new Map(subjectStore.getList(input.instituteId).map((s) => [s.id, s]))
  const examSubject = exam?.subjects.find((s) => s.subjectId === input.subjectId)
  const subject = input.subjectId ? subjects.get(input.subjectId) : undefined
  return { classes, sections, subjects, examSubject, subject }
}

function keywordValues(
  target: Target,
  input: SendSmsInput,
  exam: TermExam | undefined,
  ctx: ReturnType<typeof context>
): Record<string, string> {
  const { student, enrolment: e, result } = target
  const values: Record<string, string> = {
    Class: ctx.classes.get(e.classId) ?? "",
    Name: student.name,
    Roll: e.classRoll,
    // Students have no nick name here; the first name stands in.
    NickName: student.name.split(" ")[0],
    FathersName: student.fatherName,
    MothersName: student.motherName,
    GuardianName: student.guardianName || student.fatherName,
    Section: e.sectionId != null ? (ctx.sections.get(e.sectionId) ?? "") : "",
    AttendanceDate: input.attendanceDate ? dayLabel(input.attendanceDate) : "",
  }
  if (exam) {
    values.Exam = exam.fullName
    values.Year = exam.examStart ? exam.examStart.slice(0, 4) : ""
  }
  if (result) {
    values.Gpa = result.gpa.toFixed(2)
    values.Position = result.groupPosition ? String(result.groupPosition) : "-"
    // Legacy: compulsory subjects, then " & " the optional one, as SUB:Grade.
    const grade = (optional: boolean) =>
      result.marks
        .filter((m) => m.isOptional === optional)
        .map((m) => `${ctx.subjects.get(m.subjectId)?.code ?? m.subjectId}:${m.letterGrade}`)
        .join(", ")
    values["Subject Wise Letter Grade"] = [grade(false), grade(true)].filter(Boolean).join(" & ")
  }
  if (ctx.subject) {
    values["Subject Name"] = ctx.subject.name
    values["Subject Short Name"] = ctx.subject.code
    values["Subject Common Name"] = ctx.subject.name
    values["Subject Common Short Name"] = ctx.subject.code
  }
  if (ctx.examSubject) {
    const s = ctx.examSubject
    values["Subject Full Marks"] = String(s.totalMarks)
    const mark = result?.marks.find((m) => m.subjectId === s.subjectId)
    values["Subject Marks"] = mark ? String(mark.total) : "A"
    const parts: [MarksType, number, number | undefined][] = [
      ["Theory", s.theoryMarks, mark?.theory],
      ["CQ", s.cqMarks, mark?.cq],
      ["MCQ", s.mcqMarks, mark?.mcq],
      ["Practical", s.practicalMarks, mark?.practical],
    ]
    if (input.marksType) {
      const part = parts.find(([type]) => type === input.marksType)
      values["Single Marks Type"] = input.marksType
      values["Single Marks Type Full Marks"] = part ? String(part[1]) : ""
    } else {
      values["Single Marks Type"] = ""
      values["Single Marks Type Full Marks"] = ""
      values["All Marks Type With Marks"] = parts
        .filter(([, full]) => full > 0)
        .map(([type, , got]) => `${type === "Practical" ? "Prac" : type}=${mark ? (got ?? 0) : "A"}`)
        .join(" & ")
    }
  }
  return values
}

// The unique valid numbers of the chosen receivers for the student, with
// whose number each is (legacy LoadUniqueReceiverMobileListForStudent).
function receiverNumbers(student: Student, receivers: SmsReceiver[]) {
  const raw: Record<SmsReceiver, string> = {
    Student: student.primaryMobile,
    Father: student.fatherMobile,
    Mother: student.motherMobile,
    Guardian: student.guardianMobile,
  }
  const seen = new Map<string, SmsReceiver>()
  for (const receiver of receivers) {
    const mobile = normalizeMobile(raw[receiver] ?? "")
    if (mobile && !seen.has(mobile)) seen.set(mobile, receiver)
  }
  return [...seen]
}

export function examOf(input: Pick<SendSmsInput, "examId">) {
  return input.examId ? getTermExams().find((e) => e.id === input.examId) : undefined
}

export function buildSmsBatch(input: SendSmsInput, institute: Institute): SmsBatch {
  const empty: SmsBatch = { students: 0, mobiles: 0, parts: 0, drafts: [], withoutMobile: 0, alreadySent: 0, unknownRolls: [] }
  if (sendSmsProblems(input).length) return empty
  const exam = examOf(input)
  const same = <T>(wanted: T | null | "", actual: T) => wanted == null || wanted === "" || wanted === actual
  const rolls = parseRolls(input.rolls) ?? []

  // The class's students in the year, narrowed by structure and rolls.
  let targets: Target[] = getStudents().flatMap((student) => {
    if (student.instituteId !== input.instituteId || student.status !== "Active") return []
    const e = student.enrolments.find(
      (en) =>
        en.yearId === input.yearId &&
        en.classId === input.classId &&
        same(input.branchId, en.branchId) &&
        same(input.medium, en.medium) &&
        same(input.groupId, en.groupId) &&
        same(input.version, en.version) &&
        same(input.shiftId, en.shiftId) &&
        same(input.sectionId, en.sectionId) &&
        same(input.studentType, en.studentType)
    )
    return e ? [{ student, enrolment: e }] : []
  })
  const unknownRolls = rolls.filter((r) => !targets.some((t) => t.enrolment.classRoll === r))
  if (rolls.length) targets = targets.filter((t) => rolls.includes(t.enrolment.classRoll))

  let alreadySent = 0
  if (input.smsType === "Result" && exam) {
    const results = new Map(calculateMeritList(exam, institute).map((r) => [r.studentId, r]))
    targets = targets.flatMap((t) => {
      const result = results.get(t.student.id)
      if (!result?.isPresent) return []
      if (input.resultType === "Pass" && result.failedSubjectCount > 0) return []
      if (input.resultType === "Fail" && result.failedSubjectCount === 0) return []
      if (input.subjectId && !result.marks.some((m) => m.subjectId === input.subjectId)) return []
      return [{ ...t, result }]
    })
  } else if (input.smsType === "Attendance") {
    const present = input.attendanceType === "Present"
    const marked = new Set(
      getStudentAttendance()
        .filter((r) => r.date === input.attendanceDate && r.isPresent === present)
        .map((r) => `${r.sectionId}|${r.studentId}`)
    )
    targets = targets.filter((t) => marked.has(`${t.enrolment.sectionId}|${t.student.id}`))
    if (input.skipAlreadySent) {
      const told = new Set(
        getSmsMessages()
          .filter(
            (m) =>
              m.smsType === "Attendance" &&
              m.attendanceDate === input.attendanceDate &&
              m.status !== "Failed" &&
              m.studentId != null
          )
          .map((m) => m.studentId)
      )
      const before = targets.length
      targets = targets.filter((t) => !told.has(t.student.id))
      alreadySent = before - targets.length
    }
  } else if (input.smsType === "Exam Attendance" && exam) {
    const present = input.attendanceType === "Present"
    const marked = new Set(
      getExamAttendance()
        .filter((r) => r.termExamId === exam.id && r.subjectId === input.subjectId && r.isPresent === present)
        .map((r) => r.studentId)
    )
    targets = targets.filter(
      (t) => takesSubject(t.enrolment, input.subjectId!) && marked.has(t.student.id)
    )
  }

  targets.sort(
    (a, b) =>
      (a.enrolment.sectionId ?? 0) - (b.enrolment.sectionId ?? 0) ||
      a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
  )

  const ctx = context(input, exam)
  const drafts: SmsBatch["drafts"] = []
  let withoutMobile = 0
  for (const target of targets) {
    const numbers = receiverNumbers(target.student, input.receivers)
    if (!numbers.length) {
      withoutMobile++
      continue
    }
    const message = fillTemplate(input.message, keywordValues(target, input, exam, ctx))
    const { chars, parts } = smsLength(message)
    for (const [mobile, numberType] of numbers) {
      drafts.push({
        mobile,
        message,
        studentId: target.student.id,
        numberType,
        chars,
        parts,
        studentName: target.student.name,
        roll: target.enrolment.classRoll,
      })
    }
  }

  return {
    students: targets.length,
    mobiles: drafts.length,
    parts: drafts.reduce((sum, d) => sum + d.parts, 0),
    drafts,
    withoutMobile,
    alreadySent,
    unknownRolls,
  }
}
