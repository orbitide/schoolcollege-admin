"use client"

import * as React from "react"
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts"

import { useIsMobile } from "@/hooks/use-mobile"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group"

export const description = "Daily active users across all tenant institutes"

const chartData = [
  { date: "2026-04-01", students: 2220, staff: 150 },
  { date: "2026-04-02", students: 970, staff: 180 },
  { date: "2026-04-03", students: 1670, staff: 120 },
  { date: "2026-04-04", students: 2420, staff: 260 },
  { date: "2026-04-05", students: 3730, staff: 290 },
  { date: "2026-04-06", students: 3010, staff: 340 },
  { date: "2026-04-07", students: 2450, staff: 180 },
  { date: "2026-04-08", students: 4090, staff: 320 },
  { date: "2026-04-09", students: 590, staff: 110 },
  { date: "2026-04-10", students: 2610, staff: 190 },
  { date: "2026-04-11", students: 3270, staff: 350 },
  { date: "2026-04-12", students: 2920, staff: 210 },
  { date: "2026-04-13", students: 3420, staff: 380 },
  { date: "2026-04-14", students: 1370, staff: 220 },
  { date: "2026-04-15", students: 1200, staff: 170 },
  { date: "2026-04-16", students: 1380, staff: 190 },
  { date: "2026-04-17", students: 4460, staff: 360 },
  { date: "2026-04-18", students: 3640, staff: 410 },
  { date: "2026-04-19", students: 2430, staff: 180 },
  { date: "2026-04-20", students: 890, staff: 150 },
  { date: "2026-04-21", students: 1370, staff: 200 },
  { date: "2026-04-22", students: 2240, staff: 170 },
  { date: "2026-04-23", students: 1380, staff: 230 },
  { date: "2026-04-24", students: 3870, staff: 290 },
  { date: "2026-04-25", students: 2150, staff: 250 },
  { date: "2026-04-26", students: 750, staff: 130 },
  { date: "2026-04-27", students: 3830, staff: 420 },
  { date: "2026-04-28", students: 1220, staff: 180 },
  { date: "2026-04-29", students: 3150, staff: 240 },
  { date: "2026-04-30", students: 4540, staff: 380 },
  { date: "2026-05-01", students: 1650, staff: 220 },
  { date: "2026-05-02", students: 2930, staff: 310 },
  { date: "2026-05-03", students: 2470, staff: 190 },
  { date: "2026-05-04", students: 3850, staff: 420 },
  { date: "2026-05-05", students: 4810, staff: 390 },
  { date: "2026-05-06", students: 4980, staff: 520 },
  { date: "2026-05-07", students: 3880, staff: 300 },
  { date: "2026-05-08", students: 1490, staff: 210 },
  { date: "2026-05-09", students: 2270, staff: 180 },
  { date: "2026-05-10", students: 2930, staff: 330 },
  { date: "2026-05-11", students: 3350, staff: 270 },
  { date: "2026-05-12", students: 1970, staff: 240 },
  { date: "2026-05-13", students: 1970, staff: 160 },
  { date: "2026-05-14", students: 4480, staff: 490 },
  { date: "2026-05-15", students: 4730, staff: 380 },
  { date: "2026-05-16", students: 3380, staff: 400 },
  { date: "2026-05-17", students: 4990, staff: 420 },
  { date: "2026-05-18", students: 3150, staff: 350 },
  { date: "2026-05-19", students: 2350, staff: 180 },
  { date: "2026-05-20", students: 1770, staff: 230 },
  { date: "2026-05-21", students: 820, staff: 140 },
  { date: "2026-05-22", students: 810, staff: 120 },
  { date: "2026-05-23", students: 2520, staff: 290 },
  { date: "2026-05-24", students: 2940, staff: 220 },
  { date: "2026-05-25", students: 2010, staff: 250 },
  { date: "2026-05-26", students: 2130, staff: 170 },
  { date: "2026-05-27", students: 4200, staff: 460 },
  { date: "2026-05-28", students: 2330, staff: 190 },
  { date: "2026-05-29", students: 780, staff: 130 },
  { date: "2026-05-30", students: 3400, staff: 280 },
  { date: "2026-05-31", students: 1780, staff: 230 },
  { date: "2026-06-01", students: 1780, staff: 200 },
  { date: "2026-06-02", students: 4700, staff: 410 },
  { date: "2026-06-03", students: 1030, staff: 160 },
  { date: "2026-06-04", students: 4390, staff: 380 },
  { date: "2026-06-05", students: 880, staff: 140 },
  { date: "2026-06-06", students: 2940, staff: 250 },
  { date: "2026-06-07", students: 3230, staff: 370 },
  { date: "2026-06-08", students: 3850, staff: 320 },
  { date: "2026-06-09", students: 4380, staff: 480 },
  { date: "2026-06-10", students: 1550, staff: 200 },
  { date: "2026-06-11", students: 920, staff: 150 },
  { date: "2026-06-12", students: 4920, staff: 420 },
  { date: "2026-06-13", students: 810, staff: 130 },
  { date: "2026-06-14", students: 4260, staff: 380 },
  { date: "2026-06-15", students: 3070, staff: 350 },
  { date: "2026-06-16", students: 3710, staff: 310 },
  { date: "2026-06-17", students: 4750, staff: 520 },
  { date: "2026-06-18", students: 1070, staff: 170 },
  { date: "2026-06-19", students: 3410, staff: 290 },
  { date: "2026-06-20", students: 4080, staff: 450 },
  { date: "2026-06-21", students: 1690, staff: 210 },
  { date: "2026-06-22", students: 3170, staff: 270 },
  { date: "2026-06-23", students: 4800, staff: 530 },
  { date: "2026-06-24", students: 1320, staff: 180 },
  { date: "2026-06-25", students: 1410, staff: 190 },
  { date: "2026-06-26", students: 4340, staff: 380 },
  { date: "2026-06-27", students: 4480, staff: 490 },
  { date: "2026-06-28", students: 1490, staff: 200 },
  { date: "2026-06-29", students: 1030, staff: 160 },
  { date: "2026-06-30", students: 4460, staff: 400 },
]

const chartConfig = {
  activeUsers: {
    label: "Active users",
  },
  students: {
    label: "Students",
    color: "var(--primary)",
  },
  staff: {
    label: "Teachers & staff",
    color: "var(--primary)",
  },
} satisfies ChartConfig

export function ChartAreaInteractive() {
  const isMobile = useIsMobile()
  const [selectedRange, setTimeRange] = React.useState<string | null>(null)
  // Default to the last 7 days on small screens until the user picks a range.
  const timeRange = selectedRange ?? (isMobile ? "7d" : "90d")

  const filteredData = chartData.filter((item) => {
    const date = new Date(item.date)
    const referenceDate = new Date("2026-06-30")
    let daysToSubtract = 90
    if (timeRange === "30d") {
      daysToSubtract = 30
    } else if (timeRange === "7d") {
      daysToSubtract = 7
    }
    const startDate = new Date(referenceDate)
    startDate.setDate(startDate.getDate() - daysToSubtract)
    return date >= startDate
  })

  return (
    <Card className="@container/card">
      <CardHeader>
        <CardTitle>Daily Active Users</CardTitle>
        <CardDescription>
          <span className="hidden @[540px]/card:block">
            Students and staff signed in across all institutes
          </span>
          <span className="@[540px]/card:hidden">Last 3 months</span>
        </CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:px-4! @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">Last 3 months</ToggleGroupItem>
            <ToggleGroupItem value="30d">Last 30 days</ToggleGroupItem>
            <ToggleGroupItem value="7d">Last 7 days</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger
              className="flex w-40 **:data-[slot=select-value]:block **:data-[slot=select-value]:truncate @[767px]/card:hidden"
              size="sm"
              aria-label="Select a value"
            >
              <SelectValue placeholder="Last 3 months" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg">
                Last 3 months
              </SelectItem>
              <SelectItem value="30d" className="rounded-lg">
                Last 30 days
              </SelectItem>
              <SelectItem value="7d" className="rounded-lg">
                Last 7 days
              </SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[250px] w-full"
        >
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillStudents" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-students)"
                  stopOpacity={1.0}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-students)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillStaff" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-staff)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-staff)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value)
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="staff"
              type="natural"
              fill="url(#fillStaff)"
              stroke="var(--color-staff)"
              stackId="a"
            />
            <Area
              dataKey="students"
              type="natural"
              fill="url(#fillStudents)"
              stroke="var(--color-students)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
