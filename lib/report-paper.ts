// The paper choices the legacy attendance reports print on (legacy PaperSize,
// PageOrientation): Legal or A4, portrait or landscape.

export const paperSizes = [
  { value: "legal", label: "Legal", size: ["216mm", "356mm"] },
  { value: "a4", label: "A4", size: ["210mm", "297mm"] },
] as const
export type PaperSize = (typeof paperSizes)[number]

export const orientations = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
] as const
export type Orientation = (typeof orientations)[number]

// The CSS @page size for the paper and orientation.
export function pageSizeFor(paper: PaperSize, orientation: Orientation) {
  const [w, h] = paper.size
  return orientation.value === "landscape" ? `${h} ${w}` : `${w} ${h}`
}

// Legacy ConstantHelper.Report* limits and defaults.
export const ROWS_PER_PAGE = { min: 10, max: 35, default: 30 }
export const FONT_SIZE = { min: 12, max: 35, default: 14 }
