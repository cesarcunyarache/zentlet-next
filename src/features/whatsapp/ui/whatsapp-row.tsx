"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@heroui/react";
import { useTranslations } from "next-intl";
import { useWhatsappLink } from "../hooks/useWhatsappLink";
import { WhatsappConnectionPanel } from "./whatsapp-connection-panel";

export function WhatsappRow() {
  const t = useTranslations("settings.whatsapp");
  const whatsapp = useWhatsappLink();
  const [isExpanded, setIsExpanded] = useState(false);

  if (!whatsapp.connection?.isAvailable) return null;

  return (
    <div className="border-app-border border-b">
      <div className="flex items-center justify-between gap-3.5 py-3.5">
        <span>
          <span className="text-app-fg block text-[14.5px] font-semibold">{t("label")}</span>
          <span className="text-app-muted mt-px block text-xs">
            {whatsapp.connection.phone ? t("connected") : t("hint")}
          </span>
        </span>
        <button
          type="button"
          aria-expanded={isExpanded}
          onClick={() => setIsExpanded((value) => !value)}
          className="bg-app-fill hover:bg-app-fill-strong text-app-fg inline-flex min-h-[30px] shrink-0 items-center gap-1 rounded-full px-3 text-[13px] font-semibold"
        >
          {t(isExpanded ? "hide" : "configure")}
          <ChevronDown className={cn("size-3.5 transition-transform", isExpanded && "rotate-180")} aria-hidden />
        </button>
      </div>
      {isExpanded ? <WhatsappConnectionPanel whatsapp={whatsapp} /> : null}
    </div>
  );
}
