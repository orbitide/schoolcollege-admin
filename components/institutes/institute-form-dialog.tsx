"use client"

import * as React from "react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
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
import {
  billingCycles,
  instituteTypes,
  managers,
  plans,
  statuses,
  type Institute,
  type InstituteInput,
} from "@/lib/institutes"
import {
  addInstitute,
  updateInstitute,
  useInstitutes,
} from "@/lib/institutes-store"

type Errors = Partial<Record<keyof InstituteInput, string>>

const emptyInstitute: InstituteInput = {
  name: "",
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
  phone: "",
  city: "",
  address: "",
}

export function InstituteFormDialog({
  institute,
  open,
  onOpenChange,
}: {
  institute?: Institute
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const institutes = useInstitutes()
  const [errors, setErrors] = React.useState<Errors>({})
  const isEdit = Boolean(institute)
  const initial = institute ?? emptyInstitute

  function handleOpenChange(next: boolean) {
    if (!next) setErrors({})
    onOpenChange(next)
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const text = (key: keyof InstituteInput) =>
      String(form.get(key) ?? "").trim()

    const values = {
      name: text("name"),
      type: text("type"),
      subdomain: text("subdomain").toLowerCase(),
      plan: text("plan"),
      status: text("status"),
      billingCycle: text("billingCycle"),
      students: Number(text("students")) || 0,
      teachers: Number(text("teachers")) || 0,
      manager: text("manager"),
      principal: text("principal"),
      email: text("email"),
      phone: text("phone"),
      city: text("city"),
      address: text("address"),
    } as InstituteInput

    const nextErrors: Errors = {}
    if (!values.name) nextErrors.name = "Institute name is required."
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(values.subdomain)) {
      nextErrors.subdomain =
        "Use lowercase letters, numbers and single hyphens only."
    } else if (
      institutes.some(
        (i) => i.subdomain === values.subdomain && i.id !== institute?.id
      )
    ) {
      nextErrors.subdomain = "This subdomain is already taken."
    }
    if (!/^\S+@\S+\.\S+$/.test(values.email)) {
      nextErrors.email = "Enter a valid email address."
    }
    if (!values.principal) nextErrors.principal = "Principal name is required."

    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    if (institute) {
      updateInstitute(institute.id, values)
      toast.success(`${values.name} updated`)
    } else {
      addInstitute(values)
      toast.success(`${values.name} created`)
    }
    handleOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit institute" : "Add institute"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the institute's profile and subscription."
              : "Register a new tenant institute on the platform."}
          </DialogDescription>
        </DialogHeader>
        <form
          id="institute-form"
          key={institute?.id ?? "new"}
          onSubmit={handleSubmit}
          noValidate
        >
          <FieldGroup className="gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.name} className="sm:col-span-2">
                <FieldLabel htmlFor="name">Institute name</FieldLabel>
                <Input
                  id="name"
                  name="name"
                  defaultValue={initial.name}
                  aria-invalid={!!errors.name}
                />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <SelectField
                name="type"
                label="Institute type"
                options={instituteTypes}
                defaultValue={initial.type}
              />
              <Field data-invalid={!!errors.subdomain}>
                <FieldLabel htmlFor="subdomain">Subdomain</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="subdomain"
                    name="subdomain"
                    defaultValue={initial.subdomain}
                    aria-invalid={!!errors.subdomain}
                  />
                  <span className="text-sm text-muted-foreground">.sms.app</span>
                </div>
                <FieldError>{errors.subdomain}</FieldError>
              </Field>
            </div>

            <FieldSeparator>Contact</FieldSeparator>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.principal}>
                <FieldLabel htmlFor="principal">Principal / Head</FieldLabel>
                <Input
                  id="principal"
                  name="principal"
                  defaultValue={initial.principal}
                  aria-invalid={!!errors.principal}
                />
                <FieldError>{errors.principal}</FieldError>
              </Field>
              <Field data-invalid={!!errors.email}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={initial.email}
                  aria-invalid={!!errors.email}
                />
                <FieldError>{errors.email}</FieldError>
              </Field>
              <Field>
                <FieldLabel htmlFor="phone">Phone</FieldLabel>
                <Input id="phone" name="phone" defaultValue={initial.phone} />
              </Field>
              <Field>
                <FieldLabel htmlFor="city">City</FieldLabel>
                <Input id="city" name="city" defaultValue={initial.city} />
              </Field>
              <Field className="sm:col-span-2">
                <FieldLabel htmlFor="address">Address</FieldLabel>
                <Input
                  id="address"
                  name="address"
                  defaultValue={initial.address}
                />
              </Field>
            </div>

            <FieldSeparator>Subscription</FieldSeparator>
            <div className="grid gap-4 sm:grid-cols-3">
              <SelectField
                name="plan"
                label="Plan"
                options={plans}
                defaultValue={initial.plan}
              />
              <SelectField
                name="billingCycle"
                label="Billing cycle"
                options={billingCycles}
                defaultValue={initial.billingCycle}
              />
              <SelectField
                name="status"
                label="Status"
                options={statuses}
                defaultValue={initial.status}
              />
              <Field>
                <FieldLabel htmlFor="students">Students</FieldLabel>
                <Input
                  id="students"
                  name="students"
                  type="number"
                  min={0}
                  defaultValue={initial.students}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="teachers">Teachers</FieldLabel>
                <Input
                  id="teachers"
                  name="teachers"
                  type="number"
                  min={0}
                  defaultValue={initial.teachers}
                />
              </Field>
              <SelectField
                name="manager"
                label="Account manager"
                options={["Unassigned", ...managers]}
                defaultValue={initial.manager}
              />
            </div>
          </FieldGroup>
        </form>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button type="submit" form="institute-form">
            {isEdit ? "Save changes" : "Create institute"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SelectField({
  name,
  label,
  options,
  defaultValue,
}: {
  name: string
  label: string
  options: readonly string[]
  defaultValue: string
}) {
  return (
    <Field>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} defaultValue={defaultValue}>
        <SelectTrigger id={name} className="w-full">
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
    </Field>
  )
}
