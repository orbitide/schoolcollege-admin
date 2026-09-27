"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, ImageIcon, XIcon } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  billingCycles,
  defaultConfiguration,
  defaultSettings,
  instituteTypes,
  managers,
  plans,
  statuses,
  weekDays,
  type InstituteInput,
  type WeekDay,
} from "@/lib/institutes"
import {
  addInstitute,
  updateInstitute,
  useInstitute,
  useInstitutes,
} from "@/lib/institutes-store"

type Errors = Partial<Record<keyof InstituteInput, string>>
type BooleanKey<T> = {
  [K in keyof T]: T[K] extends boolean ? K : never
}[keyof T]

const IMAGE_TYPES = ["image/jpeg", "image/png"]

const emptyInstitute: InstituteInput = {
  ...defaultSettings,
  name: "",
  shortName: "",
  eiin: "",
  type: "School",
  subdomain: "",
  plan: "Basic",
  status: "Trial",
  billingCycle: "Monthly",
  students: 0,
  teachers: 0,
  manager: "Unassigned",
  principal: "",
  email: "",
  otherEmails: "",
  phone: "",
  city: "",
  address: "",
  logoUrl: "",
  principalSignatureUrl: "",
  configuration: defaultConfiguration,
}

export function InstituteForm({ id }: { id?: number }) {
  const institute = useInstitute(id ?? -1)

  if (id !== undefined && !institute) {
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

  return <InstituteFormBody key={id ?? "new"} id={id} initial={institute} />
}

function InstituteFormBody({
  id,
  initial,
}: {
  id?: number
  initial?: InstituteInput
}) {
  const router = useRouter()
  const institutes = useInstitutes()
  const [values, setValues] = React.useState<InstituteInput>(() =>
    initial ? { ...emptyInstitute, ...initial } : emptyInstitute
  )
  const [errors, setErrors] = React.useState<Errors>({})
  const isEdit = id !== undefined
  const backHref = isEdit ? `/institutes/${id}` : "/institutes"

  function set<K extends keyof InstituteInput>(
    key: K,
    value: InstituteInput[K]
  ) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function text(key: keyof InstituteInput) {
    return {
      id: key,
      name: key,
      value: String(values[key] ?? ""),
      "aria-invalid": !!errors[key],
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
      ) => set(key, event.target.value as never),
    }
  }

  function toggleWeekend(day: WeekDay, checked: boolean) {
    set(
      "weekend",
      checked
        ? weekDays.filter((d) => d === day || values.weekend.includes(d))
        : values.weekend.filter((d) => d !== day)
    )
  }

  function handleImage(
    key: "logoUrl" | "principalSignatureUrl",
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (!file) return
    if (!IMAGE_TYPES.includes(file.type)) {
      setErrors((current) => ({
        ...current,
        [key]: "Only .jpg, .jpeg and .png images are accepted.",
      }))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      set(key, String(reader.result))
      setErrors((current) => ({ ...current, [key]: undefined }))
    }
    reader.readAsDataURL(file)
  }

  function validate(input: InstituteInput) {
    const next: Errors = {}
    if (!input.name) next.name = "Institute name is required."
    if (!input.shortName) next.shortName = "Short name is required."
    if (!input.eiin) next.eiin = "EIIN is required."
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(input.subdomain)) {
      next.subdomain = "Use lowercase letters, numbers and single hyphens only."
    } else if (
      institutes.some((i) => i.subdomain === input.subdomain && i.id !== id)
    ) {
      next.subdomain = "This subdomain is already taken."
    }
    if (!/^\S+@\S+\.\S+$/.test(input.email)) {
      next.email = "Enter a valid email address."
    }
    const invalidOther = input.otherEmails
      .split(",")
      .map((email) => email.trim())
      .filter(Boolean)
      .find((email) => !/^\S+@\S+\.\S+$/.test(email))
    if (invalidOther) next.otherEmails = `"${invalidOther}" is not a valid email.`
    if (!input.principal) next.principal = "Principal name is required."
    if (input.weekend.includes(input.startDayOfWeek)) {
      next.startDayOfWeek = "Start day of week can not be a weekend."
    }
    if (input.enableAutoIncrementStudentId) {
      const start = input.autoIncrementStudentIdStartFrom
      if (start === null) {
        next.autoIncrementStudentIdStartFrom = "Enter the starting number."
      } else if (!Number.isInteger(start) || start <= 0) {
        next.autoIncrementStudentIdStartFrom = "Enter a whole number above 0."
      }
    }
    return next
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: InstituteInput = {
      ...values,
      name: values.name.trim(),
      shortName: values.shortName.trim(),
      eiin: values.eiin.trim(),
      subdomain: values.subdomain.trim().toLowerCase(),
      principal: values.principal.trim(),
      email: values.email.trim(),
      otherEmails: values.otherEmails.trim(),
      phone: values.phone.trim(),
      city: values.city.trim(),
      address: values.address.trim(),
      studentHouseLabel: values.studentHouseLabel.trim(),
      studentCategoryLabel: values.studentCategoryLabel.trim(),
      studentIdLabel: values.studentIdLabel.trim(),
      classRollLabel: values.classRollLabel.trim(),
    }

    const nextErrors = validate(input)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields.")
      return
    }

    if (id !== undefined) {
      updateInstitute(id, input)
      toast.success(`${input.name} updated`)
      router.push(`/institutes/${id}`)
    } else {
      const created = addInstitute(input)
      toast.success(`${input.name} created`)
      router.push(`/institutes/${created.id}`)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "flex flex-col gap-4 md:gap-6",
        // Editing renders inside the institute layout, which adds its own padding and header.
        !isEdit && "px-4 py-4 md:py-6 lg:px-6"
      )}
    >
      {!isEdit && (
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={backHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Institutes
          </Link>
        </Button>
      )}

      <div>
        {isEdit ? (
          <h3 className="text-xl font-semibold tracking-tight">
            Edit institute
          </h3>
        ) : (
          <h2 className="text-2xl font-semibold tracking-tight">
            Add institute
          </h2>
        )}
        <p className="text-sm text-muted-foreground">
          {isEdit
            ? "Update the institute's profile, academic settings and subscription."
            : "Register a new tenant institute on the platform."}
        </p>
      </div>

      <div className="grid gap-4 @4xl/main:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Basic information</CardTitle>
            <CardDescription>How the institute is identified</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.name} className="sm:col-span-2">
              <FieldLabel htmlFor="name">Institute name</FieldLabel>
              <Input {...text("name")} />
              <FieldError>{errors.name}</FieldError>
            </Field>
            <Field data-invalid={!!errors.shortName}>
              <FieldLabel htmlFor="shortName">Short name</FieldLabel>
              <Input {...text("shortName")} />
              <FieldError>{errors.shortName}</FieldError>
            </Field>
            <Field data-invalid={!!errors.eiin}>
              <FieldLabel htmlFor="eiin">EIIN</FieldLabel>
              <Input {...text("eiin")} />
              <FieldError>{errors.eiin}</FieldError>
            </Field>
            <SelectField
              name="type"
              label="Institute type"
              options={instituteTypes}
              value={values.type}
              onChange={(value) => set("type", value)}
            />
            <Field data-invalid={!!errors.subdomain}>
              <FieldLabel htmlFor="subdomain">Subdomain</FieldLabel>
              <div className="flex items-center gap-2">
                <Input {...text("subdomain")} />
                <span className="text-sm text-muted-foreground">.sms.app</span>
              </div>
              <FieldError>{errors.subdomain}</FieldError>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Primary contact and location</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field data-invalid={!!errors.principal}>
              <FieldLabel htmlFor="principal">Principal / Head</FieldLabel>
              <Input {...text("principal")} />
              <FieldError>{errors.principal}</FieldError>
            </Field>
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">Primary email</FieldLabel>
              <Input type="email" {...text("email")} />
              <FieldError>{errors.email}</FieldError>
            </Field>
            <Field data-invalid={!!errors.otherEmails} className="sm:col-span-2">
              <FieldLabel htmlFor="otherEmails">Other emails</FieldLabel>
              <Input {...text("otherEmails")} />
              <FieldDescription>Separate multiple emails with commas.</FieldDescription>
              <FieldError>{errors.otherEmails}</FieldError>
            </Field>
            <Field>
              <FieldLabel htmlFor="phone">Phone</FieldLabel>
              <Input {...text("phone")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="city">City</FieldLabel>
              <Input {...text("city")} />
            </Field>
            <Field className="sm:col-span-2">
              <FieldLabel htmlFor="address">Address</FieldLabel>
              <Textarea rows={2} {...text("address")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Branding</CardTitle>
            <CardDescription>Used on reports, ID cards and certificates</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <ImageField
              name="logoUrl"
              label="Report logo"
              value={values.logoUrl}
              error={errors.logoUrl}
              onChange={(event) => handleImage("logoUrl", event)}
              onClear={() => set("logoUrl", "")}
            />
            <ImageField
              name="principalSignatureUrl"
              label="Principal signature"
              value={values.principalSignatureUrl}
              error={errors.principalSignatureUrl}
              onChange={(event) => handleImage("principalSignatureUrl", event)}
              onClear={() => set("principalSignatureUrl", "")}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
            <CardDescription>Working week used for routines and attendance</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <SelectField
              name="startDayOfWeek"
              label="Start day of week"
              options={weekDays}
              value={values.startDayOfWeek}
              error={errors.startDayOfWeek}
              onChange={(value) => set("startDayOfWeek", value)}
            />
            <Field>
              <FieldLabel>Weekend</FieldLabel>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {weekDays.map((day) => (
                  <Field key={day} orientation="horizontal">
                    <Checkbox
                      id={`weekend-${day}`}
                      checked={values.weekend.includes(day)}
                      onCheckedChange={(checked) =>
                        toggleWeekend(day, checked === true)
                      }
                    />
                    <FieldLabel htmlFor={`weekend-${day}`} className="font-normal">
                      {day}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </Field>
          </CardContent>
        </Card>

        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Academic settings</CardTitle>
            <CardDescription>
              Turn on the structures this institute uses
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-6 gap-y-4 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
            <Toggle name="enableBranch" label="Branch" values={values} set={set} />
            <Toggle name="enableShift" label="Shift" values={values} set={set} />
            <Toggle
              name="enableGroup"
              label="Group"
              description="Streams such as Science, Business Studies and Humanities."
              values={values}
              set={set}
            />
            <Toggle name="enableMedium" label="Medium" values={values} set={set} />
            <Toggle name="enableVersion" label="Version" values={values} set={set} />
            <Toggle
              name="enableSectionGender"
              label="Section gender"
              description="Separate sections for boys and girls."
              values={values}
              set={set}
            />
            <Toggle
              name="enableStudentHouse"
              label="Student house"
              values={values}
              set={set}
            >
              <Input
                {...text("studentHouseLabel")}
                placeholder="Label, e.g. House"
                aria-label="Student house label"
              />
            </Toggle>
            <Toggle
              name="enableStudentCategory"
              label="Student category"
              values={values}
              set={set}
            >
              <Input
                {...text("studentCategoryLabel")}
                placeholder="Label, e.g. Category"
                aria-label="Student category label"
              />
            </Toggle>
            <Toggle
              name="showClassRoll"
              label="Show class roll"
              values={values}
              set={set}
            >
              <Input
                {...text("classRollLabel")}
                placeholder="Label, e.g. Roll No"
                aria-label="Class roll label"
              />
            </Toggle>
            <Toggle
              name="enableAutoIncrementStudentId"
              label="Auto-increment student ID"
              values={values}
              set={set}
            >
              <Field data-invalid={!!errors.autoIncrementStudentIdStartFrom}>
                <Input
                  id="autoIncrementStudentIdStartFrom"
                  type="number"
                  min={1}
                  placeholder="Start from, e.g. 1001"
                  aria-label="Student ID start from"
                  aria-invalid={!!errors.autoIncrementStudentIdStartFrom}
                  value={values.autoIncrementStudentIdStartFrom ?? ""}
                  onChange={(event) =>
                    set(
                      "autoIncrementStudentIdStartFrom",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                />
                <FieldError>{errors.autoIncrementStudentIdStartFrom}</FieldError>
              </Field>
              <Input
                {...text("studentIdLabel")}
                placeholder="Label, e.g. Student ID"
                aria-label="Student ID label"
              />
            </Toggle>
          </CardContent>
        </Card>

        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Plan, billing and account ownership</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <SelectField
              name="plan"
              label="Plan"
              options={plans}
              value={values.plan}
              onChange={(value) => set("plan", value)}
            />
            <SelectField
              name="billingCycle"
              label="Billing cycle"
              options={billingCycles}
              value={values.billingCycle}
              onChange={(value) => set("billingCycle", value)}
            />
            <SelectField
              name="status"
              label="Status"
              options={statuses}
              value={values.status}
              onChange={(value) => set("status", value)}
            />
            <Field>
              <FieldLabel htmlFor="students">Students</FieldLabel>
              <Input
                id="students"
                type="number"
                min={0}
                value={values.students}
                onChange={(event) =>
                  set("students", Number(event.target.value) || 0)
                }
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="teachers">Teachers</FieldLabel>
              <Input
                id="teachers"
                type="number"
                min={0}
                value={values.teachers}
                onChange={(event) =>
                  set("teachers", Number(event.target.value) || 0)
                }
              />
            </Field>
            <SelectField
              name="manager"
              label="Account manager"
              options={["Unassigned", ...managers]}
              value={values.manager}
              onChange={(value) => set("manager", value)}
            />
          </CardContent>
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={backHref}>Cancel</Link>
        </Button>
        <Button type="submit">
          {isEdit ? "Save changes" : "Create institute"}
        </Button>
      </div>
    </form>
  )
}

export function Toggle<T>({
  name,
  label,
  description,
  values,
  set,
  children,
}: {
  name: BooleanKey<T> & string
  label: string
  description?: string
  values: T
  set: (key: BooleanKey<T> & string, value: boolean) => void
  children?: React.ReactNode
}) {
  const checked = values[name] as boolean

  return (
    <div className="flex flex-col gap-2">
      <Field orientation="horizontal">
        <Checkbox
          id={name}
          checked={checked}
          onCheckedChange={(value) => set(name, value === true)}
        />
        <FieldContent>
          <FieldLabel htmlFor={name}>{label}</FieldLabel>
          {description && <FieldDescription>{description}</FieldDescription>}
        </FieldContent>
      </Field>
      {checked && children && (
        <div className="flex flex-col gap-2 pl-6">{children}</div>
      )}
    </div>
  )
}

function ImageField({
  name,
  label,
  value,
  error,
  onChange,
  onClear,
}: {
  name: string
  label: string
  value: string
  error?: string
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  onClear: () => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <div className="flex items-center gap-3">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted text-muted-foreground">
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value} alt={label} className="size-full object-contain" />
          ) : (
            <ImageIcon className="size-5" />
          )}
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Input
            id={name}
            type="file"
            accept=".jpg,.jpeg,.png"
            aria-invalid={!!error}
            onChange={onChange}
          />
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 shrink-0"
              onClick={onClear}
            >
              <XIcon />
              <span className="sr-only">Remove {label}</span>
            </Button>
          )}
        </div>
      </div>
      <FieldError>{error}</FieldError>
    </Field>
  )
}

export function SelectField<T extends string>({
  name,
  label,
  options,
  value,
  error,
  onChange,
}: {
  name: string
  label: string
  options: readonly T[]
  value: T
  error?: string
  onChange: (value: T) => void
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select value={value} onValueChange={(next) => onChange(next as T)}>
        <SelectTrigger id={name} className="w-full" aria-invalid={!!error}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      <FieldError>{error}</FieldError>
    </Field>
  )
}
