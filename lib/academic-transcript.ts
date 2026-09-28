import type { MeritList } from "@/lib/merit-lists"
import type { TabulationStudent } from "@/lib/tabulation"

// Legacy RptResult/AcademicTranscript (StudentRepository.LoadAcademicTranscript,
// Partial/_academicTranscript): a mark sheet per student of a section in an
// exam — their details, each subject's marks, letter grade and grade point
// beside the section's highest, the GPA with and without the 4th subject,
// result, positions, remarks and attendance. Needs the merit list generated.

export const transcriptResultTypes = [
  { value: "all", label: "All" },
  { value: "pass", label: "Pass" },
  { value: "failed", label: "Failed" },
  { value: "absence", label: "Absence" },
] as const
export type TranscriptResultType = (typeof transcriptResultTypes)[number]["value"]

// Legacy passFailQuery; "Absence" (which the legacy lists but never
// filters) keeps those absent in every subject.
export function matchesResultType(std: TabulationStudent, type: TranscriptResultType) {
  switch (type) {
    case "all":
      return true
    case "pass":
      return std.result.failedSubjectCount === 0
    case "failed":
      return std.result.failedSubjectCount > 0
    case "absence":
      return !std.result.isPresent
  }
}

// Each subject's best total in the section (legacy HighestMark).
export function sectionHighest(list: MeritList, sectionId: number) {
  const best = new Map<number, number>()
  for (const r of list.results) {
    if (r.sectionId !== sectionId) continue
    for (const m of r.marks) best.set(m.subjectId, Math.max(best.get(m.subjectId) ?? 0, m.total))
  }
  return best
}

// Legacy: the remarks the result was given, else one by GPA.
export function transcriptRemarks(remarks: string, gpa: number) {
  if (remarks.trim() && remarks.trim() !== "-") return remarks.trim()
  if (gpa >= 5) return "Congratulations! Keep it."
  if (gpa >= 4) return "Very good. Keep it up."
  if (gpa >= 3.5) return "Good. Try to improve."
  if (gpa >= 3) return "Try hard."
  if (gpa >= 2) return "Work hard."
  if (gpa >= 1) return "Be serious."
  return "Be alert & work hard to pass."
}
