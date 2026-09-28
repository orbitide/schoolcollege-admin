import { Fragment } from "react"
import { UserIcon } from "lucide-react"

import type { Institute } from "@/lib/institutes"
import { subjectKindLabels, type StudentInformation, type SubjectKind } from "@/lib/student-information"
import { cn, parseInlineStyle } from "@/lib/utils"

type Lookup = (kind: "class" | "section" | "group" | "session" | "house", id: number | null) => string

// Legacy StudentInformation.cshtml: per student, the institute heading with
// the student's photo, their class, section, roll, group, version, type,
// session, house and bank ID, their and their parents' names and mobiles,
// the subjects they take (name over code) and signature lines. Two students
// to a printed page, a rule between them.
export function StudentInformationSheet({
  institute,
  rows,
  name,
  subjectName,
  subjectCode,
  className,
}: {
  institute: Institute
  rows: StudentInformation[]
  name: Lookup
  subjectName: (id: number) => string
  subjectCode: (id: number) => string
  className?: string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const rollColor = config.admitCardColor1.trim() || highlight
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  const td = "border border-black px-1.5 py-1"
  const value = cn(td, "text-center font-bold")
  const dash = (text: string) => text || "-"

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      {rows.map(({ student, enrolment: e, subjects }, i) => {
        const kinds = (["compulsory", "elective", "optional"] as SubjectKind[])
          .map((kind) => ({ kind, count: subjects.filter((s) => s.kind === kind).length }))
          .filter((k) => k.count > 0)
        return (
          <Fragment key={student.id}>
            <section className="flex break-inside-avoid flex-col gap-4">
              <header className="flex items-center gap-4">
                <div className="w-[10%] shrink-0" />
                <div className="flex flex-1 items-center justify-center gap-5">
                  <div style={{ width: logoWidth }} className="shrink-0">
                    {institute.logoUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={institute.logoUrl} alt="" className="h-auto w-full" />
                    )}
                  </div>
                  <div className="flex flex-col items-center text-center">
                    <h1 style={parseInlineStyle(config.reportHeaderStyle)}>{institute.name}</h1>
                    <p className="text-sm">{institute.address}</p>
                    <h2 style={parseInlineStyle(config.reportNameStyle)}>Student Information</h2>
                  </div>
                </div>
                <div className="flex h-[90px] w-[82px] shrink-0 items-center justify-center border border-black">
                  {student.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={student.imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    <UserIcon className="size-10 text-neutral-400" aria-hidden />
                  )}
                </div>
              </header>

              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className={cn(td, "w-[12%]")}>Class :</td>
                    <td className={cn(value, "w-1/4")} style={{ color: highlight }}>
                      {name("class", e.classId)}
                    </td>
                    <td className={cn(td, "w-[13%] text-right")}>Section :</td>
                    <td className={cn(value, "w-1/5")} style={{ color: highlight }}>
                      {name("section", e.sectionId)}
                    </td>
                    <td className={cn(td, "w-[10%] text-right")}>{institute.showClassRoll ? "Roll :" : "ID :"}</td>
                    <td className={cn(value, "w-1/5 text-base tracking-[3px]")} style={{ color: rollColor }}>
                      {institute.showClassRoll ? e.classRoll : student.studentIdentificationNo}
                    </td>
                  </tr>
                  <tr>
                    <td className={td}>Group :</td>
                    <td className={value} style={{ color: highlight }}>
                      {e.groupId != null ? name("group", e.groupId) : ""}
                    </td>
                    <td className={cn(td, "text-right")}>Version :</td>
                    <td className={value} style={{ color: highlight }}>
                      {e.version.replace(/\s*Version$/, "")}
                    </td>
                    <td className={cn(td, "text-right")}>Type :</td>
                    <td className={value} style={{ color: highlight }}>
                      {e.studentType}
                    </td>
                  </tr>
                  <tr>
                    <td className={td}>Session</td>
                    <td className={value} style={{ color: highlight }}>
                      {e.sessionId != null ? name("session", e.sessionId) : ""}
                    </td>
                    <td className={cn(td, "text-right")}>{institute.studentHouseLabel.trim() || "House"}</td>
                    <td className={value} style={{ color: highlight }}>
                      {e.houseId != null ? name("house", e.houseId) : ""}
                    </td>
                    <td className={cn(td, "text-right")}>Bank ID</td>
                    <td className={value} style={{ color: highlight }}>
                      {e.bankId}
                    </td>
                  </tr>
                </tbody>
              </table>

              <table className="w-full border-collapse text-sm">
                <tbody>
                  {(
                    [
                      ["Student Name", student.name, student.primaryMobile],
                      ["Father's Name", student.fatherName, student.fatherMobile],
                      ["Mother's Name", student.motherName, student.motherMobile],
                    ] as const
                  ).map(([label, person, mobile]) => (
                    <tr key={label}>
                      <td className={cn(td, "w-1/5")}>{label} :</td>
                      <td className={cn(td, "w-[45%]")} style={{ color: highlight }}>
                        {dash(person)}
                      </td>
                      <td className={cn(td, "w-[13%] text-right")}>Mobile :</td>
                      <td className={cn(td, "text-center")} style={{ color: highlight }}>
                        {dash(mobile)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {subjects.length > 0 && (
                <table className="w-full border-collapse text-center text-sm">
                  <tbody>
                    <tr>
                      {kinds.map((k) => (
                        <td key={k.kind} className={td} colSpan={k.count}>
                          {subjectKindLabels[k.kind]}
                        </td>
                      ))}
                    </tr>
                    <tr className="font-bold">
                      {subjects.map((s) => (
                        <td key={s.subjectId} className={cn(td, "text-xs")}>
                          {subjectName(s.subjectId)}
                        </td>
                      ))}
                    </tr>
                    <tr className="font-bold">
                      {subjects.map((s) => (
                        <td key={s.subjectId} className={td} style={{ color: highlight }}>
                          {subjectCode(s.subjectId)}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}

              <div className="mt-12 grid grid-cols-3 text-center">
                {["Student's Signature", "Class Teacher", "MIS Incharge"].map((signatory) => (
                  <div key={signatory} className="flex flex-col items-center gap-1">
                    <span className="w-40 border-t border-black" />
                    {signatory}
                  </div>
                ))}
              </div>
            </section>
            {i < rows.length - 1 &&
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
