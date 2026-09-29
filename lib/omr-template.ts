// OMR answer sheet types and their geometry, in millimetres. The printed
// sheet (components/omr/omr-sheet.tsx) and the scanner (lib/omr-scan.ts)
// both work from `omrLayout`, so a bubble is read exactly where it was
// printed.
//
// Every sheet has four solid corner squares that locate the page in a scan
// or photo, a small square beside the top-left one that tells which way up
// it is, and a row of tiny code squares along the top edge that spell out
// the sheet's type, fields and question count (24 bits with a checksum), so
// the scanner knows which layout it is reading without being told. Nothing
// else is printed near the edges: the scanner probes those lines while it
// works out how the page is turned.
//
// The legacy system had no sheet of its own (an external scanner posted
// the readings), so these layouts are ours.

export type Point = { x: number; y: number }

export const A4 = { width: 210, height: 297 } as const
// Half an A4 sheet, landscape: two print on one A4 and are cut apart.
export const HALF_A4 = { width: 210, height: 148.5 } as const
export type PageSize = { width: number; height: number }

export const MARKER_SIZE = 8
const MARKER_INSET = 8

// Centres of the corner squares: top-left, top-right, bottom-right, bottom-left.
export function markersFor(page: PageSize): Point[] {
  const near = MARKER_INSET + MARKER_SIZE / 2
  return [
    { x: near, y: near },
    { x: page.width - near, y: near },
    { x: page.width - near, y: page.height - near },
    { x: near, y: page.height - near },
  ]
}

// The orientation square and the code squares sit on the line through the
// top corner squares' centres, the same on every page size.
export const TOP_LINE = MARKER_INSET + MARKER_SIZE / 2
export const ORIENTATION_SIZE = 4
export const ORIENTATION: Point = { x: MARKER_INSET + MARKER_SIZE + 6 + ORIENTATION_SIZE / 2, y: TOP_LINE }
export const CODE_BITS = 24
export const CODE_SIZE = 3
const CODE_FIRST = 32
const CODE_PITCH = 6.4
export const codeCells: Point[] = Array.from({ length: CODE_BITS }, (_, i) => ({ x: CODE_FIRST + i * CODE_PITCH, y: TOP_LINE }))

export const MAX_QUESTIONS = 100
export const SET_VALUES = ["A", "B", "C", "D"] as const
export const OPTION_VALUES = ["A", "B", "C", "D", "E"] as const

// ---- Sheet types ----

export type OmrFields = {
  // Digit columns for the roll (3–7), registration (0–10) and subject code (0–3).
  roll: number
  registration: number
  subject: number
  // A set code block (A–D).
  set: boolean
  // Options per question.
  options: 4 | 5
}

export const omrTypes = [
  {
    id: "standard",
    code: 0,
    name: "Standard",
    description: "A4 with roll and set code, up to 100 questions.",
    fields: { roll: 6, registration: 0, subject: 0, set: true, options: 4 },
  },
  {
    id: "board",
    code: 1,
    name: "Board Style",
    description: "Like the education board's sheet: roll, registration no., subject code and set code, up to 100 questions.",
    fields: { roll: 6, registration: 10, subject: 3, set: true, options: 4 },
  },
  {
    id: "class-test",
    code: 2,
    name: "Class Test",
    description: "Half an A4 page (two print on one sheet; cut them apart before scanning): roll and set, up to 40 questions.",
    fields: { roll: 5, registration: 0, subject: 0, set: true, options: 4 },
  },
  {
    id: "junior",
    code: 3,
    name: "Junior",
    description: "Large bubbles for younger classes: roll and set, up to 30 questions.",
    fields: { roll: 4, registration: 0, subject: 0, set: true, options: 4 },
  },
  {
    id: "admission",
    code: 4,
    name: "Admission Test",
    description: "Five options (A–E) per question: roll and set, up to 100 questions.",
    fields: { roll: 6, registration: 0, subject: 0, set: true, options: 5 },
  },
  {
    id: "custom",
    code: 5,
    name: "Custom",
    description: "Pick the fields yourself: roll, registration, subject code, set code, 4 or 5 options.",
    fields: { roll: 6, registration: 0, subject: 0, set: true, options: 4 },
  },
] as const satisfies readonly { id: string; code: number; name: string; description: string; fields: OmrFields }[]

export type OmrTypeId = (typeof omrTypes)[number]["id"]
export const omrType = (id: OmrTypeId) => omrTypes.find((t) => t.id === id)!

// What a sheet is: its type, fields and question count. The code squares
// carry all of it.
export type OmrSpec = OmrFields & { type: OmrTypeId; questions: number }

export const CUSTOM_LIMITS = {
  roll: { min: 3, max: 7 },
  registration: { min: 0, max: 10 },
  subject: { min: 0, max: 3 },
} as const

export function specFor(type: OmrTypeId, questions: number, custom?: Partial<OmrFields>): OmrSpec {
  const base = omrType(type).fields
  return { type, questions, ...base, ...(type === "custom" ? custom : undefined) }
}

// ---- The code squares ----
// bits 0–2 type · 3–9 questions · 10 five options · 11–13 roll digits ·
// 14–17 registration digits · 18–19 subject code digits · 20 set code ·
// 21–23 checksum (the ones among bits 0–20, mod 8).

function bitsOf(value: number, count: number) {
  return Array.from({ length: count }, (_, i) => (value >> i) & 1)
}
const valueOf = (bits: number[]) => bits.reduce((sum, bit, i) => sum + (bit << i), 0)

export function encodeSpec(spec: OmrSpec): number[] {
  const body = [
    ...bitsOf(omrType(spec.type).code, 3),
    ...bitsOf(spec.questions, 7),
    spec.options === 5 ? 1 : 0,
    ...bitsOf(spec.roll, 3),
    ...bitsOf(spec.registration, 4),
    ...bitsOf(spec.subject, 2),
    spec.set ? 1 : 0,
  ]
  const ones = body.filter(Boolean).length
  return [...body, ...bitsOf(ones % 8, 3)]
}

export function decodeSpec(bits: number[]): OmrSpec | null {
  if (bits.length !== CODE_BITS) return null
  const body = bits.slice(0, 21)
  if (valueOf(bits.slice(21)) !== body.filter(Boolean).length % 8) return null
  const type = omrTypes.find((t) => t.code === valueOf(body.slice(0, 3)))
  if (!type) return null
  const spec: OmrSpec = {
    type: type.id,
    questions: valueOf(body.slice(3, 10)),
    options: body[10] ? 5 : 4,
    roll: valueOf(body.slice(11, 14)),
    registration: valueOf(body.slice(14, 18)),
    subject: valueOf(body.slice(18, 20)),
    set: body[20] === 1,
  }
  if (spec.registration > CUSTOM_LIMITS.registration.max || spec.questions > MAX_QUESTIONS) return null
  return spec
}

// ---- Layout ----

type Style = {
  page: PageSize
  r: number
  row: number
  digit: number
  bubble: number
  font: number
  gap: number
}

function styleFor(spec: OmrSpec): Style {
  if (spec.type === "class-test") return { page: HALF_A4, r: 2, row: 5.4, digit: 6.4, bubble: 6.2, font: 1, gap: 9 }
  if (spec.type === "junior") return { page: A4, r: 3, row: 7.4, digit: 8.8, bubble: 9.5, font: 1.3, gap: 12 }
  const bubble = spec.options === 5 ? 5.8 : 7
  const r = spec.options === 5 ? 2 : 2.1
  // Wide ID blocks (board style, custom) close up so they fit the page.
  const digits = spec.roll + spec.registration + spec.subject + (spec.set ? 1 : 0)
  const blocks = [spec.roll, spec.registration, spec.subject, spec.set ? 1 : 0].filter(Boolean).length
  const digit = digits * 6.8 + (blocks - 1) * 9 > 150 ? 6.2 : 6.8
  return { page: A4, r, row: 5.4, digit, bubble, font: 1, gap: digit < 6.8 ? 7 : 9 }
}

export type OmrField = "roll" | "registration" | "subject" | "set" | "answer"

export type OmrBubble = {
  field: OmrField
  // The digit's column, the question's index (0-based), or 0 for the set.
  index: number
  value: string
  x: number
  y: number
}

export type OmrIdBlock = {
  field: Exclude<OmrField, "answer">
  // Centres of its columns, left to right.
  columns: number[]
  values: readonly string[]
}

export type OmrLayout = {
  spec: OmrSpec
  page: PageSize
  half: boolean
  markers: Point[]
  bits: number[]
  r: number
  row: number
  font: number
  id: {
    labelY: number
    boxTop: number
    boxHeight: number
    firstRow: number
    // Where the 0–9 row labels go; null without digit fields.
    digitLabelX: number | null
    blocks: OmrIdBlock[]
    right: number
    bottom: number
  }
  // The instructions box (A4 with room beside the ID block) or the lines
  // under the ID block.
  instructions: { x: number; y: number; width: number; height: number; box: boolean }
  answers: {
    // The line above them (A4) or to their left (half page).
    top: number
    left: number
    headerY: number
    firstRow: number
    rows: number
    columns: { left: number; numberRight: number; bubbles: number[] }[]
  }
  questions: number
  // Most questions the sheet type holds.
  capacity: number
  bubbles: OmrBubble[]
}

const REGION = { left: 14, right: 196 }
const BOTTOM_CLEAR = 17

export function omrLayout(spec: OmrSpec): OmrLayout {
  const style = styleFor(spec)
  const { page, r, row } = style
  const half = page === HALF_A4
  const markers = markersFor(page)

  // ID block: roll, registration, subject code, set, left to right.
  const labelY = half ? 37.5 : 64.5
  const boxTop = labelY + 2
  const boxHeight = spec.type === "junior" ? 8 : 6.5
  const firstRow = boxTop + boxHeight + r + 2.9
  const digitFields = (
    [
      ["roll", spec.roll],
      ["registration", spec.registration],
      ["subject", spec.subject],
    ] as const
  ).filter(([, n]) => n > 0)
  let x = spec.type === "junior" ? 32 : 30
  const blocks: OmrIdBlock[] = []
  for (const [field, n] of digitFields) {
    blocks.push({ field, columns: Array.from({ length: n }, (_, i) => x + i * style.digit), values: "0123456789".split("") })
    x += (n - 1) * style.digit + style.gap
  }
  if (spec.set) {
    blocks.push({ field: "set", columns: [x], values: SET_VALUES })
    x += style.gap
  }
  const idRight = x - style.gap + r
  const idRows = digitFields.length ? 10 : SET_VALUES.length
  const idBottom = firstRow + (idRows - 1) * row + r

  // Instructions: a box beside the ID block when there is room, else a few
  // lines under it.
  const boxLeft = Math.max(100, idRight + 5)
  const instructions = half
    ? { x: 22, y: idBottom + 5, width: idRight - 22, height: 148.5 - BOTTOM_CLEAR - (idBottom + 5), box: false }
    : REGION.right - 3 - boxLeft >= 34
      ? { x: boxLeft, y: labelY - 2, width: REGION.right - 3 - boxLeft, height: idBottom - labelY + 2, box: true }
      : { x: 22, y: idBottom + 4.5, width: 170, height: 4, box: false }

  // Answers: below the ID block on A4, beside it on a half page.
  const answersLeft = half ? idRight + 10 : REGION.left
  const top = half ? labelY : instructions.box ? idBottom + 6 : idBottom + 8.5
  const headerY = half ? firstRow - r - 3 : top + 7.5 + (spec.type === "junior" ? 1.5 : 0)
  const answersFirstRow = half ? firstRow : headerY + r + 3.2
  const maxY = page.height - BOTTOM_CLEAR - r
  const rowsMax = Math.max(1, Math.floor((maxY - answersFirstRow) / row) + 1)
  const numberRight = 10 * style.font
  const firstBubble = numberRight + 3 + r
  const columnWidth = firstBubble + (spec.options - 1) * style.bubble + r + 4
  const regionWidth = REGION.right - answersLeft
  const columnsMax = Math.max(1, Math.floor(regionWidth / columnWidth))
  const typeMax = spec.type === "class-test" ? 40 : spec.type === "junior" ? 30 : MAX_QUESTIONS
  const capacity = Math.min(typeMax, rowsMax * columnsMax)
  const questions = Math.max(1, Math.min(capacity, Math.floor(spec.questions) || 1))
  const minRows = half ? 5 : spec.type === "junior" ? 8 : 10
  const rows = Math.min(rowsMax, Math.max(minRows, Math.ceil(questions / columnsMax)))
  const columnCount = Math.ceil(questions / rows)
  const spacing = regionWidth / columnsMax
  const columns = Array.from({ length: columnCount }, (_, c) => {
    const left = answersLeft + c * spacing
    return {
      left,
      numberRight: left + numberRight,
      bubbles: Array.from({ length: spec.options }, (_, k) => left + firstBubble + k * style.bubble),
    }
  })

  const bubbles: OmrBubble[] = []
  for (const block of blocks) {
    block.columns.forEach((cx, index) =>
      block.values.forEach((value, v) => bubbles.push({ field: block.field, index, value, x: cx, y: firstRow + v * row }))
    )
  }
  for (let q = 0; q < questions; q++) {
    const column = columns[Math.floor(q / rows)]
    const y = answersFirstRow + (q % rows) * row
    column.bubbles.forEach((bx, k) => bubbles.push({ field: "answer", index: q, value: OPTION_VALUES[k], x: bx, y }))
  }

  return {
    spec: { ...spec, questions },
    page,
    half,
    markers,
    bits: encodeSpec({ ...spec, questions }),
    r,
    row,
    font: style.font,
    id: {
      labelY,
      boxTop,
      boxHeight,
      firstRow,
      digitLabelX: digitFields.length ? (blocks[0].columns[0] - 8) : null,
      blocks,
      right: idRight,
      bottom: idBottom,
    },
    instructions,
    answers: { top, left: answersLeft, headerY, firstRow: answersFirstRow, rows, columns },
    questions,
    capacity,
    bubbles,
  }
}

// Why a sheet can't be made as asked; null when it can.
export function specProblem(spec: OmrSpec) {
  if (spec.type === "custom") {
    for (const key of ["roll", "registration", "subject"] as const) {
      const { min, max } = CUSTOM_LIMITS[key]
      if (!(spec[key] >= min && spec[key] <= max && Number.isInteger(spec[key])))
        return `${key === "roll" ? "Roll" : key === "registration" ? "Registration" : "Subject code"} digits must be ${min}–${max}.`
    }
  }
  const layout = omrLayout(spec)
  if (layout.id.right > REGION.right - 3) return "The ID fields don't fit across the page; use fewer digits."
  if (spec.questions > layout.capacity) return `${omrType(spec.type).name} sheets hold at most ${layout.capacity} questions, not ${spec.questions}.`
  return null
}
