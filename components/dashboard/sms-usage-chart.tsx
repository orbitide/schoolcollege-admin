"use client"

import * as React from "react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { seriesColors } from "@/components/dashboard/chart-colors"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { addDays } from "@/lib/institute-dashboard"
import { useInstitutes } from "@/lib/institutes-store"
import { useSmsMessages } from "@/lib/sms-messages"
import { smsSummary, summaryParams, summaryTotal, type SummaryFilter } from "@/lib/sms-summary"
import { todayIso } from "@/lib/student-attendance"

// The last 30 days a bar a day, or the last 6 / 12 months a bar a month.
const ranges = [
  { value: "30d", label: "30 days", displayBy: "Daily", count: 30 },
  { value: "6m", label: "6 months", displayBy: "Monthly", count: 6 },
  { value: "12m", label: "12 months", displayBy: "Monthly", count: 12 },
] as const

const chartConfig = {
  sent: { label: "Sent", theme: seriesColors[0] },
  failed: { label: "Failed", theme: seriesColors[1] },
} satisfies ChartConfig

// "2026-09" for the month `back` months before `today`'s.
function monthKey(today: string, back: number) {
  const [y, m] = today.split("-").map(Number)
  const d = new Date(y, m - 1 - back, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const keyLabel = (key: string) =>
  key.length === 7
    ? new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" })
    : new Date(`${key}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// SMS sent and failed across every institute, and what the sent ones
// earned at each institute's rate — the platform's everyday activity.
export function SmsUsageChart() {
  const institutes = useInstitutes()
  const messages = useSmsMessages()
  const [value, setValue] = React.useState<(typeof ranges)[number]["value"]>("30d")
  const range = ranges.find((r) => r.value === value)!
  const today = todayIso()

  const { data, total, filter } = React.useMemo(() => {
    const keys = Array.from({ length: range.count }, (_, i) => {
      const back = range.count - 1 - i
      return range.displayBy === "Daily" ? addDays(today, -back) : monthKey(today, back)
    })
    const filter: SummaryFilter = {
      instituteId: null,
      dateFrom: range.displayBy === "Daily" ? keys[0] : `${keys[0]}-01`,
      dateTo: today,
      smsType: "",
      resultType: "",
      attendanceType: "",
      displayBy: range.displayBy,
    }
    const byId = new Map(institutes.map((i) => [i.id, i]))
    const rows = smsSummary(
      messages,
      filter,
      new Set(byId.keys()),
      (id) => byId.get(id)?.configuration.smsRate ?? 0
    )
    const byKey = new Map(rows.map((r) => [r.key, r]))
    return {
      data: keys.map((key) => ({
        key,
        sent: byKey.get(key)?.Sent.count ?? 0,
        failed: byKey.get(key)?.Failed.count ?? 0,
      })),
      total: summaryTotal(rows),
      filter,
    }
  }, [institutes, messages, range, today])

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>SMS usage</CardTitle>
        <CardDescription>
          {total.Sent.count.toLocaleString()} sent · {total.Failed.count.toLocaleString()} failed
          {total.Pending.count > 0 && ` · ${total.Pending.count.toLocaleString()} pending`} · ৳
          {total.cost.toFixed(2)} earned
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={value}
            onValueChange={(v) => v && setValue(v as typeof value)}
            variant="outline"
            size="sm"
          >
            {ranges.map((r) => (
              <ToggleGroupItem key={r.value} value={r.value} className="px-2.5">
                {r.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[240px] w-full">
          <BarChart data={data} margin={{ left: -16, right: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="key"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              tickFormatter={keyLabel}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => keyLabel(String(v))} />}
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="sent" stackId="sms" fill="var(--color-sent)" maxBarSize={40} />
            <Bar
              dataKey="failed"
              stackId="sms"
              fill="var(--color-failed)"
              radius={[4, 4, 0, 0]}
              maxBarSize={40}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="text-sm">
        <Link
          href={`/sms/summary?${summaryParams({ ...filter, details: true })}`}
          className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          Open SMS summary
        </Link>
      </CardFooter>
    </Card>
  )
}
