"use client"

import * as React from "react"
import Link from "next/link"
import { SendIcon } from "lucide-react"
import { toast } from "sonner"

import { FeeScopeFields, useFeeScope } from "@/components/fees/fee-scope"
import { insertAtCursor, KeywordPicker, SmsLengthSummary } from "@/components/sms/sms-message"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Textarea } from "@/components/ui/textarea"
import { useCurrentUser } from "@/lib/current-user"
import { formatAmount, roundMoney } from "@/lib/fee-heads"
import { useFeeInvoices } from "@/lib/fee-invoices"
import { useFeePayments } from "@/lib/fee-payments"
import { buildDueSms, sendDueSms, type DueSmsInput } from "@/lib/fee-sms"
import { smsReceivers, useSmsBalance, type SmsReceiver } from "@/lib/sms-messages"
import { useSmsTemplates } from "@/lib/sms-templates"
import { useStudents } from "@/lib/students"

// Fees › Due SMS: reminds the guardians of students who owe fees. Pick the
// year and optionally a class and section, count only dues billed up to a
// month and at least an amount, choose who receives it (or leave it to each
// student's primary contact) and a "Fee Due" template or your own message.
// Sent at once through the SMS queue and charged to the SMS balance.
export function DueSms() {
  const scope = useFeeScope()
  const { institute, year, academicClass, section, param, setParam } = scope
  const user = useCurrentUser()
  const templates = useSmsTemplates().filter(
    (t) => t.instituteId === institute?.id && t.smsType === "Fee Due" && t.status === "Active"
  )
  const invoices = useFeeInvoices()
  const payments = useFeePayments()
  const students = useStudents()
  const balance = useSmsBalance(institute?.id ?? -1)
  const [receivers, setReceivers] = React.useState<SmsReceiver[]>([])
  const [message, setMessage] = React.useState("")
  const [confirming, setConfirming] = React.useState(false)
  const area = React.useRef<HTMLTextAreaElement>(null)
  const upToMonth = /^\d{4}-\d{2}$/.test(param("upto")) ? param("upto") : ""
  const minDue = Number(param("min")) || 0

  const input: DueSmsInput | null =
    institute && year
      ? {
          instituteId: institute.id,
          yearId: year.id,
          classId: academicClass?.id ?? null,
          sectionId: section?.id ?? null,
          upToMonth,
          minDue,
          receivers,
          message,
        }
      : null
  const batch = input && message.trim() ? buildDueSms(input, { invoices, payments, students }) : null
  const rate = institute?.configuration.smsRate ?? 0
  const cost = roundMoney((batch?.parts ?? 0) * rate)

  function send() {
    if (!input || !batch || !institute) return
    try {
      const result = sendDueSms(input, batch.drafts, institute, user.id, user.name)
      toast.success(`${result.sent} SMS sent`, {
        description: result.failed ? `${result.failed} left pending: not enough SMS balance. Use Re-send SMS.` : undefined,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The SMS could not be sent.")
    }
    setConfirming(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Due SMS</CardTitle>
            <CardDescription>Remind guardians of the fees their children owe.</CardDescription>
          </div>
          <span className="text-sm text-muted-foreground">
            SMS balance <strong className="text-foreground tabular-nums">{formatAmount(balance)}</strong>
          </span>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FeeScopeFields scope={scope} />
          <Field>
            <FieldLabel htmlFor="due-sms-upto">Dues billed up to</FieldLabel>
            <Input id="due-sms-upto" type="month" value={upToMonth} onChange={(e) => setParam({ upto: e.target.value })} />
            <FieldDescription>Blank counts every month.</FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="due-sms-min">Minimum due (৳)</FieldLabel>
            <Input
              id="due-sms-min"
              inputMode="numeric"
              placeholder="Any amount"
              value={param("min")}
              onChange={(e) => setParam({ min: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <fieldset className="flex flex-col gap-2 sm:col-span-2">
            <legend className="mb-2 text-sm font-medium">Receivers</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {smsReceivers.map((r) => (
                <Label key={r} className="flex items-center gap-2 font-normal">
                  <Checkbox
                    checked={receivers.includes(r)}
                    onCheckedChange={(on) => setReceivers((list) => (on ? [...list, r] : list.filter((x) => x !== r)))}
                  />
                  {r}
                </Label>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">None ticked: each student&apos;s primary contact.</p>
          </fieldset>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
          <CardDescription>
            Keywords are filled for each student.{" "}
            {!templates.length && (
              <>
                There is no active{" "}
                <Link className="underline" href="/sms/templates">
                  Fee Due template
                </Link>{" "}
                yet.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {templates.length > 0 && (
            <div className="max-w-sm">
              <FilterField
                label="Template"
                value=""
                onChange={(v) => setMessage(templates.find((t) => String(t.id) === v)?.message ?? "")}
                options={templates.map((t) => ({ value: String(t.id), label: t.name }))}
                placeholder="Start from a template"
              />
            </div>
          )}
          <KeywordPicker type="Fee Due" onPick={(k) => setMessage((text) => insertAtCursor(area.current, text, k))} />
          <Field>
            <FieldLabel htmlFor="due-sms-message">Message</FieldLabel>
            <Textarea
              id="due-sms-message"
              ref={area}
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <SmsLengthSummary text={message} className="text-xs text-muted-foreground" />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {batch
                ? `${batch.students} students owe ${formatAmount(batch.total)} · ${batch.drafts.length} numbers · ${batch.parts} SMS · costs about ${formatAmount(cost)}${batch.withoutMobile ? ` · ${batch.withoutMobile} without a valid number` : ""}`
                : "Write the message to see who gets it."}
            </CardDescription>
          </div>
          <Button onClick={() => setConfirming(true)} disabled={!batch?.drafts.length}>
            <SendIcon data-icon="inline-start" />
            Send {batch?.drafts.length || ""} SMS
          </Button>
        </CardHeader>
        {batch && batch.drafts.length > 0 && (
          <CardContent>
            <div className="max-h-[28rem] overflow-auto rounded-lg border">
              <Table>
                <TableHeader className="sticky top-0 bg-muted">
                  <TableRow>
                    <TableHead>Roll</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Due</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Message</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batch.drafts.map((d, i) => (
                    <TableRow key={`${d.studentId}-${d.mobile}-${i}`}>
                      <TableCell className="tabular-nums">{d.roll}</TableCell>
                      <TableCell className="font-medium">{d.studentName}</TableCell>
                      <TableCell className="text-right tabular-nums">{formatAmount(d.due)}</TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {d.mobile}
                        <span className="block text-muted-foreground">{d.numberType}</span>
                      </TableCell>
                      <TableCell className="max-w-md text-xs">{d.message}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send {batch?.drafts.length} due SMS?</AlertDialogTitle>
            <AlertDialogDescription>
              {batch?.parts} SMS parts cost about {formatAmount(cost)} of the {formatAmount(balance)} balance. Those
              the balance can&apos;t pay for stay pending in Re-send SMS.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={send}>Send</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
