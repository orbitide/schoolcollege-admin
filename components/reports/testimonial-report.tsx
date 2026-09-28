"use client"

import Link from "next/link"
import { AwardIcon, PrinterIcon } from "lucide-react"

import { classRollLabel } from "@/components/students/student-lookups"
import { TestimonialFilterFields, useTestimonialFilter } from "@/components/students/testimonial-filter"
import { FilterField } from "@/components/term-exams/term-exam-fields"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TESTIMONIAL_BATCH, testimonialBatches, testimonialRows } from "@/lib/testimonials"

const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// Legacy RptResult/Testimonial: pick a class's examinees of a public exam
// and year — one by board roll, or a batch of 100 at a time — and the issue
// date, then print their testimonials (the certificate Manage Testimonial
// prints). Everything lives in the URL.
export function TestimonialReport() {
  const f = useTestimonialFilter()
  const { students, institute, selectedClass, exam, examinee, filter, base, param, setParam } = f

  const issued = param("issued") || today()
  const roll = param("roll")
  const rollInvalid = !!roll && !/^\d+$/.test(roll)
  const all = filter && !rollInvalid ? testimonialRows(students, filter) : []
  const matched = roll ? all.filter((r) => r.result.roll.trim() === roll) : all
  const batches = testimonialBatches(matched.length)
  const batch = batches.find((b) => String(b.from) === param("from")) ?? batches[0]
  const shown = batch ? matched.slice(batch.from - 1, batch.from - 1 + TESTIMONIAL_BATCH) : []

  const printHref = `/print/testimonial?${f.printQuery({
    roll,
    issued,
    from: batches.length > 1 && batch ? String(batch.from) : "",
  })}`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="text-lg">Testimonial</CardTitle>
          <CardDescription>
            Print the testimonials of a class&apos;s examinees in a public exam — all of them, in
            batches of {TESTIMONIAL_BATCH}, or one by board roll — with the date they&apos;re issued.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TestimonialFilterFields filter={f} />
          <Field>
            <FieldLabel htmlFor="testimonial-issued">
              Issue date
              <span className="text-destructive" aria-hidden>
                *
              </span>
            </FieldLabel>
            <Input
              id="testimonial-issued"
              type="date"
              value={issued}
              onChange={(e) => setParam({ issued: e.target.value === today() ? "" : e.target.value })}
            />
          </Field>
          <Field data-invalid={rollInvalid}>
            <FieldLabel htmlFor="testimonial-roll">Board roll</FieldLabel>
            <Input
              id="testimonial-roll"
              inputMode="numeric"
              placeholder="All examinees, or one board roll"
              value={roll}
              onChange={(e) => setParam({ roll: e.target.value.trim(), from: "" })}
              aria-invalid={rollInvalid}
              disabled={!filter}
            />
            {rollInvalid && <FieldError>Invalid Roll</FieldError>}
          </Field>
          {batches.length > 1 && (
            <FilterField
              label="Examinees"
              value={batch ? String(batch.from) : ""}
              onChange={(v) => setParam({ from: v === "1" ? "" : v })}
              options={batches.map((b) => ({ value: String(b.from), label: b.label }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-col gap-1">
            <CardTitle>
              {filter ? `${selectedClass?.name} · ${exam} ${examinee}` : "Testimonials"}
            </CardTitle>
            <CardDescription>
              {shown.length
                ? `${shown.length} testimonial${shown.length === 1 ? "" : "s"} to print${batches.length > 1 && batch ? ` (${batch.label} of ${matched.length})` : ""}, issued ${new Date(`${issued}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })}`
                : "Pick a class, its exam type and examinee year."}
            </CardDescription>
          </div>
          {shown.length > 0 && (
            <Button asChild size="sm">
              <Link href={printHref}>
                <PrinterIcon data-icon="inline-start" />
                Print testimonials
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {shown.length ? (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    <TableHead>{classRollLabel(institute)}</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Board roll</TableHead>
                    <TableHead>Registration no.</TableHead>
                    <TableHead>Board</TableHead>
                    <TableHead className="text-right">GPA</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map(({ student, enrolment, result }, i) => (
                    <TableRow key={student.id}>
                      <TableCell className="tabular-nums text-muted-foreground">{(batch?.from ?? 1) + i}</TableCell>
                      <TableCell className="tabular-nums">{enrolment.classRoll || "—"}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">{student.name}</TableCell>
                      <TableCell className="tabular-nums">{result.roll || "—"}</TableCell>
                      <TableCell className="tabular-nums">{result.registrationNo || "—"}</TableCell>
                      <TableCell>{result.board || "—"}</TableCell>
                      <TableCell className="text-right tabular-nums">{result.gpa || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <AwardIcon className="size-8 text-muted-foreground" />
              <p className="font-medium">
                {rollInvalid
                  ? "Invalid Roll"
                  : filter
                    ? roll
                      ? `No examinee with board roll ${roll}`
                      : "No data found"
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
    </div>
  )
}
