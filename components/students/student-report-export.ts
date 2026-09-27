import writeExcelFile from "write-excel-file/browser"

import type { Institute } from "@/lib/institutes"
import {
  columnLabel,
  selectedColumns,
  type ReportConfig,
  type ReportLookups,
  type ReportRow,
} from "@/lib/student-report"

// Legacy StudentDynamicExport: the same table as the printed report —
// Sl, the chosen information and the extra blank columns — as .xlsx.
export async function exportStudentReport({
  config,
  rows,
  institute,
  lookups,
}: {
  config: ReportConfig
  rows: ReportRow[]
  institute: Institute
  lookups: ReportLookups
}) {
  // A photo can't go in a cell; leave the column out of the file.
  const columns = selectedColumns(config.columns).filter((c) => c.key !== "Image")
  const header = ["Sl", ...columns.map((c) => columnLabel(c, institute)), ...config.extraFields]
  const bold = (value: string) => ({ value, fontWeight: "bold" as const })

  const data = [
    [bold(institute.name)],
    [bold(config.title)],
    [],
    header.map(bold),
    ...rows.map(({ student, enrolment }, index) => [
      index + 1,
      ...columns.map((column) => {
        const value = column.value({ student, enrolment, lookups })
        return value && value !== "—" ? value : null
      }),
      ...config.extraFields.map(() => null),
    ]),
  ]

  const stamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, "").replace("T", "-")
  await writeExcelFile(data, {
    columns: header.map((label, i) => ({ width: i === 0 ? 6 : Math.min(40, Math.max(10, label.length + 4)) })),
  }).toFile(`Dynamic_Student_Report_${stamp}.xlsx`)
}
