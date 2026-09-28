"use client"

import { AwardIcon, PrinterIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { useStudentLookups } from "@/components/students/student-lookups"
import { TestimonialFilterFields, useTestimonialFilter } from "@/components/students/testimonial-filter"
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
import { branchStore } from "@/lib/academic-store"
import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import type { PublicExam } from "@/lib/students"
import { testimonialRows, type TestimonialRow } from "@/lib/testimonials"
import { cn, parseInlineStyle } from "@/lib/utils"

// Legacy TotalDisplay / FontSize defaults.
const DEFAULT_ROWS = 25
const DEFAULT_FONT_SIZE = 13

// Legacy Partial/_testimonialCollectionSheet: the examinees — split by group
// when the class has groups — in pages of `rowsPerPage`, each with the
// institute heading, passing year, group and date, the board roll,
// registration, name, class roll, section and GPA, and a blank Signature
// column to sign on collecting the testimonial. Serials run on across pages.
function CollectionSheet({
  institute,
  branch,
  academicClass,
  exam,
  examinee,
  rows,
  rowsPerPage,
  fontSize,
  name,
}: {
  institute: Institute
  branch?: Branch
  academicClass: AcademicClass
  exam: PublicExam
  examinee: string
  rows: TestimonialRow[]
  rowsPerPage: number
  fontSize: number
  name: (kind: "group" | "section", id: number | null) => string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1 py-0.5 text-center"
  const date = new Date().toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })

  // Legacy groups by the student's group when the class has groups, else one list.
  const groups = new Map<number | null, TestimonialRow[]>()
  for (const row of rows) {
    const key = academicClass.hasSubjectGroup ? row.enrolment.groupId : null
    groups.set(key, [...(groups.get(key) ?? []), row])
  }
  const pages = [...groups].flatMap(([groupId, list]) =>
    Array.from({ length: Math.ceil(list.length / rowsPerPage) }, (_, p) => ({
      groupId,
      rows: list.slice(p * rowsPerPage, (p + 1) * rowsPerPage),
    }))
  )
  let serial = 0

  return (
    <div className="flex flex-col gap-10 bg-white font-serif text-black">
      {pages.map((page, p) => (
        <section key={p} className="flex break-after-page flex-col gap-3 last:break-after-auto">
          <header className="flex items-center justify-center gap-5">
            <div style={{ width: logoWidth }} className="shrink-0">
              {institute.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={institute.logoUrl} alt="" className="h-auto w-full" />
              )}
            </div>
            <div className="flex flex-col items-center text-center">
              <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
              <p className="text-sm">{branch?.address || institute.address}</p>
              <h2 style={parseInlineStyle(config.reportNameStyle)}>Testimonial Collection Sheet</h2>
            </div>
            <div style={{ width: logoWidth }} className="shrink-0" />
          </header>

          <div className="flex flex-wrap items-center justify-between gap-2 text-base">
            <span className="flex items-center gap-2">
              {exam} Passing Year:
              <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
                {examinee}
              </strong>
            </span>
            {academicClass.hasSubjectGroup && (
              <span className="flex items-center gap-2">
                Group:
                <strong className="border border-black px-3 py-0.5" style={{ color: highlight }}>
                  {page.groupId != null ? name("group", page.groupId) : "—"}
                </strong>
              </span>
            )}
            <span className="flex items-center gap-2">
              Date:
              <strong className="border border-black px-3 py-0.5 text-red-800">{date}</strong>
            </span>
          </div>

          <table className="w-full border-collapse" style={{ fontSize }}>
            <thead>
              <tr>
                <th className={cn(td, "w-[5%]")}>SL</th>
                <th className={cn(td, "w-[9%]")}>{exam} Roll</th>
                <th className={cn(td, "w-[11%]")}>Registration No.</th>
                <th className={td}>Student Name</th>
                <th className={cn(td, "w-[9%]")}>Class Roll</th>
                <th className={cn(td, "w-[7%]")}>Section</th>
                <th className={cn(td, "w-[6%]")}>GPA</th>
                <th className={cn(td, "w-[20%]")}>Signature</th>
              </tr>
            </thead>
            <tbody>
              {page.rows.map(({ student, enrolment, result }) => (
                <tr key={student.id} className="h-7">
                  <td className={td}>{++serial}</td>
                  <td className={td}>{result.roll}</td>
                  <td className={td}>{result.registrationNo}</td>
                  <td className={cn(td, "max-w-0 truncate text-left")}>{student.name}</td>
                  <td className={td}>{enrolment.classRoll}</td>
                  <td className={td}>{name("section", enrolment.sectionId)}</td>
                  <td className={td}>{result.gpa}</td>
                  <td className={td} />
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-right text-sm font-bold">
            Page {p + 1} of {pages.length}
          </p>
        </section>
      ))}
    </div>
  )
}

// Legacy RptResult/TestimonialCollectionSheet: pick a class's examinees of
// a public exam and year and print a sheet for them to sign on collecting
// their testimonials, with the rows per page and font size to fit the
// paper. Everything lives in the URL.
export function TestimonialCollectionSheet() {
  const f = useTestimonialFilter()
  const { students, institute, selectedClass, exam, examinee, filter, base, param, setParam } = f
  const name = useStudentLookups()
  const branches = branchStore.useList(institute?.id ?? -1)

  const positive = (key: string, fallback: number) => {
    const n = Number.parseInt(param(key), 10)
    return n > 0 ? n : fallback
  }
  const rowsPerPage = positive("rows", DEFAULT_ROWS)
  const fontSize = positive("font", DEFAULT_FONT_SIZE)
  const rows = filter ? testimonialRows(students, filter) : []
  const branch = param("branch") ? branches.find((b) => String(b.id) === param("branch")) : undefined

  const sheet = institute && selectedClass && exam && examinee && rows.length > 0 && (
    <CollectionSheet
      institute={institute}
      branch={branch}
      academicClass={selectedClass}
      exam={exam}
      examinee={examinee}
      rows={rows}
      rowsPerPage={rowsPerPage}
      fontSize={fontSize}
      name={name}
    />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Testimonial Collection Sheet</CardTitle>
          <CardDescription>
            A sheet of a class&apos;s examinees to sign when they collect their testimonials.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TestimonialFilterFields filter={f} />
          <Field>
            <FieldLabel htmlFor="collection-rows">Rows per page</FieldLabel>
            <Input
              id="collection-rows"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={String(DEFAULT_ROWS)}
              value={param("rows")}
              onChange={(e) => setParam({ rows: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="collection-font">Font size (px)</FieldLabel>
            <Input
              id="collection-font"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder={String(DEFAULT_FONT_SIZE)}
              value={param("font")}
              onChange={(e) => setParam({ font: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>{filter ? `${selectedClass?.name} · ${exam} ${examinee}` : "Testimonial Collection Sheet"}</CardTitle>
            <CardDescription>
              {sheet
                ? `${rows.length} examinee${rows.length === 1 ? "" : "s"} · ${rowsPerPage} per page · print on A4`
                : "Pick a class, its exam type and examinee year."}
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
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AwardIcon className="size-8 text-muted-foreground" />
              <p className="font-medium">
                {filter
                  ? "No data found"
                  : base
                    ? `No ${exam} results are recorded for this class yet`
                    : "Choose a class to see its examinees"}
              </p>
              {!filter && (
                <p className="text-sm text-muted-foreground">
                  Only classes with testimonials enabled (Basic Settings → Academic Classes) are listed.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="210mm 297mm">{sheet}</PrintArea>}
    </div>
  )
}
