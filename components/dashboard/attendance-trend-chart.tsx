"use client"

import { CartesianGrid, Line, LineChart, XAxis, YAxis } from "recharts"

import { seriesColors } from "@/components/dashboard/chart-colors"
import {
  Card,
  CardContent,
  CardDescription,
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
import type { TrendDay } from "@/lib/institute-dashboard"

const chartConfig = {
  present: { label: "Present", theme: seriesColors[0] },
  absent: { label: "Absent", theme: seriesColors[1] },
  sms: { label: "SMS sent", theme: seriesColors[2] },
} satisfies ChartConfig

const offLabel = { H: "Holiday", W: "Weekend" } as const

const dayLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })

// Legacy dashboard graph: students present and absent and attendance SMS
// sent each day, with holidays "(H)" and weekends "(W)" marked on the axis.
// A day off with nothing recorded is a gap in the lines, not a drop to 0.
export function AttendanceTrendChart({ trend }: { trend: TrendDay[] }) {
  const offOf = new Map(trend.map((d) => [d.date, d.off]))
  const data = trend.map((d) =>
    d.off && d.present + d.absent + d.sms === 0
      ? { date: d.date, present: null, absent: null, sms: null }
      : d
  )
  const tick = (date: string) => {
    const off = offOf.get(date)
    return off ? `${dayLabel(date)} (${off})` : dayLabel(date)
  }

  return (
    <Card className="@container/card h-full">
      <CardHeader>
        <CardTitle>Attendance, last {trend.length} days</CardTitle>
        <CardDescription>
          Students present and absent, and attendance SMS sent. (H) holiday, (W) weekend.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-2 pt-2 sm:px-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[280px] w-full">
          <LineChart data={data} margin={{ left: -12, right: 12 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickFormatter={tick}
            />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={44} />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  indicator="line"
                  labelFormatter={(value) => {
                    const date = String(value)
                    const off = offOf.get(date)
                    return off ? `${dayLabel(date)} · ${offLabel[off]}` : dayLabel(date)
                  }}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} itemSorter={null} />
            {(["present", "absent", "sms"] as const).map((key) => (
              <Line
                key={key}
                dataKey={key}
                type="linear"
                stroke={`var(--color-${key})`}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
