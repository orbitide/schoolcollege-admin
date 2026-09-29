"use client"

import * as React from "react"

import { logChanges } from "@/lib/common-log"

// Institute notices (spec 08-communications/notices-and-notifications.md):
// a titled notice with a body and an optional attachment, for everyone,
// the teachers, or the students and guardians of some classes. It shows on
// the Notice Board from its publish date until it expires, pinned ones
// first; publishing can also send it as an SMS. Status works as elsewhere:
// Inactive hides it, Delete marks it Deleted (Admin retrieves or removes it
// for good). In-memory like the rest of admin; replace with API calls once
// the backend endpoints exist.

export const noticeCategories = ["General", "Academic", "Exam", "Holiday", "Event", "Fees", "Urgent"] as const
export type NoticeCategory = (typeof noticeCategories)[number]

export const noticeAudiences = ["Everyone", "Teachers", "Students & Guardians"] as const
export type NoticeAudience = (typeof noticeAudiences)[number]

export const noticeStatuses = ["Active", "Inactive", "Deleted"] as const
export type NoticeStatus = (typeof noticeStatuses)[number]

export const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024

export type Notice = {
  id: number
  instituteId: number
  title: string
  body: string
  category: NoticeCategory
  audience: NoticeAudience
  // For students and guardians: the classes it is for; empty for all.
  classIds: number[]
  // ISO dates; no expiry date keeps it up until it is made inactive.
  publishDate: string
  expiryDate: string
  isPinned: boolean
  attachmentName: string
  // A data: URL while there is no file storage.
  attachmentUrl: string
  // SMS queued for it so far.
  smsCount: number
  status: NoticeStatus
  createdBy: string
  createdAt: string
  modifiedBy: string
  modifiedAt: string
}

export type NoticeInput = Pick<
  Notice,
  | "instituteId"
  | "title"
  | "body"
  | "category"
  | "audience"
  | "classIds"
  | "publishDate"
  | "expiryDate"
  | "isPinned"
  | "attachmentName"
  | "attachmentUrl"
>

const today = () => new Date().toISOString().slice(0, 10)
const daysFrom = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10)

const seedUser = "Super Admin"
const seedStamp = "2026-09-01T09:00:00.000Z"

function seedNotices(): Notice[] {
  const base = {
    classIds: [] as number[],
    expiryDate: "",
    isPinned: false,
    attachmentName: "",
    attachmentUrl: "",
    smsCount: 0,
    status: "Active" as const,
    createdBy: seedUser,
    createdAt: seedStamp,
    modifiedBy: seedUser,
    modifiedAt: seedStamp,
  }
  return [
    {
      ...base,
      id: 1,
      instituteId: 1,
      title: "Half-yearly examination routine published",
      body: "The half-yearly examination starts on 12 October. The subject-wise routine is attached. Students must collect their admit cards from the class teacher by 10 October.",
      category: "Exam",
      audience: "Students & Guardians",
      publishDate: daysFrom(-3),
      expiryDate: daysFrom(20),
      isPinned: true,
    },
    {
      ...base,
      id: 2,
      instituteId: 1,
      title: "Guardian meeting of Class Nine and Ten",
      body: "A guardian meeting on the SSC preparation of Class Nine and Ten is held on Saturday at 10 AM in the auditorium. Guardians are requested to attend.",
      category: "Academic",
      audience: "Students & Guardians",
      classIds: [4, 5],
      publishDate: daysFrom(-1),
      expiryDate: daysFrom(5),
      smsCount: 24,
    },
    {
      ...base,
      id: 3,
      instituteId: 1,
      title: "September fees due by the 15th",
      body: "Tuition and ICT fees for September are due by 15 September. Fees can be paid at the counter or online through bKash, Nagad or card.",
      category: "Fees",
      audience: "Students & Guardians",
      publishDate: daysFrom(-25),
      expiryDate: daysFrom(-10),
    },
    {
      ...base,
      id: 4,
      instituteId: 1,
      title: "Teachers' meeting on the new routine",
      body: "All teachers are requested to join the meeting on the new class routine in the staff room after the 5th period on Sunday.",
      category: "General",
      audience: "Teachers",
      publishDate: today(),
    },
    {
      ...base,
      id: 5,
      instituteId: 1,
      title: "Annual sports: registration open",
      body: "Registration for the annual sports is open till the end of October. Contact the physical education teacher.",
      category: "Event",
      audience: "Everyone",
      publishDate: daysFrom(7),
    },
    {
      ...base,
      id: 6,
      instituteId: 5,
      title: "Office closed on Thursday",
      body: "The school office is closed on Thursday for the national holiday.",
      category: "Holiday",
      audience: "Everyone",
      publishDate: daysFrom(-2),
      expiryDate: daysFrom(3),
    },
  ]
}

const seed = seedNotices()
let notices: Notice[] = seed
const listeners = new Set<() => void>()

function emit(next: Notice[]) {
  logChanges("Notice", notices, next)
  notices = next
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAllNotices() {
  return React.useSyncExternalStore(subscribe, () => notices, () => seed)
}

export function useNotice(id: number) {
  return useAllNotices().find((n) => n.id === id)
}

export type NoticeState = "Scheduled" | "Live" | "Expired" | "Inactive" | "Deleted"

// Where the notice stands on `date` (ISO).
export function noticeState(notice: Notice, date = today()): NoticeState {
  if (notice.status === "Deleted") return "Deleted"
  if (notice.status === "Inactive") return "Inactive"
  if (notice.publishDate > date) return "Scheduled"
  if (notice.expiryDate && notice.expiryDate < date) return "Expired"
  return "Live"
}

// The live notices of the institute for a reader, pinned first, newest
// first. A teacher reads Everyone and Teachers notices; the others read all.
export function boardNotices(all: Notice[], instituteIds: number[], forTeacher: boolean, date = today()) {
  return all
    .filter(
      (n) =>
        instituteIds.includes(n.instituteId) &&
        noticeState(n, date) === "Live" &&
        (!forTeacher || n.audience !== "Students & Guardians")
    )
    .sort(
      (a, b) =>
        Number(b.isPinned) - Number(a.isPinned) ||
        b.publishDate.localeCompare(a.publishDate) ||
        b.id - a.id
    )
}

export type NoticeErrors = Partial<Record<keyof NoticeInput, string>>

export function noticeErrors(input: NoticeInput): NoticeErrors {
  const errors: NoticeErrors = {}
  if (!input.instituteId) errors.instituteId = "Select an institute."
  if (!input.title.trim()) errors.title = "Title is required."
  else if (input.title.trim().length > 150) errors.title = "Keep the title within 150 characters."
  if (!input.body.trim()) errors.body = "Write the notice."
  if (!input.publishDate) errors.publishDate = "Publish date is required."
  if (input.expiryDate && input.publishDate && input.expiryDate < input.publishDate) {
    errors.expiryDate = "The expiry date can't be before the publish date."
  }
  return errors
}

function clean(input: NoticeInput): NoticeInput {
  return {
    ...input,
    title: input.title.trim(),
    body: input.body.trim(),
    classIds: input.audience === "Teachers" ? [] : input.classIds,
  }
}

const now = () => new Date().toISOString()

export function addNotice(input: NoticeInput, user: string) {
  const first = Object.values(noticeErrors(input))[0]
  if (first) throw new Error(first)
  const stamp = now()
  const notice: Notice = {
    ...clean(input),
    id: Math.max(0, ...notices.map((n) => n.id)) + 1,
    smsCount: 0,
    status: "Active",
    createdBy: user,
    createdAt: stamp,
    modifiedBy: user,
    modifiedAt: stamp,
  }
  emit([...notices, notice])
  return notice
}

function patch(id: number, changes: Partial<Notice>, user: string) {
  emit(notices.map((n) => (n.id === id ? { ...n, ...changes, modifiedBy: user, modifiedAt: now() } : n)))
}

export function updateNotice(id: number, input: NoticeInput, user: string) {
  const first = Object.values(noticeErrors(input))[0]
  if (first) throw new Error(first)
  patch(id, clean(input), user)
}

export function addNoticeSms(id: number, count: number, user: string) {
  const notice = notices.find((n) => n.id === id)
  if (notice) patch(id, { smsCount: notice.smsCount + count }, user)
}

export function toggleNoticeStatus(id: number, user: string) {
  const notice = notices.find((n) => n.id === id)
  if (!notice || notice.status === "Deleted") return
  patch(id, { status: notice.status === "Active" ? "Inactive" : "Active" }, user)
}

export function toggleNoticePin(id: number, user: string) {
  const notice = notices.find((n) => n.id === id)
  if (!notice || notice.status === "Deleted") return
  patch(id, { isPinned: !notice.isPinned }, user)
}

export function deleteNotice(id: number, user: string) {
  const notice = notices.find((n) => n.id === id)
  if (!notice || notice.status === "Deleted") return
  patch(id, { status: "Deleted" }, user)
}

export function retrieveNotice(id: number, user: string) {
  const notice = notices.find((n) => n.id === id)
  if (!notice || notice.status !== "Deleted") return
  patch(id, { status: "Active" }, user)
}

export function deleteNoticePermanently(id: number) {
  emit(notices.filter((n) => n.id !== id))
}

export function removeInstituteNotices(instituteId: number) {
  emit(notices.filter((n) => n.instituteId !== instituteId))
}
