import type { Metadata } from "next"

import { NoticeBoard } from "@/components/notices/notice-board"
import { RequireSurface } from "@/components/require-surface"

export const metadata: Metadata = {
  title: "Notice Board · SMS Admin",
}

export default function NoticeBoardPage() {
  return (
    <RequireSurface resource="notice-board" surface={["Admin", "Manage", "View"]}>
      <NoticeBoard />
    </RequireSurface>
  )
}
