import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { invitePath } from "../lib/pending-invite";

export function usePendingInvite(token: string) {
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;
    const target = invitePath(token);
    if (pathname !== target) router.replace(target);
  }, [pathname, router, token]);
}
