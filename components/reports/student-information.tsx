"use client"

import { CircleAlertIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { SectionStudentFilterFields, useSectionStudentFilter } from "@/components/reports/section-student-filter"
import { StudentInformationSheet } from "@/components/reports/student-information-sheet"
import { useStudentLookups } from "@/components/students/student-lookups"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { classYearSubjectStore, subjectStore } from "@/lib/academic-store"
import { studentInformation } from "@/lib/student-information"
import { useStudents } from "@/lib/students"

// Legacy RptStudent/StudentInformation: pick a section (institute, branch,
// medium, class, year, group, version) and optionally a roll — or student ID
// when the institute hides class rolls — then print each student's
// information card. The filters live in the URL.
export function StudentInformationReport() {
  const f = useSectionStudentFilter()
  const { institute, academicClass, section, selection, rollOrId, rollLabel } = f
  const students = useStudents()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)
  const classYearSubjects = classYearSubjectStore.useList(institute?.id ?? -1)

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const rows =
    institute && selection
      ? studentInformation(institute, students, {
          ...selection,
          classYearSubjects,
          subjectRank: (id) => byId.get(id)?.rank ?? Infinity,
        })
      : undefined
  const problem =
    f.problem ??
    (rows && !rows.length ? (rollOrId ? `No student found with ${rollLabel} ${rollOrId}` : "No student found") : null)

  const sheet = institute && rows && rows.length > 0 && (
    <StudentInformationSheet
      institute={institute}
      rows={rows}
      name={name}
      subjectName={(id) => byId.get(id)?.name ?? name("subject", id)}
      subjectCode={(id) => byId.get(id)?.code.trim() || "-"}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Student Information</CardTitle>
          <CardDescription>
            A printable card per student of a section: class details, parents and the subjects they
            take.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SectionStudentFilterFields filter={f} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Student Information</CardTitle>
            <CardDescription>
              {sheet && section && academicClass
                ? `${academicClass.name} · ${section.name} · ${rows!.length} student${rows!.length === 1 ? "" : "s"}, two to a printed page`
                : "Pick a section to see its students."}
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
            <PrinterIcon data-icon="inline-start" />
            Print
          </Button>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="mx-auto max-w-[52rem] min-w-[40rem]">{sheet}</div>
            </div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {problem}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
