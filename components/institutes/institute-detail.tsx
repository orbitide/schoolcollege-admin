"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  ArrowLeftIcon,
  CalendarIcon,
  GlobeIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react"

import { InstituteActions } from "@/components/institutes/institute-actions"
import { StatusBadge } from "@/components/institutes/status-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  formatDate,
  planLimits,
  planPrices,
  type Institute,
} from "@/lib/institutes"
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
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold tracking-tight">
              {institute.name}
            </h2>
            <StatusBadge status={institute.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {institute.type} · {institute.city} ·{" "}
            {institute.subdomain}.sms.app
          </p>
        </div>
        <InstituteActions
          institute={institute}
          showView={false}
          onDeleted={() => router.push("/institutes")}
        />
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
      </div>
    </div>
  )
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
