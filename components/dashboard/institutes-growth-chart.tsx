"use client"

import * as React from "react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"

import { seriesColors } from "@/components/dashboard/chart-colors"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useInstitutes } from "@/lib/institutes-store"

const ranges = [
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
] as const

const chartConfig = {
  joined: { label: "Institutes joined", theme: seriesColors[0] },
} satisfies ChartConfig

// "2026-09" for the month `back` months before this one.
function monthKey(back: number) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() - back, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

const monthLabel = (key: string) =>
  new Date(`${key}-01T00:00:00`).toLocaleDateString("en-US", { month: "short", year: "2-digit" })

// Institutes signed up per month, up to and including this one.
export function InstitutesGrowthChart() {
  const institutes = useInstitutes()
  const [range, setRange] = React.useState<(typeof ranges)[number]["value"]>("12")

  const data = React.useMemo(() => {
    const months = Array.from({ length: Number(range) }, (_, i) => monthKey(Number(range) - 1 - i))
    const counts = new Map(months.map((m) => [m, 0]))
    for (const i of institutes) {
      const m = i.joinedAt.slice(0, 7)
      if (counts.has(m)) counts.set(m, counts.get(m)! + 1)
    }
    return months.map((month) => ({ month, joined: counts.get(month)! }))
  }, [institutes, range])
  const total = data.reduce((sum, d) => sum + d.joined, 0)

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>New institutes</CardTitle>
        <CardDescription>
          {total} joined in the last {range} months
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={range}
            onValueChange={(v) => v && setRange(v as typeof range)}
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
              dataKey="month"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={16}
              tickFormatter={monthLabel}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={40} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(v) => monthLabel(String(v))} />}
            />
            <Bar dataKey="joined" fill="var(--color-joined)" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
