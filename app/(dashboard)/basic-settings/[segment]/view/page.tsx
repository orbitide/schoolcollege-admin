import { SurfacePage, surfaceMetadata } from "@/components/basic-settings/settings-surface-page"

export function generateMetadata({ params }: PageProps<"/basic-settings/[segment]/view">) {
  return surfaceMetadata(params, "View")
}

// Legacy "View X": the read-only View surface of a setup record kind.
export default function ManageViewPage({
  params,
}: PageProps<"/basic-settings/[segment]/view">) {
  return <SurfacePage params={params} surface="View" />
}
