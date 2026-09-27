import type { Metadata } from "next"

import { TermExamForm } from "@/components/term-exams/term-exam-form"

export const metadata: Metadata = {
  title: "Add term exam · SMS Admin",
}

const one = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value

// ?institute= preselects the institute; ?copy= starts from another exam.
export default async function NewTermExamPage({
  searchParams,
}: PageProps<"/term-exam/new">) {
  const query = await searchParams
  const institute = Number(one(query.institute)) || undefined
  const copy = Number(one(query.copy)) || undefined

  return (
    <TermExamForm
      instituteId={institute}
      copyId={copy}
      returnTo={one(query.returnTo)}
    />
  )
}
