"use client"

import * as React from "react"
import Link from "next/link"
import { PencilIcon } from "lucide-react"

import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { classStore, sectionStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { sectionTeachers } from "@/lib/section-teachers"
import { useTeachers } from "@/lib/teachers"

// Legacy SectionTeacher Details: a class's sections with the teachers who
// take each one, for an academic year.
export function SectionTeacherDetail({ classId }: { classId: number }) {
  const institutes = useAccessibleInstitutes()
  const academicClass = classStore.useAll().find((c) => c.id === classId)
  const institute = institutes.find((i) => i.id === academicClass?.instituteId)
  const iid = institute?.id ?? -1
  const sections = sectionStore.useList(iid)
  const years = yearStore.useList(iid)
  const teachers = useTeachers()

  const [yearId, setYearId] = React.useState(
    () => String(yearStore.getList(iid).find((y) => y.isCurrent && y.status === "Active")?.id ?? "")
  )
  if (!academicClass || !institute) return <ClassNotFound />


  const classSections = sections
    .filter((s) => s.classId === academicClass.id && s.status === "Active")
    .sort((a, b) => a.rank - b.rank)

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Section Teacher Details</CardTitle>
            <CardDescription>
              {institute.name} · {academicClass.name}
              {institute.enableMedium && academicClass.medium ? ` · ${academicClass.medium}` : ""}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/section-teachers">Manage section teacher</Link>
            </Button>
            <Button asChild size="sm">
              <Link href={`/section-teachers/${academicClass.id}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <FilterField
            label="Academic year"
            value={yearId}
            onChange={setYearId}
            options={years.filter((y) => y.status === "Active").map((y) => ({ value: String(y.id), label: y.name }))}
            placeholder="Select year"
          />
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-40">Section</TableHead>
              <TableHead>Teacher list</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {classSections.length ? (
              classSections.map((s) => {
                const list = yearId ? sectionTeachers(teachers, s.id, Number(yearId)) : []
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>
                      {list.length ? (
                        <div className="flex flex-wrap gap-1.5">
                          {list.map((t) => (
                            <Badge key={t.id} variant={t.status === "Active" ? "secondary" : "outline"}>
                              <Link href={`/teachers/${t.id}`} className="hover:underline">
                                {t.name}
                              </Link>
                              {t.status !== "Active" && <span className="text-muted-foreground"> ({t.status})</span>}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">No teacher</span>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={2} className="h-24 text-center text-muted-foreground">
                  This class has no active section.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

export function ClassNotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h2 className="text-xl font-semibold">Class not found</h2>
      <p className="text-sm text-muted-foreground">It may have been deleted, or belong to another institute.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/section-teachers">Back to section teachers</Link>
      </Button>
    </div>
  )
}
