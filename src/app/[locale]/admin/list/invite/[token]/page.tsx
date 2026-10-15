"use client";

import { useParams } from "next/navigation";
import { InviteView } from "@/features/list/ui/invite/invite-view";

export default function ListInvitePage() {
  const { token } = useParams<{ token: string }>();
  return <InviteView token={token} />;
}
