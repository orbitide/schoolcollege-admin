import { InstituteDetail } from "@/components/institutes/institute-detail"

export default async function InstitutePage({
  params,
}: PageProps<"/institutes/[id]">) {
  const { id } = await params

  return <InstituteDetail id={Number(id)} />
}
