"use client"

import { PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PrintArea } from "@/components/reports/print-area"
import { AdmitCardSheet } from "@/components/reports/student-information-sheet"
import { classRollLabel, useStudentLookups } from "@/components/students/student-lookups"
import { FilterField } from "@/components/term-exams/term-exam-fields"
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
import { classYearSubjectStore, subjectStore } from "@/lib/academic-store"
import { admitCards } from "@/lib/student-information"
import { useStudents } from "@/lib/students"

// Legacy RptStudent/AdmitCard: pick an exam and a section — and a roll, for
// one student — and print the admit cards of its students, two to a page.
// Everything lives in the URL.
export function AdmitCard() {
  const f = useExamReportFilter({ meritList: false })
  const { institute, chosen } = f
  const iid = institute?.id ?? -1
  const students = useStudents()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(iid)
  const classYearSubjects = classYearSubjectStore.useList(iid)

  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  const roll = f.param("roll")
  const byId = new Map(subjects.map((s) => [s.id, s]))

  const rows =
    chosen && section
      ? admitCards(chosen, students, {
          classYearSubjects,
          subjectRank: (id) => byId.get(id)?.rank ?? Infinity,
          sectionId: section.id,
          roll,
        })
      : undefined

  const sheet = institute && chosen && rows && rows.length > 0 && (
    <AdmitCardSheet
      institute={institute}
      examName={chosen.name}
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
          <CardTitle className="text-lg">Admit Card</CardTitle>
          <CardDescription>
            Admit cards for an exam: a section&apos;s students with the subjects they sit, two to a page.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Section"
            required
            value={section ? String(section.id) : ""}
            onChange={(v) => f.setParam({ section: v })}
            options={f.examSections.map((s) => ({ value: String(s.id), label: s.name }))}
            placeholder="Select section"
            disabled={!chosen}
          />
          <Field>
            <FieldLabel htmlFor="admit-roll">{classRollLabel(institute)}</FieldLabel>
            <Input
              id="admit-roll"
              inputMode="numeric"
              placeholder="All students, or one roll"
              value={roll}
              onChange={(e) => f.setParam({ roll: e.target.value.trim() })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>Admit Card{sheet ? ` (Total Student: ${rows.length})` : ""}</CardTitle>
            <CardDescription>
              {sheet ? `${chosen.fullName} · ${section?.name} · two to a printed page` : "Pick an exam and a section."}
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
          ) : chosen && !section ? (
            <ExamReportEmpty filter={f} empty emptyMessage="Select a section" />
          ) : (
            <ExamReportEmpty filter={f} empty={!!rows} emptyMessage="No Student Found" />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
