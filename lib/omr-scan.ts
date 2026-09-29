import {
  ANSWER_VALUES,
  BUBBLE_RADIUS,
  MARKER_SIZE,
  MARKERS,
  ORIENTATION,
  ORIENTATION_SIZE,
  ROLL_DIGITS,
  type OmrBubble,
  type OmrLayout,
  type Point,
} from "@/lib/omr-template"

// Reads a scanned or photographed OMR sheet (lib/omr-template.ts) in the
// browser, without an image library:
//   1. find the four corner squares (dark, square, solid blobs nearest the
//      image's corners) on a grey image thresholded with Otsu's method;
//   2. map the template onto the image with a perspective transform, trying
//      the four ways the page could be turned until the orientation square
//      is where it should be;
//   3. for every bubble, compare the ink inside it with the paper just
//      around it, so shadows and uneven light matter less;
//   4. per roll digit, set and question, a clearly darker bubble is the
//      mark; two or more are a multiple mark; faint ones are flagged.
// Everything read is only a proposal: the scan page shows it for review.

export type GrayImage = { width: number; height: number; data: Uint8Array }

// Luminance of RGBA pixels (canvas ImageData).
export function toGray(rgba: Uint8ClampedArray | Uint8Array, width: number, height: number): GrayImage {
  const data = new Uint8Array(width * height)
  for (let i = 0, j = 0; i < data.length; i++, j += 4) {
    data[i] = (rgba[j] * 299 + rgba[j + 1] * 587 + rgba[j + 2] * 114) / 1000
  }
  return { width, height, data }
}

// Otsu's threshold: the grey level that best splits ink from paper.
export function otsuThreshold(image: GrayImage) {
  const histogram = new Array<number>(256).fill(0)
  for (const v of image.data) histogram[v]++
  const total = image.data.length
  let sum = 0
  for (let i = 0; i < 256; i++) sum += i * histogram[i]
  let sumBack = 0
  let weightBack = 0
  let best = 0
  let threshold = 127
  for (let t = 0; t < 256; t++) {
    weightBack += histogram[t]
    if (!weightBack) continue
    const weightFore = total - weightBack
    if (!weightFore) break
    sumBack += t * histogram[t]
    const meanBack = sumBack / weightBack
    const meanFore = (sum - sumBack) / weightFore
    const between = weightBack * weightFore * (meanBack - meanFore) ** 2
    if (between > best) {
      best = between
      threshold = t
    }
  }
  return threshold
}

type Blob = { area: number; minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number }

// Dark connected regions (4-connected) at least `minArea` pixels big.
function darkBlobs(image: GrayImage, threshold: number, minArea: number): Blob[] {
  const { width, height, data } = image
  const seen = new Uint8Array(width * height)
  const stack = new Int32Array(width * height)
  const blobs: Blob[] = []
  for (let start = 0; start < data.length; start++) {
    if (seen[start] || data[start] > threshold) continue
    let top = 0
    stack[top++] = start
    seen[start] = 1
    let area = 0
    let sumX = 0
    let sumY = 0
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0
    while (top) {
      const p = stack[--top]
      const x = p % width
      const y = (p - x) / width
      area++
      sumX += x
      sumY += y
      if (x < minX) minX = x
      if (x > maxX) maxX = x
      if (y < minY) minY = y
      if (y > maxY) maxY = y
      const next = [x > 0 ? p - 1 : -1, x < width - 1 ? p + 1 : -1, y > 0 ? p - width : -1, y < height - 1 ? p + width : -1]
      for (const n of next) {
        if (n >= 0 && !seen[n] && data[n] <= threshold) {
          seen[n] = 1
          stack[top++] = n
        }
      }
    }
    if (area >= minArea) blobs.push({ area, minX, maxX, minY, maxY, cx: sumX / area, cy: sumY / area })
  }
  return blobs
}

// The corner squares as image points: top-left, top-right, bottom-right,
// bottom-left of the image (not yet of the page).
export function findCornerMarkers(image: GrayImage, threshold = otsuThreshold(image)): Point[] | null {
  const { width, height } = image
  const shortSide = Math.min(width, height)
  const minSide = shortSide * 0.012
  const maxSide = shortSide * 0.1
  const candidates = darkBlobs(image, threshold, minSide * minSide * 0.5).filter((b) => {
    const w = b.maxX - b.minX + 1
    const h = b.maxY - b.minY + 1
    const aspect = w / h
    return w >= minSide && h >= minSide && w <= maxSide && h <= maxSide && aspect > 0.6 && aspect < 1.67 && b.area / (w * h) > 0.55
  })
  const corners: Point[] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ]
  const found: Point[] = []
  for (const corner of corners) {
    const inQuadrant = candidates.filter(
      (b) => Math.abs(b.cx - corner.x) < width / 2 && Math.abs(b.cy - corner.y) < height / 2
    )
    if (!inQuadrant.length) return null
    // The corner squares are the biggest solid squares around; bubbles and
    // the orientation square are much smaller.
    const biggest = Math.max(...inQuadrant.map((b) => b.area))
    const pick = inQuadrant
      .filter((b) => b.area >= biggest * 0.45)
      .sort((a, b) => Math.hypot(a.cx - corner.x, a.cy - corner.y) - Math.hypot(b.cx - corner.x, b.cy - corner.y))[0]
    found.push({ x: pick.cx, y: pick.cy })
  }
  return found
}

export type Homography = number[]

// The perspective transform taking the four `from` points to `to` (a 3×3
// matrix, row by row, with the last entry 1).
export function homography(from: Point[], to: Point[]): Homography {
  const a: number[][] = []
  const b: number[] = []
  for (let i = 0; i < 4; i++) {
    const { x, y } = from[i]
    const { x: u, y: v } = to[i]
    a.push([x, y, 1, 0, 0, 0, -u * x, -u * y])
    b.push(u)
    a.push([0, 0, 0, x, y, 1, -v * x, -v * y])
    b.push(v)
  }
  // Gaussian elimination with partial pivoting.
  const n = 8
  for (let col = 0; col < n; col++) {
    let pivot = col
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r
    ;[a[col], a[pivot]] = [a[pivot], a[col]]
    ;[b[col], b[pivot]] = [b[pivot], b[col]]
    const d = a[col][col]
    if (Math.abs(d) < 1e-12) throw new Error("The corner squares don't form a page.")
    for (let r = 0; r < n; r++) {
      if (r === col) continue
      const f = a[r][col] / d
      if (!f) continue
      for (let c = col; c < n; c++) a[r][c] -= f * a[col][c]
      b[r] -= f * b[col]
    }
  }
  return [...b.map((value, i) => value / a[i][i]), 1]
}

export function project(h: Homography, x: number, y: number): Point {
  const w = h[6] * x + h[7] * y + h[8]
  return { x: (h[0] * x + h[1] * y + h[2]) / w, y: (h[3] * x + h[4] * y + h[5]) / w }
}

function pixel(image: GrayImage, p: Point) {
  const x = Math.round(p.x)
  const y = Math.round(p.y)
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) return 255
  return image.data[y * image.width + x]
}

// Mean grey of the template ring between radii r0 and r1 (mm) around a
// point, sampled on a grid and mapped onto the image.
function ringMean(image: GrayImage, h: Homography, cx: number, cy: number, r0: number, r1: number) {
  const step = r1 / 6
  let sum = 0
  let count = 0
  for (let dy = -r1; dy <= r1 + 1e-9; dy += step) {
    for (let dx = -r1; dx <= r1 + 1e-9; dx += step) {
      const d = Math.hypot(dx, dy)
      if (d < r0 || d > r1) continue
      sum += pixel(image, project(h, cx + dx, cy + dy))
      count++
    }
  }
  return count ? sum / count : 255
}

// How filled a round mark is: 0 as light as the paper around it, 1 black.
function fillScore(image: GrayImage, h: Homography, cx: number, cy: number, r: number) {
  const inside = ringMean(image, h, cx, cy, 0, r * 0.62)
  const paper = ringMean(image, h, cx, cy, r * 1.25, r * 1.5)
  if (paper <= 0) return 0
  return Math.max(0, Math.min(1, (paper - inside) / paper))
}

// A bubble at least this filled is marked; between FAINT and FILLED it is
// flagged for a look.
export const FILLED = 0.38
export const FAINT = 0.2

export type BubbleReading = OmrBubble & { score: number; marked: boolean; at: Point }

export type OmrFlag = { field: "roll" | "set" | "answer"; index: number; reason: "multiple" | "faint" | "blank" }

export type OmrReading = {
  roll: string
  setCode: string
  // One entry per question: a letter, several letters for a multiple mark,
  // or "" when blank.
  answers: string[]
  flags: OmrFlag[]
  bubbles: BubbleReading[]
  // Corner squares as found in the image, page top-left first.
  corners: Point[]
}

type Group = { field: OmrFlag["field"]; index: number; bubbles: BubbleReading[] }

// The value a group of bubbles (a roll digit, the set, a question) holds.
function readGroup(group: Group, flags: OmrFlag[], blankIsFlagged: boolean) {
  const marked = group.bubbles.filter((b) => b.score >= FILLED)
  const faint = group.bubbles.filter((b) => b.score >= FAINT && b.score < FILLED)
  for (const b of marked) b.marked = true
  if (marked.length > 1) {
    flags.push({ field: group.field, index: group.index, reason: "multiple" })
    return marked.map((b) => b.value).join("")
  }
  if (faint.length) flags.push({ field: group.field, index: group.index, reason: "faint" })
  else if (!marked.length && blankIsFlagged) flags.push({ field: group.field, index: group.index, reason: "blank" })
  return marked[0]?.value ?? ""
}

// The four ways the page could sit on the image: which image corner holds
// the page's top-left square, and so on round.
const turns = [0, 1, 2, 3].map((t) => [0, 1, 2, 3].map((i) => (i + t) % 4))

export function readOmrSheet(image: GrayImage, layout: OmrLayout): OmrReading {
  const corners = findCornerMarkers(image)
  if (!corners) throw new Error("Couldn't find the four corner squares. Scan the whole sheet on a plain, light background.")

  // Pick the turn whose orientation square is dark.
  let best: { h: Homography; order: number[]; score: number } | null = null
  for (const order of turns) {
    const h = homography(MARKERS, order.map((i) => corners[i]))
    const score = fillScore(image, h, ORIENTATION.x, ORIENTATION.y, ORIENTATION_SIZE / 2)
    if (!best || score > best.score) best = { h, order, score }
  }
  if (!best || best.score < 0.3) throw new Error("Couldn't tell which way up the sheet is. Is it our OMR sheet?")
  const { h } = best

  // A sanity check that the page isn't tiny or folded: the corner squares
  // should come out about as big as printed.
  const scale = Math.hypot(project(h, MARKERS[1].x, MARKERS[1].y).x - project(h, MARKERS[0].x, MARKERS[0].y).x, project(h, MARKERS[1].x, MARKERS[1].y).y - project(h, MARKERS[0].x, MARKERS[0].y).y) / (MARKERS[1].x - MARKERS[0].x)
  if (scale * MARKER_SIZE < 6) throw new Error("The sheet is too small in the picture. Scan it at 150 dpi or more.")

  const bubbles: BubbleReading[] = layout.bubbles.map((b) => ({
    ...b,
    score: fillScore(image, h, b.x, b.y, BUBBLE_RADIUS),
    marked: false,
    at: project(h, b.x, b.y),
  }))
  const flags: OmrFlag[] = []
  const group = (field: Group["field"], index: number): Group => ({
    field,
    index,
    bubbles: bubbles.filter((b) => b.field === field && b.index === index),
  })

  const digits = Array.from({ length: ROLL_DIGITS }, (_, i) => readGroup(group("roll", i), flags, false))
  // A roll is written from the left or the right; blank columns are skipped
  // and leading zeros dropped. A column with two marks spoils the roll.
  const roll = digits.some((d) => d.length > 1) ? digits.map((d) => (d.length > 1 ? "?" : d)).join("") : digits.join("").replace(/^0+(?=\d)/, "")
  const setCode = readGroup(group("set", 0), flags, true)
  const answers = Array.from({ length: layout.questions }, (_, q) => readGroup(group("answer", q), flags, false))
  return {
    roll,
    setCode,
    answers: answers.map((a) => a.split("").filter((c) => (ANSWER_VALUES as readonly string[]).includes(c)).join("")),
    flags,
    bubbles,
    corners: best.order.map((i) => corners[i]),
  }
}
