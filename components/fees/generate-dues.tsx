"use client"

import * as React from "react"
import Link from "next/link"
import { CircleAlertIcon, ReceiptTextIcon } from "lucide-react"
import { toast } from "sonner"

import { FeeScopeFields, useFeeScope } from "@/components/fees/fee-scope"
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useAttendanceFines } from "@/lib/attendance-fines"
import { useCurrentUser } from "@/lib/current-user"
import { feeHeadStore, formatAmount, roundMoney } from "@/lib/fee-heads"
import {
  buildDueRows,
  generateDues,
  generateProblems,
  monthLabel,
  thisMonth,
  useFeeInvoices,
  type GenerateInput,
} from "@/lib/fee-invoices"
import { useClassFees } from "@/lib/fee-setup"
import { useFeeWaivers } from "@/lib/fee-waivers"
import { useStudents } from "@/lib/students"

// Fees › Generate Dues: bills a class (or a section) for a month. Pick the
// heads (monthly ones are ticked; occasional, yearly and one-time ones when
// they are due; absent fines come from Monthly Attendance Fine), preview what
// each student gets, then generate. Running it again only bills what isn't
// billed yet, so it is safe to repeat after admitting a student or saving
// more fines.
export function GenerateDues() {
  const scope = useFeeScope()
  const { institute, year, academicClass, section, param, setParam } = scope
  const user = useCurrentUser()
  const heads = feeHeadStore.useList(institute?.id ?? -1).filter((h) => h.status === "Active")
  // Re-render when any source changes.
  const students = useStudents()
  const fees = useClassFees()
  const waivers = useFeeWaivers()
  const fines = useAttendanceFines()
  const invoices = useFeeInvoices()

  const month = /^\d{4}-\d{2}$/.test(param("month")) ? param("month") : thisMonth()
  // Picks are kept per institute; until then the monthly heads and fines.
  const [pickedFor, setPickedFor] = React.useState<{ instituteId: number; ids: number[] } | null>(null)
  const picked = pickedFor && pickedFor.instituteId === institute?.id ? pickedFor.ids : null
  const setPicked = (ids: number[]) => institute && setPickedFor({ instituteId: institute.id, ids })
  const selected =
    picked ?? heads.filter((h) => h.frequency === "Monthly" || h.frequency === "Per Absent Day").map((h) => h.id)
  const issueDate = param("issue") || `${month}-01`
  const dueDate = param("due") || `${month}-15`
  const [confirming, setConfirming] = React.useState(false)

  const input: GenerateInput | null =
    institute && year && academicClass
      ? {
          instituteId: institute.id,
          yearId: year.id,
          classId: academicClass.id,
          sectionId: section?.id ?? null,
          month,
          feeHeadIds: selected,
          issueDate,
          dueDate,
        }
      : null
  const problems = input ? generateProblems(input) : []
  const rows =
    input && !problems.length ? buildDueRows(input, { students, fees, waivers, fines, invoices, heads }) : []
  const billed = rows.filter((r) => r.lines.length)
  const total = roundMoney(
    billed.reduce((sum, r) => sum + r.lines.reduce((s, l) => s + l.amount - l.waiver, 0), 0)
  )
  const headName = new Map(heads.map((h) => [h.id, h.name]))

  function generate() {
    if (!input) return
    try {
      const result = generateDues(input, user.name)
      toast.success("Dues generated successfully", {
        description: `${result.invoices} invoice${result.invoices === 1 ? "" : "s"}, ${formatAmount(result.amount)} for ${monthLabel(month)}.`,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The dues could not be generated.")
    }
    setConfirming(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Generate Dues</CardTitle>
            <CardDescription>
              Bill a class for a month. Anything already billed is skipped, so it is safe to run again.
            </CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link href="/fees/invoices">Manage dues</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <FeeScopeFields scope={scope} need={["class"]} />
            <Field>
              <FieldLabel htmlFor="due-month">Billing month</FieldLabel>
              <Input
                id="due-month"
                type="month"
                value={month}
                onChange={(e) => setParam({ month: e.target.value, issue: "", due: "" })}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="due-issue">Issue date</FieldLabel>
              <Input id="due-issue" type="date" value={issueDate} onChange={(e) => setParam({ issue: e.target.value })} />
            </Field>
            <Field>
              <FieldLabel htmlFor="due-date">Due date</FieldLabel>
              <Input id="due-date" type="date" value={dueDate} onChange={(e) => setParam({ due: e.target.value })} />
            </Field>
          </div>
          {heads.length > 0 && (
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium">Fee heads to bill</legend>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                {heads.map((h) => (
                  <Label key={h.id} className="flex items-center gap-2 font-normal">
                    <Checkbox
                      checked={selected.includes(h.id)}
                      onCheckedChange={(on) =>
                        setPicked(on ? [...selected, h.id] : selected.filter((id) => id !== h.id))
                      }
                    />
                    {h.name}
                    <span className="text-xs text-muted-foreground">({h.frequency})</span>
                  </Label>
                ))}
              </div>
            </fieldset>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Preview · {monthLabel(month)}</CardTitle>
            <CardDescription>
              {input && !problems.length
                ? `${billed.length} of ${rows.length} students get an invoice, ${formatAmount(total)} in all.`
                : "Pick the class, month and fee heads to see what will be billed."}
            </CardDescription>
          </div>
          <Button size="sm" onClick={() => setConfirming(true)} disabled={!billed.length}>
            <ReceiptTextIcon data-icon="inline-start" />
            Generate {billed.length || ""} invoice{billed.length === 1 ? "" : "s"}
          </Button>
        </CardHeader>
        <CardContent>
          {problems.length > 0 && input ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4" />
              {problems[0]}
            </p>
          ) : rows.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Lines</TableHead>
                    <TableHead className="text-right">Payable</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row, index) => (
                    <TableRow key={row.student.id} className={row.lines.length ? undefined : "text-muted-foreground"}>
                      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                      <TableCell className="tabular-nums">{row.enrolment.classRoll}</TableCell>
                      <TableCell className="font-medium">{row.student.name}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {row.lines.map((l) => (
                            <Badge key={l.key} variant="outline" title={l.note || undefined}>
                              {headName.get(l.feeHeadId)} {formatAmount(l.amount)}
                              {l.waiver > 0 && <span className="text-green-700 dark:text-green-400">−{formatAmount(l.waiver)}</span>}
                            </Badge>
                          ))}
                          {row.skipped
                            .filter((s) => s.reason === "Already billed")
                            .map((s) => (
                              <Badge key={`skip-${s.feeHeadId}`} variant="secondary" className="text-muted-foreground">
                                {headName.get(s.feeHeadId)}: already billed
                              </Badge>
                            ))}
                          {row.skipped.some((s) => s.reason === "No amount set for the class") && (
                            <span className="text-xs text-amber-600">Some heads have no amount in Fee Setup.</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums whitespace-nowrap">
                        {row.lines.length
                          ? formatAmount(row.lines.reduce((s, l) => s + l.amount - l.waiver, 0))
                          : "Nothing new"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : input ? (
            <p className="text-sm text-muted-foreground">No active student in this class for the year.</p>
          ) : null}
        </CardContent>
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Generate {billed.length} invoices?</AlertDialogTitle>
            <AlertDialogDescription>
              {academicClass?.name}
              {section ? ` ${section.name}` : ""} is billed {formatAmount(total)} for {monthLabel(month)}, due{" "}
              {dueDate}. An invoice can later be cancelled only while nothing is paid on it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={generate}>Generate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
