import { Fragment } from "react"

import type { AcademicClass, Branch, Institute } from "@/lib/institutes"
import {
  subjectKinds,
  tabulationParts,
  type TabulationCell,
  type TabulationPart,
  type TabulationStudent,
} from "@/lib/tabulation"
import type { TermExam } from "@/lib/term-exams"
import { cn, parseInlineStyle } from "@/lib/utils"

const failedCls = (cell: TabulationCell) => (cell.failed ? "text-red-600 underline" : undefined)

// Legacy Partial/_numberSheet: a card per student — the institute heading,
// the exam, the student's class, section, roll, name, parents, version,
// group and type, their marks per part of each subject they take (a
// failed student's short marks red and underlined), total marks, the
// section's highest and their merit position in it, and signature lines.
// Two cards to a printed page, a rule between them.
export function NumberSheetSheet({
  institute,
  branch,
  academicClass,
  exam,
  students,
  parts,
  highestMarks,
  name,
  subjectLabel,
  className,
}: {
  institute: Institute
  branch?: Branch
  academicClass?: AcademicClass
  exam: TermExam
  students: TabulationStudent[]
  // The parts the exam marks any subject in: a row each (legacy isTheory, …).
  parts: TabulationPart[]
  highestMarks: number
  name: (kind: "section" | "group", id: number | null) => string
  subjectLabel: (id: number) => string
  className?: string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const rollColor = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1.5 py-1"
  const box = "border border-black px-2.5 py-1.5"
  const strong = "text-base font-bold"
  const showGroup = !!academicClass?.hasSubjectGroup

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      {students.map((std, i) => {
        const { student, result } = std
        const e = std.enrolment
        const subjects = subjectKinds.flatMap((k) => std.subjects.filter((s) => s.kind === k.key))
        const kinds = subjectKinds
          .map((k) => ({ ...k, count: std.subjects.filter((s) => s.kind === k.key).length }))
          .filter((k) => k.count > 0)
        const totalMarks = std.subjects.reduce((sum, s) => sum + s.marks, 0)
        return (
          <Fragment key={student.id}>
            <section className="flex break-inside-avoid flex-col gap-3 text-sm">
              <header className="flex items-center justify-center gap-5">
                <div style={{ width: logoWidth }} className="shrink-0">
                  {institute.logoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={institute.logoUrl} alt="" className="h-auto w-full" />
                  )}
                </div>
                <div className="flex flex-col items-center text-center">
                  <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
                  <p>{branch?.address || institute.address}</p>
                  <h2 style={parseInlineStyle(config.reportNameStyle)}>Number Sheet</h2>
                </div>
                <div style={{ width: logoWidth }} className="shrink-0" />
              </header>
              <p className={cn(box, "mx-auto")}>
                Name of Examination :{" "}
                <span className={strong} style={{ color: highlight }}>
                  {exam.fullName}
                </span>
              </p>

              <table className="w-full border-collapse">
                <tbody>
                  <tr>
                    <td className={cn(td, "w-[12%]")}>Class :</td>
                    <td className={cn(td, "w-[10%] text-center font-bold")} style={{ color: highlight }}>
                      {academicClass?.name ?? "—"}
                    </td>
                    <td className={cn(td, "w-[18%] text-right")}>Section :</td>
                    <td className={cn(td, "w-1/4 text-center font-bold")} style={{ color: highlight }}>
                      {name("section", result.sectionId)}
                    </td>
                    <td className={cn(td, "w-[15%] text-right")}>Roll :</td>
                    <td className={cn(td, "text-center font-bold tracking-[3px]")} style={{ color: rollColor }}>
                      {result.roll}
                    </td>
                  </tr>
                  <tr>
                    <td className={td} colSpan={2}>
                      Student Name :
                    </td>
                    <td className={td} colSpan={institute.enableVersion ? 2 : 4} style={{ color: highlight }}>
                      {student.name}
                    </td>
                    {institute.enableVersion && (
                      <>
                        <td className={cn(td, "text-right")}>Version :</td>
                        <td className={td} style={{ color: highlight }}>
                          {e.version || "-"}
                        </td>
                      </>
                    )}
                  </tr>
                  <tr>
                    <td className={td} colSpan={2}>
                      Father&apos;s Name :
                    </td>
                    <td className={td} colSpan={showGroup ? 2 : 4} style={{ color: highlight }}>
                      {student.fatherName || "-"}
                    </td>
                    {showGroup && (
                      <>
                        <td className={cn(td, "text-right")}>Group :</td>
                        <td className={td} style={{ color: highlight }}>
                          {e.groupId != null ? name("group", e.groupId) : "-"}
                        </td>
                      </>
                    )}
                  </tr>
                  <tr>
                    <td className={td} colSpan={2}>
                      Mother&apos;s Name :
                    </td>
                    <td className={td} colSpan={2} style={{ color: highlight }}>
                      {student.motherName || "-"}
                    </td>
                    <td className={cn(td, "text-right")}>Type :</td>
                    <td className={td} style={{ color: highlight }}>
                      {e.studentType}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-center tabular-nums">
                <tbody>
                  <tr>
                    <td className={td}>Marks Type</td>
                    {kinds.map((k) => (
                      <td key={k.key} className={td} colSpan={k.count}>
                        {k.key === "optional" ? "Optional" : k.label.replace(" Subject", "")}
                      </td>
                    ))}
                  </tr>
                  <tr className="font-bold">
                    <td className={td} />
                    {subjects.map((s) => (
                      <td key={s.subjectId} className={td}>
                        {subjectLabel(s.subjectId)}
                      </td>
                    ))}
                  </tr>
                  {parts.map((part) => (
                    <tr key={part}>
                      <td className={td}>{tabulationParts.find((p) => p.key === part)!.label}</td>
                      {subjects.map((s) => {
                        const cell = s.parts[part]
                        return (
                          <td key={s.subjectId} className={cn(td, cell && failedCls(cell))}>
                            {cell?.text ?? "-"}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  <tr className="font-bold">
                    <td className={td}>Total</td>
                    {subjects.map((s) => (
                      <td key={s.subjectId} className={cn(td, failedCls(s.total))}>
                        {s.total.text}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>

              <div className="flex items-center justify-between gap-4">
                {(
                  [
                    ["Total Marks", totalMarks],
                    ["Highest Marks", highestMarks],
                    ["Merit Position", std.passed && result.isPresent ? result.sectionPosition : "-"],
                  ] as const
                ).map(([label, value]) => (
                  <p key={label} className={box}>
                    {label} :{" "}
                    <span className={strong} style={{ color: highlight }}>
                      {value}
                    </span>
                  </p>
                ))}
              </div>

              <div className="mt-10 grid grid-cols-3 text-center">
                {["Class Teacher", "Guardian's Signature", "Vice-Principal"].map((signatory) => (
                  <div key={signatory} className="flex flex-col items-center gap-1">
                    <span className="w-40 border-t border-black" />
                    {signatory}
                  </div>
                ))}
              </div>
            </section>
            {i < students.length - 1 &&
              (i % 2 === 0 ? (
                <hr className="my-8 border-black" />
              ) : (
                <div className="my-8 break-after-page border-t border-dashed border-neutral-300 print:border-0" />
              ))}
          </Fragment>
        )
      })}
    </div>
  )
}
