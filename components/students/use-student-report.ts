"use client"

import { useReportLookups } from "@/components/students/student-lookups"
import { classStore, yearStore } from "@/lib/academic-store"
import { useAccessibleInstitutes } from "@/lib/current-user"
import { reportRows, type ReportConfig } from "@/lib/student-report"
import { useStudents } from "@/lib/students"

// The institute, rows and lookups for a dynamic report, shared by the
// report form (count, export) and the print page.
export function useStudentReport(config: ReportConfig | null) {
  const students = useStudents()
  const institutes = useAccessibleInstitutes()
  const institute = institutes.find((i) => i.id === config?.filter.instituteId)
  const years = yearStore.useList(institute?.id ?? -1)
  const classes = classStore.useList(institute?.id ?? -1)
  const lookups = useReportLookups()

  const rows =
    config && institute
      ? reportRows(
          students,
          config.filter,
          years.find((y) => y.isCurrent)?.id,
          new Map(classes.map((c) => [c.id, c.rank])),
          (id) => lookups.name("section", id)
        )
      : []
  return { institute, rows, lookups }
}
