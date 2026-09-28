"use client"

import * as React from "react"
import Link from "next/link"
import { BanIcon, CircleCheckIcon, GaugeIcon, LoaderIcon, MessageSquareWarningIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { planLimits, type Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { useSmsBalances, useSmsMessages } from "@/lib/sms-messages"

// SMS credit (Taka) below which an institute that sends SMS is warned.
const LOW_SMS_BALANCE = 200
// Share of the plan's student limit at which an institute should upgrade.
const NEAR_LIMIT = 0.9
const SHOWN = 6

type Issue = { institute: Institute; reason: string; icon: React.ReactNode; order: number }

// Institutes the platform team should act on: suspended ones, trials to
// convert, institutes outgrowing their plan and ones running out of SMS
// credit. Each row opens the institute.
export function NeedsAttentionCard() {
  const institutes = useInstitutes()
  const balances = useSmsBalances()
  const messages = useSmsMessages()

  const issues = React.useMemo(() => {
    const sendsSms = new Set(messages.map((m) => m.instituteId))
    const list: Issue[] = []
    for (const institute of institutes) {
      if (institute.status === "Suspended") {
        list.push({ institute, reason: "Suspended", icon: <BanIcon className="text-destructive" />, order: 0 })
        continue
      }
      const limit = planLimits[institute.plan].students
      if (institute.students >= limit * NEAR_LIMIT) {
        list.push({
          institute,
          reason: `${institute.students.toLocaleString()} of ${limit.toLocaleString()} students on ${institute.plan}`,
          icon: <GaugeIcon className="text-amber-500" />,
          order: 1,
        })
      }
      const balance = balances[institute.id] ?? 0
      if (sendsSms.has(institute.id) && balance < LOW_SMS_BALANCE) {
        list.push({
          institute,
          reason: `SMS credit low: ৳${balance.toLocaleString()}`,
          icon: <MessageSquareWarningIcon className="text-amber-500" />,
          order: 2,
        })
      }
      if (institute.status === "Trial") {
        list.push({ institute, reason: "On trial", icon: <LoaderIcon className="text-amber-500" />, order: 3 })
      }
    }
    return list.sort((a, b) => a.order - b.order || a.institute.name.localeCompare(b.institute.name))
  }, [institutes, balances, messages])

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
        <CardDescription>
          {issues.length ? `${issues.length} items across institutes` : "Nothing to act on"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {issues.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center text-sm text-muted-foreground">
            <CircleCheckIcon className="size-6 text-green-600 dark:text-green-400" />
            All institutes are in good standing.
          </div>
        ) : (
          <ul className="-mx-2 flex flex-col">
            {issues.slice(0, SHOWN).map((issue, index) => (
              <li key={`${issue.institute.id}-${index}`}>
                <Link
                  href={`/institutes/${issue.institute.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted [&_svg]:size-4 [&_svg]:shrink-0"
                >
                  {issue.icon}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{issue.institute.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{issue.reason}</span>
                  </span>
                </Link>
              </li>
            ))}
            {issues.length > SHOWN && (
              <li className="px-2 pt-2 text-xs text-muted-foreground">
                And {issues.length - SHOWN} more. See the institutes table below.
              </li>
            )}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
