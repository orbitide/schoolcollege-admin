// Legacy NccUtil.GetSafeSlug / ezducms Slug.Create: lower-case letters,
// marks and digits of any script (a Bangla title gives a Bangla slug), every
// other run of characters turned into one "-".
export function toSlug(text: string) {
  return text
    .normalize("NFC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
}
