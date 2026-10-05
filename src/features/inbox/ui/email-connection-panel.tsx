"use client";

import { useTranslations } from "next-intl";
import { useEmailConnection } from "../hooks/useEmailConnection";
import { ForwardingConnection } from "./forwarding-connection";
import { GmailConnection } from "./gmail-connection";
import { InboxSenders } from "./inbox-senders";

export function EmailConnectionPanel() {
  const t = useTranslations("inbox.connection");
  const email = useEmailConnection(true);
  const { connection } = email;

  if (email.isLoading || !connection) return <p className="text-app-muted py-3 text-xs">{t("loading")}</p>;

  const { gmail } = connection;
  if (!connection.isAvailable && !gmail.isAvailable) return <p className="text-app-muted py-3 text-xs">{t("unavailable")}</p>;

  return (
    <div className="flex flex-col gap-5 py-3">
      {gmail.isAvailable ? <GmailConnection gmail={gmail} email={email} /> : null}
      {connection.isAvailable ? (
        <section className="flex flex-col gap-2">
          {gmail.isAvailable ? <span className="text-app-fg text-xs font-semibold">{t("forwardingTitle")}</span> : null}
          <ForwardingConnection connection={connection} email={email} />
        </section>
      ) : null}
      {connection.address || gmail.email ? <InboxSenders connection={connection} email={email} /> : null}
    </div>
  );
}
