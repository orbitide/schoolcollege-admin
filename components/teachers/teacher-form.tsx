"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  branchStore,
  classStore,
  groupStore,
  sectionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { useAccessibleInstitutes, useCurrentUser } from "@/lib/current-user"
import {
  academicMediums,
  academicVersions,
  sectionGenders,
  type Institute,
} from "@/lib/institutes"
import { MOBILE_ERROR, MOBILE_PATTERN } from "@/lib/students"
import {
  addTeacher,
  isDuplicateTeacherCode,
  isDuplicateTeacherName,
  updateTeacher,
  useTeachers,
  type Teacher,
  type TeacherInput,
  type TeacherSection,
} from "@/lib/teachers"

type Errors = Record<string, string | undefined>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// One "Add Section" row; selects stay strings until submit. Branch, medium,
// version, shift, gender and group only narrow the section list — what is
// saved comes from the section picked.
type SectionRow = {
  key: number
  branchId: string
  medium: string
  classId: string
  version: string
  yearId: string
  shiftId: string
  gender: string
  groupId: string
  sectionId: string
}

const str = (value: number | null | undefined) => (value == null ? "" : String(value))

let nextRowKey = 1

function currentYear(instituteId: number) {
  return str(yearStore.getList(instituteId).find((y) => y.isCurrent && y.status === "Active")?.id)
}

function emptyRow(instituteId: number): SectionRow {
  return {
    key: nextRowKey++,
    branchId: "",
    medium: "",
    classId: "",
    version: "",
    yearId: currentYear(instituteId),
    shiftId: "",
    gender: "",
    groupId: "",
    sectionId: "",
  }
}

function toRow(section: TeacherSection): SectionRow {
  return {
    key: nextRowKey++,
    branchId: str(section.branchId),
    medium: section.medium,
    classId: String(section.classId),
    version: section.version,
    yearId: String(section.yearId),
    shiftId: str(section.shiftId),
    gender: section.gender,
    groupId: str(section.groupId),
    sectionId: String(section.sectionId),
  }
}

// Legacy Teacher Create/Edit: who the teacher is, their login, the subjects
// they teach and the sections they take.
export function TeacherForm({
  teacherId,
  instituteId: defaultInstituteId,
  returnTo,
}: {
  teacherId?: number
  instituteId?: number
  returnTo?: string
}) {
  const teachers = useTeachers()
  const existing = teacherId ? teachers.find((t) => t.id === teacherId) : undefined
  const institutes = useAccessibleInstitutes()
  const listHref = returnTo?.startsWith("/") ? returnTo : "/teachers"

  if (teacherId && (!existing || existing.status === "Deleted")) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Teacher not found</h2>
        <p className="text-sm text-muted-foreground">
          It may have been deleted. Retrieve it from the list to edit it.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to teachers</Link>
        </Button>
      </div>
    )
  }

  const initialInstitute =
    institutes.find((i) => i.id === (existing?.instituteId ?? defaultInstituteId)) ??
    (institutes.length === 1 ? institutes[0] : undefined)

  return (
    <Form
      // Remount when switching between teachers so state starts fresh.
      key={teacherId ?? "new"}
      existing={existing}
      institutes={institutes}
      initialInstitute={initialInstitute}
      listHref={listHref}
    />
  )
}

function Form({
  existing,
  institutes,
  initialInstitute,
  listHref,
}: {
  existing?: Teacher
  institutes: Institute[]
  initialInstitute?: Institute
  listHref: string
}) {
  const router = useRouter()
  const user = useCurrentUser()
  const isNew = !existing

  const [instituteId, setInstituteId] = React.useState(str(initialInstitute?.id))
  const institute = institutes.find((i) => String(i.id) === instituteId)
  const iid = institute?.id ?? -1
  const subjects = subjectStore.useList(iid)

  const [name, setName] = React.useState(existing?.name ?? "")
  const [teacherCode, setTeacherCode] = React.useState(existing?.teacherCode ?? "")
  const [email, setEmail] = React.useState(existing?.email ?? "")
  const [mobile, setMobile] = React.useState(existing?.mobile ?? "")
  const [password, setPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [subjectIds, setSubjectIds] = React.useState<number[]>(existing?.subjectIds ?? [])
  const [rows, setRows] = React.useState<SectionRow[]>(() =>
    existing ? existing.sections.map(toRow) : []
  )
  const [errors, setErrors] = React.useState<Errors>({})

  const config = institute?.configuration
  const subjectOptions = subjects.filter(
    (s) => s.status === "Active" || subjectIds.includes(s.id)
  )

  function changeInstitute(value: string) {
    setInstituteId(value)
    setSubjectIds([])
    setRows([])
  }

  function updateRow(key: number, patch: Partial<SectionRow>) {
    setRows((current) => current.map((row) => (row.key === key ? { ...row, ...patch } : row)))
  }

  function validate() {
    const next: Errors = {}
    if (!institute) next.instituteId = "Institute is required."
    if (!name.trim()) next.name = "Name can not be empty."
    if (!teacherCode.trim()) next.teacherCode = "Teacher code can not be empty."
    if (!email.trim()) next.email = "Email can not be empty."
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = "Enter a valid email address."
    if (!mobile.trim()) next.mobile = "Mobile can not be empty."
    else if (!MOBILE_PATTERN.test(mobile.trim())) next.mobile = MOBILE_ERROR
    if (isNew && !password) next.password = "Password can not be empty."
    else if (password && password.length < 6) next.password = "Use at least 6 characters."
    if ((isNew || password) && password !== confirmPassword) {
      next.confirmPassword = "Password must be matched with confirm password."
    }
    if (institute) {
      if (!next.name && isDuplicateTeacherName(institute.id, name, existing?.id)) {
        next.name = "Duplicate teacher name found."
      }
      if (!next.teacherCode && isDuplicateTeacherCode(institute.id, teacherCode, existing?.id)) {
        next.teacherCode = "Another teacher of this institute has this code."
      }
    }
    rows.forEach((row, index) => {
      const at = (field: string) => `${row.key}.${field}`
      if (institute?.enableMedium && !row.medium) next[at("medium")] = "Choose academic medium."
      if (!row.classId) next[at("classId")] = "Class is required."
      if (!row.yearId) next[at("yearId")] = "Academic year is required."
      if (!row.sectionId) next[at("sectionId")] = "Section is required."
      else if (rows.findIndex((r) => r.sectionId === row.sectionId) !== index) {
        next[at("sectionId")] = "Multiple same section found."
      }
    })
    return next
  }

  function save(andNew: boolean) {
    const next = validate()
    setErrors(next)
    if (Object.values(next).some(Boolean) || !institute) {
      toast.error("Check the highlighted fields.")
      return
    }

    const sectionsById = new Map(sectionStore.getList(institute.id).map((s) => [s.id, s]))
    const classesById = new Map(classStore.getList(institute.id).map((c) => [c.id, c]))
    const input: TeacherInput = {
      instituteId: institute.id,
      name: name.trim(),
      teacherCode: teacherCode.trim(),
      email: email.trim(),
      mobile: mobile.trim(),
      // A login is made on registration when the institute asks for it, or
      // later when a password is first set on an institute that does.
      hasAccount:
        (existing?.hasAccount ?? false) ||
        (Boolean(config?.isUserRegistration) && (isNew || Boolean(password))),
      subjectIds: subjectOptions.map((s) => s.id).filter((id) => subjectIds.includes(id)),
      sections: rows.map((row) => {
        const section = sectionsById.get(Number(row.sectionId))!
        return {
          branchId: section.branchId,
          medium: institute.enableMedium
            ? row.medium || classesById.get(section.classId)?.medium || ""
            : "",
          classId: section.classId,
          version: section.version,
          yearId: Number(row.yearId),
          shiftId: section.shiftId,
          gender: institute.enableSectionGender ? section.gender : "",
          groupId: section.groupId,
          sectionId: section.id,
        }
      }),
    }

    if (existing) {
      updateTeacher(existing.id, input, user.name)
      toast.success("Teacher updated successfully")
    } else {
      addTeacher(input, user.name)
      toast.success("Teacher added successfully")
    }
    if (andNew) {
      // Keep the institute; start the next teacher from a blank form.
      setName("")
      setTeacherCode("")
      setEmail("")
      setMobile("")
      setPassword("")
      setConfirmPassword("")
      setSubjectIds([])
      setRows([])
      setErrors({})
      return
    }
    router.push(listHref)
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save(false)
      }}
      noValidate
      className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6"
    >
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href={listHref}>
          <ArrowLeftIcon data-icon="inline-start" />
          Teachers
        </Link>
      </Button>

      <h2 className="text-xl font-semibold tracking-tight">
        {existing ? `Edit ${existing.name}` : "Add teacher"}
      </h2>

      <Card>
        <CardHeader>
          <CardTitle>Teacher</CardTitle>
          <CardDescription>
            {config?.isUserRegistration
              ? `A login with the “${config.teacherRole}” role is made for the teacher with this email and password.`
              : "This institute doesn't make logins on teacher registration (see its configuration)."}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.length > 1 && (
            <FilterField
              label="Institute"
              required
              value={instituteId}
              onChange={changeInstitute}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
              error={errors.instituteId}
              disabled={!isNew}
            />
          )}
          <TextField
            id="name"
            label="Name"
            required
            value={name}
            onChange={setName}
            placeholder="Enter name"
            error={errors.name}
          />
          <TextField
            id="teacherCode"
            label="Teacher code"
            required
            value={teacherCode}
            onChange={setTeacherCode}
            placeholder="Enter code"
            error={errors.teacherCode}
          />
          <TextField
            id="email"
            label="Email"
            required
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="name@example.com"
            error={errors.email}
          />
          <TextField
            id="mobile"
            label="Mobile"
            required
            type="tel"
            value={mobile}
            onChange={setMobile}
            placeholder="01XXXXXXXXX"
            error={errors.mobile}
          />
          <TextField
            id="password"
            label="Password"
            required={isNew}
            type="password"
            value={password}
            onChange={setPassword}
            placeholder={isNew ? "Enter password" : "Leave blank to keep"}
            error={errors.password}
          />
          <TextField
            id="confirmPassword"
            label="Confirm password"
            required={isNew}
            type="password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            placeholder={isNew ? "Enter password again" : "Leave blank to keep"}
            error={errors.confirmPassword}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
          <CardDescription>
            {institute
              ? `${subjectIds.length} of ${subjectOptions.length} subjects selected.`
              : "Select the institute to list its subjects."}
          </CardDescription>
        </CardHeader>
        {institute && (
          <CardContent>
            {subjectOptions.length ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {subjectOptions.map((subject) => {
                  const id = `subject-${subject.id}`
                  return (
                    <div key={subject.id} className="flex items-center gap-2">
                      <Checkbox
                        id={id}
                        checked={subjectIds.includes(subject.id)}
                        onCheckedChange={(checked) =>
                          setSubjectIds((current) =>
                            checked === true
                              ? [...current, subject.id]
                              : current.filter((s) => s !== subject.id)
                          )
                        }
                      />
                      <Label htmlFor={id} className="font-normal">
                        {subject.name}
                        <span className="text-muted-foreground">({subject.code})</span>
                      </Label>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                This institute has no subjects yet. Add them in Basic Settings → Subjects.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1.5">
            <CardTitle>Sections</CardTitle>
            <CardDescription>
              The sections the teacher takes. Branch, shift and the other structures narrow the
              section list.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!institute}
            onClick={() => setRows((current) => [...current, emptyRow(iid)])}
          >
            <PlusIcon data-icon="inline-start" />
            Add section
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {rows.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {institute ? "No sections assigned." : "Select the institute to assign sections."}
            </p>
          )}
          {institute &&
            rows.map((row, index) => (
              <SectionRowFields
                key={row.key}
                index={index}
                row={row}
                institute={institute}
                errors={errors}
                onChange={(patch) => updateRow(row.key, patch)}
                onRemove={() => setRows((current) => current.filter((r) => r.key !== row.key))}
              />
            ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 -mx-4 flex justify-end gap-2 border-t bg-background px-4 py-3 lg:-mx-6 lg:px-6">
        <Button asChild variant="outline">
          <Link href={listHref}>Cancel</Link>
        </Button>
        {isNew && (
          <Button type="button" variant="secondary" onClick={() => save(true)}>
            Save and new
          </Button>
        )}
        <Button type="submit">{isNew ? "Save" : "Update"}</Button>
      </div>
    </form>
  )
}

// One section assignment. The legacy form shows branch, medium, version,
// shift, gender and group columns only when the institute uses them.
function SectionRowFields({
  index,
  row,
  institute,
  errors,
  onChange,
  onRemove,
}: {
  index: number
  row: SectionRow
  institute: Institute
  errors: Errors
  onChange: (patch: Partial<SectionRow>) => void
  onRemove: () => void
}) {
  const iid = institute.id
  const classes = classStore.useList(iid)
  const years = yearStore.useList(iid)
  const branches = branchStore.useList(iid)
  const shifts = shiftStore.useList(iid)
  const groups = groupStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const at = (field: string) => errors[`${row.key}.${field}`]

  const active = <T extends { id: number; status: string }>(list: T[], current: string) =>
    list.filter((item) => item.status === "Active" || String(item.id) === current)
  const medium = institute.enableMedium ? row.medium : ""
  const selectedClass = classes.find((c) => String(c.id) === row.classId)
  const classGroups =
    institute.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []
  const matches = (value: string, of: number | string | null) => !value || String(of) === value
  const sectionOptions = row.classId
    ? active(sections, row.sectionId).filter(
        (s) =>
          String(s.classId) === row.classId &&
          (!institute.enableBranch || matches(row.branchId, s.branchId)) &&
          (!institute.enableShift || matches(row.shiftId, s.shiftId)) &&
          (!institute.enableVersion || matches(row.version, s.version)) &&
          (!classGroups.length || matches(row.groupId, s.groupId)) &&
          (!institute.enableSectionGender || matches(row.gender, s.gender))
      )
    : []
  const describe = (s: (typeof sections)[number]) =>
    [
      s.name,
      institute.enableShift && !row.shiftId && s.shiftId != null
        ? shifts.find((sh) => sh.id === s.shiftId)?.name
        : null,
      institute.enableBranch && !row.branchId && s.branchId != null
        ? branches.find((b) => b.id === s.branchId)?.name
        : null,
    ]
      .filter(Boolean)
      .join(" · ")

  // Changing what narrows the list drops a section it no longer offers.
  const narrow = (patch: Partial<SectionRow>) => onChange({ ...patch, sectionId: "" })

  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Section {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8 text-muted-foreground"
          onClick={onRemove}
        >
          <Trash2Icon />
          <span className="sr-only">Remove section {index + 1}</span>
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {institute.enableBranch && (
          <FilterField
            label="Branch"
            value={row.branchId}
            onChange={(v) => narrow({ branchId: v })}
            options={active(branches, row.branchId).map((b) => ({ value: String(b.id), label: b.name }))}
            allLabel="Any branch"
          />
        )}
        {institute.enableMedium && (
          <FilterField
            label="Medium"
            required
            value={row.medium}
            onChange={(v) => narrow({ medium: v, classId: "", groupId: "" })}
            options={academicMediums.map((m) => ({ value: m, label: m }))}
            placeholder="Select medium"
            error={at("medium")}
          />
        )}
        <FilterField
          label="Class"
          required
          value={row.classId}
          onChange={(v) => narrow({ classId: v, groupId: "" })}
          options={active(classes, row.classId)
            .filter((c) => !medium || !c.medium || c.medium === medium)
            .map((c) => ({ value: String(c.id), label: c.name }))}
          placeholder="Select class"
          error={at("classId")}
        />
        {institute.enableVersion && (
          <FilterField
            label="Version"
            value={row.version}
            onChange={(v) => narrow({ version: v })}
            options={academicVersions.map((v) => ({ value: v, label: v }))}
            allLabel="Any version"
          />
        )}
        <FilterField
          label="Academic year"
          required
          value={row.yearId}
          onChange={(v) => onChange({ yearId: v })}
          options={active(years, row.yearId).map((y) => ({
            value: String(y.id),
            label: y.isCurrent ? `${y.name} (current)` : y.name,
          }))}
          placeholder="Select academic year"
          error={at("yearId")}
        />
        {institute.enableShift && (
          <FilterField
            label="Shift"
            value={row.shiftId}
            onChange={(v) => narrow({ shiftId: v })}
            options={active(shifts, row.shiftId).map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="Any shift"
          />
        )}
        {institute.enableSectionGender && (
          <FilterField
            label="Gender"
            value={row.gender}
            onChange={(v) => narrow({ gender: v })}
            options={sectionGenders.map((g) => ({ value: g, label: g }))}
            allLabel="Any gender"
          />
        )}
        {classGroups.length > 0 && (
          <FilterField
            label="Academic group"
            value={row.groupId}
            onChange={(v) => narrow({ groupId: v })}
            options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
            allLabel="Any group"
          />
        )}
        <FilterField
          label="Section"
          required
          value={row.sectionId}
          onChange={(v) => onChange({ sectionId: v })}
          options={sectionOptions.map((s) => ({ value: String(s.id), label: describe(s) }))}
          placeholder={
            !row.classId
              ? "Select class first"
              : sectionOptions.length
                ? "Select section"
                : "No section matches"
          }
          error={at("sectionId")}
          disabled={!row.classId}
        />
      </div>
    </div>
  )
}

function TextField({
  id,
  label,
  required,
  type = "text",
  value,
  onChange,
  placeholder,
  error,
}: {
  id: string
  label: string
  required?: boolean
  type?: "text" | "email" | "tel" | "password"
  value: string
  onChange: (value: string) => void
  placeholder?: string
  error?: string
}) {
  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        autoComplete={type === "password" ? "new-password" : undefined}
        aria-invalid={!!error}
        onChange={(event) => onChange(event.target.value)}
      />
      <FieldError>{error}</FieldError>
    </Field>
  )
}
