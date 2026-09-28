"use client"

import Link from "next/link"
import {
  CalendarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react"

import { kindLabels } from "@/components/institutes/academic/kinds"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  academicMediums,
  academicVersions,
  formatDate,
  planLimits,
  planPrices,
  type HolidayEvent,
  type Institute,
} from "@/lib/institutes"
import {
  branchStore,
  categoryStore,
  classStore,
  groupStore,
  houseStore,
  letterGradeStore,
  resultRemarkStore,
  sectionStore,
  shiftStore,
  subjectStore,
  yearStore,
} from "@/lib/academic-store"
import { formatDateRange, holidayStore } from "@/lib/holidays"
import { useInstitute } from "@/lib/institutes-store"
import { useStudents } from "@/lib/students"

// Dummy activity feed until audit logs come from the API.
function activityFor(institute: Institute) {
  return [
    { label: "Monthly invoice paid", date: "2026-09-01" },
    { label: `${institute.principal} signed in`, date: "2026-08-28" },
    { label: "Exam results published", date: "2026-08-20" },
    { label: `Upgraded to ${institute.plan} plan`, date: "2026-07-12" },
    { label: "Institute created", date: institute.joinedAt },
  ]
}

export function InstituteDetail({ id }: { id: number }) {
  const institute = useInstitute(id)
  const branches = branchStore.useList(id)
  const shifts = shiftStore.useList(id)
  const groups = groupStore.useList(id)
  const classes = classStore.useList(id)
  const sections = sectionStore.useList(id)
  const subjects = subjectStore.useList(id)
  const students = useStudents().filter((student) => student.instituteId === id)
  const houses = houseStore.useList(id)
  const categories = categoryStore.useList(id)
  const currentYear = yearStore.useList(id).find((year) => year.isCurrent)
  const grades = letterGradeStore.useList(id)
  const remarks = resultRemarkStore.useList(id)
  const nextHoliday = nextOccurrence(holidayStore.useList(id))

  if (!institute) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h2 className="text-xl font-semibold">Institute not found</h2>
        <p className="text-sm text-muted-foreground">
          It may have been deleted.
        </p>
        <Button asChild variant="outline" size="sm">
          <Link href="/institutes">Back to institutes</Link>
        </Button>
      </div>
    )
  }

  const config = institute.configuration
  const houseLabels = kindLabels("houses", institute)
  const categoryLabels = kindLabels("categories", institute)
  const limits = planLimits[institute.plan]
  const monthly = planPrices[institute.plan]
  const billed =
    institute.billingCycle === "Yearly"
      ? `$${(monthly * 10).toLocaleString()} / year`
      : `$${monthly} / month`

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="grid gap-4 @4xl/main:grid-cols-3">
        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Usage</CardTitle>
            <CardDescription>
              Against the limits of the {institute.plan} plan
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <UsageBar
              label="Students"
              used={institute.students}
              limit={limits.students}
            />
            <UsageBar
              label="Teachers"
              used={institute.teachers}
              limit={limits.teachers}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Subscription</CardTitle>
            <CardDescription>Billing details</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Plan">
              <Badge variant="outline">{institute.plan}</Badge>
            </Row>
            <Row label="Billing cycle">{institute.billingCycle}</Row>
            <Row label="Amount">{billed}</Row>
            <Row label="Next invoice">Oct 1, 2026</Row>
            <Row label="Account manager">{institute.manager}</Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contact</CardTitle>
            <CardDescription>Primary institute contact</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <ContactLine icon={<UserIcon />}>{institute.principal}</ContactLine>
            <ContactLine icon={<MailIcon />}>{institute.email}</ContactLine>
            {institute.otherEmails && (
              <ContactLine icon={<MailIcon />}>
                {institute.otherEmails}
              </ContactLine>
            )}
            <ContactLine icon={<PhoneIcon />}>
              {institute.phone || "—"}
            </ContactLine>
            <ContactLine icon={<MapPinIcon />}>
              {institute.address || institute.city || "—"}
            </ContactLine>
            <ContactLine icon={<GlobeIcon />}>
              {institute.subdomain}.sms.app
            </ContactLine>
            <ContactLine icon={<CalendarIcon />}>
              Joined {formatDate(institute.joinedAt)}
            </ContactLine>
          </CardContent>
        </Card>

        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <CardDescription>Latest events for this institute</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col">
              {activityFor(institute).map((item, index) => (
                <li key={item.label}>
                  {index > 0 && <Separator className="my-3" />}
                  <div className="flex items-center justify-between gap-4 text-sm">
                    <span>{item.label}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {formatDate(item.date)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="@4xl/main:col-span-2">
          <CardHeader>
            <CardTitle>Academic settings</CardTitle>
            <CardDescription>Calendar and enabled structures</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-3 text-sm @xl/main:grid-cols-2">
            <Row label="Students">
              <ManageLink
                href={`/students?institute=${institute.id}`}
                count={students.length}
                noun="student"
                plural="students"
              />
            </Row>
            <Row label="Current academic year">
              <Link
                href={`/institutes/${institute.id}/years`}
                className="underline-offset-4 hover:underline"
              >
                {currentYear ? currentYear.name : "Not set"}
              </Link>
            </Row>
            <Row label="Classes">
              <ManageLink
                href={`/institutes/${institute.id}/classes`}
                count={classes.length}
                noun="class"
                plural="classes"
              />
            </Row>
            <Row label="Sections">
              <ManageLink
                href={`/institutes/${institute.id}/sections`}
                count={sections.length}
                noun="section"
                plural="sections"
              />
            </Row>
            <Row label="Subjects">
              <ManageLink
                href={`/institutes/${institute.id}/subjects`}
                count={subjects.length}
                noun="subject"
                plural="subjects"
              />
            </Row>
            <Row label="Letter grades">
              <ManageLink
                href={`/institutes/${institute.id}/grades`}
                count={grades.length}
                noun="grade"
                plural="grades"
              />
            </Row>
            <Row label="Result remarks">
              <ManageLink
                href={`/institutes/${institute.id}/remarks`}
                count={remarks.length}
                noun="remark"
                plural="remarks"
              />
            </Row>
            <Row label="Next holiday">
              <Link
                href={`/institutes/${institute.id}/holidays`}
                className="underline-offset-4 hover:underline"
              >
                {nextHoliday
                  ? `${nextHoliday.name} · ${formatDateRange(nextHoliday.startDate, nextHoliday.endDate)}`
                  : "None scheduled"}
              </Link>
            </Row>
            <Row label="Start day of week">{institute.startDayOfWeek}</Row>
            <Row label="Weekend">
              {institute.weekend.length ? institute.weekend.join(", ") : "—"}
            </Row>
            <Row label="Branch">
              {institute.enableBranch ? (
                <ManageLink
                  href={`/institutes/${institute.id}/branches`}
                  count={branches.length}
                  noun="branch"
                  plural="branches"
                />
              ) : (
                "No"
              )}
            </Row>
            <Row label="Shift">
              {institute.enableShift ? (
                <ManageLink
                  href={`/institutes/${institute.id}/shifts`}
                  count={shifts.length}
                  noun="shift"
                  plural="shifts"
                />
              ) : (
                "No"
              )}
            </Row>
            <Row label="Group">
              {institute.enableGroup ? (
                <ManageLink
                  href={`/institutes/${institute.id}/groups`}
                  count={groups.length}
                  noun="group"
                  plural="groups"
                />
              ) : (
                "No"
              )}
            </Row>
            <Row label="Medium">
              {institute.enableMedium ? academicMediums.join(", ") : "No"}
            </Row>
            <Row label="Version">
              {institute.enableVersion ? academicVersions.join(", ") : "No"}
            </Row>
            <Row label="Section gender">
              {yesNo(institute.enableSectionGender)}
            </Row>
            <Row label="Student house">
              {institute.enableStudentHouse ? (
                <ManageLink
                  href={`/institutes/${institute.id}/houses`}
                  count={houses.length}
                  noun={houseLabels.singular.toLowerCase()}
                  plural={houseLabels.plural.toLowerCase()}
                />
              ) : (
                "No"
              )}
            </Row>
            <Row label="Student category">
              {institute.enableStudentCategory ? (
                <ManageLink
                  href={`/institutes/${institute.id}/categories`}
                  count={categories.length}
                  noun={categoryLabels.singular.toLowerCase()}
                  plural={categoryLabels.plural.toLowerCase()}
                />
              ) : (
                "No"
              )}
            </Row>
            <Row label="Show class roll">
              {withLabel(institute.showClassRoll, institute.classRollLabel)}
            </Row>
            <Row label="Auto-increment student ID">
              {institute.enableAutoIncrementStudentId
                ? `From ${institute.autoIncrementStudentIdStartFrom}${
                    institute.studentIdLabel
                      ? ` (${institute.studentIdLabel})`
                      : ""
                  }`
                : "No"}
            </Row>
            <Row label="Principal signature">
              {institute.principalSignatureUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={institute.principalSignatureUrl}
                  alt="Principal signature"
                  className="h-8 object-contain"
                />
              ) : (
                "—"
              )}
            </Row>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuration</CardTitle>
            <CardDescription>Results, reports and SMS</CardDescription>
            <CardAction>
              <Button asChild variant="link" size="sm" className="px-0">
                <Link href={`/institutes/${institute.id}/configuration`}>
                  Manage
                </Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <Row label="Maximum GPA">{config.maximumGpa}</Row>
            <Row label="Optional GPA subtraction">
              {config.optionalGpaSubtraction}
            </Row>
            <Row label="Print page size">{config.printPageSize || "—"}</Row>
            <Row label="SMS mask">{config.smsMask || "—"}</Row>
            <Row label="SMS rate">{config.smsRate.toFixed(2)}</Row>
            <Row label="SMS API key">{config.smsApiKey ? "Set" : "Not set"}</Row>
            <Row label="Absent fine period">
              Day {config.dayFrom} to {config.dayTo}
            </Row>
            <Row label="Teacher role">{config.teacherRole}</Row>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

// The next active holiday from today. Yearly ones are moved to their next date.
function nextOccurrence(holidays: HolidayEvent[]) {
  const today = new Date().toISOString().slice(0, 10)
  const year = Number(today.slice(0, 4))
  const upcoming = holidays
    .filter((holiday) => holiday.status === "Active")
    .map((holiday) => {
      if (holiday.repetition !== "Yearly" || holiday.endDate >= today) return holiday
      const shift = (date: string, to: number) => `${to}${date.slice(4)}`
      const target = shift(holiday.endDate, year) >= today ? year : year + 1
      const span = Number(holiday.endDate.slice(0, 4)) - Number(holiday.startDate.slice(0, 4))
      return {
        ...holiday,
        startDate: shift(holiday.startDate, target - span),
        endDate: shift(holiday.endDate, target),
      }
    })
    .filter((holiday) => holiday.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate))
  return upcoming[0]
}

function ManageLink({
  href,
  count,
  noun,
  plural,
}: {
  href: string
  count: number
  noun: string
  plural: string
}) {
  return (
    <Link href={href} className="underline-offset-4 hover:underline">
      {count} {count === 1 ? noun : plural} · Manage
    </Link>
  )
}

function yesNo(value: boolean) {
  return value ? "Yes" : "No"
}

function withLabel(enabled: boolean, label: string) {
  return enabled ? (label ? `Yes (${label})` : "Yes") : "No"
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string
  used: number
  limit: number
}) {
  const percent = Math.min(100, Math.round((used / limit) * 100))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {used.toLocaleString()} / {limit.toLocaleString()} ({percent}%)
        </span>
      </div>
      <Progress value={percent} />
    </div>
  )
}

function Row({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{children}</span>
    </div>
  )
}

function ContactLine({
  icon,
  children,
}: {
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
      {icon}
      <span className="truncate">{children}</span>
    </div>
  )
}
