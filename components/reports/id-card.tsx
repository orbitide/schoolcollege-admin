"use client"

import { CircleAlertIcon, PrinterIcon, UserIcon } from "lucide-react"

import { PrintArea } from "@/components/reports/print-area"
import { SectionStudentFilterFields, useSectionStudentFilter } from "@/components/reports/section-student-filter"
import { useStudentLookups } from "@/components/students/student-lookups"
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
import { classYearSubjectStore } from "@/lib/academic-store"
import type { Institute } from "@/lib/institutes"
import { studentInformation } from "@/lib/student-information"
import { useStudents, type Enrolment, type Student } from "@/lib/students"

// Legacy _BafsdIdCard colours.
const BAND = "#00bfff"

type IdCardRow = { student: Student; enrolment: Enrolment; className: string; sectionName: string }

// Legacy Partial/_BafsdIdCard: a CR80 card (86 × 54 mm) per student — the
// institute band, photo, roll (or ID), name, class and section, bank ID,
// blood group, parents, validity, an emergency number (father, then mother,
// then guardian) and the principal's signature. One card to a printed page,
// for a card printer. Sized in mm, so the screen shows it at print size.
function IdCardSheet({ institute, rows, validity }: { institute: Institute; rows: IdCardRow[]; validity: string }) {
  const line = "truncate px-[1.2mm] text-left font-bold"
  return (
    <div className="flex flex-wrap justify-center gap-4 print:block">
      {rows.map(({ student, enrolment: e, className, sectionName }) => {
        const emergency = student.fatherMobile || student.motherMobile || student.guardianMobile || "-"
        return (
          <section
            key={student.id}
            className="flex h-[54mm] w-[86mm] shrink-0 break-after-page flex-col overflow-hidden border border-neutral-300 bg-white font-serif leading-[1.2] text-black print:border-0 last:break-after-auto"
          >
            <header className="flex items-center gap-[2mm] px-[3mm] py-[0.8mm] text-white" style={{ background: BAND }}>
              {institute.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={institute.logoUrl} alt="" className="w-[10mm] shrink-0" />
              )}
              <div className="min-w-0 flex-1 text-center">
                <p className="truncate text-[4mm] font-bold">{institute.name}</p>
                <p className="truncate text-[2.6mm]">{institute.address}</p>
              </div>
            </header>

            <div className="flex min-h-0 flex-1 gap-[1mm] p-[1mm]">
              <div
                className="flex h-[18.5mm] w-[17mm] shrink-0 items-center justify-center border-2"
                style={{ borderColor: BAND }}
              >
                {student.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={student.imageUrl} alt="" className="size-full object-cover" />
                ) : (
                  <UserIcon className="size-[10mm] text-neutral-400" aria-hidden />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col justify-between text-[2.5mm]">
                <p className="mx-auto bg-red-600 px-[1.5mm] text-[2.95mm] font-bold text-white">
                  {institute.showClassRoll && e.classRoll
                    ? `Student Roll # ${e.classRoll}`
                    : `Student ID # ${student.studentIdentificationNo || "-"}`}
                </p>
                <p className={`${line} text-[2.95mm] text-blue-900`}>{student.name || "-"}</p>
                <div className="grid grid-cols-2 text-[2.7mm]">
                  <p className={line}>Class: {className}</p>
                  <p className={line}>Section: {sectionName}</p>
                  <p className={line}>Bank ID: {e.bankId || "-"}</p>
                  <p className={`${line} text-red-600`}>Blood: {student.bloodGroup || "-"}</p>
                </div>
                <p className={line}>Father&apos;s Name: {student.fatherName || "-"}</p>
                <p className={line}>Mother&apos;s Name: {student.motherName || "-"}</p>
                <p className={`${line} text-green-700`}>Validity: {validity}</p>
                <div className="flex items-end justify-between gap-1">
                  <p className={line}>Emergency Call: {emergency}</p>
                  {institute.principalSignatureUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={institute.principalSignatureUrl} alt="" className="max-h-[4.5mm] max-w-[13mm] shrink-0" />
                  )}
                </div>
              </div>
            </div>

            <footer className="px-[2mm] py-[1.3mm] text-right text-[2.5mm] leading-none font-bold text-white" style={{ background: BAND }}>
              Principal
            </footer>
          </section>
        )
      })}
    </div>
  )
}

// Legacy RptStudent/IDCard: pick a section — and a roll or ID, for one
// student — the date the cards expire and whether the section shows the
// previous class's section too ("both class", e.g. "A-B"), then print the
// cards. The filters live in the URL.
export function IdCard() {
  const f = useSectionStudentFilter()
  const { institute, academicClass, section, selection, rollOrId, rollLabel, param, setParam } = f
  const students = useStudents()
  const name = useStudentLookups()
  const classYearSubjects = classYearSubjectStore.useList(institute?.id ?? -1)

  // Legacy default: the end of this year.
  const defaultExpiry = `${new Date().getFullYear()}-12-31`
  const expiry = /^\d{4}-\d{2}-\d{2}$/.test(param("expire")) ? param("expire") : defaultExpiry
  const validity = new Date(`${expiry}T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "numeric" })
  const bothClass = param("both") === "on"

  const rows: IdCardRow[] | undefined =
    institute && academicClass && section && selection
      ? studentInformation(institute, students, { ...selection, classYearSubjects, subjectRank: () => 0 }).map(
          ({ student, enrolment }) => {
            // The student's section in the class before this one, latest year first.
            const previous =
              bothClass && academicClass.previousClassId != null
                ? [...student.enrolments]
                    .filter((x) => x.classId === academicClass.previousClassId && x.sectionId != null)
                    .sort((a, b) => b.yearId - a.yearId)[0]
                : undefined
            return {
              student,
              enrolment,
              className: academicClass.name,
              sectionName: previous ? `${name("section", previous.sectionId)}-${section.name}` : section.name,
            }
          }
        )
      : undefined
  const problem =
    f.problem ??
    (rows && !rows.length ? (rollOrId ? `No student found with ${rollLabel} ${rollOrId}` : "No student found") : null)

  const sheet = institute && rows && rows.length > 0 && (
    <IdCardSheet institute={institute} rows={rows} validity={validity} />
  )

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">ID Card</CardTitle>
          <CardDescription>Student ID cards for a section, sized for a card printer (86 × 54 mm).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <SectionStudentFilterFields filter={f} />
          <Field>
            <FieldLabel htmlFor="id-card-expire">Expire date</FieldLabel>
            <Input
              id="id-card-expire"
              type="date"
              value={expiry}
              onChange={(e) => setParam({ expire: e.target.value === defaultExpiry ? "" : e.target.value })}
            />
          </Field>
          <Field orientation="horizontal" className="self-end pb-2">
            <Checkbox
              id="id-card-both"
              checked={bothClass}
              onCheckedChange={(checked) => setParam({ both: checked === true ? "on" : "" })}
            />
            <FieldLabel htmlFor="id-card-both">Both class (previous class&apos;s section too)</FieldLabel>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>ID Card</CardTitle>
            <CardDescription>
              {sheet && section && academicClass
                ? `${academicClass.name} · ${section.name} · ${rows!.length} card${rows!.length === 1 ? "" : "s"}, valid to ${validity}, one to a printed page`
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
            <div className="overflow-x-auto rounded-md border bg-muted/40 p-4">{sheet}</div>
          ) : (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <CircleAlertIcon className="size-4 shrink-0" />
              {problem}
            </p>
          )}
        </CardContent>
      </Card>

      {sheet && <PrintArea pageSize="86mm 54mm" margin="0">{sheet}</PrintArea>}
    </div>
  )
}
