"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { CalendarCogIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react"
import { toast } from "sonner"

import { useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { classStore, sectionStore } from "@/lib/academic-store"
import {
  deleteFineGroup,
  fineGroups,
  formatPeriod,
  useAttendanceFines,
  type FineGroup,
} from "@/lib/attendance-fines"
import { useAccessibleInstitutes, useCurrentTeacher, useCurrentUser } from "@/lib/current-user"

// Legacy "Manage Monthly Attendance Fine" (StudentAttendance/
// ManageMonthlyAttendanceFine): the fines saved per section and period with
// their totals, filtered by institute, class, section and period, each with
// Edit (back to the entry page) and Delete.
export function AttendanceFineList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const fines = useAttendanceFines()
  const name = useStudentLookups()
  const user = useCurrentUser()
  const teacher = useCurrentTeacher()
  const canPick = institutes.length > 1
  const [deleting, setDeleting] = React.useState<FineGroup | null>(null)

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const iid = institute?.id ?? -1
  const classes = classStore.useList(iid)
  const sections = sectionStore.useList(iid)
  const selectedClass = classes.find((c) => String(c.id) === param("class"))
  const classSections = sections.filter(
    (s) => s.classId === selectedClass?.id && (!own || own.has(s.id))
  )

  const allowed = new Set(institutes.map((i) => i.id))
  // A teacher sees only the fines of sections they take; admins see all.
  const own =
    user.role === "Teacher" ? new Set(teacher?.sections.map((s) => s.sectionId) ?? []) : null
  const groups = fineGroups(fines).filter(
    (g) =>
      allowed.has(g.instituteId) &&
      (!institute || g.instituteId === institute.id) &&
      (!own || own.has(g.sectionId))
  )
  // The periods fined so far, for the period filter (legacy LoadMonthlyAbsentDate).
  const periods = [...new Set(groups.map((g) => `${g.dateFrom}|${g.dateTo}`))].map((value) => {
    const [from, to] = value.split("|")
    return { value, label: formatPeriod(from, to) }
  })
  const rows = groups.filter(
    (g) =>
      (!selectedClass || g.classId === selectedClass.id) &&
      (!param("section") || String(g.sectionId) === param("section")) &&
      (!param("period") || `${g.dateFrom}|${g.dateTo}` === param("period"))
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

  const entryHref = (group?: FineGroup) => {
    const params = new URLSearchParams()
    const instituteId = group?.instituteId ?? institute?.id
    if (instituteId) params.set("institute", String(instituteId))
    if (group) {
      params.set("class", String(group.classId))
      params.set("section", String(group.sectionId))
      params.set("from", group.dateFrom)
      params.set("to", group.dateTo)
    }
    const search = params.toString()
    return `/attendance/fines/new${search ? `?${search}` : ""}`
  }
  const instituteName = new Map(institutes.map((i) => [i.id, i.shortName || i.name]))
  const sectionLabel = (g: FineGroup) => `${name("class", g.classId)}, ${name("section", g.sectionId)}`

  function remove() {
    if (!deleting) return
    const removed = deleteFineGroup(deleting)
    toast.success("Attendance absent fine deleted successfully", {
      description: `${removed} student fine${removed === 1 ? "" : "s"} removed.`,
    })
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Manage Monthly Attendance Absent Fine</CardTitle>
            <CardDescription>
              Absent fines saved per section and period, with the days students were absent and
              fined for.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/attendance/fines/configuration">
                <CalendarCogIcon data-icon="inline-start" />
                Fine period
              </Link>
            </Button>
            <Button asChild size="sm">
              <Link href={entryHref()}>
                <PlusIcon data-icon="inline-start" />
                Add fines
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, class: "", section: "", period: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          <FilterField
            label="Class"
            value={param("class")}
            onChange={(v) => setParam({ class: v, section: "" })}
            options={classes
              .filter((c) => !own || sections.some((s) => s.classId === c.id && own.has(s.id)))
              .map((c) => ({ value: String(c.id), label: c.name }))}
            allLabel="All classes"
            disabled={!institute}
          />
          <FilterField
            label="Section"
            value={param("section")}
            onChange={(v) => setParam({ section: v })}
            options={classSections.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!selectedClass}
          />
          <FilterField
            label="Period"
            value={param("period")}
            onChange={(v) => setParam({ period: v })}
            options={periods}
            allLabel="All periods"
          />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              <TableHead>Period</TableHead>
              {!institute && <TableHead>Institute</TableHead>}
              <TableHead>Class, section</TableHead>
              <TableHead className="text-right">Students</TableHead>
              <TableHead className="text-right">Absent days</TableHead>
              <TableHead className="text-right">Fined days</TableHead>
              <TableHead className="w-44" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((group, index) => (
                <TableRow key={group.key}>
                  <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatPeriod(group.dateFrom, group.dateTo)}
                  </TableCell>
                  {!institute && (
                    <TableCell>{instituteName.get(group.instituteId) ?? "—"}</TableCell>
                  )}
                  <TableCell className="font-medium">{sectionLabel(group)}</TableCell>
                  <TableCell className="text-right tabular-nums">{group.totalStudents}</TableCell>
                  <TableCell className="text-right tabular-nums">{group.totalAbsentDays}</TableCell>
                  <TableCell className="text-right tabular-nums">{group.totalFinedDays}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={entryHref(group)}>
                          <PencilIcon data-icon="inline-start" />
                          Edit
                        </Link>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleting(group)}
                      >
                        <Trash2Icon data-icon="inline-start" />
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={institute ? 7 : 8}
                  className="h-24 text-center text-muted-foreground"
                >
                  {groups.length ? "No fines match these filters." : "No fines have been saved yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!deleting} onOpenChange={(open) => !open && setDeleting(null)}>
        {deleting && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete {sectionLabel(deleting)} fines?</AlertDialogTitle>
              <AlertDialogDescription>
                The fines of {deleting.totalStudents} student
                {deleting.totalStudents === 1 ? "" : "s"} for{" "}
                {formatPeriod(deleting.dateFrom, deleting.dateTo)} are removed. Attendance itself
                is not touched. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={remove}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  )
}
