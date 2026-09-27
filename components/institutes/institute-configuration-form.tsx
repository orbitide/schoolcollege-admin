"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { SelectField, Toggle } from "@/components/institutes/institute-form"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  defaultConfiguration,
  roles,
  type Institute,
  type InstituteConfiguration,
} from "@/lib/institutes"
import {
  updateInstituteConfiguration,
  useInstitute,
} from "@/lib/institutes-store"

type Config = InstituteConfiguration
type Errors = Partial<Record<keyof Config, string>>
type NumberKey = {
  [K in keyof Config]: Config[K] extends number ? K : never
}[keyof Config]
type TextKey = {
  [K in keyof Config]: Config[K] extends string ? K : never
}[keyof Config]

export function InstituteConfigurationForm({ id }: { id: number }) {
  const institute = useInstitute(id)

  if (!institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Institute not found</h2>
        <p className="text-sm text-muted-foreground">
          It may have been deleted.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/institutes">Back to institutes</Link>
        </Button>
      </div>
    )
  }

  return <ConfigurationFormBody key={id} id={id} institute={institute} />
}

function ConfigurationFormBody({
  id,
  institute,
}: {
  id: number
  institute: Institute
}) {
  const { name, configuration: initial } = institute
  const router = useRouter()
  const [values, setValues] = React.useState<Config>({
    ...defaultConfiguration,
    ...initial,
  })
  const [errors, setErrors] = React.useState<Errors>({})
  const backHref = `/institutes/${id}`

  function set<K extends keyof Config>(key: K, value: Config[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function text(key: TextKey) {
    return {
      id: key,
      name: key,
      value: values[key],
      "aria-invalid": !!errors[key],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => set(key, event.target.value),
    }
  }

  function number(key: NumberKey, step = "1") {
    return {
      id: key,
      name: key,
      type: "number",
      step,
      min: 0,
      value: Number.isNaN(values[key]) ? "" : values[key],
      "aria-invalid": !!errors[key],
      onChange: (event: React.ChangeEvent<HTMLInputElement>) =>
        set(key, event.target.value === "" ? NaN : Number(event.target.value)),
    }
  }

  function validate(input: Config) {
    const next: Errors = {}
    const isCount = (value: number) => Number.isInteger(value) && value > 0

    if (!(input.maximumGpa > 0)) next.maximumGpa = "Must be greater than 0."
    if (!(input.optionalGpaSubtraction >= 0)) {
      next.optionalGpaSubtraction = "Must be 0 or more."
    } else if (input.optionalGpaSubtraction > input.maximumGpa) {
      next.optionalGpaSubtraction = "Can not exceed the maximum GPA."
    }
    if (!(input.printPageSize >= 0) || !Number.isInteger(input.printPageSize)) {
      next.printPageSize = "Enter a whole number."
    }
    if (input.smsUrl && !URL.canParse(input.smsUrl)) {
      next.smsUrl = "Enter a valid URL."
    }
    if (!(input.smsRate >= 0)) next.smsRate = "Must be 0 or more."
    if (!isCount(input.smsBatchSize)) next.smsBatchSize = "Enter a whole number above 0."
    if (!isCount(input.smsBatchLoadSize)) {
      next.smsBatchLoadSize = "Enter a whole number above 0."
    }
    if (!isCount(input.smsMaxTry)) next.smsMaxTry = "Enter a whole number above 0."
    if (!(input.minImageSize >= 0)) next.minImageSize = "Must be 0 or more."
    if (!(input.maxImageSize > 0)) {
      next.maxImageSize = "Must be greater than 0."
    } else if (input.minImageSize > input.maxImageSize) {
      next.minImageSize = "Can not be larger than the maximum size."
    }
    for (const key of ["dayFrom", "dayTo"] as const) {
      const day = input[key]
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        next[key] = "Enter a day between 1 and 31."
      }
    }
    return next
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: Config = {
      ...values,
      reportLogoWidth: values.reportLogoWidth.trim(),
      smsUrl: values.smsUrl.trim(),
      smsApiKey: values.smsApiKey.trim(),
      smsMask: values.smsMask.trim(),
    }

    const nextErrors = validate(input)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields.")
      return
    }

    updateInstituteConfiguration(id, input)
    toast.success(`${name} configuration saved`)
    router.push(backHref)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight">
            Configuration
          </h3>
          <p className="text-sm text-muted-foreground">
            Results, reports, SMS and exam settings for {name}.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setValues(defaultConfiguration)
            setErrors({})
          }}
        >
          Reset to defaults
        </Button>
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
            <CardDescription>GPA calculation</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Maximum GPA"
              error={errors.maximumGpa}
              input={number("maximumGpa", "0.01")}
            />
            <NumberField
              label="Optional subject GPA subtraction"
              error={errors.optionalGpaSubtraction}
              input={number("optionalGpaSubtraction", "0.01")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Student</CardTitle>
            <CardDescription>Promotion and photo upload limits</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Min image size (KB)"
              error={errors.minImageSize}
              input={number("minImageSize", "any")}
            />
            <NumberField
              label="Max image size (KB)"
              error={errors.maxImageSize}
              input={number("maxImageSize", "any")}
            />
            <div className="sm:col-span-2">
              <Toggle
                name="termExamWiseTransfer"
                label="Term exam wise transfer"
                description="Transfer students based on each term exam."
                values={values}
                set={set}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Report</CardTitle>
            <CardDescription>Header and print layout of reports</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field className="sm:col-span-3">
              <FieldLabel htmlFor="reportHeaderStyle">
                Report header style
              </FieldLabel>
              <Input className="font-mono text-xs" {...text("reportHeaderStyle")} />
              <FieldDescription>Inline CSS for the institute name.</FieldDescription>
            </Field>
            <Field className="sm:col-span-3">
              <FieldLabel htmlFor="reportNameStyle">Report name style</FieldLabel>
              <Input className="font-mono text-xs" {...text("reportNameStyle")} />
              <FieldDescription>Inline CSS for the report title.</FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="reportLogoWidth">Logo width</FieldLabel>
              <Input placeholder="70px" {...text("reportLogoWidth")} />
            </Field>
            <ColorField
              label="Highlight color"
              value={values.reportHighlightColor}
              input={text("reportHighlightColor")}
              onPick={(value) => set("reportHighlightColor", value)}
            />
            <NumberField
              label="Print page size"
              error={errors.printPageSize}
              input={number("printPageSize")}
            />
            <div className="flex flex-col gap-2 sm:col-span-3">
              <span className="text-sm font-medium">Preview</span>
              <ReportHeaderPreview institute={institute} config={values} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Admit card</CardTitle>
            <CardDescription>Admit card and attendance sheet</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ColorField
              label="Primary color"
              value={values.admitCardColor1}
              input={text("admitCardColor1")}
              onPick={(value) => set("admitCardColor1", value)}
            />
            <ColorField
              label="Secondary color"
              value={values.admitCardColor2}
              input={text("admitCardColor2")}
              onPick={(value) => set("admitCardColor2", value)}
            />
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="admitCardFooterText">Footer text</FieldLabel>
              <Textarea rows={5} className="font-mono text-xs" {...text("admitCardFooterText")} />
              <FieldDescription>HTML is allowed.</FieldDescription>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>SMS</CardTitle>
            <CardDescription>Gateway used for notifications</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.smsUrl} className="sm:col-span-2">
              <FieldLabel htmlFor="smsUrl">Gateway URL</FieldLabel>
              <Input type="url" {...text("smsUrl")} />
              <FieldError>{errors.smsUrl}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="smsApiKey">API key</FieldLabel>
              <Input type="password" autoComplete="off" {...text("smsApiKey")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="smsMask">Mask / sender ID</FieldLabel>
              <Input {...text("smsMask")} />
            </Field>
            <NumberField
              label="Rate per SMS"
              error={errors.smsRate}
              input={number("smsRate", "0.01")}
            />
            <NumberField
              label="Max tries"
              error={errors.smsMaxTry}
              input={number("smsMaxTry")}
            />
            <NumberField
              label="Batch size"
              error={errors.smsBatchSize}
              input={number("smsBatchSize")}
            />
            <NumberField
              label="Batch load size"
              error={errors.smsBatchLoadSize}
              input={number("smsBatchLoadSize")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exam</CardTitle>
            <CardDescription>Shown on marksheets and tabulation</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <Toggle
              name="examShowAttendance"
              label="Show attendance"
              values={values}
              set={set}
            />
            <Toggle
              name="examShowAssignment"
              label="Show assignment"
              values={values}
              set={set}
            />
            <Toggle
              name="examShowDependent"
              label="Show dependent"
              values={values}
              set={set}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Attendance absent fine</CardTitle>
            <CardDescription>
              Billing period used to calculate absent fines
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <NumberField
              label="Day from"
              error={errors.dayFrom}
              input={{ ...number("dayFrom"), min: 1, max: 31 }}
            />
            <NumberField
              label="Day to"
              error={errors.dayTo}
              input={{ ...number("dayTo"), min: 1, max: 31 }}
            />
          </CardContent>
        </Card>

        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Teacher</CardTitle>
            <CardDescription>Role and account creation for teachers</CardDescription>
          </CardHeader>
          <CardContent className="grid items-end gap-4 sm:grid-cols-2">
            <SelectField
              name="teacherRole"
              label="Teacher role"
              options={roles}
              value={values.teacherRole as (typeof roles)[number]}
              onChange={(value) => set("teacherRole", value)}
            />
            <Toggle
              name="isUserRegistration"
              label="Create user account on teacher registration"
              values={values}
              set={set}
            />
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={backHref}>Cancel</Link>
        </Button>
        <Button type="submit">Save configuration</Button>
      </div>
    </form>
  )
}

// Turn an inline CSS string ("color: red; font-size: 20px") into a React style
// object. Unknown or invalid declarations are simply ignored by the browser.
function parseInlineStyle(css: string): React.CSSProperties {
  const style: Record<string, string> = {}
  for (const declaration of css.split(";")) {
    const index = declaration.indexOf(":")
    if (index === -1) continue
    const property = declaration.slice(0, index).trim().toLowerCase()
    const value = declaration.slice(index + 1).trim()
    if (!/^-?[a-z]+(-[a-z]+)*$/.test(property) || !value) continue
    style[property.replace(/-([a-z])/g, (_, char: string) => char.toUpperCase())] =
      value
  }
  return style
}

// Mock of the printed report header, updated live as the settings change.
function ReportHeaderPreview({
  institute,
  config,
}: {
  institute: Institute
  config: Config
}) {
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const highlight = config.reportHighlightColor.trim()

  return (
    <div className="overflow-x-auto rounded-lg border bg-white p-6 text-black">
      <div className="flex min-w-md items-center gap-4">
        <div style={{ width: logoWidth }} className="shrink-0">
          {institute.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.logoUrl} alt="" className="h-auto w-full" />
          ) : (
            <div className="flex aspect-square w-full items-center justify-center rounded-md border border-dashed border-neutral-300 text-[10px] text-neutral-400">
              Logo
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-col items-center text-center">
          <p style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</p>
          <p className="text-xs text-neutral-600">
            {[institute.address, institute.city].filter(Boolean).join(", ") ||
              "Institute address"}
            {institute.eiin && ` · EIIN: ${institute.eiin}`}
          </p>
          <p style={parseInlineStyle(config.reportNameStyle)}>Progress Report</p>
        </div>
        {/* Balances the logo so the text stays centred, as on the printed report. */}
        <div style={{ width: logoWidth }} className="shrink-0" />
      </div>
      <div
        className="mt-4 h-1 rounded-full"
        style={{ backgroundColor: highlight || "#e5e5e5" }}
      />
    </div>
  )
}

function NumberField({
  label,
  error,
  input,
}: {
  label: string
  error?: string
  input: React.ComponentProps<typeof Input> & { id: string }
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={input.id}>{label}</FieldLabel>
      <Input {...input} />
      <FieldError>{error}</FieldError>
    </Field>
  )
}

function ColorField({
  label,
  value,
  input,
  onPick,
}: {
  label: string
  value: string
  input: React.ComponentProps<typeof Input> & { id: string }
  onPick: (value: string) => void
}) {
  return (
    <Field>
      <FieldLabel htmlFor={input.id}>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`Pick ${label.toLowerCase()}`}
          value={/^#[0-9a-f]{6}$/i.test(value) ? value : "#000000"}
          onChange={(event) => onPick(event.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-1"
        />
        <Input placeholder="#1e3a8a or blank" {...input} />
      </div>
    </Field>
  )
}
