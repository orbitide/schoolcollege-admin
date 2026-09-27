"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeftIcon, ArrowRightLeftIcon, PencilIcon } from "lucide-react"

import {
  classRollLabel,
  initials,
  studentIdLabel,
  useStudentLookups,
} from "@/components/students/student-lookups"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { publicExams } from "@/lib/institutes"
import { useInstitute } from "@/lib/institutes-store"
import { currentEnrolment, useStudent } from "@/lib/students"

// Read-only view of everything recorded for a student.
export function StudentProfile({ id }: { id: number }) {
  const student = useStudent(id)
  const institute = useInstitute(student?.instituteId ?? -1)
  const name = useStudentLookups()

  if (!student || !institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Student not found</h2>
        <p className="text-sm text-muted-foreground">It may have been deleted.</p>
        <Button asChild variant="outline" size="sm">
          <Link href="/students">Back to students</Link>
        </Button>
      </div>
    )
  }

  const enrolment = currentEnrolment(student)
  const boardResults = publicExams.filter((exam) => student.board[exam])
  const date = (value: string) =>
    value
      ? new Date(`${value}T00:00:00`).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—"

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="ghost" size="sm" className="w-fit">
          <Link href={`/students?institute=${institute.id}`}>
            <ArrowLeftIcon data-icon="inline-start" />
            Students
          </Link>
        </Button>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${student.id}/transfer?returnTo=${encodeURIComponent(`/students/${student.id}`)}`}>
              <ArrowRightLeftIcon data-icon="inline-start" />
              Transfer
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/students/${student.id}/edit?returnTo=${encodeURIComponent(`/students/${student.id}`)}`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-center gap-4">
          <Avatar className="size-20">
            {student.imageUrl && <AvatarImage src={student.imageUrl} alt={student.name} />}
            <AvatarFallback className="text-xl">{initials(student.name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-semibold tracking-tight">{student.name}</h2>
              <StatusBadge status={student.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {studentIdLabel(institute)} {student.studentIdentificationNo} ·{" "}
              <Link href={`/institutes/${institute.id}`} className="underline-offset-4 hover:underline">
                {institute.name}
              </Link>
            </p>
            {enrolment && (
              <p className="text-sm">
                {name("class", enrolment.classId)}
                {enrolment.sectionId != null && `, Section ${name("section", enrolment.sectionId)}`}
                {enrolment.classRoll && ` · ${classRollLabel(institute)} ${enrolment.classRoll}`}
                {` · ${name("year", enrolment.yearId)}`}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 @4xl/main:grid-cols-2">
        <Info
          title="Basic information"
          rows={[
            ["Gender", student.gender],
            ["Date of birth", date(student.dateOfBirth)],
            ["Blood group", student.bloodGroup || "—"],
            ["Religion", student.religion || "—"],
            ["Mobile", student.primaryMobile || "—"],
            ["Home district", name("district", student.districtId)],
            ...(institute.enableStudentCategory
              ? [[institute.studentCategoryLabel.trim() || "Category", name("category", student.categoryId)] as [string, string]]
              : []),
            ["Admitted", date(student.admittedAt)],
          ]}
        />

        {enrolment && (
          <Info
            title="Academic information"
            description={`For ${name("year", enrolment.yearId)}`}
            rows={[
              ...(institute.enableMedium ? [["Medium", enrolment.medium || "—"] as [string, string]] : []),
              ["Class", name("class", enrolment.classId)],
              ["Section", name("section", enrolment.sectionId)],
              ...(institute.enableBranch ? [["Branch", name("branch", enrolment.branchId)] as [string, string]] : []),
              ...(institute.enableShift ? [["Shift", name("shift", enrolment.shiftId)] as [string, string]] : []),
              ...(institute.enableVersion ? [["Version", enrolment.version || "—"] as [string, string]] : []),
              ...(institute.enableGroup ? [["Group", name("group", enrolment.groupId)] as [string, string]] : []),
              ...(enrolment.sessionId != null ? [["Session", name("session", enrolment.sessionId)] as [string, string]] : []),
              [classRollLabel(institute), enrolment.classRoll || "—"],
              ["Student type", enrolment.studentType],
              ...(institute.enableStudentHouse
                ? [[institute.studentHouseLabel.trim() || "House", name("house", enrolment.houseId)] as [string, string]]
                : []),
              ["Bank ID", enrolment.bankId || "—"],
            ]}
          />
        )}

        <Card>
          <CardHeader>
            <CardTitle>Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            {enrolment?.subjectIds.length ? (
              <div className="flex flex-wrap gap-2">
                {enrolment.subjectIds.map((subjectId) => (
                  <Badge key={subjectId} variant="outline">
                    {name("subject", subjectId)}
                    {enrolment.optionalSubjectId === subjectId && " (4th)"}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No subjects recorded.</p>
            )}
          </CardContent>
        </Card>

        <Info
          title="Personal information"
          rows={[
            ["Email", student.email || "—"],
            ["Present address", student.presentAddress || "—"],
            ["Permanent address", student.isSameAs ? "Same as present" : student.permanentAddress || "—"],
            ["Medical history", student.medicalHistory || "—"],
            ["Hobby", student.hobby || "—"],
          ]}
        />

        <Info
          title="Parents & guardian"
          description={`Primary contact: ${student.primaryCommunicationPerson}`}
          rows={[
            ["Father", joined(student.fatherName, student.fatherProfession)],
            ["Father's mobile", student.fatherMobile || "—"],
            ["Mother", joined(student.motherName, student.motherProfession)],
            ["Mother's mobile", student.motherMobile || "—"],
            ["Guardian", joined(student.guardianName, student.guardianRelation)],
            ["Guardian's mobile", student.guardianMobile || "—"],
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>Board results</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {boardResults.length ? (
              boardResults.map((exam) => {
                const result = student.board[exam]!
                return (
                  <div key={exam} className="flex flex-col gap-1">
                    <span className="font-medium">
                      {exam} {result.passingYear} · GPA {result.gpa || "—"}
                    </span>
                    <span className="text-muted-foreground">
                      {[
                        result.board && `${result.board} board`,
                        result.roll && `Roll ${result.roll}`,
                        result.registrationNo && `Reg. ${result.registrationNo}`,
                        result.eiin && `EIIN ${result.eiin}`,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </div>
                )
              })
            ) : (
              <p className="text-muted-foreground">No board results recorded.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {student.enrolments.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Enrolment history</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 text-sm">
            {student.enrolments.map((e) => (
              <span key={e.yearId}>
                {name("year", e.yearId)}: {name("class", e.classId)}, Section {name("section", e.sectionId)}, Roll{" "}
                {e.classRoll || "—"}
              </span>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function joined(...parts: string[]) {
  return parts.filter((part) => part.trim()).join(", ") || "—"
}

function Info({
  title,
  description,
  rows,
}: {
  title: string
  description?: string
  rows: [string, React.ReactNode][]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[auto_1fr]">
          {rows.map(([label, value]) => (
            <React.Fragment key={label}>
              <dt className="text-muted-foreground">{label}</dt>
              <dd>{value}</dd>
            </React.Fragment>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
