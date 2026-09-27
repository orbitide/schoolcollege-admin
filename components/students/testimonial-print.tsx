"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeftIcon, PrinterIcon } from "lucide-react"

import { useStudentLookups } from "@/components/students/student-lookups"
import { Button } from "@/components/ui/button"
import { classStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import type { Institute } from "@/lib/institutes"
import {
  publicExamNames,
  testimonialEnrolment,
  useStudents,
  type PublicExam,
} from "@/lib/students"
import { testimonialRows, type TestimonialRow } from "@/lib/testimonials"

// Legacy RptResult/Testimonial (Partial/_testimonial*.cshtml): one A4
// certificate per examinee, for printing on the institute's letterhead.
// Opened with the Manage Testimonial filters (every examinee) or with
// ?student= (one).
export function TestimonialPrint() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const students = useStudents()
  const institutes = useAccessibleInstitutes()
  const param = (key: string) => searchParams.get(key) ?? ""
  const exam = param("type") as PublicExam
  const studentId = Number(param("student")) || null
  const single = students.find((s) => s.id === studentId)
  const institute = institutes.find(
    (i) => i.id === (single?.instituteId ?? Number(param("institute")))
  )
  const classes = classStore.useList(institute?.id ?? -1)
  const lookup = useStudentLookups()

  let rows: TestimonialRow[] = []
  if (institute && exam && param("class")) {
    const toId = (value: string) => (value ? Number(value) : null)
    rows = testimonialRows(students, {
      instituteId: institute.id,
      classId: Number(param("class")),
      exam,
      examinee: param("examinee"),
      branchId: toId(param("branch")),
      medium: param("medium"),
      groupId: toId(param("group")),
      version: param("version"),
    })
    if (studentId) rows = rows.filter((row) => row.student.id === studentId)
  } else if (institute && exam && single) {
    const enrolment = testimonialEnrolment(single, exam, classes)
    const result = single.board[exam]
    if (enrolment && result) rows = [{ student: single, enrolment, result }]
  }

  // Serial is the class roll and the issue month, e.g. 1001-09-26.
  const issued = new Date()
  const monthYear = `${String(issued.getMonth() + 1).padStart(2, "0")}-${String(issued.getFullYear()).slice(2)}`

  return (
    <div className="min-h-svh bg-muted/40 print:bg-white">
      <div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-2 border-b bg-background px-4 py-3 print:hidden">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeftIcon data-icon="inline-start" />
          Back
        </Button>
        <p className="text-sm text-muted-foreground">
          {rows.length
            ? `${rows.length} testimonial${rows.length === 1 ? "" : "s"} · ${exam}`
            : "Nothing to print"}
        </p>
        <Button size="sm" onClick={() => window.print()} disabled={!rows.length}>
          <PrinterIcon data-icon="inline-start" />
          Print
        </Button>
      </div>

      {!institute || !rows.length ? (
        <p className="p-10 text-center text-sm text-muted-foreground">
          No examinee matches. Go back and pick a class, type and examinee year.
        </p>
      ) : (
        <div className="flex flex-col items-center gap-6 py-6 print:block print:p-0">
          {rows.map((row) => (
            <Certificate
              key={row.student.id}
              institute={institute}
              row={row}
              exam={exam}
              serial={`${row.enrolment.classRoll || row.student.studentIdentificationNo}-${monthYear}`}
              issued={issued}
              session={
                row.enrolment.sessionId != null
                  ? lookup("session", row.enrolment.sessionId)
                  : ""
              }
              group={row.enrolment.groupId != null ? lookup("group", row.enrolment.groupId) : ""}
            />
          ))}
        </div>
      )}
      {/* A4 portrait, leaving the top of the page for the pre-printed letterhead. */}
      <style>{`@media print { @page { size: A4 portrait; margin: 0; } }`}</style>
    </div>
  )
}

function Certificate({
  institute,
  row,
  exam,
  serial,
  issued,
  session,
  group,
}: {
  institute: Institute
  row: TestimonialRow
  exam: PublicExam
  serial: string
  issued: Date
  session: string
  group: string
}) {
  const { student, enrolment, result } = row
  const female = student.gender === "Female"
  const he = female ? "she" : "he"
  const He = female ? "She" : "He"
  const him = female ? "her" : "him"
  const place = /college/i.test(institute.type)
    ? "college"
    : /madrasa/i.test(institute.type)
      ? "madrasa"
      : "school"
  const version = enrolment.version.replace(/ Version$/, "")
  const boardText = ["O Level", "A Level"].includes(exam)
    ? `under ${result.board || "the examining board"}`
    : `under the Board of Intermediate and Secondary Education, ${result.board || "—"}`
  const strong = (value: string) => <strong className="uppercase">{value || "—"}</strong>

  return (
    <article className="flex aspect-[210/297] w-full max-w-[210mm] flex-col bg-white px-[25mm] pt-[20mm] pb-[25mm] font-serif text-[17px] leading-[1.9] text-black shadow-sm print:max-w-none print:break-after-page print:shadow-none">
      <header className="flex flex-col items-center gap-1 border-b-2 border-double border-black pb-4 text-center">
        {institute.logoUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={institute.logoUrl} alt="" className="mb-1 h-16 w-auto object-contain" />
        )}
        <h1 className="text-2xl leading-tight font-bold uppercase">{institute.name}</h1>
        <p className="text-sm leading-snug">{institute.address}</p>
        <p className="text-sm leading-snug">
          EIIN: {institute.eiin}
          {institute.phone && ` · Phone: ${institute.phone}`}
          {institute.email && ` · ${institute.email}`}
        </p>
      </header>

      <div className="mt-6 flex justify-between text-[15px]">
        <span>Serial: {serial}</span>
        <span>
          Issue Date:{" "}
          {issued.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}
        </span>
      </div>

      <h2 className="mt-8 text-center text-2xl font-bold tracking-[0.3em] underline underline-offset-8">
        TESTIMONIAL
      </h2>

      <p className="mt-8 text-justify indent-12">
        This is to certify that {strong(student.name)} {female ? "daughter" : "son"} of (Father){" "}
        {strong(student.fatherName)} and (Mother) {strong(student.motherName)} of this {place}{" "}
        bearing Roll No. <strong>{result.roll || "—"}</strong> Registration No.{" "}
        <strong>{result.registrationNo || "—"}</strong>
        {session && (
          <>
            {" "}Session <strong>{session}</strong>
          </>
        )}{" "}
        duly passed the <strong>{publicExamNames[exam]}</strong> Examination held in{" "}
        <strong>{result.passingYear}</strong> {boardText}
        {group && (
          <>
            {" "}in Group <strong>{group}</strong>
          </>
        )}
        {version && (
          <>
            {" "}Version <strong>{version}</strong>
          </>
        )}{" "}
        and obtained GPA <strong>{result.gpa || "—"}</strong> out of 5.00.
      </p>
      <p className="mt-4 text-justify indent-12">
        {He} bears a good moral character and to the best of my knowledge, {he} did not take part
        in any activity subversive of the state or of discipline.
      </p>
      <p className="mt-4 indent-12">I wish {him} every success in life.</p>

      <footer className="mt-auto flex items-end justify-between pt-16 text-[15px]">
        <div className="flex flex-col items-center">
          <span className="mb-1 h-12" />
          <span className="border-t border-black px-6 pt-1">Verified by</span>
        </div>
        <div className="flex flex-col items-center text-center leading-snug">
          {institute.principalSignatureUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={institute.principalSignatureUrl} alt="" className="mb-1 h-12 w-auto object-contain" />
          ) : (
            <span className="mb-1 h-12" />
          )}
          <span className="border-t border-black px-6 pt-1 font-semibold">{institute.principal}</span>
          <span>Principal</span>
          <span>{institute.name}</span>
        </div>
      </footer>
    </article>
  )
}
