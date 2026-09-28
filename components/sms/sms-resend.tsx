"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArchiveIcon,
  ArchiveXIcon,
  PlayIcon,
  RotateCwIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { FilterField, stamp } from "@/components/term-exams/term-exam-fields"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
import { useAccessibleInstitutes } from "@/lib/current-user"
import {
  archivePendingSms,
  RESPONSE_TEXT,
  sendPendingSms,
  useSmsMessages,
  type SmsMessage,
} from "@/lib/sms-messages"
import { smsAttendanceTypes, smsResultTypes, smsTypes, subTypeOf, type SmsType } from "@/lib/sms-templates"
import { useStudents } from "@/lib/students"
import { useTermExams } from "@/lib/term-exams"

type Operation = "resend" | "success" | "failed"

const operations: Record<Operation, { title: string; action: string; icon: React.ElementType; destructive?: boolean }> = {
  resend: { title: "Re-send", action: "Re-send", icon: RotateCwIcon },
  success: { title: "Archive as success", action: "Archive as success", icon: ArchiveIcon },
  failed: { title: "Archive as failed", action: "Archive as failed", icon: ArchiveXIcon, destructive: true },
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = React.useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input id={id} type="date" value={value} onChange={(event) => onChange(event.target.value)} />
    </Field>
  )
}

// Legacy Sms/ReSendPendingSms ("Re-send SMS"): the pending SMS the gateway
// schedule has given up on (tried the institute's "SMS max try" times),
// filtered by campaign, type, exam, date and search. The chosen ones can be
// tried again or closed as sent or failed. The queue still waiting for the
// schedule can be sent from here too, since there is no scheduler yet.
export function SmsResend() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const messages = useSmsMessages()
  const students = useStudents()
  const exams = useTermExams()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const type = param("type") as SmsType | ""
  const sub = subTypeOf(type)
  const q = param("q")
  const [query, setQuery] = React.useState(q)
  // Rows unticked by hand; every other filtered row is chosen.
  const [unticked, setUnticked] = React.useState<Set<number>>(new Set())
  const [operation, setOperation] = React.useState<Operation | null>(null)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
    setUnticked(new Set())
  }

  const instituteById = new Map(institutes.map((i) => [i.id, i]))
  const maxTry = (m: SmsMessage) => instituteById.get(m.instituteId)?.configuration.smsMaxTry ?? 1
  const rateOf = (instituteId: number) => instituteById.get(instituteId)?.configuration.smsRate ?? 0
  const studentById = new Map(students.map((s) => [s.id, s]))
  const examById = new Map(exams.map((e) => [e.id, e]))
  const inScope = (m: SmsMessage) =>
    instituteById.has(m.instituteId) && (!institute || m.instituteId === institute.id)

  const pending = messages.filter((m) => m.status === "Pending" && inScope(m))
  const stuck = pending.filter((m) => m.tryCount >= maxTry(m))
  const waiting = pending.filter((m) => m.tryCount < maxTry(m))
  const campaigns = [...new Set(stuck.map((m) => m.campaignName))].sort().reverse()
  const examOptions = [...new Set(stuck.filter((m) => m.examId != null).map((m) => m.examId!))].map((id) => ({
    value: String(id),
    label: examById.get(id)?.fullName ?? `Exam ${id}`,
  }))

  const needle = q.trim()
  const rows = stuck
    .filter((m) => {
      const day = m.createdAt.slice(0, 10)
      if (param("campaign") && m.campaignName !== param("campaign")) return false
      if (type && m.smsType !== type) return false
      if (param("sub") && m.resultType !== param("sub") && m.attendanceType !== param("sub")) return false
      if (param("exam") && String(m.examId) !== param("exam")) return false
      if (param("from") && day < param("from")) return false
      if (param("to") && day > param("to")) return false
      // Legacy: the campaign exactly, the mobile's ending or the message.
      if (needle && m.campaignName !== needle && !m.mobile.endsWith(needle) && !m.message.includes(needle)) return false
      return true
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id - b.id)
  const chosen = rows.filter((m) => !unticked.has(m.id))
  const chosenParts = chosen.reduce((sum, m) => sum + m.parts, 0)
  const chosenCost = chosen.reduce((sum, m) => sum + m.parts * rateOf(m.instituteId), 0)
  const allTicked = rows.length > 0 && chosen.length === rows.length

  function run() {
    const op = operation
    setOperation(null)
    if (!op || !chosen.length) return
    const ids = chosen.map((m) => m.id)
    if (op === "resend") {
      const { sent, failed } = sendPendingSms(ids, rateOf)
      if (sent) toast.success(`${sent} SMS ${sent === 1 ? "is" : "are"} successfully sent`, {
        description: failed ? `${failed} couldn't be sent and stay here.` : undefined,
      })
      else toast.error(`${failed} SMS couldn't be sent`, { description: "Check the SMS balance." })
    } else {
      const count = archivePendingSms(ids, op === "success" ? "Sent" : "Failed")
      toast.success(
        `${count} SMS ${count === 1 ? "is" : "are"} moved to the archive as ${op === "success" ? "successful" : "failed"}`
      )
    }
    setUnticked(new Set())
  }

  function sendWaiting() {
    const { sent, failed } = sendPendingSms(
      waiting.map((m) => m.id),
      rateOf
    )
    toast.success(`Total sent SMS: ${sent}, can't send SMS: ${failed}`, {
      description: failed ? "Those are tried again until they reach the max try, then show below." : undefined,
    })
  }

  const filtered = ["campaign", "type", "sub", "exam", "from", "to", "q"].some((k) => param(k))
  const op = operation ? operations[operation] : null

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Re-send SMS</CardTitle>
            <CardDescription>
              Pending SMS the gateway gave up on after the institute&apos;s max tries. Choose which to
              try again or close as sent or failed.
            </CardDescription>
          </div>
          {filtered && (
            <Button asChild size="sm" variant="ghost">
              <Link
                href={canPick && institute ? `${pathname}?institute=${institute.id}` : pathname}
                onClick={() => setQuery("")}
              >
                <XIcon data-icon="inline-start" />
                Clear filters
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, campaign: "", exam: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          <FilterField
            label="Campaign"
            value={param("campaign")}
            onChange={(v) => setParam({ campaign: v })}
            options={campaigns.map((c) => ({ value: c, label: c }))}
            allLabel="All campaigns"
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
          <DateField label="From" value={param("from")} onChange={(v) => setParam({ from: v })} />
          <DateField label="To" value={param("to")} onChange={(v) => setParam({ to: v })} />
          <form
            className="flex flex-col justify-end sm:col-span-2 lg:col-span-1"
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
                placeholder="Campaign, mobile ending, message"
                aria-label="Search pending SMS"
                className="pl-8"
              />
            </div>
          </form>
        </CardContent>
      </Card>

      {waiting.length > 0 && (
        <Card className="gap-2 py-4">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 px-4">
            <div className="flex flex-col">
              <span className="font-medium">
                {waiting.length} SMS waiting for the gateway schedule
              </span>
              <span className="text-sm text-muted-foreground">
                {waiting.reduce((sum, m) => sum + m.parts, 0)} SMS parts queued from Send SMS and not tried
                up to the max yet. There is no scheduler yet, so send them from here.
              </span>
            </div>
            <Button size="sm" onClick={sendWaiting}>
              <PlayIcon data-icon="inline-start" />
              Send pending now
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {rows.length
            ? `${chosen.length} of ${rows.length} chosen · ${chosenParts} SMS parts · ≈ ৳${chosenCost.toFixed(2)}`
            : "Nothing to re-send."}
        </p>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(operations) as Operation[]).map((key) => {
            const o = operations[key]
            return (
              <Button
                key={key}
                size="sm"
                variant={key === "resend" ? "default" : "outline"}
                className={o.destructive ? "text-destructive hover:text-destructive" : undefined}
                disabled={!chosen.length}
                onClick={() => setOperation(key)}
              >
                <o.icon data-icon="inline-start" />
                {o.title}
              </Button>
            )
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allTicked ? true : chosen.length ? "indeterminate" : false}
                  onCheckedChange={(checked) =>
                    setUnticked(checked === true ? new Set() : new Set(rows.map((m) => m.id)))
                  }
                  aria-label="Choose all"
                  disabled={!rows.length}
                />
              </TableHead>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead className="text-center">Try</TableHead>
              <TableHead>SMS type</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead className="min-w-80">SMS</TableHead>
              <TableHead>Campaign</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Last response</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((m, index) => {
                const subType = m.resultType ?? m.attendanceType
                const exam = m.examId != null ? examById.get(m.examId) : undefined
                return (
                  <TableRow key={m.id} data-state={unticked.has(m.id) ? undefined : "selected"}>
                    <TableCell>
                      <Checkbox
                        checked={!unticked.has(m.id)}
                        onCheckedChange={(checked) =>
                          setUnticked((current) => {
                            const next = new Set(current)
                            if (checked === true) next.delete(m.id)
                            else next.add(m.id)
                            return next
                          })
                        }
                        aria-label={`Choose SMS to ${m.mobile}`}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    <TableCell className="text-center tabular-nums">
                      {m.tryCount}/{maxTry(m)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {m.smsType}
                        {subType && (
                          <Badge variant="outline" className="px-1.5 text-muted-foreground">
                            {subType}
                          </Badge>
                        )}
                      </div>
                      {exam && <div className="text-xs text-muted-foreground">{exam.fullName}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {m.studentId != null ? (studentById.get(m.studentId)?.name ?? "—") : "—"}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <div className="tabular-nums">{m.mobile}</div>
                      <div className="text-xs text-muted-foreground">{m.numberType ?? "—"}</div>
                    </TableCell>
                    <TableCell className="max-w-md min-w-80 whitespace-normal">
                      <p className="line-clamp-3 text-sm" title={m.message}>
                        {m.message}
                      </p>
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="font-mono text-xs text-primary underline-offset-4 hover:underline"
                        onClick={() => setParam({ campaign: m.campaignName })}
                        title="Only this campaign"
                      >
                        {m.campaignName}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      <div className="tabular-nums">{stamp(m.createdAt)}</div>
                      <div className="text-muted-foreground">{m.createdBy}</div>
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {m.responseCode ? (
                        <>
                          <div className="tabular-nums">{m.responseCode}</div>
                          <div className="text-muted-foreground">{RESPONSE_TEXT[m.responseCode] ?? ""}</div>
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
                <TableCell colSpan={10} className="h-24 text-center text-muted-foreground">
                  {stuck.length
                    ? "No pending SMS match these filters."
                    : "No SMS has run out of tries. Everything pending is still with the gateway schedule."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!op} onOpenChange={(open) => !open && setOperation(null)}>
        {op && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {op.title} {chosen.length} SMS?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {operation === "resend"
                  ? `They are sent through the gateway again (${chosenParts} SMS parts, about ৳${chosenCost.toFixed(2)}). Any that fail again stay here.`
                  : `They are closed without sending and move to SMS History as ${operation === "success" ? "sent" : "failed"}.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant={op.destructive ? "destructive" : "default"} onClick={run}>
                {op.action}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}
