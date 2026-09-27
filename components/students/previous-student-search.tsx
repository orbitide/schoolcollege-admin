"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, ArrowRightLeftIcon, EyeIcon, SearchIcon } from "lucide-react"

import {
  classRollLabel,
  initials,
  studentIdLabel,
  useStudentLookups,
} from "@/components/students/student-lookups"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { branchStore, classStore, yearStore } from "@/lib/academic-store"
import { academicMediums, academicVersions, type Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { findPreviousStudent, useStudents } from "@/lib/students"

const ANY = "__any"

// Legacy "Add Previous Student": find a student already enrolled in an
// earlier class/year by roll (or ID), check it is the right one, then
// transfer them into a new class and year.
export function PreviousStudentSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useInstitutes()
  // Re-run the lookup when students change.
  useStudents()

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = institutes.find((i) => String(i.id) === param("institute"))

  // The form edits a draft; Search writes it to the URL, which drives the result.
  const [draft, setDraft] = React.useState(() => ({
    institute: param("institute"),
    class: param("class"),
    year: param("year"),
    medium: param("medium"),
    branch: param("branch"),
    version: param("version"),
    roll: param("roll"),
  }))
  const draftInstitute = institutes.find((i) => String(i.id) === draft.institute)
  const classes = classStore.useList(draftInstitute?.id ?? -1)
  const years = yearStore.useList(draftInstitute?.id ?? -1)
  const branches = branchStore.useList(draftInstitute?.id ?? -1)
  const byRoll = draftInstitute?.showClassRoll ?? true
  const year = draft.year || String(years.find((y) => y.isCurrent)?.id ?? "")

  function set(key: keyof typeof draft, value: string) {
    setDraft((current) =>
      key === "institute"
        ? { institute: value, class: "", year: "", medium: "", branch: "", version: "", roll: "" }
        : { ...current, [key]: value }
    )
  }

  function search(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries({ ...draft, year })) {
      if (value.trim()) params.set(key, value.trim())
    }
    router.push(`${pathname}?${params}`)
  }

  const searched = Boolean(institute && param("class") && param("year") && param("roll").trim())
  const found = searched
    ? findPreviousStudent({
        instituteId: institute!.id,
        classId: Number(param("class")),
        yearId: Number(param("year")),
        rollOrId: param("roll"),
        byRoll: institute!.showClassRoll,
        medium: param("medium") || undefined,
        branchId: param("branch") ? Number(param("branch")) : null,
        version: param("version") || undefined,
      })
    : undefined

  const ready = Boolean(draftInstitute && draft.class && year && draft.roll.trim())

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={institute ? `/students?institute=${institute.id}` : "/students"}>
          <ArrowLeftIcon data-icon="inline-start" />
          Students
        </Link>
      </Button>
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Add Previous Student</h2>
        <p className="text-sm text-muted-foreground">
          Find a student from an earlier class or year, then transfer them into their new class.
        </p>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={search} className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Pick
              label="Institute"
              value={draft.institute}
              onChange={(value) => set("institute", value)}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
            {draftInstitute?.enableBranch && (
              <Pick
                label="Branch"
                value={draft.branch}
                onChange={(value) => set("branch", value)}
                options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
                anyLabel="Any branch"
              />
            )}
            {draftInstitute?.enableMedium && (
              <Pick
                label="Medium"
                value={draft.medium}
                onChange={(value) => set("medium", value)}
                options={academicMediums.map((m) => ({ value: m, label: m }))}
                anyLabel="Any medium"
              />
            )}
            <Pick
              label="Class"
              value={draft.class}
              onChange={(value) => set("class", value)}
              options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
              placeholder={draftInstitute ? "Select class" : "Pick an institute first"}
              disabled={!draftInstitute}
            />
            <Pick
              label="Academic year"
              value={year}
              onChange={(value) => set("year", value)}
              options={years.map((y) => ({
                value: String(y.id),
                label: y.isCurrent ? `${y.name} (current)` : y.name,
              }))}
              placeholder="Select year"
              disabled={!draftInstitute}
            />
            {draftInstitute?.enableVersion && (
              <Pick
                label="Version"
                value={draft.version}
                onChange={(value) => set("version", value)}
                options={academicVersions.map((v) => ({ value: v, label: v }))}
                anyLabel="Any version"
              />
            )}
            <Field>
              <FieldLabel htmlFor="rollOrId">
                {byRoll ? classRollLabel(draftInstitute) : studentIdLabel(draftInstitute)}
              </FieldLabel>
              <Input
                id="rollOrId"
                value={draft.roll}
                inputMode="numeric"
                placeholder={`Enter ${(byRoll ? classRollLabel(draftInstitute) : studentIdLabel(draftInstitute)).toLowerCase()}`}
                onChange={(event) => set("roll", event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={!ready}>
              <SearchIcon data-icon="inline-start" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {searched && !found && (
        <Card>
          <CardHeader>
            <CardTitle>No student found</CardTitle>
            <CardDescription>
              Nobody in that class and year has this{" "}
              {(institute!.showClassRoll ? classRollLabel(institute) : studentIdLabel(institute)).toLowerCase()}.
              Check the class, year and number, or{" "}
              <Link
                href={`/students/new?institute=${institute!.id}`}
                className="text-foreground underline underline-offset-4"
              >
                add a new student
              </Link>
              .
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      {found && institute && (
        <FoundStudent
          institute={institute}
          studentId={found.student.id}
          enrolmentYear={found.enrolment.yearId}
          returnTo={`${pathname}?${searchParams}`}
        />
      )}
    </div>
  )
}

function FoundStudent({
  institute,
  studentId,
  enrolmentYear,
  returnTo,
}: {
  institute: Institute
  studentId: number
  enrolmentYear: number
  returnTo: string
}) {
  const name = useStudentLookups()
  const student = useStudents().find((s) => s.id === studentId)
  const enrolment = student?.enrolments.find((e) => e.yearId === enrolmentYear)
  if (!student || !enrolment) return null

  const studentRows: [string, string][] = [
    [studentIdLabel(institute), String(student.studentIdentificationNo)],
    ["Full name", student.name],
    ["Father's name", student.fatherName || "—"],
    ["Mother's name", student.motherName || "—"],
    ["Guardian's name", student.guardianName || "—"],
    ["Guardian's relation", student.guardianRelation || "—"],
    ["Gender", student.gender],
    ["Date of birth", student.dateOfBirth || "—"],
    ["District", name("district", student.districtId)],
    ["Primary mobile", student.primaryMobile || "—"],
    ["Guardian's mobile", student.guardianMobile || "—"],
    ["Father's mobile", student.fatherMobile || "—"],
    ["Mother's mobile", student.motherMobile || "—"],
    ["Blood group", student.bloodGroup || "—"],
    ["Religion", student.religion || "—"],
    ["Guardian's address", student.guardianAddress || "—"],
  ]
  const academicRows: [string, string][] = [
    ["Institute", institute.name],
    ...(institute.enableBranch ? [["Branch", name("branch", enrolment.branchId)] as [string, string]] : []),
    ...(institute.enableMedium ? [["Medium", enrolment.medium || "—"] as [string, string]] : []),
    ["Class", name("class", enrolment.classId)],
    ...(institute.enableGroup ? [["Group", name("group", enrolment.groupId)] as [string, string]] : []),
    ["Academic year", name("year", enrolment.yearId)],
    ...(institute.enableVersion ? [["Version", enrolment.version || "—"] as [string, string]] : []),
    ...(enrolment.sessionId != null ? [["Session", name("session", enrolment.sessionId)] as [string, string]] : []),
    ...(institute.enableShift ? [["Shift", name("shift", enrolment.shiftId)] as [string, string]] : []),
    ["Section", name("section", enrolment.sectionId)],
    [classRollLabel(institute), enrolment.classRoll || "—"],
    ["Student type", enrolment.studentType],
    ...(institute.enableStudentCategory ? [["Category", name("category", student.categoryId)] as [string, string]] : []),
    ...(institute.enableStudentHouse ? [["House", name("house", enrolment.houseId)] as [string, string]] : []),
  ]

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-14">
            {student.imageUrl && <AvatarImage src={student.imageUrl} alt={student.name} />}
            <AvatarFallback>{initials(student.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-lg font-semibold">{student.name}</span>
              <StatusBadge status={student.status} />
            </div>
            <span className="text-sm text-muted-foreground">
              {name("class", enrolment.classId)}, Section {name("section", enrolment.sectionId)} ·{" "}
              {name("year", enrolment.yearId)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href={`/students/${student.id}`}>
                <EyeIcon data-icon="inline-start" />
                View profile
              </Link>
            </Button>
            <Button asChild>
              <Link
                href={`/students/${student.id}/transfer?fromYear=${enrolment.yearId}&returnTo=${encodeURIComponent(returnTo)}`}
              >
                <ArrowRightLeftIcon data-icon="inline-start" />
                Transfer
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 @4xl/main:grid-cols-2">
        <Details title="Student information" rows={studentRows} />
        <Details title="Academic information" rows={academicRows} />
      </div>
    </div>
  )
}

function Details({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

function Pick({
  label,
  value,
  onChange,
  options,
  placeholder,
  anyLabel,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  // Offers a blank "any" choice with this label.
  anyLabel?: string
  disabled?: boolean
}) {
  const id = `previous-${label.toLowerCase().replace(/\W+/g, "-")}`
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Select
        value={value === "" && anyLabel ? ANY : value}
        onValueChange={(next) => onChange(next === ANY ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {anyLabel && <SelectItem value={ANY}>{anyLabel}</SelectItem>}
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </Field>
  )
}
