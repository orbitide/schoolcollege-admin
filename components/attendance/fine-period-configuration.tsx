"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, RotateCcwIcon, SaveIcon, TriangleAlertIcon } from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { permissionCode, useCan } from "@/lib/access"
import {
  defaultFinePeriod,
  finePeriodEndingIn,
  finePeriodGap,
  formatPeriod,
} from "@/lib/attendance-fines"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { defaultConfiguration, type Institute } from "@/lib/institutes"
import { updateInstituteConfiguration } from "@/lib/institutes-store"
import { todayIso } from "@/lib/student-attendance"

// Legacy "Attendance Absent Fine Date Configuration"
// (Configuration/AttendanceAbsentFineDateConfiguration,
// ScMonthlyAttendanceAbsentFineConfiguration): the days of the month a fine
// period runs from and to. It is the institute configuration's
// dayFrom/dayTo, also editable there; this page shows what periods they
// make before saving.
export function FinePeriodConfiguration() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const can = useCan()
  const canPick = institutes.length > 1
  const institute = canPick
    ? institutes.find((i) => String(i.id) === searchParams.get("institute"))
    : institutes[0]

  function pickInstitute(value: string) {
    const params = new URLSearchParams(searchParams)
    if (value) params.set("institute", value)
    else params.delete("institute")
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/attendance/fines">
          <ArrowLeftIcon data-icon="inline-start" />
          Monthly attendance fines
        </Link>
      </Button>

      {canPick && (
        <Card>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FilterField
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={pickInstitute}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          </CardContent>
        </Card>
      )}

      {institute ? (
        <PeriodForm
          // Start over from what is saved when the institute or its saved days change.
          key={`${institute.id}|${institute.configuration.dayFrom}|${institute.configuration.dayTo}`}
          institute={institute}
          canEdit={can(permissionCode("attendance.fine-configuration", "Manage"))}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Select an institute to configure its absent fine period.
          </CardContent>
        </Card>
      )}
    </div>
  )
}

const dayError = (value: string) => {
  const day = Number(value)
  return value && Number.isInteger(day) && day >= 1 && day <= 31
    ? undefined
    : "Enter a day between 1 and 31."
}

function PeriodForm({ institute, canEdit }: { institute: Institute; canEdit: boolean }) {
  const saved = institute.configuration
  const [dayFrom, setDayFrom] = React.useState(String(saved.dayFrom))
  const [dayTo, setDayTo] = React.useState(String(saved.dayTo))
  const [touched, setTouched] = React.useState(false)

  const errors = { dayFrom: dayError(dayFrom), dayTo: dayError(dayTo) }
  const valid = !errors.dayFrom && !errors.dayTo
  const config = valid ? { dayFrom: Number(dayFrom), dayTo: Number(dayTo) } : undefined
  const changed = config ? config.dayFrom !== saved.dayFrom || config.dayTo !== saved.dayTo : true

  function save(event: React.FormEvent) {
    event.preventDefault()
    setTouched(true)
    if (!config) {
      toast.error("Please fix the highlighted fields.")
      return
    }
    updateInstituteConfiguration(institute.id, { ...saved, ...config })
    toast.success("Absent fine date configuration saved", {
      description: `${institute.name}: day ${config.dayFrom} to day ${config.dayTo}.`,
    })
  }

  function useDefault() {
    setDayFrom(String(defaultConfiguration.dayFrom))
    setDayTo(String(defaultConfiguration.dayTo))
  }

  return (
    <div className="grid gap-4 md:gap-6 @4xl/main:grid-cols-2">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Absent Fine Date Configuration</CardTitle>
          <CardDescription>
            The days of the month a fine period runs from and to for {institute.name}. A later
            &ldquo;day from&rdquo; than &ldquo;day to&rdquo; runs into the next month (26 to 25
            is the 26th of one month to the 25th of the next).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={save} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <DayField
                label="Day from"
                value={dayFrom}
                onChange={setDayFrom}
                error={touched || dayFrom ? errors.dayFrom : undefined}
                disabled={!canEdit}
              />
              <DayField
                label="Day to"
                value={dayTo}
                onChange={setDayTo}
                error={touched || dayTo ? errors.dayTo : undefined}
                disabled={!canEdit}
              />
            </div>
            {canEdit ? (
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={!changed}>
                  <SaveIcon data-icon="inline-start" />
                  Save
                </Button>
                <Button type="button" variant="outline" onClick={useDefault}>
                  <RotateCcwIcon data-icon="inline-start" />
                  Use default (26 to 25)
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">You can view this setting but not change it.</p>
            )}
            <p className="text-sm text-muted-foreground">
              Also part of the{" "}
              <Link
                href={`/institutes/${institute.id}/configuration`}
                className="text-primary underline-offset-4 hover:underline"
              >
                institute configuration
              </Link>
              .
            </p>
          </form>
        </CardContent>
      </Card>

      {config && <PeriodPreview config={config} unsaved={changed} />}
    </div>
  )
}

function DayField({
  label,
  value,
  onChange,
  error,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        <span className="text-destructive" aria-hidden>
          *
        </span>
      </FieldLabel>
      <Input
        id={id}
        type="number"
        inputMode="numeric"
        min={1}
        max={31}
        value={value}
        disabled={disabled}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldDescription>Day of the month, 1–31. Shorter months use their last day.</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

// The periods the days make around today, marking the one the fine form
// opens on (the latest ended) and the one running now.
function PeriodPreview({
  config,
  unsaved,
}: {
  config: { dayFrom: number; dayTo: number }
  unsaved: boolean
}) {
  const today = todayIso()
  const fallback = defaultFinePeriod(config, today)
  const [year, month] = today.split("-").map(Number)
  const periods = [-3, -2, -1, 0, 1].map((offset) => finePeriodEndingIn(config, year, month - 1 + offset))
  const gap = finePeriodGap(config)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>Fine periods</CardTitle>
        <CardDescription>
          {unsaved ? "With these days (not saved yet), " : "With the saved days, "}periods run:
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {gap !== 0 && (
          <div className="flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-300">
            <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
            <span>
              {gap > 0
                ? `Periods don't follow on: up to ${gap} day${gap === 1 ? "" : "s"} between them are never fined.`
                : `Periods overlap: up to ${-gap} day${gap === -1 ? "" : "s"} fall in two periods.`}{" "}
              Set &ldquo;day from&rdquo; to the day after &ldquo;day to&rdquo; to cover every day.
            </span>
          </div>
        )}
        <ul className="divide-y rounded-md border">
          {periods.map((p) => {
            const isDefault = p.dateFrom === fallback.dateFrom && p.dateTo === fallback.dateTo
            const running = p.dateFrom <= today && today <= p.dateTo
            return (
              <li key={p.dateFrom} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="tabular-nums">{formatPeriod(p.dateFrom, p.dateTo)}</span>
                {isDefault ? (
                  <Badge variant="outline" className="border-primary/40 text-primary">
                    Fine form opens on this
                  </Badge>
                ) : running ? (
                  <Badge variant="outline">Running now</Badge>
                ) : p.dateFrom > today ? (
                  <span className="text-xs text-muted-foreground">Upcoming</span>
                ) : null}
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
