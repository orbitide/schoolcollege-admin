"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { EyeIcon, PencilIcon, PlusIcon, SearchIcon } from "lucide-react"

import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
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
import { academicMediums } from "@/lib/institutes"
import { sectionTeachers } from "@/lib/section-teachers"
import { useTeachers } from "@/lib/teachers"

// Legacy "Section Teacher Manage Admin" (SectionTeacher/ManageAdmin): every
// active class with how many sections it has, and links to see or assign
// the teachers of each section.
export function SectionTeacherList() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const institutes = useAccessibleInstitutes()
  const classes = classStore.useAll()
  const sections = sectionStore.useAll()
  const years = yearStore.useAll()
  const teachers = useTeachers()
  const canPick = institutes.length > 1

  const param = (key: string) => searchParams.get(key) ?? ""
  const institute = canPick
    ? institutes.find((i) => String(i.id) === param("institute"))
    : institutes[0]
  const medium = param("medium")

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const byId = new Map(institutes.map((i) => [i.id, i]))
  const rows = classes
    .filter(
      (c) =>
        c.status === "Active" &&
        byId.has(c.instituteId) &&
        (!institute || c.instituteId === institute.id) &&
        (!medium || !c.medium || c.medium === medium) &&
        (!needle || c.name.toLowerCase().includes(needle))
    )
    .sort((a, b) => a.instituteId - b.instituteId || a.rank - b.rank)

  function setParam(updates: Record<string, string>) {
    const params = new URLSearchParams(searchParams)
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value)
      else params.delete(key)
    }
    const search = params.toString()
    router.replace(search ? `${pathname}?${search}` : pathname)
  }

  // Sections and, for the institute's current year, how many have teachers.
  function counts(classId: number, instituteId: number) {
    const own = sections.filter((s) => s.classId === classId && s.status === "Active")
    const year = years.find((y) => y.instituteId === instituteId && y.isCurrent && y.status === "Active")
    const staffed = year ? own.filter((s) => sectionTeachers(teachers, s.id, year.id).length > 0).length : 0
    return { sections: own.length, staffed, year }
  }

  const showMedium = rows.some((c) => byId.get(c.instituteId)?.enableMedium)
  const columnCount = 5 + (institute ? 0 : 1) + (showMedium ? 1 : 0)
  const newHref = institute ? `/section-teachers/new?institute=${institute.id}` : "/section-teachers/new"

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Manage Section Teacher (Admin)</CardTitle>
            <CardDescription>
              Each class with its sections. Assign the teachers who take each section in an
              academic year.
            </CardDescription>
          </div>
          <Button asChild size="sm">
            <Link href={newHref}>
              <PlusIcon data-icon="inline-start" />
              Add section teacher
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {canPick && (
            <FilterField
              label="Institute"
              value={institute ? String(institute.id) : ""}
              onChange={(v) => setParam({ institute: v, medium: "" })}
              options={institutes.map((i) => ({ value: String(i.id), label: i.name }))}
              allLabel="All institutes"
            />
          )}
          {(!institute || institute.enableMedium) && (
            <FilterField
              label="Academic medium"
              value={medium}
              onChange={(v) => setParam({ medium: v })}
              options={academicMediums.map((m) => ({ value: m, label: m }))}
              allLabel="All mediums"
            />
          )}
          <div className="flex flex-col justify-end sm:col-span-2 lg:col-span-1">
            <div className="relative">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search class"
                aria-label="Search classes"
                className="pl-8"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader className="bg-muted">
            <TableRow>
              <TableHead className="w-12">Sl</TableHead>
              {!institute && <TableHead>Institute</TableHead>}
              {showMedium && <TableHead>Medium</TableHead>}
              <TableHead>Class</TableHead>
              <TableHead className="text-center">Sections</TableHead>
              <TableHead>Teachers assigned</TableHead>
              <TableHead className="w-44 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((c, index) => {
                const count = counts(c.id, c.instituteId)
                const owner = byId.get(c.instituteId)
                return (
                  <TableRow key={c.id}>
                    <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                    {!institute && <TableCell>{owner?.name ?? "—"}</TableCell>}
                    {showMedium && (
                      <TableCell>{owner?.enableMedium ? c.medium || "All medium" : "—"}</TableCell>
                    )}
                    <TableCell className="font-medium whitespace-nowrap">{c.name}</TableCell>
                    <TableCell className="text-center tabular-nums">{count.sections}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {count.year && count.sections
                        ? `${count.staffed} of ${count.sections} sections in ${count.year.name}`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/section-teachers/${c.id}`}>
                          <EyeIcon data-icon="inline-start" />
                          Details
                        </Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/section-teachers/${c.id}/edit`}>
                          <PencilIcon data-icon="inline-start" />
                          Edit
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columnCount} className="h-24 text-center text-muted-foreground">
                  No class found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
