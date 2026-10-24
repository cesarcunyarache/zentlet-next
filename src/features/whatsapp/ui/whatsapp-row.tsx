"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { SettingsRow } from "@/features/account/ui/settings-row";
import { useWhatsappLink } from "../hooks/useWhatsappLink";
import { WhatsappConnectionPanel } from "./whatsapp-connection-panel";

export function WhatsappRow() {
  const t = useTranslations("settings.whatsapp");
  const whatsapp = useWhatsappLink();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!whatsapp.connection?.isAvailable) return null;

  return (
    <div>
      <SettingsRow
        label={t("label")}
        hint={whatsapp.connection.phone ? t("connected") : t("hint")}
      >
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className="bg-app-fill hover:bg-app-fill-strong text-app-fg inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold"
        >
          {t(isExpanded ? "hide" : "configure")}
          <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} aria-hidden />
        </button>
      </SettingsRow>
      {isExpanded ? <WhatsappConnectionPanel whatsapp={whatsapp} /> : null}
    </div>
  );
}
