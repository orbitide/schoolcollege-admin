"use client"

import { yearStore } from "@/lib/academic-store"
import { studentNumbers } from "@/lib/fee-sms"
import type { Institute } from "@/lib/institutes"
import type { Notice } from "@/lib/notices"
import { newCampaignName, normalizeMobile, queueAndSendSms, type SmsDraft, type SmsReceiver } from "@/lib/sms-messages"
import { smsLength } from "@/lib/sms-templates"
import { getStudents } from "@/lib/students"
import { getTeachers } from "@/lib/teachers"

// Sends a notice as an SMS to its audience: the chosen numbers of the
// students (current academic year, the notice's classes) and/or the active
// teachers. Goes through the SMS queue as a "Notice" SMS.

export function noticeSmsDrafts(
  notice: Pick<Notice, "instituteId" | "audience" | "classIds">,
  message: string,
  receivers: SmsReceiver[]
) {
  const drafts: SmsDraft[] = []
  const seen = new Set<string>()
  const { chars, parts } = smsLength(message)
  const push = (mobile: string, studentId: number | null, numberType: SmsReceiver | null) => {
    if (seen.has(mobile)) return
    seen.add(mobile)
    drafts.push({ mobile, message, studentId, numberType, chars, parts })
  }
  if (notice.audience !== "Teachers") {
    const year = yearStore.getList(notice.instituteId).find((y) => y.isCurrent)
    for (const student of getStudents()) {
      if (student.instituteId !== notice.instituteId || student.status !== "Active") continue
      const e = student.enrolments.find((en) => en.yearId === year?.id && !en.transferred)
      if (!e || (notice.classIds.length && !notice.classIds.includes(e.classId))) continue
      for (const [mobile, type] of studentNumbers(student, receivers)) push(mobile, student.id, type)
    }
  }
  if (notice.audience !== "Students & Guardians") {
    for (const teacher of getTeachers()) {
      if (teacher.instituteId !== notice.instituteId || teacher.status !== "Active") continue
      const mobile = normalizeMobile(teacher.mobile)
      if (mobile) push(mobile, null, null)
    }
  }
  return drafts
}

export function sendNoticeSms(drafts: SmsDraft[], institute: Institute, userId: number, user: string) {
  return queueAndSendSms(
    {
      instituteId: institute.id,
      branchId: null,
      campaignName: newCampaignName(userId),
      smsType: "Notice",
      resultType: null,
      attendanceType: null,
      examId: null,
      subjectId: null,
      attendanceDate: null,
    },
    drafts,
    user,
    institute.configuration.smsRate
  )
}
