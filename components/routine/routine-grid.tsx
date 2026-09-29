"use client"

import type * as React from "react"

import type { Institute, WeekDay } from "@/lib/institutes"
import { periodTime, type RoutinePeriod } from "@/lib/routine"
import { cn, parseInlineStyle } from "@/lib/utils"

export type GridCell = {
  title: string
  lines: string[]
  // A cell that doesn't fit (e.g. a clash shown on the teacher routine).
  warn?: boolean
}

// A week of periods: a row per working day, a column per period (breaks as
// a narrow shaded column), each cell from `cellOf`. `onCell` makes empty
// and filled class cells clickable. Styled to print as it looks.
export function RoutineGrid({
  days,
  periods,
  cellOf,
  onCell,
  print,
}: {
  days: WeekDay[]
  periods: RoutinePeriod[]
  cellOf: (day: WeekDay, period: RoutinePeriod) => GridCell | null
  onCell?: (day: WeekDay, period: RoutinePeriod) => void
  print?: boolean
}) {
  const border = print ? "border border-black" : "border"
  return (
    <table className={cn("w-full border-collapse text-sm", print && "text-black")}>
      <thead>
        <tr>
          <th className={cn(border, "w-24 bg-muted/60 px-2 py-1 text-left", print && "bg-transparent")}>Day</th>
          {periods.map((p) => (
            <th
              key={p.id}
              className={cn(
                border,
                "px-2 py-1 text-center align-top font-medium",
                p.isBreak ? "w-12 bg-muted" : print ? "" : "bg-muted/60"
              )}
            >
              <div className={cn(p.isBreak && "text-xs")}>{p.name}</div>
              <div className="text-[11px] font-normal text-muted-foreground">{periodTime(p)}</div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {days.map((day) => (
          <tr key={day}>
            <th className={cn(border, "px-2 py-1 text-left font-medium")}>{day}</th>
            {periods.map((p) => {
              if (p.isBreak) {
                return (
                  <td key={p.id} className={cn(border, "bg-muted text-center text-[10px] text-muted-foreground uppercase")}>
                    {p.name}
                  </td>
                )
              }
              const cell = cellOf(day, p)
              const content = cell ? (
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{cell.title}</span>
                  {cell.lines.map((line, i) => (
                    <span key={i} className="text-xs text-muted-foreground">
                      {line}
                    </span>
                  ))}
                </div>
              ) : onCell ? (
                <span className="text-xs text-muted-foreground/60">+ Add</span>
              ) : null
              return (
                <td
                  key={p.id}
                  className={cn(border, "h-16 min-w-28 p-0 align-top", cell?.warn && "bg-red-500/10")}
                >
                  {onCell ? (
                    <button
                      type="button"
                      onClick={() => onCell(day, p)}
                      className="flex size-full min-h-16 flex-col px-2 py-1 text-left hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                    >
                      {content}
                    </button>
                  ) : (
                    <div className="px-2 py-1">{content}</div>
                  )}
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// The printed page: institute heading, the routine's title and subtitle,
// then the grid.
export function RoutinePrintSheet({
  institute,
  title,
  subtitle,
  children,
}: {
  institute: Institute
  title: string
  subtitle: string
  children: React.ReactNode
}) {
  const config = institute.configuration
  return (
    <div className="flex flex-col gap-3 bg-white font-serif text-black">
      <header className="flex flex-col items-center text-center">
        <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
        <p className="text-sm">{institute.address}</p>
        <h2 style={parseInlineStyle(config.reportNameStyle)}>{title}</h2>
        <p className="text-sm">{subtitle}</p>
      </header>
      {children}
    </div>
  )
}
