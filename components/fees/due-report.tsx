"use client"

import * as React from "react"
import Link from "next/link"
import { DownloadIcon, MessageSquareTextIcon, PrinterIcon } from "lucide-react"

import { FeeScopeFields, fmtDate, useFeeScope } from "@/components/fees/fee-scope"
import { PrintArea } from "@/components/reports/print-area"
import { useStudentLookups } from "@/components/students/student-lookups"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useCan } from "@/lib/access"
import { formatAmount, roundMoney } from "@/lib/fee-heads"
import { monthLabel } from "@/lib/fee-invoices"
import { openLines, useFeeLedger } from "@/lib/fee-payments"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents, type Enrolment, type Student } from "@/lib/students"
import { cn, parseInlineStyle } from "@/lib/utils"

type DueRow = {
  student: Student
  enrolment: Enrolment
  months: string[]
  overdue: number
  due: number
}

// Fees › Due Report: who owes what, class by class, counting dues billed up
// to a month; each student with the months owed and how much of it is past
// its due date. Printable, exportable, and one click from Due SMS.
export function DueReport() {
  const scope = useFeeScope()
  const { institute, year, academicClass, section, param, setParam } = scope
  const ledger = useFeeLedger()
  const students = useStudents()
  const name = useStudentLookups()
  const can = useCan()
  const upTo = /^\d{4}-\d{2}$/.test(param("upto")) ? param("upto") : ""
  const minDue = Number(param("min")) || 0
  const today = new Date().toISOString().slice(0, 10)

  const rows = React.useMemo(() => {
    if (!institute || !year) return []
    const list: DueRow[] = []
    for (const student of students) {
      if (student.instituteId !== institute.id) continue
      const enrolment = student.enrolments.find(
        (e) =>
          e.yearId === year.id &&
          (!academicClass || e.classId === academicClass.id) &&
          (!section || e.sectionId === section.id)
      )
      if (!enrolment) continue
      const lines = openLines(ledger.invoices, ledger.payments, student.id).filter(
        (l) => l.invoice.yearId === year.id && (!upTo || l.invoice.month <= upTo)
      )
      const due = roundMoney(lines.reduce((s, l) => s + l.due, 0))
      if (!(due > 0) || due < minDue) continue
      list.push({
        student,
        enrolment,
        months: [...new Set(lines.map((l) => l.invoice.month))].sort(),
        overdue: roundMoney(lines.filter((l) => l.invoice.dueDate < today).reduce((s, l) => s + l.due, 0)),
        due,
      })
    }
    return list.sort(
      (a, b) =>
        a.enrolment.classId - b.enrolment.classId ||
        (a.enrolment.sectionId ?? 0) - (b.enrolment.sectionId ?? 0) ||
        a.enrolment.classRoll.localeCompare(b.enrolment.classRoll, undefined, { numeric: true })
    )
  }, [institute, year, academicClass, section, students, ledger, upTo, minDue, today])

  const total = roundMoney(rows.reduce((s, r) => s + r.due, 0))
  const overdue = roundMoney(rows.reduce((s, r) => s + r.overdue, 0))
  const byClass = [...new Set(rows.map((r) => r.enrolment.classId))].map((classId) => {
    const list = rows.filter((r) => r.enrolment.classId === classId)
    return { classId, students: list.length, due: roundMoney(list.reduce((s, r) => s + r.due, 0)) }
  })

  function exportCsv() {
    downloadCsv(
        `fee-dues${upTo ? `-to-${upTo}` : ""}.csv`,
        ["SL", "Class", "Section", "Roll", "Student ID", "Student", "Mobile", "Months", "Overdue", "Due"],
        rows.map((r, i) => [
          i + 1,
          name("class", r.enrolment.classId),
          name("section", r.enrolment.sectionId),
          r.enrolment.classRoll,
          r.student.studentIdentificationNo,
          r.student.name,
          r.student.fatherMobile || r.student.primaryMobile,
          r.months.map(monthLabel).join("; "),
          r.overdue,
          r.due,
        ])
    )
  }

  const td = "border border-black px-1.5 py-0.5"
  const config = institute?.configuration
  const sheet = institute && config && rows.length > 0 && (
    <div className="flex flex-col gap-4 bg-white font-serif text-sm text-black">
      <header className="flex flex-col items-center text-center">
        <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
        <p>{institute.address}</p>
        <h2 style={parseInlineStyle(config.reportNameStyle)}>Fee Due Report</h2>
        <p>
          {year?.name}
          {academicClass && ` · ${academicClass.name}`}
          {section && ` ${section.name}`}
          {upTo && ` · billed up to ${monthLabel(upTo)}`} · as of {fmtDate(today)}
        </p>
      </header>
      <table className="w-1/2 border-collapse text-xs">
        <thead>
          <tr>
            <th className={cn(td, "text-left")}>Class</th>
            <th className={cn(td, "text-right")}>Students</th>
            <th className={cn(td, "text-right")}>Due</th>
          </tr>
        </thead>
        <tbody>
          {byClass.map((c) => (
            <tr key={c.classId}>
              <td className={td}>{name("class", c.classId)}</td>
              <td className={cn(td, "text-right tabular-nums")}>{c.students}</td>
              <td className={cn(td, "text-right tabular-nums")}>{formatAmount(c.due)}</td>
            </tr>
          ))}
          <tr>
            <td className={cn(td, "font-bold")}>Total</td>
            <td className={cn(td, "text-right font-bold tabular-nums")}>{rows.length}</td>
            <td className={cn(td, "text-right font-bold tabular-nums")}>{formatAmount(total)}</td>
          </tr>
        </tbody>
      </table>
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className={cn(td, "w-8")}>SL</th>
            <th className={td}>Class</th>
            <th className={td}>Roll</th>
            <th className={cn(td, "text-left")}>Student</th>
            <th className={td}>Mobile</th>
            <th className={cn(td, "text-left")}>Months</th>
            <th className={cn(td, "text-right")}>Overdue</th>
            <th className={cn(td, "text-right")}>Due</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.student.id}>
              <td className={cn(td, "text-center")}>{i + 1}</td>
              <td className={cn(td, "whitespace-nowrap")}>
                {name("class", r.enrolment.classId)} {name("section", r.enrolment.sectionId)}
              </td>
              <td className={cn(td, "text-center")}>{r.enrolment.classRoll}</td>
              <td className={td}>
                {r.student.name} ({r.student.studentIdentificationNo})
              </td>
              <td className={td}>{r.student.fatherMobile || r.student.primaryMobile}</td>
              <td className={td}>{r.months.map(monthLabel).join(", ")}</td>
              <td className={cn(td, "text-right tabular-nums")}>{r.overdue ? formatAmount(r.overdue) : "—"}</td>
              <td className={cn(td, "text-right font-bold tabular-nums")}>{formatAmount(r.due)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const smsHref = `/fees/due-sms?${new URLSearchParams({
    ...(institute && { institute: String(institute.id) }),
    ...(year && { year: String(year.id) }),
    ...(academicClass && { class: String(academicClass.id) }),
    ...(section && { section: String(section.id) }),
    ...(upTo && { upto: upTo }),
    ...(minDue && { min: String(minDue) }),
  })}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Due Report</CardTitle>
          <CardDescription>Students who owe fees, with the months owed and what is overdue.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} />
          <Field>
            <FieldLabel htmlFor="due-report-upto">Billed up to</FieldLabel>
            <Input id="due-report-upto" type="month" value={upTo} onChange={(e) => setParam({ upto: e.target.value })} />
            <FieldDescription>Blank counts every month.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="due-report-min">Minimum due (৳)</FieldLabel>
            <Input
              id="due-report-min"
              inputMode="numeric"
              placeholder="Any amount"
              value={param("min")}
              onChange={(e) => setParam({ min: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>{formatAmount(total)} due</CardTitle>
            <CardDescription>
              {rows.length} student{rows.length === 1 ? "" : "s"} · {formatAmount(overdue)} of it overdue
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            {can("fee-due-sms.manage") && (
              <Button asChild size="sm" variant="outline" disabled={!rows.length}>
                <Link href={smsHref}>
                  <MessageSquareTextIcon data-icon="inline-start" />
                  Send due SMS
                </Link>
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheet}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[40rem]">{sheet}</div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {!institute ? "Select an institute." : !year ? "Select an academic year." : "Nobody owes fees here."}
            </p>
          )}
        </CardContent>
      </Card>
      {sheet && <PrintArea pageSize="A4 portrait">{sheet}</PrintArea>}
    </div>
  )
}
