import { optionLabels, paperNumber } from "@/lib/bangla"
import {
  CODE_SIZE,
  codeCells,
  MARKER_SIZE,
  omrType,
  OPTION_VALUES,
  ORIENTATION,
  ORIENTATION_SIZE,
  SET_VALUES,
  type OmrLayout,
} from "@/lib/omr-template"

export type OmrSheetInfo = {
  institute: string
  exam: string
  subject: string
  // A sheet made out to a student; a blank sheet leaves these to be written.
  student?: { name: string; roll: string; registration: string; className: string; section: string }
  // Printed into the subject code boxes and bubbles, when it's digits that fit.
  subjectCode?: string
  // Fill the roll (and registration) bubbles in print, for a student's sheet.
  prefill?: boolean
  lang: "bn" | "en"
}

const INK = "#111"
const LINE = "#333"
const HINT = "#b0b0b0"

const text = {
  bn: {
    title: "বহুনির্বাচনি অভীক্ষার উত্তরপত্র",
    name: "নাম",
    class: "শ্রেণি",
    section: "শাখা",
    roll: "রোল নম্বর",
    registration: "রেজিস্ট্রেশন নম্বর",
    subjectCode: "বিষয় কোড",
    set: "সেট কোড",
    subject: "বিষয়",
    signature: "পরীক্ষার্থীর স্বাক্ষর",
    invigilator: "কক্ষ পরিদর্শকের স্বাক্ষর",
    rules: "নিয়মাবলি",
    lines: ["কালো বল পয়েন্ট কলম ব্যবহার কর।", "সঠিক উত্তরের বৃত্ত সম্পূর্ণ ভরাট কর:", "ভুল পদ্ধতি:", "নম্বর লিখে নিচের বৃত্ত ভরাট কর।", "উত্তরপত্র ভাঁজ করবে না।", "কোণের কালো চিহ্নে দাগ দেবে না।"],
    answers: "উত্তর",
    cut: "এখান দিয়ে কাটুন",
  },
  en: {
    title: "MCQ ANSWER SHEET",
    name: "Name",
    class: "Class",
    section: "Section",
    roll: "Roll No.",
    registration: "Registration No.",
    subjectCode: "Subject Code",
    set: "Set Code",
    subject: "Subject",
    signature: "Candidate's signature",
    invigilator: "Invigilator's signature",
    rules: "Instructions",
    lines: ["Use a black ballpoint pen.", "Fill the answer's circle fully:", "Wrong ways:", "Write the numbers, then fill below.", "Do not fold the sheet.", "Don't mark the corner squares."],
    answers: "Answers",
    cut: "Cut here",
  },
}

const fieldLabel = (field: string, t: (typeof text)["en"]) =>
  field === "roll" ? t.roll : field === "registration" ? t.registration : field === "subject" ? t.subjectCode : t.set

// One OMR answer sheet of any type, drawn in millimetres from the layout
// the scanner reads (lib/omr-template.ts): the corner, orientation and code
// squares, the header, the ID blocks, the instructions and the answers.
// Letters inside the bubbles are pale so they don't read as marks.
export function OmrSheet({ layout, info }: { layout: OmrLayout; info: OmrSheetInfo }) {
  const t = text[info.lang]
  const bangla = info.lang === "bn"
  const n = (v: string | number) => paperNumber(v, bangla)
  const { page, r, spec, id, answers } = layout
  const f = layout.font
  const font = "'Noto Sans Bengali', 'Hind Siliguri', Arial, sans-serif"
  const center = page.width / 2

  // What the ID blocks show and fill: the student's roll and registration
  // (right-aligned in the roll, as written), the subject code.
  const shown: Record<string, string> = {}
  const fits = (value: string, digits: number) => /^\d+$/.test(value) && value.length <= digits
  if (info.student && fits(info.student.roll, spec.roll)) shown.roll = info.student.roll.padStart(spec.roll, " ")
  if (info.student && fits(info.student.registration, spec.registration)) shown.registration = info.student.registration.padStart(spec.registration, " ")
  if (info.subjectCode && fits(info.subjectCode, spec.subject)) shown.subject = info.subjectCode.padStart(spec.subject, "0")
  const filled = (field: string, index: number, value: string) =>
    (field === "subject" || info.prefill) && shown[field]?.[index] === value

  const infoRows: [string, string][] = [
    [t.name, info.student?.name ?? ""],
    [t.class, info.student?.className ?? ""],
    [t.section, info.student?.section ?? ""],
    [t.roll, info.student?.roll ?? ""],
  ]

  return (
    <svg
      viewBox={`0 0 ${page.width} ${page.height}`}
      width={`${page.width}mm`}
      height={`${page.height}mm`}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily={font}
      style={{ display: "block", background: "#fff" }}
    >
      {layout.markers.map((m, i) => (
        <rect key={i} x={m.x - MARKER_SIZE / 2} y={m.y - MARKER_SIZE / 2} width={MARKER_SIZE} height={MARKER_SIZE} fill="#000" />
      ))}
      <rect
        x={ORIENTATION.x - ORIENTATION_SIZE / 2}
        y={ORIENTATION.y - ORIENTATION_SIZE / 2}
        width={ORIENTATION_SIZE}
        height={ORIENTATION_SIZE}
        fill="#000"
      />
      {codeCells.map((c, i) =>
        layout.bits[i] ? <rect key={i} x={c.x - CODE_SIZE / 2} y={c.y - CODE_SIZE / 2} width={CODE_SIZE} height={CODE_SIZE} fill="#000" /> : null
      )}

      {/* Header */}
      {layout.half ? (
        <>
          <text x={center} y={20} textAnchor="middle" fontSize={3.6} fontWeight={700} fill={INK}>
            {info.institute}
          </text>
          <text x={center} y={25.5} textAnchor="middle" fontSize={2.8} fill={INK}>
            {t.title} · {info.exam} · {info.subject}
          </text>
          {infoRows.map(([label, value], i) => (
            <g key={label}>
              <text x={22 + i * 43} y={31.5} fontSize={2.5} fill={INK}>
                {label}:
              </text>
              <line x1={22 + i * 43 + 11} y1={32.2} x2={22 + i * 43 + 41} y2={32.2} stroke={HINT} strokeWidth={0.2} />
              <text x={22 + i * 43 + 12} y={31.5} fontSize={2.6} fontWeight={600} fill={INK}>
                {value}
              </text>
            </g>
          ))}
        </>
      ) : (
        <>
          <text x={center} y={20} textAnchor="middle" fontSize={3.4} fontWeight={700} fill={INK}>
            {t.title}
            {spec.type !== "standard" && ` · ${omrType(spec.type).name}`}
          </text>
          <text x={center} y={26} textAnchor="middle" fontSize={4.4} fontWeight={700} fill={INK}>
            {info.institute}
          </text>
          <text x={center} y={31.2} textAnchor="middle" fontSize={3.2} fill={INK}>
            {info.exam}
          </text>
          <rect x={22} y={33.5} width={166} height={25} fill="none" stroke={LINE} strokeWidth={0.3} rx={1} />
          {(
            [
              [t.name, info.student?.name ?? "", 24, 39, 186],
              [t.subject, info.subject, 24, 45.5, 120],
              [t.class, info.student?.className ?? "", 122, 45.5, 186],
              [t.section, info.student?.section ?? "", 24, 52, 120],
              [t.roll, info.student?.roll ?? "", 122, 52, 186],
            ] as const
          ).map(([label, value, x, y, end]) => (
            <g key={label}>
              <text x={x} y={y} fontSize={2.8} fill={INK}>
                {label}:
              </text>
              <line x1={x + 18} y1={y + 0.8} x2={end} y2={y + 0.8} stroke={HINT} strokeWidth={0.2} />
              <text x={x + 19} y={y} fontSize={3} fontWeight={600} fill={INK}>
                {value}
              </text>
            </g>
          ))}
          <text x={24} y={57} fontSize={2.2} fill="#555">
            {t.signature}: ____________________
          </text>
          <text x={122} y={57} fontSize={2.2} fill="#555">
            {t.invigilator}: ________________
          </text>
        </>
      )}

      {/* ID blocks: a label, write-in boxes, then a column of bubbles per digit */}
      {id.blocks.map((block) => {
        const first = block.columns[0]
        const last = block.columns[block.columns.length - 1]
        const boxW = Math.min(6, (block.columns[1] ?? first + 6) - first - 0.4)
        return (
          <g key={block.field}>
            <text x={(first + last) / 2} y={id.labelY} textAnchor="middle" fontSize={2.5 * f} fontWeight={700} fill={INK}>
              {fieldLabel(block.field, t)}
            </text>
            {block.columns.map((x, i) => (
              <g key={i}>
                <rect x={x - boxW / 2} y={id.boxTop} width={boxW} height={id.boxHeight} fill="none" stroke={LINE} strokeWidth={0.3} />
                {shown[block.field]?.[i]?.trim() && (block.field === "subject" || info.prefill) && (
                  <text x={x} y={id.boxTop + id.boxHeight * 0.72} textAnchor="middle" fontSize={3.4 * f} fontWeight={700} fill={INK}>
                    {n(shown[block.field][i])}
                  </text>
                )}
              </g>
            ))}
          </g>
        )
      })}
      {id.digitLabelX != null &&
        Array.from({ length: 10 }, (_, d) => (
          <text key={d} x={id.digitLabelX!} y={id.firstRow + d * layout.row + 0.9 * f} fontSize={2.5 * f} fill="#555" textAnchor="middle">
            {n(d)}
          </text>
        ))}

      {/* Instructions */}
      {layout.instructions.box ? (
        <Instructions x={layout.instructions.x} y={layout.instructions.y} width={layout.instructions.width} height={layout.instructions.height} t={t} r={r} />
      ) : (
        <text x={layout.instructions.x} y={layout.instructions.y} fontSize={2.2} fill="#444">
          {layout.half
            ? t.lines.slice(0, 2).join(" ")
            : `${t.rules}: ${t.lines[0]} ${t.lines[1].replace(/:$/, "")}. ${t.lines[4]}`}
        </text>
      )}
      {layout.half &&
        t.lines.slice(2).map((line, i) => (
          <text key={i} x={layout.instructions.x} y={layout.instructions.y + 4 + i * 3.6} fontSize={2.2} fill="#444">
            {line}
          </text>
        ))}

      {/* Answers */}
      {layout.half ? (
        <line x1={answers.left - 4} y1={answers.top - 2} x2={answers.left - 4} y2={answers.firstRow + (answers.rows - 1) * layout.row + 3} stroke={LINE} strokeWidth={0.3} />
      ) : (
        <>
          <line x1={14} y1={answers.top} x2={196} y2={answers.top} stroke={LINE} strokeWidth={0.3} />
          <text x={center} y={answers.top + 3.6} textAnchor="middle" fontSize={2.8 * f} fontWeight={700} fill={INK}>
            {t.answers} ({n(layout.questions)})
          </text>
        </>
      )}
      {answers.columns.map((column, c) => (
        <g key={c}>
          {column.bubbles.map((bx, k) => (
            <text key={k} x={bx} y={answers.headerY + 0.9} textAnchor="middle" fontSize={2.5 * f} fontWeight={700} fill={INK}>
              {optionLabels[info.lang][k]}
            </text>
          ))}
          {c > 0 && (
            <line
              x1={column.left - 1.5}
              y1={answers.headerY - 2}
              x2={column.left - 1.5}
              y2={answers.firstRow + (answers.rows - 1) * layout.row + 3}
              stroke="#ccc"
              strokeWidth={0.2}
            />
          )}
        </g>
      ))}
      {Array.from({ length: layout.questions }, (_, q) => {
        const column = answers.columns[Math.floor(q / answers.rows)]
        const y = answers.firstRow + (q % answers.rows) * layout.row
        return (
          <text key={q} x={column.numberRight} y={y + 0.95 * f} textAnchor="end" fontSize={2.6 * f} fontWeight={600} fill={INK}>
            {n(q + 1)}
          </text>
        )
      })}

      {/* Bubbles, last so nothing covers them */}
      {layout.bubbles.map((b, i) => {
        const on = filled(b.field, b.index, b.value)
        const label =
          b.field === "answer"
            ? optionLabels[info.lang][OPTION_VALUES.indexOf(b.value as "A")]
            : b.field === "set"
              ? optionLabels[info.lang][SET_VALUES.indexOf(b.value as "A")]
              : n(b.value)
        return (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={r} fill={on ? "#000" : "#fff"} stroke={LINE} strokeWidth={0.25} />
            {!on && (
              <text x={b.x} y={b.y + 0.4 * r} textAnchor="middle" fontSize={r * 1.05} fill={HINT}>
                {label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// The instructions box with the right way and some wrong ways to mark. In
// a narrow box (board style) the samples take rows of their own and the
// least needed lines are left out.
function Instructions({
  x,
  y,
  width,
  height,
  t,
  r,
}: {
  x: number
  y: number
  width: number
  height: number
  t: (typeof text)["en"]
  r: number
}) {
  const narrow = width < 60
  const size = narrow ? 1.9 : 2.5
  const pitch = narrow ? 4.6 : 6
  type Row = { text?: string; samples?: "right" | "wrong" }
  const numbered = t.lines.map((line, i) => `${i + 1}. ${line}`)
  const rows: Row[] = narrow
    ? [{ text: numbered[0] }, { text: numbered[1] }, { samples: "right" }, { text: numbered[2] }, { samples: "wrong" }, { text: numbered[4] }]
    : numbered.map((text, i) => ({ text, samples: i === 1 ? "right" : i === 2 ? "wrong" : undefined }))
  const sample = (kind: "right" | "wrong", rowY: number) => {
    const cy = rowY - 0.8
    const startX = narrow ? x + 7 : x + width - 4 - 3 * (r * 2 + 1.6)
    if (kind === "right") return <circle cx={narrow ? startX : x + width - 4} cy={cy} r={r} fill={INK} />
    return [0, 1, 2, 3].map((k) => {
      const cx = startX + k * (r * 2 + 1.6)
      return (
        <g key={k}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke={LINE} strokeWidth={0.25} />
          {k === 0 && <line x1={cx - r * 0.7} y1={cy + r * 0.7} x2={cx + r * 0.7} y2={cy - r * 0.7} stroke={INK} strokeWidth={0.5} />}
          {k === 1 && <path d={`M${cx - r * 0.6} ${cy} l${r * 0.45} ${r * 0.55} l${r * 0.85} ${-r * 1.1}`} fill="none" stroke={INK} strokeWidth={0.5} />}
          {k === 2 && <circle cx={cx} cy={cy} r={r * 0.33} fill={INK} />}
          {k === 3 && <path d={`M${cx - r} ${cy} A${r} ${r} 0 0 1 ${cx + r} ${cy} Z`} fill={INK} />}
        </g>
      )
    })
  }
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="none" stroke={LINE} strokeWidth={0.3} rx={1} />
      <text x={x + 3} y={y + 5.5} fontSize={size + 0.4} fontWeight={700} fill={INK}>
        {t.rules}
      </text>
      {rows.map((row, i) => {
        const rowY = y + 6 + (i + 1) * pitch
        return (
          <g key={i}>
            {row.text && (
              <text x={x + 3} y={rowY} fontSize={size} fill={INK}>
                {row.text}
              </text>
            )}
            {row.samples && sample(row.samples, rowY)}
          </g>
        )
      })}
    </g>
  )
}
