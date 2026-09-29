"use client"

import * as React from "react"
import Link from "next/link"
import { BanIcon, CircleCheckIcon, LoaderIcon, MessageSquareWarningIcon, ReceiptTextIcon } from "lucide-react"

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { addDaysIso, formatTaka, isoDate } from "@/lib/billing"
import { useOutstanding } from "@/lib/institute-billing"
import type { Institute } from "@/lib/institutes"
import { useInstitutes } from "@/lib/institutes-store"
import { useSmsBalances, useSmsMessages } from "@/lib/sms-messages"
import { useSubscriptions } from "@/lib/subscriptions"

// SMS credit (Taka) below which an institute that sends SMS is warned.
const LOW_SMS_BALANCE = 200
// Trials ending within this many days are flagged.
const TRIAL_WARNING_DAYS = 7
const SHOWN = 6

type Issue = { institute: Institute; reason: string; icon: React.ReactNode; order: number }

// Institutes the platform team should act on: suspended ones, trials to
// convert, overdue invoices and institutes running out of SMS credit.
// Each row opens the institute.
export function NeedsAttentionCard() {
  const institutes = useInstitutes()
  const balances = useSmsBalances()
  const messages = useSmsMessages()
  const outstanding = useOutstanding()
  const subscriptions = useSubscriptions()

  const issues = React.useMemo(() => {
    const sendsSms = new Set(messages.map((m) => m.instituteId))
    const today = isoDate()
    const soon = addDaysIso(today, TRIAL_WARNING_DAYS)
    const list: Issue[] = []
    for (const institute of institutes) {
      const owed = outstanding.get(institute.id)
      if (owed?.overdueCount) {
        list.push({
          institute,
          reason: `${formatTaka(owed.overdue)} overdue (${owed.overdueCount} ${owed.overdueCount === 1 ? "invoice" : "invoices"})`,
          icon: <ReceiptTextIcon className="text-destructive" />,
          order: 0,
        })
      }
      if (institute.status === "Suspended") {
        list.push({ institute, reason: "Suspended", icon: <BanIcon className="text-destructive" />, order: 1 })
        continue
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
      const trialEnds = subscriptions.find((s) => s.instituteId === institute.id)?.trialEndsAt
      if (institute.status === "Trial" && trialEnds && trialEnds <= soon) {
        list.push({
          institute,
          reason: trialEnds < today ? `Trial ended ${trialEnds}` : `Trial ends ${trialEnds}`,
          icon: <LoaderIcon className="text-amber-500" />,
          order: 3,
        })
      }
    }
    return list.sort((a, b) => a.order - b.order || a.institute.name.localeCompare(b.institute.name))
  }, [institutes, balances, messages, outstanding, subscriptions])

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
