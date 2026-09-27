"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import {
  ArrowRightLeftIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleCheckIcon,
  CircleMinusIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { toast } from "sonner"

import {
  classRollLabel,
  initials,
  studentIdLabel,
  useStudentLookups,
} from "@/components/students/student-lookups"
import { StatusBadge } from "@/components/institutes/status-badge"
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
import { classStore, sectionStore, yearStore } from "@/lib/academic-store"
import { recordStatuses, type Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import {
  currentEnrolment,
  removeStudent,
  setStudentStatus,
  useStudents,
  type Enrolment,
  type Student,
} from "@/lib/students"

const ALL = "all"
const CURRENT = "current"
const PAGE_SIZE = 25

type Row = { student: Student; enrolment?: Enrolment; institute: Institute }

// Legacy "Manage Student (Admin)": students of every institute with their
// enrolment for the chosen academic year.
export function StudentList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const students = useStudents()
  const institutes = useInstitutes()
  const name = useStudentLookups()

  const selected = institutes.find(
    (institute) => String(institute.id) === searchParams.get("institute")
  )
  const years = yearStore.useList(selected?.id ?? -1)
  const classes = classStore.useList(selected?.id ?? -1)
  const sections = sectionStore.useList(selected?.id ?? -1)
  const yearFilter = searchParams.get("year") ?? CURRENT
  const classFilter = searchParams.get("class") ?? ALL
  const sectionFilter = searchParams.get("section") ?? ALL

  const [status, setStatus] = React.useState(ALL)
  const [query, setQuery] = React.useState("")
  const [page, setPage] = React.useState(0)
  const [deleting, setDeleting] = React.useState<Student | null>(null)

  // Filters live in the URL so they survive a trip to the form and back.
  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value === ALL || (key === "year" && value === CURRENT))
        params.delete(key)
      else params.set(key, value)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
    setPage(0)
  }

  const listed = selected ? [selected] : institutes
  const instituteById = new Map(institutes.map((i) => [i.id, i]))
  const needle = query.trim().toLowerCase()

  const rows: Row[] = students.flatMap((student) => {
    const institute = instituteById.get(student.instituteId)
    if (!institute || (selected && institute.id !== selected.id)) return []
    const enrolment =
      yearFilter === CURRENT || yearFilter === ALL
        ? currentEnrolment(student)
        : student.enrolments.find((e) => String(e.yearId) === yearFilter)
    if (yearFilter !== CURRENT && yearFilter !== ALL && !enrolment) return []
    if (classFilter !== ALL && String(enrolment?.classId) !== classFilter)
      return []
    if (sectionFilter !== ALL && String(enrolment?.sectionId) !== sectionFilter)
      return []
    if (status !== ALL && student.status !== status) return []
    if (
      needle &&
      ![
        student.name,
        String(student.studentIdentificationNo),
        enrolment?.classRoll ?? "",
        student.primaryMobile,
        student.fatherName,
      ].some((value) => value.toLowerCase().includes(needle))
    ) {
      return []
    }
    return [{ student, enrolment, institute }]
  })

  // Class order, then section, then roll, like the legacy list.
  const classRank = new Map(
    classStore.getList(selected?.id ?? -1).map((c) => [c.id, c.rank])
  )
  rows.sort(
    (a, b) =>
      a.institute.name.localeCompare(b.institute.name) ||
      (classRank.get(a.enrolment?.classId ?? -1) ?? a.enrolment?.classId ?? 0) -
        (classRank.get(b.enrolment?.classId ?? -1) ??
          b.enrolment?.classId ??
          0) ||
      name("section", a.enrolment?.sectionId).localeCompare(
        name("section", b.enrolment?.sectionId)
      ) ||
      (a.enrolment?.classRoll ?? "").localeCompare(
        b.enrolment?.classRoll ?? "",
        undefined,
        {
          numeric: true,
        }
      )
  )

  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const pageRows = rows.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE)

  // Optional structures get a column when any listed institute uses them.
  const uses = (key: keyof Institute) =>
    listed.some((institute) => Boolean(institute[key]))
  const optional = [
    {
      label: "Medium",
      on: uses("enableMedium"),
      cell: (r: Row) => r.enrolment?.medium || "—",
    },
    {
      label: "Branch",
      on: uses("enableBranch"),
      cell: (r: Row) => name("branch", r.enrolment?.branchId),
    },
    {
      label: "Shift",
      on: uses("enableShift"),
      cell: (r: Row) => name("shift", r.enrolment?.shiftId),
    },
    {
      label: "Group",
      on: uses("enableGroup"),
      cell: (r: Row) => name("group", r.enrolment?.groupId),
    },
    {
      label: "Version",
      on: uses("enableVersion"),
      cell: (r: Row) => r.enrolment?.version || "—",
    },
    {
      label: "House",
      on: uses("enableStudentHouse"),
      cell: (r: Row) => name("house", r.enrolment?.houseId),
    },
    {
      label: "Category",
      on: uses("enableStudentCategory"),
      cell: (r: Row) => name("category", r.student.categoryId),
    },
  ].filter((column) => column.on)

  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`
  const withReturn = (href: string) =>
    `${href}${href.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`

  function toggleStatus(student: Student) {
    const next = student.status === "Active" ? "Inactive" : "Active"
    setStudentStatus(student.id, next)
    toast.success(
      `${student.name} ${next === "Active" ? "activated" : "inactivated"}`
    )
  }

  function remove() {
    if (!deleting) return
    removeStudent(deleting.id)
    toast.success(`${deleting.name} deleted`)
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            Manage Students (Admin)
          </h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} student{rows.length === 1 ? "" : "s"}
            {selected ? ` in ${selected.name}` : " across all institutes"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link
              href={
                selected
                  ? `/students/previous?institute=${selected.id}`
                  : "/students/previous"
              }
            >
              <ArrowRightLeftIcon data-icon="inline-start" />
              Add previous student
            </Link>
          </Button>
          {/* The institute is picked on the form itself (as in the legacy
              form); a filtered list just starts it on that institute. */}
          <Button asChild>
            <Link
              href={withReturn(
                selected
                  ? `/students/new?institute=${selected.id}`
                  : "/students/new"
              )}
            >
              <PlusIcon data-icon="inline-start" />
              Add student
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterSelect
          label="Institute"
          value={selected ? String(selected.id) : ALL}
          onChange={(value) =>
            setParam({
              institute: value,
              year: CURRENT,
              class: ALL,
              section: ALL,
            })
          }
          options={[
            { value: ALL, label: "All institutes" },
            ...institutes.map((i) => ({ value: String(i.id), label: i.name })),
          ]}
          className="sm:w-64"
        />
        <FilterSelect
          label="Academic year"
          value={yearFilter}
          onChange={(value) => setParam({ year: value })}
          options={[
            { value: CURRENT, label: "Current year" },
            ...years.map((y) => ({ value: String(y.id), label: y.name })),
          ]}
        />
        {selected && (
          <FilterSelect
            label="Class"
            value={classFilter}
            onChange={(value) => setParam({ class: value, section: ALL })}
            options={[
              { value: ALL, label: "All classes" },
              ...classes.map((c) => ({ value: String(c.id), label: c.name })),
            ]}
          />
        )}
        {selected && classFilter !== ALL && (
          <FilterSelect
            label="Section"
            value={sectionFilter}
            onChange={(value) => setParam({ section: value })}
            options={[
              { value: ALL, label: "All sections" },
              ...sections
                .filter((s) => String(s.classId) === classFilter)
                .map((s) => ({ value: String(s.id), label: s.name })),
            ]}
          />
        )}
        <FilterSelect
          label="Status"
          value={status}
          onChange={(value) => {
            setStatus(value)
            setPage(0)
          }}
          options={[
            { value: ALL, label: "All statuses" },
            ...recordStatuses.map((s) => ({ value: s, label: s })),
          ]}
        />
        <div className="relative w-full sm:w-64">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(0)
            }}
            placeholder="Name, ID, roll or mobile"
            aria-label="Search students"
            className="pl-8"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>
                {selected ? studentIdLabel(selected) : "Student ID"}
              </TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Gender</TableHead>
              {!selected && <TableHead>Institute</TableHead>}
              <TableHead>Class</TableHead>
              <TableHead>
                {selected ? classRollLabel(selected) : "Class roll"}
              </TableHead>
              <TableHead>Section</TableHead>
              {optional.map((column) => (
                <TableHead key={column.label}>{column.label}</TableHead>
              ))}
              <TableHead>Year</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Father&apos;s name</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {pageRows.length ? (
              pageRows.map((row, index) => {
                const { student, enrolment, institute } = row
                return (
                  <TableRow key={student.id}>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {current * PAGE_SIZE + index + 1}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {student.studentIdentificationNo}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/students/${student.id}`}
                        className="flex items-center gap-2 font-medium whitespace-nowrap underline-offset-4 hover:underline"
                      >
                        <Avatar className="size-7">
                          {student.imageUrl && (
                            <AvatarImage src={student.imageUrl} alt="" />
                          )}
                          <AvatarFallback className="text-xs">
                            {initials(student.name)}
                          </AvatarFallback>
                        </Avatar>
                        {student.name}
                      </Link>
                    </TableCell>
                    <TableCell>{student.gender}</TableCell>
                    {!selected && (
                      <TableCell className="whitespace-nowrap">
                        {institute.shortName || institute.name}
                      </TableCell>
                    )}
                    <TableCell className="whitespace-nowrap">
                      {name("class", enrolment?.classId)}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {enrolment?.classRoll || "—"}
                    </TableCell>
                    <TableCell>
                      {name("section", enrolment?.sectionId)}
                    </TableCell>
                    {optional.map((column) => (
                      <TableCell
                        key={column.label}
                        className="whitespace-nowrap"
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                    <TableCell>{name("year", enrolment?.yearId)}</TableCell>
                    <TableCell>{enrolment?.studentType ?? "—"}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {student.fatherName || "—"}
                    </TableCell>
                    <TableCell className="tabular-nums">
                      {student.primaryMobile || "—"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={student.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-8 text-muted-foreground data-[state=open]:bg-muted"
                          >
                            <EllipsisVerticalIcon />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem asChild>
                            <Link href={`/students/${student.id}`}>
                              <EyeIcon />
                              View profile
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link
                              href={withReturn(`/students/${student.id}/edit`)}
                            >
                              <PencilIcon />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => toggleStatus(student)}
                          >
                            {student.status === "Active" ? (
                              <CircleMinusIcon />
                            ) : (
                              <CircleCheckIcon />
                            )}
                            {student.status === "Active"
                              ? "Inactivate"
                              : "Activate"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleting(student)}
                          >
                            <Trash2Icon />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={14 + optional.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  No students match these filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">
            Page {current + 1} of {pages}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={current === 0}
            onClick={() => setPage(current - 1)}
          >
            <ChevronLeftIcon />
            <span className="sr-only">Previous page</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-8"
            disabled={current >= pages - 1}
            onClick={() => setPage(current + 1)}
          >
            <ChevronRightIcon />
            <span className="sr-only">Next page</span>
          </Button>
        </div>
      )}

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleting?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the student and every enrolment. To keep their
              records, inactivate the student instead. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  className,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
  className?: string
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label={label}
        className={className ?? "w-full sm:w-40"}
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
