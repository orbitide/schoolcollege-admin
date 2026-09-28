import type { Institute } from "@/lib/institutes"
import {
  summaryTotal,
  type SummaryCell,
  type SummaryFilter,
  type SummaryRow,
} from "@/lib/sms-summary"
import { cn } from "@/lib/utils"

const statuses = [
  ["Pending", "Pending"],
  ["Sent", "Success"],
  ["Failed", "Failed"],
] as const

const longDay = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" })
}

// Legacy _CombineSmsReport: the institute heading, the SMS type, date range
// and sub type used, and the counts per group — with SMS parts ("Length")
// beside each count when `details` is on — and a total row. Styled as a
// printed report so the page and the print view look the same.
export function SmsSummarySheet({
  institute,
  filter,
  rows,
  details,
  className,
}: {
  // Undefined when the summary spans several institutes.
  institute?: Institute
  filter: SummaryFilter
  rows: SummaryRow[]
  details: boolean
  className?: string
}) {
  const total = summaryTotal(rows)
  const subLabel =
    filter.smsType === "Result"
      ? ["SMS Result Type", filter.resultType || "All"]
      : filter.smsType === "Attendance" || filter.smsType === "Exam Attendance"
        ? ["SMS Attendance Type", filter.attendanceType || "All"]
        : null
  const groupName = filter.displayBy === "SMS Type wise" ? "SMS Type" : "Date"
  const th = "border border-black px-2 py-1 text-center font-semibold"
  const td = "border border-black px-2 py-1 text-center tabular-nums"
  const cells = (cell: SummaryCell) =>
    details ? [cell.count, cell.parts] : [cell.count]

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      <header className="text-center">
        <h1 className="text-lg leading-tight font-bold uppercase">
          {institute?.name ?? "All institutes"}
        </h1>
        {institute?.address && <p className="text-xs">{institute.address}</p>}
        <h2 className="mt-1 text-base font-bold underline underline-offset-4">
          SMS Report ({filter.displayBy})
        </h2>
      </header>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span className="border border-black px-2 py-1">
          SMS Type: <strong>{filter.smsType || "All"}</strong>
        </span>
        <span className="border border-black px-2 py-1">
          Date: <strong>{longDay(filter.dateFrom)}</strong> to <strong>{longDay(filter.dateTo)}</strong>
        </span>
        {subLabel && (
          <span className="border border-black px-2 py-1">
            {subLabel[0]}: <strong>{subLabel[1]}</strong>
          </span>
        )}
      </div>

      <table className="mt-3 w-full border-collapse text-[13px] leading-tight">
        <thead>
          <tr>
            <th className={th} rowSpan={details ? 2 : 1}>
              {groupName}
            </th>
            {statuses.map(([, label]) => (
              <th key={label} className={th} colSpan={details ? 2 : 1}>
                {label}
              </th>
            ))}
            <th className={th} colSpan={details ? 2 : 1}>
              Total SMS
            </th>
            <th className={th} rowSpan={details ? 2 : 1}>
              Cost (৳)
            </th>
          </tr>
          {details && (
            <tr>
              {[...statuses, ["total", "total"]].flatMap(([key]) => [
                <th key={`${key}-count`} className={th}>
                  Count
                </th>,
                <th key={`${key}-parts`} className={th}>
                  Length
                </th>,
              ])}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.length ? (
            [...rows, ...(rows.length > 1 ? [total] : [])].map((row) => {
              const isTotal = row.key === "total"
              return (
                <tr key={row.key} className={cn("break-inside-avoid", isTotal && "font-bold")}>
                  <td className={cn(td, "text-left whitespace-nowrap")}>{row.label}</td>
                  {[row.Pending, row.Sent, row.Failed, row.total].flatMap((cell, i) =>
                    cells(cell).map((value, j) => (
                      <td key={`${i}-${j}`} className={td}>
                        {value}
                      </td>
                    ))
                  )}
                  <td className={td}>{row.cost.toFixed(2)}</td>
                </tr>
              )
            })
          ) : (
            <tr>
              <td colSpan={details ? 10 : 6} className="border border-black p-4 text-center">
                No record found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      <p className="mt-2 text-[11px]">
        Length is the number of SMS parts charged; cost counts the successful ones at the
        institute&apos;s SMS rate.
      </p>
    </div>
  )
}
