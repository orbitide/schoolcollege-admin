"use client"

import * as React from "react"

import { branchStore } from "@/lib/academic-store"
import { logChanges } from "@/lib/common-log"

// Legacy SchoolCollege SmsTemplate: a reusable message of one institute (and
// optionally one branch) for an SMS type, with keywords such as [{Name}]
// filled per student when it is sent. Deleting only marks the template
// "Deleted" (it can be retrieved); a permanent delete removes it. In-memory
// dummy store for the browser session; replace with API calls once the
// backend endpoints exist.

export const smsTypes = ["Notice", "Result", "Admission", "Attendance", "Exam Attendance"] as const
export type SmsType = (typeof smsTypes)[number]

export const smsResultTypes = ["Pass", "Fail", "All"] as const
export type SmsResultType = (typeof smsResultTypes)[number]

export const smsAttendanceTypes = ["Present", "Absence"] as const
export type SmsAttendanceType = (typeof smsAttendanceTypes)[number]

export const smsTemplateStatuses = ["Active", "Inactive", "Deleted"] as const
export type SmsTemplateStatus = (typeof smsTemplateStatuses)[number]

// Which sub-type the SMS type is sent for: results go to those who passed,
// failed or all; attendance to those present or absent.
export function subTypeOf(type: SmsType | "") {
  if (type === "Result") return "result" as const
  if (type === "Attendance" || type === "Exam Attendance") return "attendance" as const
  return null
}

export type SmsKeyword = { label: string; group?: string }

const SUBJECT_ONLY = "Subject SMS only"

// Legacy LoadSmsKeyword: the keywords each SMS type fills, named as the
// legacy enums describe them. Result's subject keywords are filled only when
// the SMS is sent for one subject.
const keywordsByType: Record<SmsType, SmsKeyword[]> = {
  Notice: ["Class", "Name", "Roll", "NickName", "FathersName", "MothersName", "GuardianName"].map(
    (label) => ({ label })
  ),
  Result: [
    ...["Class", "Name", "Roll", "Section", "Gpa", "Position", "Exam", "Year", "Subject Wise Letter Grade"].map(
      (label) => ({ label })
    ),
    ...[
      "Subject Short Name",
      "Subject Name",
      "Subject Common Name",
      "Subject Common Short Name",
      "Subject Marks",
      "Subject Full Marks",
      "Single Marks Type",
      "Single Marks Type Full Marks",
      "All Marks Type With Marks",
    ].map((label) => ({ label, group: SUBJECT_ONLY })),
  ],
  Admission: [
    "Name",
    "Roll",
    "NickName",
    "Password",
    "Application Start Date",
    "Application End Date",
    "AdmissionSerial",
  ].map((label) => ({ label })),
  Attendance: ["Class", "Name", "Roll", "NickName", "AttendanceDate"].map((label) => ({ label })),
  "Exam Attendance": ["Class", "Name", "Roll", "Section", "Exam", "Subject Name"].map((label) => ({ label })),
}

export function smsKeywords(type: SmsType | "") {
  return type ? keywordsByType[type] : []
}

// How a keyword is written in a message (legacy SendSms inserts "[{" + k + "}]").
export const placeholder = (keyword: string) => `[{${keyword}}]`

const PLACEHOLDER = /\[\{([^[\]{}]+)\}\]/g

// The keywords a message uses, in order, once each.
export function templateKeywords(message: string) {
  return [...new Set([...message.matchAll(PLACEHOLDER)].map((m) => m[1]))]
}

// Keywords in the message that the SMS type doesn't fill; they would go out
// as written.
export function unknownKeywords(type: SmsType | "", message: string) {
  const known = new Set(smsKeywords(type).map((k) => k.label))
  return templateKeywords(message).filter((k) => !known.has(k))
}

// Made-up values to preview a message with.
export const sampleKeywordValues: Record<string, string> = {
  Class: "Class Six",
  Name: "Rahim Uddin",
  Roll: "601",
  NickName: "Rahim",
  FathersName: "Abdul Karim",
  MothersName: "Rokeya Begum",
  GuardianName: "Abdul Karim",
  Section: "A",
  Gpa: "4.83",
  Position: "3",
  Exam: "Half Yearly - 2026",
  Year: "2026",
  "Subject Wise Letter Grade": "BAN:A+, ENG:A, MATH:A+, ICT:A",
  "Subject Short Name": "BAN",
  "Subject Name": "Bangla",
  "Subject Common Name": "Bangla",
  "Subject Common Short Name": "BAN",
  "Subject Marks": "78",
  "Subject Full Marks": "100",
  "Single Marks Type": "CQ",
  "Single Marks Type Full Marks": "70",
  "All Marks Type With Marks": "CQ:52, MCQ:26",
  Password: "4821",
  "Application Start Date": "01 Oct 2026",
  "Application End Date": "31 Oct 2026",
  AdmissionSerial: "A-0142",
  AttendanceDate: "28 Sep 2026",
}

// Fills the keywords it has values for; the rest stay as written.
export function fillTemplate(message: string, values: Record<string, string> = sampleKeywordValues) {
  return message.replace(PLACEHOLDER, (whole, keyword: string) => values[keyword] ?? whole)
}

// GSM 03.38: a message in these characters goes as 160 per SMS (153 per part
// when split); the extension characters take two. Anything else (Bangla)
// makes it Unicode: 70 per SMS, 67 per part.
const GSM_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
)
const GSM_EXTENDED = new Set("^{}\\[~]|€")

export function smsLength(text: string) {
  const unicode = [...text].some((c) => !GSM_BASIC.has(c) && !GSM_EXTENDED.has(c))
  const chars = unicode
    ? text.length
    : [...text].reduce((sum, c) => sum + (GSM_EXTENDED.has(c) ? 2 : 1), 0)
  const [single, multi] = unicode ? [70, 67] : [160, 153]
  const parts = chars === 0 ? 0 : chars <= single ? 1 : Math.ceil(chars / multi)
  return { chars, parts, unicode, perPart: parts > 1 ? multi : single }
}

export type SmsTemplate = {
  id: number
  instituteId: number
  // null: every branch of the institute.
  branchId: number | null
  name: string
  smsType: SmsType
  // Set only for Result.
  resultType: SmsResultType | null
  // Set only for Attendance and Exam Attendance.
  attendanceType: SmsAttendanceType | null
  message: string
  status: SmsTemplateStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type SmsTemplateInput = Pick<
  SmsTemplate,
  "instituteId" | "branchId" | "name" | "smsType" | "resultType" | "attendanceType" | "message"
>

export const MAX_TEMPLATE_LENGTH = 1000

// ---- Seed ----

const seedUser = "Super Admin"

function seedTemplate(
  id: number,
  instituteId: number,
  name: string,
  smsType: SmsType,
  message: string,
  extra: Partial<SmsTemplate> = {}
): SmsTemplate {
  const at = `2026-${String(1 + (id % 9)).padStart(2, "0")}-${String(3 + id).padStart(2, "0")}T10:${String(10 + id).padStart(2, "0")}:00.000Z`
  return {
    id,
    instituteId,
    branchId: null,
    name,
    smsType,
    resultType: null,
    attendanceType: null,
    message,
    status: "Active",
    createdBy: seedUser,
    createdAt: at,
    modifiedBy: seedUser,
    modifiedAt: at,
    ...extra,
  }
}

const seed: SmsTemplate[] = [
  seedTemplate(
    1,
    1,
    "Holiday notice",
    "Notice",
    "Dear guardian, [{Name}] of [{Class}] (Roll [{Roll}]): the school remains closed tomorrow for a public holiday. Classes resume on Sunday. - DRMS"
  ),
  seedTemplate(
    2,
    1,
    "Guardian meeting (Uttara)",
    "Notice",
    "Dear [{FathersName}], the guardian meeting of [{Class}] is on Saturday at 10 AM at the Uttara Branch. Please attend. - DRMS",
    { branchId: 2 }
  ),
  seedTemplate(
    3,
    1,
    "Result - passed",
    "Result",
    "Congratulations! [{Name}], [{Class}] Sec [{Section}], Roll [{Roll}] passed [{Exam}] with GPA [{Gpa}], position [{Position}]. - DRMS",
    { resultType: "Pass" }
  ),
  seedTemplate(
    4,
    1,
    "Result - failed",
    "Result",
    "Dear guardian, [{Name}] ([{Class}], Roll [{Roll}]) did not pass [{Exam}]. Grades: [{Subject Wise Letter Grade}]. Please meet the class teacher. - DRMS",
    { resultType: "Fail" }
  ),
  seedTemplate(
    5,
    1,
    "Result - all students",
    "Result",
    "[{Exam}] result of [{Name}], Roll [{Roll}]: GPA [{Gpa}], position [{Position}]. - DRMS",
    { resultType: "All" }
  ),
  seedTemplate(
    6,
    1,
    "Subject marks",
    "Result",
    "[{Name}] got [{Subject Marks}] out of [{Subject Full Marks}] in [{Subject Name}] ([{Exam}]). - DRMS",
    { resultType: "All", status: "Inactive", modifiedAt: "2026-08-02T09:00:00.000Z" }
  ),
  seedTemplate(
    7,
    1,
    "Absent today",
    "Attendance",
    "Dear guardian, [{Name}] of [{Class}] (Roll [{Roll}]) was absent from school on [{AttendanceDate}]. - DRMS",
    { attendanceType: "Absence" }
  ),
  seedTemplate(
    8,
    1,
    "অনুপস্থিতি (বাংলা)",
    "Attendance",
    "সম্মানিত অভিভাবক, আপনার সন্তান [{Name}] ([{Class}], রোল [{Roll}]) [{AttendanceDate}] তারিখে বিদ্যালয়ে অনুপস্থিত ছিল। - ডিআরএমএস",
    { attendanceType: "Absence" }
  ),
  seedTemplate(
    9,
    1,
    "Reached school",
    "Attendance",
    "[{Name}] ([{Class}], Roll [{Roll}]) reached school on [{AttendanceDate}]. - DRMS",
    { attendanceType: "Present" }
  ),
  seedTemplate(
    10,
    1,
    "Missed exam",
    "Exam Attendance",
    "Dear guardian, [{Name}] ([{Class}]-[{Section}], Roll [{Roll}]) was absent in the [{Exam}] [{Subject Name}] exam. - DRMS",
    { attendanceType: "Absence" }
  ),
  seedTemplate(
    11,
    1,
    "Admission login",
    "Admission",
    "Dear [{Name}], your admission roll is [{Roll}] and password [{Password}]. Apply from [{Application Start Date}] to [{Application End Date}]. Serial: [{AdmissionSerial}]. - DRMS"
  ),
  seedTemplate(
    12,
    1,
    "Eid vacation 2025",
    "Notice",
    "Dear guardian, the school is closed for Eid from 28 Mar to 8 Apr 2025. - DRMS",
    { status: "Deleted", modifiedAt: "2026-01-15T08:30:00.000Z" }
  ),
  seedTemplate(
    13,
    5,
    "General notice",
    "Notice",
    "Dear guardian of [{Name}] ([{Class}], Roll [{Roll}]), please check the notice board for this week's schedule. - RCS"
  ),
  seedTemplate(
    14,
    5,
    "Absent today",
    "Attendance",
    "[{Name}] ([{Class}], Roll [{Roll}]) was absent on [{AttendanceDate}]. - RCS",
    { attendanceType: "Absence" }
  ),
]

// ---- Store ----

let templates: SmsTemplate[] = seed
const listeners = new Set<() => void>()

function emit(next: SmsTemplate[]) {
  logChanges("SmsTemplate", templates, next)
  templates = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useSmsTemplates() {
  return React.useSyncExternalStore(
    subscribe,
    () => templates,
    () => seed
  )
}

export function getSmsTemplates() {
  return templates
}

// Legacy LoadSmsDynamicTemplate: the active templates Send SMS offers for an
// SMS type (and its result / attendance type) at a branch.
export function templatesFor(
  instituteId: number,
  smsType: SmsType,
  subType: SmsResultType | SmsAttendanceType | null = null,
  branchId: number | null = null
) {
  return templates.filter(
    (t) =>
      t.instituteId === instituteId &&
      t.status === "Active" &&
      t.smsType === smsType &&
      (t.branchId == null || branchId == null || t.branchId === branchId) &&
      (subType == null || t.resultType === subType || t.attendanceType === subType)
  )
}

// One name per institute among the templates not deleted.
export function isDuplicateTemplateName(instituteId: number, name: string, exceptId?: number) {
  const needle = name.trim().toLowerCase()
  return templates.some(
    (t) =>
      t.instituteId === instituteId &&
      t.id !== exceptId &&
      t.status !== "Deleted" &&
      t.name.trim().toLowerCase() === needle
  )
}

export type SmsTemplateErrors = Partial<Record<keyof SmsTemplateInput, string>>

// What is wrong with the template, field by field (empty when it can be saved).
export function smsTemplateErrors(input: SmsTemplateInput, exceptId?: number): SmsTemplateErrors {
  const errors: SmsTemplateErrors = {}
  const sub = subTypeOf(input.smsType)
  if (!input.instituteId) errors.instituteId = "Select an institute."
  if (
    input.branchId != null &&
    !branchStore.getList(input.instituteId).some((b) => b.id === input.branchId)
  ) {
    errors.branchId = "Select a branch of this institute."
  }
  if (!input.name.trim()) errors.name = "Template name is required."
  else if (input.name.trim().length > 100) errors.name = "Keep the name within 100 characters."
  else if (input.instituteId && isDuplicateTemplateName(input.instituteId, input.name, exceptId)) {
    errors.name = "This institute already has a template with this name."
  }
  if (!smsTypes.includes(input.smsType)) errors.smsType = "Select an SMS type."
  if (sub === "result" && !input.resultType) errors.resultType = "Select who the result SMS is for."
  if (sub === "attendance" && !input.attendanceType) {
    errors.attendanceType = "Select who the attendance SMS is for."
  }
  if (!input.message.trim()) errors.message = "Message is required."
  else if (input.message.length > MAX_TEMPLATE_LENGTH) {
    errors.message = `Keep the message within ${MAX_TEMPLATE_LENGTH} characters.`
  }
  return errors
}

// The sub-types that don't apply to the SMS type are dropped.
function clean(input: SmsTemplateInput): SmsTemplateInput {
  const sub = subTypeOf(input.smsType)
  return {
    ...input,
    name: input.name.trim(),
    message: input.message.trim(),
    resultType: sub === "result" ? input.resultType : null,
    attendanceType: sub === "attendance" ? input.attendanceType : null,
  }
}

function check(input: SmsTemplateInput, exceptId?: number) {
  const first = Object.values(smsTemplateErrors(input, exceptId))[0]
  if (first) throw new Error(first)
}

const now = () => new Date().toISOString()

export function addSmsTemplate(input: SmsTemplateInput, user: string) {
  check(input)
  const stamp = now()
  const template: SmsTemplate = {
    ...clean(input),
    id: Math.max(0, ...templates.map((t) => t.id)) + 1,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...templates, template])
  return template
}

function patch(id: number, changes: Partial<SmsTemplate>, user: string) {
  emit(
    templates.map((t) => (t.id === id ? { ...t, ...changes, modifiedBy: user, modifiedAt: now() } : t))
  )
}

export function updateSmsTemplate(id: number, input: SmsTemplateInput, user: string) {
  check(input, id)
  patch(id, clean(input), user)
}

// Legacy StatusUpdateSmsTemplateAjax: Active ⇄ Inactive.
export function toggleSmsTemplateStatus(id: number, user: string) {
  const template = templates.find((t) => t.id === id)
  if (!template || template.status === "Deleted") return
  patch(id, { status: template.status === "Active" ? "Inactive" : "Active" }, user)
}

// Legacy DeleteSmsTemplateAjax: a soft delete, retrievable later.
export function deleteSmsTemplate(id: number, user: string) {
  const template = templates.find((t) => t.id === id)
  if (!template || template.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

// Legacy RetrieveSmsTemplateAjax: back as active. Returns false when another
// template has taken its name meanwhile.
export function retrieveSmsTemplate(id: number, user: string) {
  const template = templates.find((t) => t.id === id)
  if (!template || template.status !== "Deleted") return false
  if (isDuplicateTemplateName(template.instituteId, template.name, id)) return false
  patch(id, { status: "Active" }, user)
  return true
}

// Legacy PermanentDeleteSmsTemplateAjax.
export function deleteSmsTemplatePermanently(id: number) {
  emit(templates.filter((t) => t.id !== id))
}

export function removeInstituteSmsTemplates(instituteId: number) {
  emit(templates.filter((t) => t.instituteId !== instituteId))
}
