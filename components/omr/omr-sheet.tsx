import { optionLabels, paperNumber } from "@/lib/bangla"
import {
  ANSWER_VALUES,
  ANSWERS,
  BUBBLE_RADIUS,
  MARKER_SIZE,
  MARKERS,
  ORIENTATION,
  ORIENTATION_SIZE,
  PAGE,
  questionPosition,
  ROLL,
  ROLL_DIGITS,
  SET,
  SET_VALUES,
  type OmrLayout,
} from "@/lib/omr-template"

export type OmrSheetInfo = {
  institute: string
  exam: string
  subject: string
  // A sheet made out to a student; a blank sheet leaves these to be written.
  student?: { name: string; roll: string; className: string; section: string }
  // Fill the roll bubbles in print (only for a student's sheet).
  prefillRoll?: boolean
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
    set: "সেট কোড",
    subject: "বিষয়",
    signature: "পরীক্ষার্থীর স্বাক্ষর",
    invigilator: "কক্ষ পরিদর্শকের স্বাক্ষর",
    rules: "নিয়মাবলি",
    lines: [
      "১. কালো বল পয়েন্ট কলম ব্যবহার কর।",
      "২. সঠিক উত্তরের বৃত্তটি সম্পূর্ণ ভরাট কর:",
      "৩. ভুল পদ্ধতি:",
      "৪. রোল নম্বর ও সেট কোড লিখে বৃত্ত ভরাট কর।",
      "৫. উত্তরপত্র ভাঁজ করবে না, কোণের কালো",
      "    চিহ্নে কোনো দাগ দেবে না।",
    ],
    answers: "উত্তর",
  },
  en: {
    title: "MCQ ANSWER SHEET",
    name: "Name",
    class: "Class",
    section: "Section",
    roll: "Roll No.",
    set: "Set Code",
    subject: "Subject",
    signature: "Candidate's signature",
    invigilator: "Invigilator's signature",
    rules: "Instructions",
    lines: [
      "1. Use a black ballpoint pen.",
      "2. Fill the circle of the answer fully:",
      "3. Wrong ways:",
      "4. Write your roll and set code, then fill",
      "    the circles below them.",
      "5. Do not fold the sheet or mark the corners.",
    ],
    answers: "Answers",
  },
}

// One A4 OMR answer sheet, drawn in millimetres from the same layout the
// scanner reads (lib/omr-template.ts). Letters inside the bubbles are pale so
// they don't read as marks; nothing is printed where the orientation square
// would land on a turned page.
export function OmrSheet({ layout, info }: { layout: OmrLayout; info: OmrSheetInfo }) {
  const t = text[info.lang]
  const bangla = info.lang === "bn"
  const n = (v: string | number) => paperNumber(v, bangla)
  const roll = info.student?.roll ?? ""
  const rollDigits = roll.length <= ROLL_DIGITS ? roll.padStart(ROLL_DIGITS, " ") : ""
  const filled = (field: string, index: number, value: string) =>
    field === "roll" && info.prefillRoll && info.student && rollDigits[index] === value
  const half = MARKER_SIZE / 2
  const r = BUBBLE_RADIUS
  const font = "'Noto Sans Bengali', 'Hind Siliguri', Arial, sans-serif"

  return (
    <svg
      viewBox={`0 0 ${PAGE.width} ${PAGE.height}`}
      width={`${PAGE.width}mm`}
      height={`${PAGE.height}mm`}
      xmlns="http://www.w3.org/2000/svg"
      fontFamily={font}
      style={{ display: "block", background: "#fff" }}
    >
      {MARKERS.map((m, i) => (
        <rect key={i} x={m.x - half} y={m.y - half} width={MARKER_SIZE} height={MARKER_SIZE} fill="#000" />
      ))}
      <rect
        x={ORIENTATION.x - ORIENTATION_SIZE / 2}
        y={ORIENTATION.y - ORIENTATION_SIZE / 2}
        width={ORIENTATION_SIZE}
        height={ORIENTATION_SIZE}
        fill="#000"
      />

      {/* Header */}
      <text x={PAGE.width / 2} y={16} textAnchor="middle" fontSize={3.6} fontWeight={700} fill={INK}>
        {t.title}
      </text>
      <text x={PAGE.width / 2} y={23} textAnchor="middle" fontSize={4.6} fontWeight={700} fill={INK}>
        {info.institute}
      </text>
      <text x={PAGE.width / 2} y={29} textAnchor="middle" fontSize={3.4} fill={INK}>
        {info.exam}
      </text>
      <rect x={22} y={33} width={166} height={27} fill="none" stroke={LINE} strokeWidth={0.3} rx={1} />
      {[
        [t.name, info.student?.name ?? "", 24, 39, 186],
        [t.subject, info.subject, 24, 46, 120],
        [t.class, info.student?.className ?? "", 122, 46, 186],
        [t.section, info.student?.section ?? "", 24, 53, 120],
        [t.roll, info.student?.roll ?? "", 122, 53, 186],
      ].map(([label, value, x, y, end]) => (
        <g key={String(label)}>
          <text x={Number(x)} y={Number(y)} fontSize={2.9} fill={INK}>
            {label}:
          </text>
          <line x1={Number(x) + 18} y1={Number(y) + 0.8} x2={Number(end)} y2={Number(y) + 0.8} stroke={HINT} strokeWidth={0.2} />
          <text x={Number(x) + 19} y={Number(y)} fontSize={3.1} fontWeight={600} fill={INK}>
            {value}
          </text>
        </g>
      ))}
      <text x={24} y={58.5} fontSize={2.3} fill="#555">
        {t.signature}: ____________________
      </text>
      <text x={122} y={58.5} fontSize={2.3} fill="#555">
        {t.invigilator}: ________________
      </text>

      {/* Roll */}
      <text x={ROLL.firstColumn - 3} y={ROLL.boxTop - 1.5} fontSize={2.8} fontWeight={700} fill={INK}>
        {t.roll}
      </text>
      {Array.from({ length: ROLL_DIGITS }, (_, i) => {
        const x = ROLL.firstColumn + i * ROLL.columnPitch
        return (
          <g key={i}>
            <rect x={x - 3} y={ROLL.boxTop} width={6} height={ROLL.boxHeight} fill="none" stroke={LINE} strokeWidth={0.3} />
            {info.prefillRoll && rollDigits[i]?.trim() && (
              <text x={x} y={ROLL.boxTop + 4.8} textAnchor="middle" fontSize={3.6} fontWeight={700} fill={INK}>
                {n(rollDigits[i])}
              </text>
            )}
          </g>
        )
      })}
      {Array.from({ length: 10 }, (_, d) => (
        <text key={d} x={ROLL.labelX} y={ROLL.firstRow + d * 5.4 + 1} fontSize={2.6} fill="#555" textAnchor="middle">
          {n(d)}
        </text>
      ))}

      {/* Set code */}
      <text x={SET.x} y={ROLL.boxTop - 1.5} fontSize={2.8} fontWeight={700} fill={INK} textAnchor="middle">
        {t.set}
      </text>
      <rect x={SET.x - 3} y={ROLL.boxTop} width={6} height={ROLL.boxHeight} fill="none" stroke={LINE} strokeWidth={0.3} />

      {/* Instructions */}
      <rect x={100} y={64} width={92} height={66} fill="none" stroke={LINE} strokeWidth={0.3} rx={1} />
      <text x={104} y={70} fontSize={3} fontWeight={700} fill={INK}>
        {t.rules}
      </text>
      {t.lines.map((line, i) => (
        <text key={i} x={104} y={77 + i * 6} fontSize={2.6} fill={INK}>
          {line}
        </text>
      ))}
      {/* Right and wrong ways to mark */}
      <circle cx={180} cy={82.2} r={r} fill={INK} />
      {[160, 168, 176, 184].map((x, i) => (
        <g key={x}>
          <circle cx={x} cy={88.2} r={r} fill="none" stroke={LINE} strokeWidth={0.25} />
          {i === 0 && <line x1={x - 1.5} y1={88.2 + 1.5} x2={x + 1.5} y2={88.2 - 1.5} stroke={INK} strokeWidth={0.5} />}
          {i === 1 && <path d={`M${x - 1.3} ${88.2} l1 1.2 l1.8 -2.4`} fill="none" stroke={INK} strokeWidth={0.5} />}
          {i === 2 && <circle cx={x} cy={88.2} r={0.7} fill={INK} />}
          {i === 3 && <path d={`M${x - r} ${88.2} A${r} ${r} 0 0 1 ${x + r} ${88.2} Z`} fill={INK} />}
        </g>
      ))}

      {/* Answers */}
      <line x1={14} y1={ANSWERS.top - 2} x2={196} y2={ANSWERS.top - 2} stroke={LINE} strokeWidth={0.3} />
      <text x={PAGE.width / 2} y={ANSWERS.top + 1.5} textAnchor="middle" fontSize={3} fontWeight={700} fill={INK}>
        {t.answers} ({n(layout.questions)})
      </text>
      {Array.from({ length: layout.columns }, (_, c) => {
        const left = ANSWERS.firstColumn + c * ANSWERS.columnWidth
        return (
          <g key={c}>
            {ANSWER_VALUES.map((_, k) => (
              <text
                key={k}
                x={left + ANSWERS.firstBubble + k * ANSWERS.bubblePitch}
                y={ANSWERS.firstRow - 4.2}
                textAnchor="middle"
                fontSize={2.6}
                fontWeight={700}
                fill={INK}
              >
                {optionLabels[info.lang][k]}
              </text>
            ))}
            {c > 0 && (
              <line
                x1={left - 1.5}
                y1={ANSWERS.firstRow - 6}
                x2={left - 1.5}
                y2={ANSWERS.firstRow + (layout.rows - 1) * 5.4 + 3}
                stroke="#ccc"
                strokeWidth={0.2}
              />
            )}
          </g>
        )
      })}
      {Array.from({ length: layout.questions }, (_, q) => {
        const { left, y } = questionPosition(q, layout.rows)
        return (
          <text key={q} x={left + ANSWERS.numberRight} y={y + 1} textAnchor="end" fontSize={2.7} fontWeight={600} fill={INK}>
            {n(q + 1)}
          </text>
        )
      })}

      {/* Bubbles, last so nothing covers them */}
      {layout.bubbles.map((b, i) => {
        const on = filled(b.field, b.index, b.value)
        const label =
          b.field === "roll"
            ? n(b.value)
            : optionLabels[info.lang][(b.field === "set" ? SET_VALUES : ANSWER_VALUES).indexOf(b.value as "A")]
        return (
          <g key={i}>
            <circle cx={b.x} cy={b.y} r={r} fill={on ? "#000" : "#fff"} stroke={LINE} strokeWidth={0.25} />
            {!on && (
              <text x={b.x} y={b.y + 0.85} textAnchor="middle" fontSize={2.2} fill={HINT}>
                {label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
