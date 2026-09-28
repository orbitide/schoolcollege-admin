import { SurfacePage, surfaceMetadata } from "@/components/basic-settings/settings-surface-page"

export function generateMetadata({ params }: PageProps<"/basic-settings/[segment]">) {
  return surfaceMetadata(params, "Manage")
}

// Legacy "Manage X": the Manage surface of a setup record kind.
export default function ManagePage({ params }: PageProps<"/basic-settings/[segment]">) {
  return <SurfacePage params={params} surface="Manage" />
}
