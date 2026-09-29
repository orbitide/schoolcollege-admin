"use client"

import * as React from "react"
import Link from "next/link"
import { CheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  billingSettingsErrors,
  formatTaka,
  monthlyCharge,
  perStudentRate,
  updateBillingSettings,
  useBillingSettings,
  type BillingSettingsInput,
} from "@/lib/billing"
import { useCurrentUser } from "@/lib/current-user"
import { useBillOf } from "@/lib/institute-billing"
import { useInstitutes } from "@/lib/institutes-store"
import { useSubscriptions } from "@/lib/subscriptions"

type Draft = Record<keyof BillingSettingsInput, string>

const toDraft = (s: BillingSettingsInput): Draft => ({
  threshold: String(s.threshold),
  lowerRate: String(s.lowerRate),
  upperRate: String(s.upperRate),
  trialDays: String(s.trialDays),
  invoiceDueDays: String(s.invoiceDueDays),
})

const fromDraft = (d: Draft): BillingSettingsInput => ({
  threshold: Number(d.threshold),
  lowerRate: Number(d.lowerRate),
  upperRate: Number(d.upperRate),
  trialDays: Number(d.trialDays),
  invoiceDueDays: Number(d.invoiceDueDays),
})

const features = [
  "Every module: students, attendance, exams, results, SMS, reports",
  "No limit on students, teachers or branches",
  "Invoiced monthly for active students at the month's end",
]

// The platform's single plan and its default per-student rates, a
// calculator, and the institutes that have rates of their own.
export function PricingPage() {
  const settings = useBillingSettings()

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Pricing</h2>
        <p className="text-sm text-muted-foreground">
          One plan with every feature, charged per active student each month.
        </p>
      </div>
      <div className="grid gap-4 md:gap-6 @4xl/main:grid-cols-3">
        <div className="@4xl/main:col-span-2">
          <SettingsForm key={settings.modifiedAt} />
        </div>
        <Calculator />
      </div>
      <CustomRates />
    </div>
  )
}

function SettingsForm() {
  const settings = useBillingSettings()
  const user = useCurrentUser()
  const [draft, setDraft] = React.useState(() => toDraft(settings))
  const [errors, setErrors] = React.useState<ReturnType<typeof billingSettingsErrors>>({})
  const changed = JSON.stringify(draft) !== JSON.stringify(toDraft(settings))
  const set = (key: keyof Draft) => (value: string) => setDraft((d) => ({ ...d, [key]: value }))

  function save(event: React.FormEvent) {
    event.preventDefault()
    const input = fromDraft(draft)
    const found = billingSettingsErrors(input)
    setErrors(found)
    if (Object.keys(found).length) {
      toast.error("Check the highlighted fields.")
      return
    }
    updateBillingSettings(input, user.name)
    toast.success("Pricing saved. New invoices use these rates.")
  }

  const threshold = Number(draft.threshold) || settings.threshold

  return (
    <form onSubmit={save}>
      <Card className="h-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            All features plan <Badge variant="secondary">Only plan</Badge>
          </CardTitle>
          <CardDescription>
            The whole student count is charged one rate: below {threshold.toLocaleString()} students every
            student pays the lower rate, at {threshold.toLocaleString()} or more every student pays the upper
            rate. Institutes with custom rates keep theirs.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <ul className="grid gap-1.5 text-sm">
            {features.map((f) => (
              <li key={f} className="flex items-start gap-2">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-green-600 dark:text-green-400" />
                {f}
              </li>
            ))}
          </ul>
          <div className="grid gap-4 sm:grid-cols-3">
            <NumberField
              id="lowerRate"
              label="Lower rate (৳ / student)"
              description={`Under ${threshold.toLocaleString()} students`}
              value={draft.lowerRate}
              onChange={set("lowerRate")}
              error={errors.lowerRate}
              step="0.01"
            />
            <NumberField
              id="upperRate"
              label="Upper rate (৳ / student)"
              description={`${threshold.toLocaleString()} students or more`}
              value={draft.upperRate}
              onChange={set("upperRate")}
              error={errors.upperRate}
              step="0.01"
            />
            <NumberField
              id="threshold"
              label="Threshold (students)"
              description="Where the upper rate starts"
              value={draft.threshold}
              onChange={set("threshold")}
              error={errors.threshold}
            />
            <NumberField
              id="trialDays"
              label="Trial length (days)"
              description="For institutes that join on trial"
              value={draft.trialDays}
              onChange={set("trialDays")}
              error={errors.trialDays}
            />
            <NumberField
              id="invoiceDueDays"
              label="Invoice due after (days)"
              description="Counted from the issue date"
              value={draft.invoiceDueDays}
              onChange={set("invoiceDueDays")}
              error={errors.invoiceDueDays}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-wrap items-center justify-between gap-2 border-t">
          <p className="text-xs text-muted-foreground">
            Last changed by {settings.modifiedBy} on {new Date(settings.modifiedAt).toLocaleDateString()}
          </p>
          <div className="flex gap-2">
            <Button type="button" variant="outline" disabled={!changed} onClick={() => setDraft(toDraft(settings))}>
              Reset
            </Button>
            <Button type="submit" disabled={!changed}>
              Save pricing
            </Button>
          </div>
        </CardFooter>
      </Card>
    </form>
  )
}

function NumberField({
  id,
  label,
  description,
  value,
  onChange,
  error,
  step,
}: {
  id: string
  label: string
  description?: string
  value: string
  onChange: (value: string) => void
  error?: string
  step?: string
}) {
  return (
    <Field data-invalid={!!error || undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        id={id}
        type="number"
        min={0}
        step={step}
        inputMode="decimal"
        value={value}
        aria-invalid={!!error || undefined}
        onChange={(e) => onChange(e.target.value)}
      />
      {description && !error && <FieldDescription>{description}</FieldDescription>}
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// What an institute of a given size pays at the default rates.
function Calculator() {
  const settings = useBillingSettings()
  const [students, setStudents] = React.useState("850")
  const count = Math.max(0, Math.floor(Number(students) || 0))
  const rate = perStudentRate(count, settings, settings.threshold)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Calculator</CardTitle>
        <CardDescription>A month&apos;s bill at the saved default rates</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Field>
          <FieldLabel htmlFor="calc-students">Active students</FieldLabel>
          <Input
            id="calc-students"
            type="number"
            min={0}
            value={students}
            onChange={(e) => setStudents(e.target.value)}
          />
        </Field>
        <dl className="grid gap-2 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Rate per student</dt>
            <dd className="font-medium tabular-nums">{formatTaka(rate)}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted-foreground">Monthly bill</dt>
            <dd className="text-2xl font-semibold tabular-nums">
              {formatTaka(monthlyCharge(count, settings, settings.threshold))}
            </dd>
          </div>
        </dl>
        <p className="text-xs text-muted-foreground">
          {count < settings.threshold
            ? `${(settings.threshold - count).toLocaleString()} more students would move this institute to ${formatTaka(settings.upperRate)} a student.`
            : `At ${settings.threshold.toLocaleString()}+ students every student is charged ${formatTaka(settings.upperRate)}.`}
        </p>
      </CardContent>
    </Card>
  )
}

function CustomRates() {
  const institutes = useInstitutes()
  const subscriptions = useSubscriptions()
  const billOf = useBillOf()
  const custom = subscriptions.filter((s) => s.customLowerRate != null || s.customUpperRate != null)

  return (
    <Card>
      <CardHeader>
        <CardTitle>Institutes with custom rates</CardTitle>
        <CardDescription>
          Set or clear an institute&apos;s own rates from its subscription.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Institute</TableHead>
                <TableHead className="text-right">Lower rate</TableHead>
                <TableHead className="text-right">Upper rate</TableHead>
                <TableHead className="text-right">Active students</TableHead>
                <TableHead className="text-right">This month (est.)</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {custom.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                    Every institute pays the default rates.
                  </TableCell>
                </TableRow>
              ) : (
                custom.map((s) => {
                  const institute = institutes.find((i) => i.id === s.instituteId)
                  if (!institute) return null
                  const bill = billOf(institute)
                  return (
                    <TableRow key={s.id}>
                      <TableCell>
                        <Link href={`/subscriptions/${institute.id}`} className="font-medium hover:underline">
                          {institute.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaka(bill.rates.lowerRate)}
                        {s.customLowerRate == null && <span className="text-muted-foreground"> (default)</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatTaka(bill.rates.upperRate)}
                        {s.customUpperRate == null && <span className="text-muted-foreground"> (default)</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{bill.students.toLocaleString()}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {institute.status === "Active" ? formatTaka(bill.amount) : "—"}
                      </TableCell>
                      <TableCell className="max-w-64 truncate text-muted-foreground">{s.notes || "—"}</TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
