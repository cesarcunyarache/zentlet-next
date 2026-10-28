import { useState } from "react";
import { useLocale } from "next-intl";
import { getPathname } from "@/i18n/navigation";
import { invitePath } from "../lib/pending-invite";

export function useInviteLink() {
  const locale = useLocale();
  const [link, setLink] = useState<string | null>(null);

  function show(token: string) {
    setLink(`${window.location.origin}${getPathname({ href: invitePath(token), locale })}`);
  }

  async function copy() {
    if (!link) return false;
    try {
      await navigator.clipboard.writeText(link);
      return true;
    } catch {
      return false;
    }
  }

  async function share(text: string) {
    if (!link || typeof navigator.share !== "function") return false;
    try {
      await navigator.share({ text, url: link });
      return true;
    } catch {
      return false;
    }
  }

  return {
    link,
    show,
    copy,
    share,
    reset: () => setLink(null),
    canShare: typeof navigator !== "undefined" && typeof navigator.share === "function",
  };
}
