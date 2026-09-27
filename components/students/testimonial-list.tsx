"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { AwardIcon, PencilIcon, PrinterIcon, SearchIcon } from "lucide-react"

import {
  classRollLabel,
  initials,
  useStudentLookups,
} from "@/components/students/student-lookups"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { branchStore, classStore, groupStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { academicMediums, academicVersions } from "@/lib/institutes"
import { useStudents, type PublicExam } from "@/lib/students"
import {
  examineeYears,
  testimonialRows,
  testimonialTypes,
  type TestimonialFilter,
} from "@/lib/testimonials"

// Radix Select can't use "" as a value; "" here means "All …".
const ALL = "__all"

// Legacy "Manage Testimonial" (Views/Student/ManageTestimonial.cshtml): the
// students of a class who passed a public exam in a year, to correct their
// details and print their testimonials.
export function TestimonialList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const students = useStudents()
  const institutes = useAccessibleInstitutes()
  const name = useStudentLookups()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  // Only classes that issue testimonials are offered.
  const classes = classStore.useList(iid).filter((c) => c.testimonialExams.length)
  const branches = branchStore.useList(iid)
  const groups = groupStore.useList(iid)

  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const types = testimonialTypes(selectedClass)
  // Type and examinee default to the first on offer, as soon as there is one.
  const exam = (types.find((t) => t === param("type")) ?? types[0]) as PublicExam | undefined
  const classGroups =
    institute?.enableGroup && selectedClass?.hasSubjectGroup
      ? groups.filter((g) => selectedClass.groupIds.includes(g.id))
      : []

  const toId = (value: string) => (value ? Number(value) : null)
  const base =
    institute && selectedClass && exam
      ? {
          instituteId: institute.id,
          classId: selectedClass.id,
          exam,
          branchId: toId(param("branch")),
          medium: param("medium"),
          groupId: toId(param("group")),
          version: param("version"),
        }
      : null
  const years = base ? examineeYears(students, base) : []
  const examinee = years.find((y) => y === param("examinee")) ?? years[0]
  const filter: TestimonialFilter | null = base && examinee ? { ...base, examinee } : null

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const rows = (filter ? testimonialRows(students, filter) : []).filter(
    ({ student, enrolment, result }) =>
      !needle ||
      [student.name, enrolment.classRoll, result.roll, student.fatherName, student.motherName, student.primaryMobile]
        .some((value) => value.toLowerCase().includes(needle))
  )

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  // A choice further up clears the ones that depended on it.
  const clearBelow = {
    institute: { branch: "", medium: "", class: "", type: "", examinee: "", group: "", version: "" },
    class: { type: "", examinee: "", group: "" },
    type: { examinee: "" },
  }

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const printQuery = filter
    ? new URLSearchParams(
        Object.entries({
          institute: String(filter.instituteId),
          class: String(filter.classId),
          type: filter.exam,
          examinee: filter.examinee,
          branch: param("branch"),
          medium: param("medium"),
          group: param("group"),
          version: param("version"),
        }).filter(([, value]) => value)
      ).toString()
    : ""

  const showBranch = Boolean(institute?.enableBranch)
  const showMedium = Boolean(institute?.enableMedium)
  const showVersion = Boolean(institute?.enableVersion)
  const showGroup = classGroups.length > 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Manage Testimonial</CardTitle>
            <CardDescription>
              Check the details testimonials print, correct them, and print the testimonials
              of a class&apos;s examinees.
            </CardDescription>
          </div>
          {filter && rows.length > 0 && (
            <Button asChild size="sm">
              <Link href={`/print/testimonial?${printQuery}`}>
                <PrinterIcon data-icon="inline-start" />
                Print all ({rows.length})
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <Filter
              label="Institute"
              required
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, ...clearBelow.institute })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              placeholder="Select institute"
            />
          )}
          {showBranch && (
            <Filter
              label="Branch"
              value={param("branch")}
              onChange={(v) => setParam({ branch: v, examinee: "" })}
              options={branches.map((b) => ({ value: String(b.id), label: b.name }))}
              allLabel="All branches"
            />
          )}
          {showMedium && (
            <Filter
              label="Medium"
              value={param("medium")}
              onChange={(v) => setParam({ medium: v, examinee: "" })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <Filter
            label="Class"
            required
            value={selectedClass ? String(selectedClass.id) : ""}
            onChange={(v) => setParam({ class: v, ...clearBelow.class })}
            options={classes.map((c) => ({ value: String(c.id), label: c.name }))}
            placeholder={
              !institute
                ? "Pick an institute first"
                : classes.length
                  ? "Select class"
                  : "No class issues testimonials"
            }
            disabled={!institute || !classes.length}
          />
          <Filter
            label="Type"
            required
            value={exam ?? ""}
            onChange={(v) => setParam({ type: v, ...clearBelow.type })}
            options={types.map((t) => ({ value: t, label: t }))}
            placeholder="Select type"
            disabled={!types.length}
          />
          <Filter
            label="Examinee"
            required
            value={examinee ?? ""}
            onChange={(v) => setParam({ examinee: v })}
            options={years.map((y) => ({ value: y, label: y }))}
            placeholder={base ? (years.length ? "Select year" : "No results on record") : "Select year"}
            disabled={!years.length}
          />
          {showGroup && (
            <Filter
              label="Group"
              value={param("group")}
              onChange={(v) => setParam({ group: v, examinee: "" })}
              options={classGroups.map((g) => ({ value: String(g.id), label: g.name }))}
              allLabel="All groups"
            />
          )}
          {showVersion && (
            <Filter
              label="Version"
              value={param("version")}
              onChange={(v) => setParam({ version: v, examinee: "" })}
              options={academicVersions.map((v) => ({ value: v, label: v }))}
              allLabel="All versions"
            />
          )}
        </CardContent>
      </Card>

      {!filter ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <AwardIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {base
                ? `No ${exam} results are recorded for this class yet`
                : "Choose a class to see its examinees"}
            </p>
            <p className="text-sm text-muted-foreground">
              {base
                ? "Add the students' board results on their profiles, then they appear here."
                : "Only classes with testimonials enabled (Basic Settings → Academic Classes) are listed."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>
                {selectedClass?.name} · {exam} {examinee}
              </CardTitle>
              <CardDescription>
                {rows.length} examinee{rows.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, roll, board roll or mobile"
                aria-label="Search examinees"
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    {showBranch && <TableHead>Branch</TableHead>}
                    {showMedium && <TableHead>Medium</TableHead>}
                    <TableHead>{classRollLabel(institute)}</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Section</TableHead>
                    {showGroup && <TableHead>Group</TableHead>}
                    {showVersion && <TableHead>Version</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Passing year</TableHead>
                    <TableHead>Board roll</TableHead>
                    <TableHead>Board registration no.</TableHead>
                    <TableHead className="text-right">GPA</TableHead>
                    <TableHead className="text-right">Total marks</TableHead>
                    <TableHead>Father&apos;s name</TableHead>
                    <TableHead>Mother&apos;s name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Guardian&apos;s mobile</TableHead>
                    <TableHead>Father&apos;s mobile</TableHead>
                    <TableHead>Mother&apos;s mobile</TableHead>
                    <TableHead className="w-44">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map(({ student, enrolment, result }, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        {showBranch && <TableCell>{name("branch", enrolment.branchId)}</TableCell>}
                        {showMedium && <TableCell>{enrolment.medium || "—"}</TableCell>}
                        <TableCell className="tabular-nums">{enrolment.classRoll || "—"}</TableCell>
                        <TableCell>
                          <Link
                            href={`/students/${student.id}`}
                            className="flex items-center gap-2 font-medium whitespace-nowrap underline-offset-4 hover:underline"
                          >
                            <Avatar className="size-7">
                              {student.imageUrl && <AvatarImage src={student.imageUrl} alt="" />}
                              <AvatarFallback className="text-xs">{initials(student.name)}</AvatarFallback>
                            </Avatar>
                            {student.name}
                          </Link>
                        </TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{name("section", enrolment.sectionId)}</TableCell>
                        {showGroup && <TableCell>{name("group", enrolment.groupId)}</TableCell>}
                        {showVersion && <TableCell>{enrolment.version || "—"}</TableCell>}
                        <TableCell>{exam}</TableCell>
                        <TableCell className="tabular-nums">{result.passingYear}</TableCell>
                        <TableCell className="tabular-nums">{result.roll || "—"}</TableCell>
                        <TableCell className="tabular-nums">{result.registrationNo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{result.gpa || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{result.totalMarks || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{student.fatherName || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{student.motherName || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.primaryMobile || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.guardianMobile || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.fatherMobile || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.motherMobile || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/students/${student.id}/testimonial?type=${encodeURIComponent(exam!)}&returnTo=${encodeURIComponent(returnTo)}`}
                              >
                                <PencilIcon data-icon="inline-start" />
                                Edit
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/print/testimonial?${printQuery}&student=${student.id}`}
                              >
                                <PrinterIcon data-icon="inline-start" />
                                Testimonial
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={24} className="h-24 text-center text-muted-foreground">
                        No examinees match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Filter({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  allLabel,
  disabled,
}: {
  label: string
  required?: boolean
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  placeholder?: string
  // Offers an "All …" choice (value "").
  allLabel?: string
  disabled?: boolean
}) {
  const id = React.useId()
  return (
    <Field>
      <FieldLabel htmlFor={id}>
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </FieldLabel>
      <Select
        value={value === "" && allLabel ? ALL : value}
        onValueChange={(next) => onChange(next === ALL ? "" : next)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
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
