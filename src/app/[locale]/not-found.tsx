import { getTranslations } from "next-intl/server";
import { StatusPage } from "@/core/components/status-page";

export default async function NotFound() {
  const t = await getTranslations("common.notFound");
  return <StatusPage code="404" title={t("title")} body={t("body")} home={t("home")} />;
}
