import { InstituteHeader } from "@/components/institutes/institute-header"

export default async function InstituteLayout({
  children,
  params,
}: LayoutProps<"/institutes/[id]">) {
  const { id } = await params

  return (
    <div className="flex flex-1 flex-col gap-4 px-4 py-4 md:gap-6 md:py-6 lg:px-6">
      <InstituteHeader id={Number(id)} />
      {children}
    </div>
  )
}
