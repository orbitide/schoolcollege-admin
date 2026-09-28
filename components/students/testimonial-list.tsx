"use client"

import * as React from "react"
import Link from "next/link"
import { AwardIcon, PencilIcon, PrinterIcon, SearchIcon } from "lucide-react"

import {
  classRollLabel,
  initials,
  useStudentLookups,
} from "@/components/students/student-lookups"
import { TestimonialFilterFields, useTestimonialFilter } from "@/components/students/testimonial-filter"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
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
import { testimonialRows } from "@/lib/testimonials"

// Legacy "Manage Testimonial" (Views/Student/ManageTestimonial.cshtml): the
// students of a class who passed a public exam in a year, to correct their
// details and print their testimonials.
export function TestimonialList() {
  const f = useTestimonialFilter()
  const { students, institute, selectedClass, exam, classGroups, base, examinee, filter, returnTo } = f
  const name = useStudentLookups()

  const [query, setQuery] = React.useState("")
  const needle = query.trim().toLowerCase()
  const rows = (filter ? testimonialRows(students, filter) : []).filter(
    ({ student, enrolment, result }) =>
      !needle ||
      [student.name, enrolment.classRoll, result.roll, student.fatherName, student.motherName, student.primaryMobile]
        .some((value) => value.toLowerCase().includes(needle))
  )

  const printQuery = f.printQuery()

  const showBranch = Boolean(institute?.enableBranch)
  const showMedium = Boolean(institute?.enableMedium)
  const showVersion = Boolean(institute?.enableVersion)
  const showGroup = classGroups.length > 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Card>
        <CardHeader className="flex flex-wrap items-start justify-between gap-2 border-b">
          <div className="flex flex-col gap-1">
            <CardTitle className="text-lg">Manage Testimonial</CardTitle>
            <CardDescription>
              Check the details testimonials print, correct them, and print the testimonials
              of a class&apos;s examinees.
            </CardDescription>
          </div>
          {filter && rows.length > 0 && (
            <Button asChild size="sm">
              <Link href={`/print/testimonial?${printQuery}`}>
                <PrinterIcon data-icon="inline-start" />
                Print all ({rows.length})
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <TestimonialFilterFields filter={f} />
        </CardContent>
      </Card>

      {!filter ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <AwardIcon className="size-8 text-muted-foreground" />
            <p className="font-medium">
              {base
                ? `No ${exam} results are recorded for this class yet`
                : "Choose a class to see its examinees"}
            </p>
            <p className="text-sm text-muted-foreground">
              {base
                ? "Add the students' board results on their profiles, then they appear here."
                : "Only classes with testimonials enabled (Basic Settings → Academic Classes) are listed."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle>
                {selectedClass?.name} · {exam} {examinee}
              </CardTitle>
              <CardDescription>
                {rows.length} examinee{rows.length === 1 ? "" : "s"}
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Name, roll, board roll or mobile"
                aria-label="Search examinees"
                className="pl-8"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow>
                    <TableHead className="w-12">Sl</TableHead>
                    {showBranch && <TableHead>Branch</TableHead>}
                    {showMedium && <TableHead>Medium</TableHead>}
                    <TableHead>{classRollLabel(institute)}</TableHead>
                    <TableHead>Full name</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Section</TableHead>
                    {showGroup && <TableHead>Group</TableHead>}
                    {showVersion && <TableHead>Version</TableHead>}
                    <TableHead>Type</TableHead>
                    <TableHead>Passing year</TableHead>
                    <TableHead>Board roll</TableHead>
                    <TableHead>Board registration no.</TableHead>
                    <TableHead className="text-right">GPA</TableHead>
                    <TableHead className="text-right">Total marks</TableHead>
                    <TableHead>Father&apos;s name</TableHead>
                    <TableHead>Mother&apos;s name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Guardian&apos;s mobile</TableHead>
                    <TableHead>Father&apos;s mobile</TableHead>
                    <TableHead>Mother&apos;s mobile</TableHead>
                    <TableHead className="w-44">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length ? (
                    rows.map(({ student, enrolment, result }, index) => (
                      <TableRow key={student.id}>
                        <TableCell className="tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        {showBranch && <TableCell>{name("branch", enrolment.branchId)}</TableCell>}
                        {showMedium && <TableCell>{enrolment.medium || "—"}</TableCell>}
                        <TableCell className="tabular-nums">{enrolment.classRoll || "—"}</TableCell>
                        <TableCell>
                          <Link
                            href={`/students/${student.id}`}
                            className="flex items-center gap-2 font-medium whitespace-nowrap underline-offset-4 hover:underline"
                          >
                            <Avatar className="size-7">
                              {student.imageUrl && <AvatarImage src={student.imageUrl} alt="" />}
                              <AvatarFallback className="text-xs">{initials(student.name)}</AvatarFallback>
                            </Avatar>
                            {student.name}
                          </Link>
                        </TableCell>
                        <TableCell>{student.gender}</TableCell>
                        <TableCell>{name("section", enrolment.sectionId)}</TableCell>
                        {showGroup && <TableCell>{name("group", enrolment.groupId)}</TableCell>}
                        {showVersion && <TableCell>{enrolment.version || "—"}</TableCell>}
                        <TableCell>{exam}</TableCell>
                        <TableCell className="tabular-nums">{result.passingYear}</TableCell>
                        <TableCell className="tabular-nums">{result.roll || "—"}</TableCell>
                        <TableCell className="tabular-nums">{result.registrationNo || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{result.gpa || "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">{result.totalMarks || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{student.fatherName || "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{student.motherName || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.primaryMobile || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.guardianMobile || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.fatherMobile || "—"}</TableCell>
                        <TableCell className="tabular-nums">{student.motherMobile || "—"}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/students/${student.id}/testimonial?type=${encodeURIComponent(exam!)}&returnTo=${encodeURIComponent(returnTo)}`}
                              >
                                <PencilIcon data-icon="inline-start" />
                                Edit
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm">
                              <Link
                                href={`/print/testimonial?${printQuery}&student=${student.id}`}
                              >
                                <PrinterIcon data-icon="inline-start" />
                                Testimonial
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={24} className="h-24 text-center text-muted-foreground">
                        No examinees match.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

