"use client"

import { DownloadIcon, PrinterIcon } from "lucide-react"

import { ExamReportEmpty, ExamReportFilterFields, useExamReportFilter } from "@/components/reports/exam-report-filter"
import { PassFailReportSheet } from "@/components/reports/pass-fail-report-sheet"
import { PrintArea } from "@/components/reports/print-area"
import { useStudentLookups } from "@/components/students/student-lookups"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { subjectStore } from "@/lib/academic-store"
import {
  DEFAULT_ROWS_PER_PAGE,
  passFailReport,
  passFailReportOrders,
  passFailReportTypes,
  type PassFailReportOrder,
  type PassFailReportType,
} from "@/lib/pass-fail-report"
import { downloadCsv } from "@/lib/sms-messages"
import { useStudents } from "@/lib/students"

// Legacy RptResult/PassFailReport ("Pass/Fail"): pick an exam whose merit
// list is generated, the kind of list and its order, and see the students
// page by page. Everything lives in the URL, so other reports can link to a
// list (?exam=&type=failed&subject=, as the legacy links from Failed Summary).
export function PassFailReport() {
  const f = useExamReportFilter()
  const { institute, chosen, list, academicClass, branch } = f
  const students = useStudents()
  const name = useStudentLookups()
  const subjects = subjectStore.useList(institute?.id ?? -1)

  const type: PassFailReportType =
    passFailReportTypes.find((t) => t.value === f.param("type"))?.value ?? "all"
  const order: PassFailReportOrder =
    passFailReportOrders.find((o) => o.value === f.param("order"))?.value ?? "merit"
  const section = f.examSections.find((s) => String(s.id) === f.param("section"))
  const subjectId =
    type === "failed" ? chosen?.subjects.find((s) => String(s.subjectId) === f.param("subject"))?.subjectId : undefined
  const columns = {
    mobile: f.param("mobile") !== "hide",
    section: f.param("sections") !== "hide",
    groupPosition: f.param("groupPosition") === "show",
  }
  const rowsParam = Number.parseInt(f.param("rows"), 10)
  const rowsPerPage = rowsParam > 0 ? rowsParam : DEFAULT_ROWS_PER_PAGE

  const byId = new Map(subjects.map((s) => [s.id, s]))
  const subjectName = (id: number) => byId.get(id)?.name ?? name("subject", id)
  // The subject's short name, as the legacy result details.
  const subjectLabel = (id: number) => byId.get(id)?.code.trim() || subjectName(id)
  const tables =
    chosen && list
      ? passFailReport(chosen, list, students, f.sections, {
          type,
          order,
          sectionId: section?.id,
          subjectId,
          subjectLabel,
        })
      : undefined
  const heading = {
    class: academicClass?.name ?? "—",
    group:
      institute?.enableGroup && academicClass?.hasSubjectGroup
        ? chosen?.groupId != null
          ? name("group", chosen.groupId)
          : "All"
        : undefined,
    section: section?.name ?? "All",
  }
  const results = type === "all" || type === "passed"
  const studentCount = new Set(tables?.flatMap((t) => t.rows.map((r) => r.student.id))).size

  function exportCsv() {
    if (!chosen || !tables) return
    const typeName = passFailReportTypes.find((t) => t.value === type)!.title
    downloadCsv(
      `${typeName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${chosen.fullName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.csv`,
      [
        ...(type === "failed" ? ["Subject"] : []),
        "Sl",
        ...(columns.section ? ["Section"] : []),
        "Roll",
        "Student Name",
        ...(columns.mobile ? ["Mobile"] : []),
        ...(type !== "failed-details" ? ["Total Marks"] : []),
        ...(results ? ["GPA", "Section Position", ...(columns.groupPosition ? ["Group Position"] : []), "Result"] : []),
        ...(type === "failed" ? ["Subject Marks"] : []),
        ...(type === "failed-details" ? ["Result Details"] : []),
      ],
      tables.flatMap((t) =>
        t.rows.map((row, i) => {
          const { result: r, student } = row
          const passed = r.isPresent && r.failedSubjectCount === 0
          return [
            ...(t.subjectId != null ? [subjectName(t.subjectId)] : []),
            i + 1,
            ...(columns.section ? [name("section", r.sectionId)] : []),
            r.roll,
            student.name,
            ...(columns.mobile ? [student.primaryMobile] : []),
            ...(type !== "failed-details" ? [r.totalMarks] : []),
            ...(results
              ? [
                  passed ? r.gpa.toFixed(2) : "",
                  passed ? r.sectionPosition : "",
                  ...(columns.groupPosition ? [passed ? r.groupPosition : ""] : []),
                  passed ? "Passed" : r.isPresent ? `Failed(${r.failedSubjectCount})` : "Absent",
                ]
              : []),
            ...(type === "failed" ? [row.mark?.total ?? ""] : []),
            ...(type === "failed-details" ? [row.details ?? ""] : []),
          ]
        })
      )
    )
  }

  const empty = tables && !tables.length
  const sheet = chosen && tables && institute && !empty && (
    <PassFailReportSheet
      institute={institute}
      branch={branch}
      exam={chosen}
      type={type}
      tables={tables}
      rowsPerPage={rowsPerPage}
      heading={heading}
      columns={columns}
      subjectName={subjectName}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Pass/Fail Report</CardTitle>
          <CardDescription>
            The exam&apos;s students with their results — everyone, those who passed, or those who
            failed and in what.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ExamReportFilterFields filter={f} />
          <FilterField
            label="Section"
            value={section ? String(section.id) : ""}
            onChange={(v) => f.setParam({ section: v })}
            options={f.examSections.map((s) => ({ value: String(s.id), label: s.name }))}
            allLabel="All sections"
            disabled={!chosen}
          />
          <FilterField
            label="Report type"
            required
            value={type}
            onChange={(v) => f.setParam({ type: v === "all" ? "" : v })}
            options={passFailReportTypes.map((t) => ({ value: t.value, label: t.label }))}
          />
          <FilterField
            label="Order by"
            required
            value={order}
            onChange={(v) => f.setParam({ order: v === "merit" ? "" : v })}
            options={passFailReportOrders.map((o) => ({ value: o.value, label: o.label }))}
          />
          {type === "failed" && (
            <FilterField
              label="Subject"
              value={subjectId != null ? String(subjectId) : ""}
              onChange={(v) => f.setParam({ subject: v })}
              options={(chosen?.subjects ?? []).map((s) => ({
                value: String(s.subjectId),
                label: `${subjectName(s.subjectId)} (${subjectLabel(s.subjectId)})`,
              }))}
              allLabel="All subjects"
              disabled={!chosen}
            />
          )}
          <Field>
            <FieldLabel htmlFor="rows-per-page">Rows per page</FieldLabel>
            <Input
              id="rows-per-page"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={String(DEFAULT_ROWS_PER_PAGE)}
              value={f.param("rows")}
              onChange={(e) => f.setParam({ rows: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3 pb-2 sm:col-span-2 lg:col-span-3">
            <Field orientation="horizontal" className="w-auto">
              <Checkbox
                id="show-mobile"
                checked={columns.mobile}
                onCheckedChange={(checked) => f.setParam({ mobile: checked === true ? "" : "hide" })}
              />
              <FieldLabel htmlFor="show-mobile">Show mobile</FieldLabel>
            </Field>
            <Field orientation="horizontal" className="w-auto">
              <Checkbox
                id="show-section"
                checked={columns.section}
                onCheckedChange={(checked) => f.setParam({ sections: checked === true ? "" : "hide" })}
              />
              <FieldLabel htmlFor="show-section">Show section</FieldLabel>
            </Field>
            {results && (
              <Field orientation="horizontal" className="w-auto">
                <Checkbox
                  id="show-group-position"
                  checked={columns.groupPosition}
                  onCheckedChange={(checked) => f.setParam({ groupPosition: checked === true ? "show" : "" })}
                />
                <FieldLabel htmlFor="show-group-position">Show group position</FieldLabel>
              </Field>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>{passFailReportTypes.find((t) => t.value === type)!.title}</CardTitle>
            <CardDescription>
              {tables && chosen && !empty
                ? `${chosen.fullName} · ${heading.section === "All" ? "all sections" : heading.section} · ${studentCount} student${studentCount === 1 ? "" : "s"}`
                : "Only exams with a generated merit list can be reported."}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={!sheet}>
              <DownloadIcon data-icon="inline-start" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => window.print()} disabled={!sheet}>
              <PrinterIcon data-icon="inline-start" />
              Print
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {sheet ? (
            <div className="overflow-x-auto rounded-md border p-4">
              <div className="min-w-[48rem]">{sheet}</div>
            </div>
          ) : (
            <ExamReportEmpty filter={f} empty={!!empty} emptyMessage="No result found" />
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="356mm 216mm">{sheet}</PrintArea>}
    </div>
  )
}
