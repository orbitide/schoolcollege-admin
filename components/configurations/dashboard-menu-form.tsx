"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"
import { toast } from "sonner"

import { DashboardMenuButton } from "@/components/configurations/dashboard-menu-button"
import { dashboardMenuIcons } from "@/components/configurations/dashboard-menu-icons"
import { PickField } from "@/components/institutes/academic/class-year-subject-form"
import type { EditableRecord, Errors } from "@/components/institutes/academic/kinds"
import { ColorField } from "@/components/institutes/institute-configuration-form"
import { SelectField } from "@/components/institutes/institute-form"
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
import { dashboardMenuGroupStore, dashboardMenuStore } from "@/lib/academic-store"
import {
  recordStatuses,
  type DashboardMenu,
  type Institute,
  editableStatus,
  type RecordStatus,
} from "@/lib/institutes"

const colorKeys = [
  "fontColor",
  "backgroundColor",
  "borderColor",
  "hoverFontColor",
  "hoverBackgroundColor",
  "hoverBorderColor",
] as const
type ColorKey = (typeof colorKeys)[number]

type Values = Pick<DashboardMenu, "name" | "link" | "icon" | ColorKey> & { groupId: string }

// Legacy DashboardMenu defaults: white text that turns black on hover.
const blank: Values = {
  groupId: "",
  name: "",
  link: "",
  icon: "",
  fontColor: "#ffffff",
  backgroundColor: "",
  borderColor: "",
  hoverFontColor: "#000000",
  hoverBackgroundColor: "",
  hoverBorderColor: "",
}

// An in-app path (/students) or a full http(s) address.
const isLink = (value: string) =>
  /^\/(?!\/)\S*$/.test(value) || (/^https?:\/\//i.test(value) && URL.canParse(value))

const isColor = (value: string) => !value || CSS.supports("color", value)

// Legacy DashboardMenu/CreateEdit: a button of a dashboard menu group — its
// name, link and icon, and its colours at rest and on hover — with a
// preview of both.
export function DashboardMenuForm({
  institute,
  record,
  singular,
  plural,
  listHref,
}: {
  institute: Institute
  record?: EditableRecord
  singular: string
  plural: string
  listHref: string
}) {
  const existing = record as DashboardMenu | undefined
  const router = useRouter()
  const groups = dashboardMenuGroupStore.useList(institute.id)
  const [values, setValues] = React.useState<Values>(() =>
    existing ? { ...existing, groupId: String(existing.groupId) } : blank
  )
  const [status, setStatus] = React.useState<RecordStatus>(editableStatus(existing?.status))
  const [errors, setErrors] = React.useState<Errors>({})
  const lower = singular.toLowerCase()

  function set<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function validate(input: Values) {
    const next: Errors = {}
    if (!input.groupId) next.groupId = "Menu group is required."
    if (!input.name) next.name = "Name is required."
    else if (dashboardMenuStore.isTaken(institute.id, "name", input.name, existing?.id))
      next.name = `Another ${lower} already uses this name.`
    if (!input.link) next.link = "Link is required."
    else if (!isLink(input.link)) next.link = "Enter a path such as /students, or a full http(s) address."
    for (const key of colorKeys) if (!isColor(input[key])) next[key] = "Not a colour."
    return next
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const input: Values = {
      ...values,
      name: values.name.trim(),
      link: values.link.trim(),
      ...Object.fromEntries(colorKeys.map((key) => [key, values[key].trim()])),
    }
    const next = validate(input)
    setErrors(next)
    if (Object.values(next).some(Boolean)) {
      toast.error("Check the highlighted fields.")
      return
    }
    const menu = { ...input, groupId: Number(input.groupId), status }
    if (existing) dashboardMenuStore.update(existing.id, menu)
    else dashboardMenuStore.add({ ...menu, instituteId: institute.id })
    toast.success(`${menu.name} ${existing ? "updated" : "added"}`)
    router.push(listHref)
  }

  function color(key: ColorKey, label: string) {
    return (
      <ColorField
        label={label}
        value={values[key]}
        input={{ id: key, name: key, value: values[key], onChange: (e) => set(key, e.target.value) }}
        onPick={(value) => set(key, value)}
        error={errors[key]}
      />
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4 md:gap-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          {plural}
        </Link>
      </Button>

      <h3 className="text-xl font-semibold tracking-tight">{existing ? `Edit ${lower}` : `Add ${lower}`}</h3>

      <div className="grid gap-4 @4xl/main:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Menu</CardTitle>
              <CardDescription>A button on the dashboard of {institute.name}.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <PickField
                id="groupId"
                label="Menu group"
                value={values.groupId}
                onChange={(value) => set("groupId", value)}
                options={groups
                  .filter((g) => g.status === "Active" || String(g.id) === values.groupId)
                  .map((g) => ({ value: String(g.id), label: g.name }))}
                placeholder={groups.length ? "Select group" : "Add a menu group first"}
                error={errors.groupId}
              />
              <Field data-invalid={!!errors.name}>
                <FieldLabel htmlFor="name">Name</FieldLabel>
                <Input
                  id="name"
                  value={values.name}
                  placeholder="e.g. Manage Students"
                  aria-invalid={!!errors.name}
                  onChange={(e) => set("name", e.target.value)}
                />
                <FieldError>{errors.name}</FieldError>
              </Field>
              <Field data-invalid={!!errors.link} className="sm:col-span-2">
                <FieldLabel htmlFor="link">Link</FieldLabel>
                <Input
                  id="link"
                  value={values.link}
                  placeholder="/students"
                  aria-invalid={!!errors.link}
                  onChange={(e) => set("link", e.target.value)}
                />
                <FieldDescription>A page of this site, or a full address for another site.</FieldDescription>
                <FieldError>{errors.link}</FieldError>
              </Field>
              <PickField
                id="icon"
                label="Icon"
                value={values.icon}
                onChange={(value) => set("icon", value)}
                options={Object.entries(dashboardMenuIcons).map(([value, { label }]) => ({ value, label }))}
                noneLabel="No icon"
              />
              <SelectField
                name="status"
                label="Status"
                options={recordStatuses}
                value={status}
                onChange={setStatus}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Colours</CardTitle>
              <CardDescription>
                Leave a colour blank to use the standard button&apos;s; blank hover colours stay as they are at rest.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {color("fontColor", "Font color")}
              {color("hoverFontColor", "Font color (hover)")}
              {color("backgroundColor", "Background color")}
              {color("hoverBackgroundColor", "Background color (hover)")}
              {color("borderColor", "Border color")}
              {color("hoverBorderColor", "Border color (hover)")}
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit @4xl/main:sticky @4xl/main:top-4">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              {groups.find((g) => String(g.id) === values.groupId)?.name ?? "No group chosen"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {[
              { label: "At rest", hovered: false },
              { label: "On hover", hovered: true },
            ].map(({ label, hovered }) => (
              <div key={label} className="flex flex-col gap-2">
                <span className="text-sm text-muted-foreground">{label}</span>
                <div className="rounded-lg border bg-muted/40 p-4">
                  <DashboardMenuButton
                    menu={{ ...values, name: values.name.trim() }}
                    hovered={hovered}
                    className="max-w-full"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-2">
        <Button type="submit">{existing ? "Save changes" : `Add ${lower}`}</Button>
        <Button asChild type="button" variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
      </div>
    </form>
  )
}
