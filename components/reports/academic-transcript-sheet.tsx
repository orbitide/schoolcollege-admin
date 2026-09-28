import type * as React from "react"

import type { AcademicClass, Institute, Section } from "@/lib/institutes"
import { transcriptRemarks } from "@/lib/academic-transcript"
import { subjectKinds, type TabulationCell, type TabulationStudent } from "@/lib/tabulation"
import type { TermExamStudentInfo } from "@/lib/term-exam-marks"
import type { TermExam } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

type Lookup = (kind: "shift" | "group" | "session" | "house", id: number | null) => string

const td = "border border-black px-1.5 py-1 text-center"
const failedCls = (cell: TabulationCell) => (cell.failed ? "text-red-600 underline" : undefined)

// "Jun - 26", as the legacy ExamStart.ToString("MMM - yy").
const monthShortYear = (iso: string) => {
  const [y, m] = iso.split("-").map(Number)
  return `${new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short" })} - ${String(y).slice(-2)}`
}
// "30 June, 2026", as the legacy ResultPublish.ToString("dd MMMM, yyyy").
const longDate = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number)
  return `${String(d).padStart(2, "0")} ${new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "long" })}, ${y}`
}

// Legacy Partial/_academicTranscript: a page per student.
export function AcademicTranscriptSheet({
  institute,
  exam,
  academicClass,
  section,
  students,
  highest,
  info,
  name,
  subjectLabel,
  className,
}: {
  institute: Institute
  exam: TermExam
  academicClass?: AcademicClass
  section: Section
  students: TabulationStudent[]
  // Each subject's best total in the section.
  highest: Map<number, number>
  // Attendance and remarks noted for the student in the exam.
  info: (studentId: number) => TermExamStudentInfo
  name: Lookup
  subjectLabel: (id: number) => string
  className?: string
}) {
  const config = institute.configuration
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const order = subjectKinds.map((k) => k.key)
  const kindLabel = { compulsory: "Compulsory", elective: "Elective", optional: "Optional" } as const
  const byId = new Map(exam.subjects.map((s) => [s.subjectId, s]))

  return (
    <div className={cn("flex flex-col gap-10 bg-white font-serif text-[13px] text-black", className)}>
      {students.map((std) => {
        const { student, enrolment: e, result } = std
        const subjects = [...std.subjects].sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
        const marks = new Map(result.marks.map((m) => [m.subjectId, m]))
        const hasTheory = subjects.some((s) => (byId.get(s.subjectId)?.theoryMarks ?? 0) > 0)
        const hasCq = subjects.some((s) => (byId.get(s.subjectId)?.cqMarks ?? 0) > 0)
        const optional = subjects.filter((s) => s.kind === "optional")
        const note = info(student.id)
        const passed = result.isPresent && result.failedSubjectCount === 0

        const details: [string, React.ReactNode][][] = [
          [["Name", student.name]],
          [["Father's Name", student.fatherName]],
          [
            ["Mother's Name", student.motherName],
            ["Class", academicClass?.name ?? "—"],
            ["Roll", <strong key="roll">{e.classRoll}</strong>],
          ],
          [
            ["Shift", section.shiftId != null ? name("shift", section.shiftId) : "N/A"],
            ["Group", section.groupId != null ? name("group", section.groupId) : "All"],
            ["Version", section.version ? section.version.replace(/\s*Version$/, "") : "All"],
          ],
          [
            ["Gender", student.gender],
            ["Section", section.name],
            ["Session", e.sessionId != null ? name("session", e.sessionId) : ""],
          ],
          [
            ["Type", e.studentType],
            [institute.studentHouseLabel.trim() || "House", e.houseId != null ? name("house", e.houseId) : ""],
            ["SSC GPA", student.board.SSC?.gpa ?? ""],
          ],
        ]
        const summary: [string, React.ReactNode][] = [
          ["Result", <strong key="r">{passed ? "Passed" : "Failed"}</strong>],
          ["Total Marks", <strong key="t">{result.totalMarks}</strong>],
          ["Position in Section", <strong key="s">{result.sectionPosition > 0 && result.gpa > 0 ? result.sectionPosition : "-"}</strong>],
          ["Position in Group", <strong key="g">{result.groupPosition > 0 && result.gpa > 0 ? result.groupPosition : "-"}</strong>],
          ["Remarks", transcriptRemarks(note.remarks || result.remarks, result.gpa)],
          ["No. of Working Days", <strong key="w">{note.totalWorkingDays}</strong>],
          ["Total Attendance", <strong key="a">{note.totalAttend}</strong>],
          ["Total Absent", <strong key="b">{Math.max(0, note.totalWorkingDays - note.totalAttend)}</strong>],
          ["Class Teacher's Signature", ""],
          ["Guardian's Signature", ""],
        ]

        return (
          <section key={student.id} className="flex break-after-page flex-col gap-3 last:break-after-auto">
            <header className="flex items-center justify-center gap-5">
              <div style={{ width: logoWidth }} className="shrink-0">
                {institute.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={institute.logoUrl} alt="" className="h-auto w-full" />
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
                <p className="text-sm">{institute.address}</p>
                <h2 style={parseInlineStyle(config.reportNameStyle)}>Academic Transcript</h2>
              </div>
              <div style={{ width: logoWidth }} className="shrink-0" />
            </header>

            <div className="border border-black p-1.5">
              <table className="w-full">
                <tbody>
                  {details.map((row, r) => (
                    <tr key={r}>
                      {row.map(([label, value], c) => (
                        <td key={label} className={cn("py-0.5 align-top", c === 0 ? "w-[55%]" : "w-[22%]")} colSpan={row.length === 1 ? 3 : 1}>
                          <span className={cn("inline-block", c === 0 ? "w-28" : "w-16")}>{label}</span> : {value}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-center gap-4 text-lg font-bold">
              <span className="border-2 border-black px-2">Exam Name : {exam.name}</span>
              <span className="border-2 border-black px-2">Exam Held : {monthShortYear(exam.examStart)}</span>
            </div>
            <p className="text-center text-base font-bold">Result in Details</p>

            <table className="w-full border-collapse">
              <thead>
                <tr className="font-bold">
                  <th className={td} rowSpan={2}>
                    Subject Type
                  </th>
                  <th className={td} rowSpan={2}>
                    Subject Name
                  </th>
                  <th className={td} colSpan={4}>
                    Marks Obtained
                  </th>
                  <th className={td} rowSpan={2}>
                    Letter Grade
                  </th>
                  <th className={td} rowSpan={2}>
                    Grade Point
                  </th>
                  <th className={td} rowSpan={2}>
                    Highest Marks
                  </th>
                  {optional.length > 0 && (
                    <th className={cn(td, "w-6 p-0 font-normal")} rowSpan={2 + subjects.length - optional.length}>
                      <span className="inline-block whitespace-nowrap text-[11px] [writing-mode:vertical-rl] rotate-180">
                        GP added from 4th subject above 2.00
                      </span>
                    </th>
                  )}
                  <th className={td} rowSpan={2}>
                    GPA
                    <span className="block text-[10px]">Without 4th sub.</span>
                  </th>
                  <th className={td} rowSpan={2}>
                    GPA
                    <span className="block text-[10px]">With 4th sub.</span>
                  </th>
                </tr>
                <tr className="font-bold">
                  <th className={td}>{hasTheory && hasCq ? "Theory/CQ" : hasCq ? "CQ" : "Theory"}</th>
                  <th className={td}>MCQ</th>
                  <th className={td}>Prac</th>
                  <th className={td}>Total</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((s, i) => {
                  const mark = marks.get(s.subjectId)
                  const kindSpan = i === 0 || subjects[i - 1].kind !== s.kind ? subjects.filter((x) => x.kind === s.kind).length : 0
                  const written = s.parts.cq ?? s.parts.theory
                  const part = (cell: TabulationCell | null) =>
                    cell ? <td className={cn(td, s.kind !== "optional" && failedCls(cell))}>{cell.text}</td> : <td className={td}>-</td>
                  const gradePoint = mark?.gpa ?? 0
                  return (
                    <tr key={s.subjectId}>
                      {kindSpan > 0 && (
                        <td className={cn(td, "font-bold")} rowSpan={kindSpan}>
                          {kindLabel[s.kind]}
                        </td>
                      )}
                      <td className={cn(td, "text-left")}>{subjectLabel(s.subjectId)}</td>
                      {part(written)}
                      {part(s.parts.mcq)}
                      {part(s.parts.practical)}
                      <td className={cn(td, "font-bold", s.kind !== "optional" && failedCls(s.total))}>{s.total.text}</td>
                      <td className={td}>{mark?.letterGrade || "F"}</td>
                      <td className={td}>{gradePoint.toFixed(2)}</td>
                      <td className={cn(td, "font-bold")}>{highest.get(s.subjectId) ?? 0}</td>
                      {s.kind === "optional" && (
                        <td className={cn(td, "font-bold")}>{Math.max(gradePoint - 2, 0).toFixed(2)}</td>
                      )}
                      {i === 0 && (
                        <>
                          <td className={cn(td, "font-bold")} rowSpan={subjects.length}>
                            {result.gpaWithoutOptional.toFixed(2)}
                          </td>
                          <td className={cn(td, "font-bold")} rowSpan={subjects.length}>
                            {result.gpa.toFixed(2)}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <table className="w-full border-collapse">
              <tbody>
                {summary.map(([label, value], i) => (
                  <tr key={label}>
                    <td className="w-[22%] border-y border-l border-black px-1.5 py-1">{label}</td>
                    <td className="w-[1%] border-y border-black">:</td>
                    <td className="w-[37%] border-y border-r border-black px-1.5 py-1 text-center">{value}</td>
                    {i === 0 && <td className="border-x border-t border-black" rowSpan={summary.length - 1} />}
                    {i === summary.length - 1 && (
                      <td className="border-x border-b border-black px-1.5 py-1 text-center font-bold whitespace-nowrap">
                        Principal / Vice-Principal
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs font-bold">Result Published Date : {longDate(exam.resultPublish)}</p>
          </section>
        )
      })}
    </div>
  )
}
