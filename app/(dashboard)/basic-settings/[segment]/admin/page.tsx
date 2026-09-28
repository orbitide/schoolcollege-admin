import { SurfacePage, surfaceMetadata } from "@/components/basic-settings/settings-surface-page"

export function generateMetadata({ params }: PageProps<"/basic-settings/[segment]/admin">) {
  return surfaceMetadata(params, "Admin")
}

// Legacy "Manage X (Admin)": the Admin surface of a setup record kind.
export default function ManageAdminPage({
  params,
}: PageProps<"/basic-settings/[segment]/admin">) {
  return <SurfacePage params={params} surface="Admin" />
}
