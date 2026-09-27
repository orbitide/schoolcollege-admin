"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  CalendarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PencilIcon,
  PhoneIcon,
  SlidersHorizontalIcon,
  UserIcon,
} from "lucide-react"

import { InstituteActions } from "@/components/institutes/institute-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
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
  type Institute,
} from "@/lib/institutes"
import { branchStore, shiftStore } from "@/lib/academic-store"
import { useInstitute } from "@/lib/institutes-store"

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
  const router = useRouter()
  const institute = useInstitute(id)
  const branches = branchStore.useList(id)
  const shifts = shiftStore.useList(id)

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
  const limits = planLimits[institute.plan]
  const monthly = planPrices[institute.plan]
  const billed =
    institute.billingCycle === "Yearly"
      ? `$${(monthly * 10).toLocaleString()} / year`
      : `$${monthly} / month`

  return (
    <div className="flex flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <Button asChild variant="ghost" size="sm" className="w-fit">
        <Link href="/institutes">
          <ArrowLeftIcon data-icon="inline-start" />
          Institutes
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {institute.logoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={institute.logoUrl}
              alt={`${institute.name} logo`}
              className="size-14 shrink-0 rounded-md border object-contain"
            />
          )}
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-semibold tracking-tight">
                {institute.name}
              </h2>
              <StatusBadge status={institute.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {institute.shortName} · EIIN {institute.eiin} · {institute.type}{" "}
              · {institute.city} · {institute.subdomain}.sms.app
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/institutes/${institute.id}/edit`}>
              <PencilIcon data-icon="inline-start" />
              Edit
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href={`/institutes/${institute.id}/configuration`}>
              <SlidersHorizontalIcon data-icon="inline-start" />
              Configuration
            </Link>
          </Button>
          <InstituteActions
            institute={institute}
            showView={false}
            onDeleted={() => router.push("/institutes")}
          />
        </div>
      </div>

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
              {withLabel(institute.enableStudentHouse, institute.studentHouseLabel)}
            </Row>
            <Row label="Student category">
              {withLabel(
                institute.enableStudentCategory,
                institute.studentCategoryLabel
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
