import type { Metadata } from "next"

import { TestimonialEdit } from "@/components/students/testimonial-edit"

export const metadata: Metadata = {
  title: "Edit testimonial · SMS Admin",
}

export default async function EditTestimonialPage({
  params,
}: PageProps<"/students/[id]/testimonial">) {
  const { id } = await params

  return <TestimonialEdit studentId={Number(id)} />
}
