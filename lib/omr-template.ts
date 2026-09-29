// The OMR answer sheet's geometry, in millimetres on an A4 page. The printed
// sheet (components/omr/omr-sheet.tsx) and the scanner (lib/omr-scan.ts)
// both work from this one layout, so a bubble is read exactly where it was
// printed. Four solid corner squares locate the page in a scan or photo; a
// small square beside the top-left one tells which way up it is. A sheet
// carries the roll number (six digit columns), the set code (A–D) and up to
// 100 questions of four options. The legacy system had no sheet of its own
// (an external scanner posted the readings), so this layout is ours.

export const PAGE = { width: 210, height: 297 } as const

export const MARKER_SIZE = 8
// Top-left corners of the corner squares.
const MARKER_INSET = 8

export type Point = { x: number; y: number }

// Centres of the corner squares: top-left, top-right, bottom-right, bottom-left.
export const MARKERS: Point[] = [
  { x: MARKER_INSET + MARKER_SIZE / 2, y: MARKER_INSET + MARKER_SIZE / 2 },
  { x: PAGE.width - MARKER_INSET - MARKER_SIZE / 2, y: MARKER_INSET + MARKER_SIZE / 2 },
  { x: PAGE.width - MARKER_INSET - MARKER_SIZE / 2, y: PAGE.height - MARKER_INSET - MARKER_SIZE / 2 },
  { x: MARKER_INSET + MARKER_SIZE / 2, y: PAGE.height - MARKER_INSET - MARKER_SIZE / 2 },
]

// The orientation square beside the top-left corner square; the places it
// would land on a turned page are left blank.
export const ORIENTATION_SIZE = 4
export const ORIENTATION: Point = { x: MARKER_INSET + MARKER_SIZE + 6 + ORIENTATION_SIZE / 2, y: MARKERS[0].y }

export const BUBBLE_RADIUS = 2.1
export const ROLL_DIGITS = 6
export const SET_VALUES = ["A", "B", "C", "D"] as const
export const ANSWER_VALUES = ["A", "B", "C", "D"] as const
export const MAX_QUESTIONS = 100

const ROW_PITCH = 5.4

// Roll: one column per digit, 0–9 downwards, under a row of write-in boxes.
export const ROLL = {
  boxTop: 68,
  boxHeight: 6.5,
  firstRow: 80,
  firstColumn: 30,
  columnPitch: 6.8,
  labelX: 22,
}

// Set code: A–D downwards, under its write-in box.
export const SET = { x: 84, firstRow: 80 }

// Questions: up to four columns of up to 25 rows.
export const ANSWERS = {
  top: 140,
  firstRow: 148,
  columns: 4,
  maxRows: 25,
  columnWidth: 46,
  firstColumn: 14,
  // Question number, then the bubbles.
  numberRight: 10,
  firstBubble: 16,
  bubblePitch: 7,
}

export type OmrField = "roll" | "set" | "answer"

export type OmrBubble = {
  field: OmrField
  // The roll digit's column, the question's index (0-based), or 0 for the set.
  index: number
  value: string
  x: number
  y: number
}

export type OmrLayout = {
  questions: number
  rows: number
  columns: number
  bubbles: OmrBubble[]
}

// Rows per question column: at least 10 so short papers aren't cramped into
// one corner, at most 25.
export function answerRows(questions: number) {
  return Math.min(ANSWERS.maxRows, Math.max(10, Math.ceil(questions / ANSWERS.columns)))
}

export function questionPosition(index: number, rows: number) {
  const column = Math.floor(index / rows)
  const row = index % rows
  const left = ANSWERS.firstColumn + column * ANSWERS.columnWidth
  return { column, row, left, y: ANSWERS.firstRow + row * ROW_PITCH }
}

export function omrLayout(questions: number): OmrLayout {
  const count = Math.max(1, Math.min(MAX_QUESTIONS, Math.floor(questions)))
  const rows = answerRows(count)
  const bubbles: OmrBubble[] = []
  for (let digit = 0; digit < ROLL_DIGITS; digit++) {
    for (let value = 0; value <= 9; value++) {
      bubbles.push({
        field: "roll",
        index: digit,
        value: String(value),
        x: ROLL.firstColumn + digit * ROLL.columnPitch,
        y: ROLL.firstRow + value * ROW_PITCH,
      })
    }
  }
  SET_VALUES.forEach((value, i) => bubbles.push({ field: "set", index: 0, value, x: SET.x, y: SET.firstRow + i * ROW_PITCH }))
  for (let q = 0; q < count; q++) {
    const { left, y } = questionPosition(q, rows)
    ANSWER_VALUES.forEach((value, k) =>
      bubbles.push({ field: "answer", index: q, value, x: left + ANSWERS.firstBubble + k * ANSWERS.bubblePitch, y })
    )
  }
  return { questions: count, rows, columns: Math.ceil(count / rows), bubbles }
}

export const ROW_SPACING = ROW_PITCH
