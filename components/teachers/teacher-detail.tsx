"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, PencilIcon } from "lucide-react"

import { StatusBadge } from "@/components/institutes/status-badge"
import { useStudentLookups } from "@/components/students/student-lookups"
import { Badge } from "@/components/ui/badge"
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
import { subjectStore } from "@/lib/academic-store"
import { surfaceHref, useSurfaces } from "@/lib/access"
import { useInstitute } from "@/lib/institutes-store"
import { useTeacher } from "@/lib/teachers"

// Legacy Teacher Details: the teacher, the subjects they teach and the
// sections they take.
export function TeacherDetail({ id, returnTo }: { id: number; returnTo?: string }) {
  const teacher = useTeacher(id)
  const institute = useInstitute(teacher?.instituteId ?? -1)
  const subjects = subjectStore.useAll()
  const name = useStudentLookups()
  // Back to the list the user came from, else the first one they may open.
  const surfaces = useSurfaces("teacher")
  const canEdit = surfaces.some((surface) => surface !== "View")
  const listHref = returnTo?.startsWith("/")
    ? returnTo
    : surfaceHref("/teachers", surfaces[0] ?? "View")

  if (!teacher || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Teacher not found</h2>
        <p className="text-sm text-muted-foreground">It may have been permanently deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href={listHref}>Back to teachers</Link>
        </Button>
      </div>
    )
  }

  const deleted = teacher.status === "Deleted"
  const subjectName = new Map(subjects.map((s) => [s.id, `${s.name} (${s.code})`]))
  const rows: [string, React.ReactNode][] = [
    ["Institute", institute.name],
    ["Teacher code", teacher.teacherCode],
    ["Email", teacher.email],
    ["Mobile", teacher.mobile],
    ["Rank", deleted ? "—" : teacher.rank],
    ["User account", teacher.hasAccount ? `Yes (${institute.configuration.teacherRole})` : "No"],
    ["Created", `${teacher.createdBy}, ${new Date(teacher.createdAt).toLocaleString("en-GB")}`],
    ["Last modified", `${teacher.modifiedBy}, ${new Date(teacher.modifiedAt).toLocaleString("en-GB")}`],
  ]

  const show = {
    branch: institute.enableBranch,
    medium: institute.enableMedium,
    version: institute.enableVersion,
    shift: institute.enableShift,
    gender: institute.enableSectionGender,
    group: institute.enableGroup && teacher.sections.some((s) => s.groupId != null),
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={listHref}>
            <ArrowLeftIcon data-icon="inline-start" />
            Teachers
          </Link>
        </Button>
        {!deleted && canEdit && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/teachers/${teacher.id}/edit?returnTo=${encodeURIComponent(listHref)}`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-lg">{teacher.name}</CardTitle>
            <StatusBadge status={teacher.status} />
          </div>
          <CardDescription>{institute.name}</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-x-8 gap-y-3 text-sm sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="grid grid-cols-[9rem_1fr] gap-2">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="font-medium break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          {teacher.subjectIds.length ? (
            <div className="flex flex-wrap gap-2">
              {teacher.subjectIds.map((sid) => (
                <Badge key={sid} variant="secondary">
                  {subjectName.get(sid) ?? `Subject #${sid}`}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No subjects assigned.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sections</CardTitle>
          <CardDescription>
            {teacher.sections.length} section{teacher.sections.length === 1 ? "" : "s"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teacher.sections.length ? (
            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    {show.branch && <TableHead>Branch</TableHead>}
                    {show.medium && <TableHead>Medium</TableHead>}
                    <TableHead>Class</TableHead>
                    {show.version && <TableHead>Version</TableHead>}
                    <TableHead>Academic year</TableHead>
                    {show.shift && <TableHead>Shift</TableHead>}
                    {show.gender && <TableHead>Gender</TableHead>}
                    {show.group && <TableHead>Group</TableHead>}
                    <TableHead>Section</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teacher.sections.map((section, index) => (
                    <TableRow key={section.sectionId}>
                      <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                      {show.branch && <TableCell>{name("branch", section.branchId)}</TableCell>}
                      {show.medium && <TableCell>{section.medium || "—"}</TableCell>}
                      <TableCell>{name("class", section.classId)}</TableCell>
                      {show.version && <TableCell>{section.version || "—"}</TableCell>}
                      <TableCell>{name("year", section.yearId)}</TableCell>
                      {show.shift && <TableCell>{name("shift", section.shiftId)}</TableCell>}
                      {show.gender && <TableCell>{section.gender || "—"}</TableCell>}
                      {show.group && <TableCell>{name("group", section.groupId)}</TableCell>}
                      <TableCell className="font-medium">{name("section", section.sectionId)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No sections assigned.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
