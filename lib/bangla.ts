// Bangla numerals and letters for printed papers (legacy question paper
// headers print time, marks and serials in Bangla when the paper is Bangla).

const digits = "০১২৩৪৫৬৭৮৯"

export function toBanglaDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (d) => digits[Number(d)])
}

// A number as the paper's language writes it.
export const paperNumber = (value: string | number, bangla: boolean) =>
  bangla ? toBanglaDigits(value) : String(value)

// CQ sub-question labels (legacy ক/খ/গ/ঘ in Bangla, a/b/c/d in English).
export const cqLabels = { bn: ["ক", "খ", "গ", "ঘ"], en: ["a", "b", "c", "d"] } as const

// MCQ option labels as the paper prints them; the answer keys and OMR data
// stay A–E whatever the language.
export const optionLabels = { bn: ["ক", "খ", "গ", "ঘ", "ঙ"], en: ["A", "B", "C", "D", "E"] } as const
