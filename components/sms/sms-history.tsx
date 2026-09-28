"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, SearchIcon, XIcon } from "lucide-react"

import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { branchStore } from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  downloadCsv,
  RESPONSE_TEXT,
  smsReceivers,
  smsStatuses,
  useSmsMessages,
  type SmsMessage,
  type SmsStatus,
} from "@/lib/sms-messages"
import { smsAttendanceTypes, smsResultTypes, smsTypes, subTypeOf, type SmsType } from "@/lib/sms-templates"
import { todayIso } from "@/lib/student-attendance"
import { useStudents } from "@/lib/students"
import { useTermExams } from "@/lib/term-exams"
import { cn } from "@/lib/utils"

const PAGE_SIZES = [25, 50, 100]

const statusStyles: Record<SmsStatus, string> = {
  Sent: "border-emerald-500/40 text-emerald-700 dark:text-emerald-400",
  Pending: "border-amber-500/40 text-amber-700 dark:text-amber-400",
  Failed: "border-rose-500/40 text-rose-700 dark:text-rose-400",
}

function SmsStatusBadge({ status }: { status: SmsStatus }) {
  return (
    <Badge variant="outline" className={cn("px-1.5", statusStyles[status])}>
      {status}
    </Badge>
  )
}

function DateField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (value: string) => void
}) {
  const id = React.useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

// Legacy Sms/CombineHistory ("SMS History"): every SMS queued or sent — the
// pending ones and the archive in one list — filtered by status, type, exam,
// receiver, test SMS, try count and date, with a search over student, exam,
// mobile (ending with), message, campaign, sender and gateway response.
export function SmsHistory() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const user = useCurrentUser()
  const institutes = useAccessibleInstitutes()
  const messages = useSmsMessages()
  const students = useStudents()
  const exams = useTermExams()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const branches = branchStore.useList(institute?.id ?? -1)
  const today = todayIso()
  // Legacy opens on this month so far.
  const from = param("from") || `${today.slice(0, 8)}01`
  const to = param("to") || today
  const type = param("type") as SmsType | ""
  const sub = subTypeOf(type)
  const q = param("q")
  const [query, setQuery] = React.useState(q)
  const [pageSize, setPageSize] = React.useState(PAGE_SIZES[0])
  const [page, setPage] = React.useState(0)
  // The legacy try-count filter is for the super admin only.
  const showTryCount = user.role === "Super Admin"

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
    setPage(0)
  }

  const studentById = React.useMemo(() => new Map(students.map((s) => [s.id, s])), [students])
  const examById = React.useMemo(() => new Map(exams.map((e) => [e.id, e])), [exams])
  const instituteById = new Map(institutes.map((i) => [i.id, i]))
  const allowed = new Set(institutes.map((i) => i.id))
  const studentName = (m: SmsMessage) => (m.studentId != null ? (studentById.get(m.studentId)?.name ?? "") : "")
  const examName = (m: SmsMessage) => (m.examId != null ? (examById.get(m.examId)?.fullName ?? "") : "")
  const maxTry = (m: SmsMessage) => instituteById.get(m.instituteId)?.configuration.smsMaxTry ?? 1

  // The exams SMS went out for, for the exam filter.
  const examOptions = [
    ...new Set(
      messages
        .filter((m) => m.examId != null && (!institute || m.instituteId === institute.id) && (!type || m.smsType === type))
        .map((m) => m.examId!)
    ),
  ].map((id) => ({ value: String(id), label: examById.get(id)?.fullName ?? `Exam ${id}` }))

  const needle = q.trim().toLowerCase()
  const rows = messages
    .filter((m) => {
      const day = m.createdAt.slice(0, 10)
      if (!allowed.has(m.instituteId) || (institute && m.instituteId !== institute.id)) return false
      if (param("branch") && m.branchId != null && String(m.branchId) !== param("branch")) return false
      if (param("status") && m.status !== param("status")) return false
      if (type && m.smsType !== type) return false
      if (param("sub") && m.resultType !== param("sub") && m.attendanceType !== param("sub")) return false
      if (param("exam") && String(m.examId) !== param("exam")) return false
      if (param("number") && m.numberType !== param("number")) return false
      if (param("test") === "test" && !m.isTest) return false
      if (param("test") === "real" && m.isTest) return false
      if (param("try") === "below" && m.tryCount >= maxTry(m)) return false
      if (param("try") === "max" && m.tryCount < maxTry(m)) return false
      if ((from && day < from) || (to && day > to)) return false
      if (needle) {
        // Legacy: mobile matches its ending, response code / id exactly,
        // everything else anywhere.
        const hit =
          m.mobile.endsWith(needle) ||
          m.responseCode === q.trim() ||
          m.responseId === q.trim() ||
          [studentName(m), examName(m), m.message, m.campaignName, m.createdBy].some((v) =>
            v.toLowerCase().includes(needle)
          )
        if (!hit) return false
      }
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const current = Math.min(page, pageCount - 1)
  const shown = rows.slice(current * pageSize, (current + 1) * pageSize)
  const count = (status: SmsStatus) => rows.filter((m) => m.status === status).length
  const parts = (status?: SmsStatus) =>
    rows.filter((m) => !status || m.status === status).reduce((sum, m) => sum + m.parts, 0)
  const sentCost = rows
    .filter((m) => m.status === "Sent")
    .reduce((sum, m) => sum + m.parts * (instituteById.get(m.instituteId)?.configuration.smsRate ?? 0), 0)
  const filtered = searchParams.toString() !== ""

  function exportCsv() {
    downloadCsv(
      `sms-history-${from}-to-${to}.csv`,
      ["Sl", "Status", "SMS type", "Sub category", "Exam", "Student", "Mobile", "Number type", "SMS", "Characters", "SMS count", "Test SMS", "Campaign", "Try count", "Sent by", "Created", "Sent", "Response code", "Response ID"],
      rows.map((m, index) => [
        index + 1,
        m.status,
        m.smsType,
        m.resultType ?? m.attendanceType ?? "",
        examName(m),
        studentName(m),
        m.mobile,
        m.numberType ?? "",
        m.message,
        m.chars,
        m.parts,
        m.isTest ? "Yes" : "No",
        m.campaignName,
        m.tryCount,
        m.createdBy,
        stamp(m.createdAt),
        m.sentAt ? stamp(m.sentAt) : "",
        m.responseCode ?? "",
        m.responseId ?? "",
      ])
    )
  }

  const stats = [
    { label: "SMS", value: rows.length, hint: `${parts()} SMS parts` },
    { label: "Sent", value: count("Sent"), hint: `${parts("Sent")} parts · ৳${sentCost.toFixed(2)}`, tone: "text-emerald-600 dark:text-emerald-400" },
    { label: "Pending", value: count("Pending"), hint: `${parts("Pending")} parts waiting`, tone: "text-amber-600 dark:text-amber-400" },
    { label: "Failed", value: count("Failed"), hint: `${parts("Failed")} parts`, tone: "text-rose-600 dark:text-rose-400" },
  ]

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">SMS History</CardTitle>
            <CardDescription>
              Every SMS queued, sent or failed. Click a campaign to see the rest of it.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {filtered && (
              <Button asChild size="sm" variant="ghost">
                <Link href={pathname} onClick={() => setQuery("")}>
                  <XIcon data-icon="inline-start" />
                  Clear filters
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!rows.length}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, branch: "", exam: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {institute?.enableBranch && (
            <FilterField
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          <FilterField
            label="SMS status"
            value={param("status")}
            onChange={(v) => setParam({ status: v })}
            options={smsStatuses.map((s) => ({ value: s, label: s }))}
            allLabel="All statuses"
          />
          <FilterField
            label="SMS type"
            value={type}
            onChange={(v) => setParam({ type: v, sub: "", exam: "" })}
            options={smsTypes.map((t) => ({ value: t, label: t }))}
            allLabel="All types"
          />
          {sub && (
            <FilterField
              label={sub === "result" ? "Result type" : "Attendance type"}
              value={param("sub")}
              onChange={(v) => setParam({ sub: v })}
              options={(sub === "result" ? smsResultTypes : smsAttendanceTypes).map((t) => ({ value: t, label: t }))}
              allLabel="All"
            />
          )}
          {(type === "Result" || type === "Exam Attendance") && (
            <FilterField
              label="Exam"
              value={param("exam")}
              onChange={(v) => setParam({ exam: v })}
              options={examOptions}
              allLabel="All exams"
            />
          )}
          <FilterField
            label="Number type"
            value={param("number")}
            onChange={(v) => setParam({ number: v })}
            options={smsReceivers.map((r) => ({ value: r, label: r }))}
            allLabel="All numbers"
          />
          <FilterField
            label="Test SMS"
            value={param("test")}
            onChange={(v) => setParam({ test: v })}
            options={[
              { value: "test", label: "Test SMS only" },
              { value: "real", label: "Except test SMS" },
            ]}
            allLabel="All SMS"
          />
          {showTryCount && (
            <FilterField
              label="Try count"
              value={param("try")}
              onChange={(v) => setParam({ try: v })}
              options={[
                { value: "below", label: "Below max try" },
                { value: "max", label: "Reached max try" },
              ]}
              allLabel="All try counts"
            />
          )}
          <DateField label="From" value={from} onChange={(v) => setParam({ from: v })} />
          <DateField label="To" value={to} onChange={(v) => setParam({ to: v })} />
          <form
            className="flex flex-col justify-end sm:col-span-2"
            onSubmit={(event) => {
              event.preventDefault()
              setParam({ q: query.trim() })
            }}
          >
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onBlur={() => query.trim() !== q && setParam({ q: query.trim() })}
                placeholder="Student, exam, mobile, message, campaign, sender, response"
                aria-label="Search SMS"
                className="pl-8"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label} className="gap-1 py-4">
            <CardContent className="flex flex-col px-4">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <span className={cn("text-2xl font-semibold tabular-nums", stat.tone)}>{stat.value}</span>
              <span className="text-xs text-muted-foreground">{stat.hint}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>SMS type</TableHead>
              <TableHead>Exam</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead className="min-w-80">SMS</TableHead>
              <TableHead>Length</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead className="text-center">Try</TableHead>
              <TableHead>Sent by</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {shown.length ? (
              shown.map((m, index) => {
                const subType = m.resultType ?? m.attendanceType
                return (
                  <TableRow key={m.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {current * pageSize + index + 1}
                    </TableCell>
                    <TableCell>
                      <SmsStatusBadge status={m.status} />
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {m.smsType}
                        {subType && (
                          <Badge variant="outline" className="px-1.5 text-muted-foreground">
                            {subType}
                          </Badge>
                        )}
                        {m.isTest && (
                          <Badge variant="outline" className="border-sky-500/40 px-1.5 text-sky-700 dark:text-sky-400">
                            Test
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{examName(m) || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">{studentName(m) || "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="tabular-nums">{m.mobile}</div>
                      <div className="text-xs text-muted-foreground">{m.numberType ?? "Test number"}</div>
                    </TableCell>
                    <TableCell className="max-w-md min-w-80 whitespace-normal">
                      <p className="line-clamp-3 text-sm" title={m.message}>
                        {m.message}
                      </p>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums text-muted-foreground">
                      {m.chars} chars
                      <br />
                      {m.parts} SMS
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                        onClick={() => {
                          setQuery(m.campaignName)
                          setParam({ q: m.campaignName })
                        }}
                        title="Show this campaign"
                      >
                        {m.campaignName}
                      </button>
                    </TableCell>
                    <TableCell className="text-center tabular-nums">{m.tryCount}</TableCell>
                    <TableCell className="whitespace-nowrap">{m.createdBy}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      <div>Cr: {stamp(m.createdAt)}</div>
                      {m.sentAt && <div>Se: {stamp(m.sentAt)}</div>}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap tabular-nums">
                      {m.responseCode || m.responseId ? (
                        <>
                          <div title={m.responseCode ? RESPONSE_TEXT[m.responseCode] : undefined}>
                            {m.responseCode ?? "—"}
                          </div>
                          <div className="text-muted-foreground">{m.responseId ?? ""}</div>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={13} className="h-24 text-center text-muted-foreground">
                  No SMS match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
        <span>
          {rows.length
            ? `${current * pageSize + 1}–${Math.min(rows.length, (current + 1) * pageSize)} of ${rows.length}`
            : "0 SMS"}
        </span>
        <div className="flex items-center gap-2">
          <FilterPageSize
            value={pageSize}
            onChange={(size) => {
              setPageSize(size)
              setPage(0)
            }}
          />
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            aria-label="Previous page"
          >
            <ChevronLeftIcon />
          </Button>
          <span className="tabular-nums">
            {current + 1} / {pageCount}
          </span>
          <Button
            size="icon"
            variant="outline"
            className="size-8"
            onClick={() => setPage(current + 1)}
            disabled={current >= pageCount - 1}
            aria-label="Next page"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  )
}

function FilterPageSize({ value, onChange }: { value: number; onChange: (size: number) => void }) {
  return (
    <label className="flex items-center gap-2">
      Rows
      <select
        className="h-8 rounded-md border bg-transparent px-2 text-sm"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      >
        {PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </label>
  )
}
