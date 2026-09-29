"use client"

import * as React from "react"

import { getCurrentUser } from "@/lib/current-user"

/**
 * Legacy SchoolCollege CommonLog (Basic Actions › Common Log). The legacy
 * ScBaseService writes a row after every save, update, delete, retrieve and
 * permanent delete of a record: the table, the row's id, the status the row
 * was left in, and a JSON snapshot of it (empty for delete, retrieve and
 * permanent delete). Here each store logs from its emit via `logChanges`.
 * In-memory like the rest of admin, so the log starts empty on each load.
 */

// Legacy EntityStatus values, plus -808 for a permanent delete.
export const logEntityStatuses = ["Active", "Inactive", "Deleted", "Permanent Delete"] as const
export type LogEntityStatus = (typeof logEntityStatuses)[number]

export type CommonLog = {
  id: number
  tableName: string
  rowId: number
  uniqueKey: string
  entityStatus: LogEntityStatus
  objectJson: string
  remarks: string
  createdBy: string
  createdAt: string
}

let logs: CommonLog[] = []
const empty: CommonLog[] = []
const listeners = new Set<() => void>()
let nextId = 1

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useCommonLogs() {
  return React.useSyncExternalStore(
    subscribe,
    () => logs,
    () => empty
  )
}

// The tables the stores log under (legacy LoadModuleTables), named after the
// legacy entities. The page offers them whether or not a store has loaded.
const tables = new Set<string>([
  "AcademicClass",
  "AcademicClassGroup",
  "AcademicSession",
  "AcademicYear",
  "AdminUser",
  "BillingSetting",
  "BoardStudent",
  "Branch",
  "Building",
  "ClassFee",
  "ClassPeriod",
  "ClassRoutine",
  "ClassYearSubject",
  "DashboardMenu",
  "DashboardMenuGroup",
  "District",
  "EducationBoard",
  "ExamSeatPlan",
  "ExamStudentAttendance",
  "FeeHead",
  "FeeInvoice",
  "FeePayment",
  "FeeWaiver",
  "HolidayAndEventSettings",
  "Institute",
  "InstituteBillingProfile",
  "LetterGrade",
  "MonthlyAttendanceFine",
  "NccCategory",
  "NccComment",
  "NccPermission",
  "NccPost",
  "NccSettings",
  "NccTag",
  "NccWebSite",
  "Notice",
  "OnlinePayment",
  "PlatformBillingInfo",
  "ResultRemarks",
  "SaasInvoice",
  "SaasPayment",
  "Section",
  "Shift",
  "SmsTemplate",
  "Student",
  "StudentAttendance",
  "StudentCategory",
  "StudentHouse",
  "Subscription",
  "SupportTicket",
  "Subject",
  "Teacher",
  "TermExam",
  "TermExamStudentMarks",
  "TermExamSubjectCorrectAnswer",
  "UserInstitute",
])

export function logTables() {
  return [...tables].sort()
}

type Row = { id: number; status?: unknown; modifiedBy?: unknown }

const statusOf = (row: Row): LogEntityStatus =>
  row.status === "Inactive" ? "Inactive" : row.status === "Deleted" ? "Deleted" : "Active"

// Legacy DoAfterSave / DoAfterUpdate / DoAfterDelete / DoAfterRetrive /
// DoAfterPermanentDelete, worked out from a store's list before and after.
export function logChanges<T extends Row>(
  table: string,
  before: readonly T[],
  after: readonly T[],
  uniqueKey?: (row: T) => string
) {
  tables.add(table)
  if (before === after) return
  const stamp = new Date().toISOString()
  const fallbackUser = () => getCurrentUser().name
  const entries: CommonLog[] = []
  const add = (row: Row, entityStatus: LogEntityStatus, objectJson: string, remarks = "") =>
    entries.push({
      id: nextId++,
      tableName: table,
      rowId: row.id,
      uniqueKey: uniqueKey ? uniqueKey(row as T) : "",
      entityStatus,
      objectJson,
      remarks,
      createdBy: typeof row.modifiedBy === "string" && row.modifiedBy ? row.modifiedBy : fallbackUser(),
      createdAt: stamp,
    })

  const previous = new Map(before.map((row) => [row.id, row]))
  for (const row of after) {
    const old = previous.get(row.id)
    previous.delete(row.id)
    if (old === row) continue
    const json = JSON.stringify(row)
    if (!old) {
      add(row, statusOf(row), json)
    } else if (JSON.stringify(old) !== json) {
      const wasDeleted = old.status === "Deleted"
      const isDeleted = row.status === "Deleted"
      if (!wasDeleted && isDeleted) add(row, "Deleted", "")
      else if (wasDeleted && !isDeleted) add(row, "Active", "")
      else add(row, statusOf(row), json)
    }
  }
  for (const row of previous.values()) {
    add({ ...row, modifiedBy: fallbackUser() }, "Permanent Delete", "", "Permanent Delete")
  }
  if (!entries.length) return
  logs = [...entries.reverse(), ...logs]
  listeners.forEach((listener) => listener())
}
