import { Fragment } from "react"
import type * as React from "react"
import { UserIcon } from "lucide-react"

import type { Institute } from "@/lib/institutes"
import { subjectKindLabels, type StudentInformation, type SubjectKind } from "@/lib/student-information"
import { cn, parseInlineStyle } from "@/lib/utils"

type Lookup = (kind: "class" | "section" | "group" | "session" | "house", id: number | null) => string

const td = "border border-black px-1.5 py-1"
const value = cn(td, "text-center font-bold")

// Cards two to a printed page, a rule between the pair (legacy i % 2).
function TwoPerPage({ cards }: { cards: { key: number; card: React.ReactNode }[] }) {
  return cards.map(({ key, card }, i) => (
    <Fragment key={key}>
      {card}
      {i < cards.length - 1 &&
        (i % 2 === 0 ? (
          <hr className="my-8 border-black" />
        ) : (
          <div className="my-8 break-after-page border-t border-dashed border-neutral-300 print:border-0" />
        ))}
    </Fragment>
  ))
}

// The institute heading with the report's title (and anything under it),
// the student's photo on the right.
function PhotoHeading({
  institute,
  title,
  photo,
  children,
}: {
  institute: Institute
  title: string
  photo: string
  children?: React.ReactNode
}) {
  const config = institute.configuration
  const logoWidth = config.reportLogoWidth.trim() || "70px"
  return (
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
          <h2 style={parseInlineStyle(config.reportNameStyle)}>{title}</h2>
          {children}
        </div>
      </div>
      <div className="flex h-[90px] w-[82px] shrink-0 items-center justify-center border border-black">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" className="size-full object-cover" />
        ) : (
          <UserIcon className="size-10 text-neutral-400" aria-hidden />
        )}
      </div>
    </header>
  )
}

// The subjects a student takes under Compulsory / Elective / Optional, the
// name over the code.
function SubjectsTable({
  subjects,
  subjectName,
  subjectCode,
  highlight,
}: {
  subjects: StudentInformation["subjects"]
  subjectName: (id: number) => string
  subjectCode: (id: number) => string
  highlight?: string
}) {
  const kinds = (["compulsory", "elective", "optional"] as SubjectKind[])
    .map((kind) => ({ kind, count: subjects.filter((s) => s.kind === kind).length }))
    .filter((k) => k.count > 0)
  if (!subjects.length) return null
  return (
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
  )
}

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
  const dash = (text: string) => text || "-"

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      <TwoPerPage
        cards={rows.map(({ student, enrolment: e, subjects }) => ({
          key: student.id,
          card: (
            <section className="flex break-inside-avoid flex-col gap-4">
              <PhotoHeading institute={institute} title="Student Information" photo={student.imageUrl} />

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

              <SubjectsTable
                subjects={subjects}
                subjectName={subjectName}
                subjectCode={subjectCode}
                highlight={highlight}
              />

              <div className="mt-12 grid grid-cols-3 text-center">
                {["Student's Signature", "Class Teacher", "MIS Incharge"].map((signatory) => (
                  <div key={signatory} className="flex flex-col items-center gap-1">
                    <span className="w-40 border-t border-black" />
                    {signatory}
                  </div>
                ))}
              </div>
            </section>
          ),
        }))}
      />
    </div>
  )
}

// Legacy Partial/_BafsdAdmitCard: per student, the institute heading with
// the exam's name and the student's photo, their class, section and roll,
// name, parents, version, group and type, and the subjects they sit in the
// exam (name over code). Two to a printed page, a rule between them.
export function AdmitCardSheet({
  institute,
  examName,
  rows,
  name,
  subjectName,
  subjectCode,
  className,
}: {
  institute: Institute
  examName: string
  rows: StudentInformation[]
  name: Lookup
  subjectName: (id: number) => string
  subjectCode: (id: number) => string
  className?: string
}) {
  const config = institute.configuration
  const highlight = config.reportHighlightColor.trim() || undefined
  const rollColor = config.admitCardColor1.trim() || highlight

  return (
    <div className={cn("bg-white font-serif text-black", className)}>
      <TwoPerPage
        cards={rows.map(({ student, enrolment: e, subjects }) => ({
          key: student.id,
          card: (
            <section className="flex break-inside-avoid flex-col gap-4">
              <PhotoHeading institute={institute} title="Admit Card" photo={student.imageUrl}>
                <p className="mt-3 border border-black px-2.5 py-1 text-sm">
                  Name of Examination :{" "}
                  <strong className="text-base" style={{ color: highlight }}>
                    {examName}
                  </strong>
                </p>
              </PhotoHeading>

              <table className="w-full border-collapse text-sm">
                <tbody>
                  <tr>
                    <td className={cn(td, "w-[12%]")}>Class :</td>
                    <td className={cn(value, "w-[10%]")} style={{ color: highlight }}>
                      {name("class", e.classId)}
                    </td>
                    <td className={cn(td, "w-[18%] text-right")}>Section :</td>
                    <td className={cn(value, "w-1/4")} style={{ color: highlight }}>
                      {name("section", e.sectionId)}
                    </td>
                    <td className={cn(td, "w-[15%] text-right")}>Roll :</td>
                    <td className={cn(value, "text-base tracking-[3px]")} style={{ color: rollColor }}>
                      {e.classRoll}
                    </td>
                  </tr>
                  {(
                    [
                      ["Student Name", student.name, "Version", e.version.replace(/\s*Version$/, "") || "All"],
                      ["Father's Name", student.fatherName, "Group", e.groupId != null ? name("group", e.groupId) : "All"],
                      ["Mother's Name", student.motherName, "Type", e.studentType],
                    ] as const
                  ).map(([label, person, sideLabel, side]) => (
                    <tr key={label}>
                      <td className={td} colSpan={2}>
                        {label} :
                      </td>
                      <td className={td} colSpan={2} style={{ color: highlight }}>
                        {person || "-"}
                      </td>
                      <td className={cn(td, "text-right")}>{sideLabel} :</td>
                      <td className={td} style={{ color: highlight }}>
                        {side}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <SubjectsTable
                subjects={subjects}
                subjectName={subjectName}
                subjectCode={subjectCode}
                highlight={highlight}
              />
            </section>
          ),
        }))}
      />
    </div>
  )
}
