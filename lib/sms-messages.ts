"use client"

import * as React from "react"

import { classStore } from "@/lib/academic-store"
import { getSmsTemplates, fillTemplate, smsLength, type SmsAttendanceType, type SmsResultType, type SmsType } from "@/lib/sms-templates"
import { getStudentAttendance, todayIso } from "@/lib/student-attendance"
import { getStudents } from "@/lib/students"

// Legacy SchoolCollege SmsPending + SmsArchive in one list: every SMS queued
// for a mobile number, with its campaign, the student and exam it is about,
// and whether it went out. Send SMS queues them as "Pending"; the gateway
// (the Pending SMS page, later) sends them. A test SMS goes straight out.
// There is no gateway yet, so nothing leaves this browser session.

export const smsReceivers = ["Student", "Father", "Mother", "Guardian"] as const
export type SmsReceiver = (typeof smsReceivers)[number]

export const smsStatuses = ["Pending", "Sent", "Failed"] as const
export type SmsStatus = (typeof smsStatuses)[number]

export type SmsMessage = {
  id: number
  instituteId: number
  branchId: number | null
  campaignName: string
  mobile: string
  message: string
  // Who the number belongs to; null for a test SMS.
  studentId: number | null
  numberType: SmsReceiver | null
  smsType: SmsType
  resultType: SmsResultType | null
  attendanceType: SmsAttendanceType | null
  examId: number | null
  subjectId: number | null
  // The day an attendance SMS is about (ISO), to skip students already told.
  attendanceDate: string | null
  chars: number
  parts: number
  isTest: boolean
  status: SmsStatus
  tryCount: number
  createdBy: string
  createdAt: string
  sentAt: string | null
}

// "8801XXXXXXXXX" for a Bangladeshi mobile number written with or without
// the 88 / +88 prefix (legacy CheckMobileNumber); null when it isn't one.
export function normalizeMobile(raw: string) {
  const digits = raw.replace(/[\s+-]/g, "")
  const match = /^(?:88)?(01[1-9]\d{8})$/.exec(digits)
  return match ? `88${match[1]}` : null
}

// Legacy campaign name: when it was sent and by whom.
export function newCampaignName(userId: number, at = new Date()) {
  const pad = (n: number, w = 2) => String(n).padStart(w, "0")
  return `${at.getFullYear()}${pad(at.getMonth() + 1)}${pad(at.getDate())}_${pad(at.getHours())}${pad(at.getMinutes())}${pad(at.getSeconds())}_${pad(at.getMilliseconds(), 3)}_${userId}`
}

// ---- Seed ----
// Built on first use, once students, attendance and templates exist: the
// absence SMS sent for the last school day before today (so "Skip already
// sent" has something to skip) and a notice to Class Ten last week, two of
// which failed.

const seedUser = "Super Admin"

function seedMessages(): SmsMessage[] {
  const messages: SmsMessage[] = []
  const today = todayIso()
  const records = getStudentAttendance().filter((r) => r.instituteId === 1 && r.date < today)
  const lastDay = records.reduce((latest, r) => (r.date > latest ? r.date : latest), "")
  const students = new Map(getStudents().map((s) => [s.id, s]))
  const className = new Map(classStore.getList(1).map((c) => [c.id, c.name]))
  const templates = getSmsTemplates()
  const absentTemplate = templates.find((t) => t.id === 7)
  const noticeTemplate = templates.find((t) => t.id === 1)

  const push = (m: Omit<SmsMessage, "id" | "chars" | "parts">) => {
    const { chars, parts } = smsLength(m.message)
    messages.push({ ...m, id: messages.length + 1, chars, parts })
  }
  const valuesFor = (studentId: number, date?: string) => {
    const student = students.get(studentId)!
    const enrolment = student.enrolments.find((e) => e.yearId === 2)!
    const [y, mo, d] = (date ?? today).split("-").map(Number)
    return {
      Name: student.name,
      Class: className.get(enrolment.classId) ?? "",
      Roll: enrolment.classRoll,
      AttendanceDate: new Date(y, mo - 1, d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    }
  }

  if (lastDay && absentTemplate) {
    const at = `${lastDay}T10:30:00`
    for (const r of records.filter((r) => r.date === lastDay && !r.isPresent)) {
      const student = students.get(r.studentId)
      const mobile = student && normalizeMobile(student.fatherMobile)
      if (!mobile) continue
      push({
        instituteId: 1,
        branchId: null,
        campaignName: `${lastDay.replaceAll("-", "")}_103000_000_1`,
        mobile,
        message: fillTemplate(absentTemplate.message, valuesFor(r.studentId, lastDay)),
        studentId: r.studentId,
        numberType: "Father",
        smsType: "Attendance",
        resultType: null,
        attendanceType: "Absence",
        examId: null,
        subjectId: null,
        attendanceDate: lastDay,
        isTest: false,
        status: "Sent",
        tryCount: 1,
        createdBy: seedUser,
        createdAt: at,
        sentAt: `${lastDay}T10:31:00`,
      })
    }
  }

  if (noticeTemplate) {
    const [y, m, d] = today.split("-").map(Number)
    const day = new Date(y, m - 1, d - 7)
    const date = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`
    let n = 0
    for (const student of students.values()) {
      const enrolment = student.enrolments.find((e) => e.yearId === 2)
      const mobile = normalizeMobile(student.fatherMobile)
      if (student.instituteId !== 1 || enrolment?.classId !== 5 || !mobile) continue
      const failed = n++ % 3 === 2
      push({
        instituteId: 1,
        branchId: null,
        campaignName: `${date.replaceAll("-", "")}_090000_000_1`,
        mobile,
        message: fillTemplate(noticeTemplate.message, valuesFor(student.id)),
        studentId: student.id,
        numberType: "Father",
        smsType: "Notice",
        resultType: null,
        attendanceType: null,
        examId: null,
        subjectId: null,
        attendanceDate: null,
        isTest: false,
        status: failed ? "Failed" : "Sent",
        tryCount: failed ? 3 : 1,
        createdBy: seedUser,
        createdAt: `${date}T09:00:00`,
        sentAt: failed ? null : `${date}T09:02:00`,
      })
    }
  }
  return messages
}

// ---- Store ----

let seeded: SmsMessage[] | null = null
let messages: SmsMessage[] | null = null
const listeners = new Set<() => void>()

const seed = () => (seeded ??= seedMessages())

export function getSmsMessages() {
  return (messages ??= seed())
}

function emit(next: SmsMessage[]) {
  messages = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSmsMessages() {
  return React.useSyncExternalStore(subscribe, getSmsMessages, seed)
}

// Prepaid SMS credit per institute in Taka, as the gateway would report it
// (legacy GetCurrentBalance). Dummy figures until a gateway is connected.
let balances: Record<number, number> = { 1: 850, 5: 120 }
const seedBalances = balances

export function useSmsBalance(instituteId: number) {
  return React.useSyncExternalStore(
    subscribe,
    () => balances[instituteId] ?? 0,
    () => seedBalances[instituteId] ?? 0
  )
}

export type SmsDraft = Pick<
  SmsMessage,
  "mobile" | "message" | "studentId" | "numberType" | "chars" | "parts"
>

export type SmsBatchInfo = Pick<
  SmsMessage,
  | "instituteId"
  | "branchId"
  | "campaignName"
  | "smsType"
  | "resultType"
  | "attendanceType"
  | "examId"
  | "subjectId"
  | "attendanceDate"
>

// Legacy SendSms: saves each generated SMS as pending for the gateway.
// Returns how many SMS (parts) were queued.
export function queueSms(info: SmsBatchInfo, drafts: SmsDraft[], user: string) {
  if (!drafts.length) throw new Error("There is no SMS to send.")
  if (!info.campaignName.trim()) throw new Error("Campaign name is required.")
  const all = getSmsMessages()
  const at = new Date().toISOString()
  let id = Math.max(0, ...all.map((m) => m.id))
  const fresh = drafts.map<SmsMessage>((d) => ({
    ...info,
    ...d,
    campaignName: info.campaignName.trim(),
    id: ++id,
    isTest: false,
    status: "Pending",
    tryCount: 0,
    createdBy: user,
    createdAt: at,
    sentAt: null,
  }))
  emit([...all, ...fresh])
  return fresh.reduce((sum, m) => sum + m.parts, 0)
}

// Legacy SendTestSms: one SMS to the given number, sent at once and charged
// to the balance. Throws when the number or message is unusable or the
// balance can't pay for it.
export function sendTestSms(
  info: SmsBatchInfo,
  rawMobile: string,
  message: string,
  rate: number,
  user: string
) {
  const mobile = normalizeMobile(rawMobile)
  if (!mobile) throw new Error("Invalid mobile number.")
  if (!message.trim()) throw new Error("SMS is empty.")
  const { chars, parts } = smsLength(message)
  const cost = parts * rate
  const balance = balances[info.instituteId] ?? 0
  if (cost > balance) throw new Error("Not enough SMS balance for the test SMS.")
  const all = getSmsMessages()
  const at = new Date().toISOString()
  balances = { ...balances, [info.instituteId]: Math.round((balance - cost) * 100) / 100 }
  emit([
    ...all,
    {
      ...info,
      id: Math.max(0, ...all.map((m) => m.id)) + 1,
      mobile,
      message,
      studentId: null,
      numberType: null,
      chars,
      parts,
      isTest: true,
      status: "Sent",
      tryCount: 1,
      createdBy: user,
      createdAt: at,
      sentAt: at,
    },
  ])
  return mobile
}
