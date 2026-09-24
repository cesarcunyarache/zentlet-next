import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { legalDocuments, type LegalDocumentId } from "@/features/legal/content";
import { Link } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { siteConfig } from "@/lib/site";

interface LegalPageProps {
  params: Promise<{ locale: string; document: string }>;
}

const DOCUMENTS = Object.keys(legalDocuments) as LegalDocumentId[];

function resolve(locale: string, document: string) {
  if (!hasLocale(routing.locales, locale) || !DOCUMENTS.includes(document as LegalDocumentId)) return null;
  return legalDocuments[document as LegalDocumentId][locale as Locale];
}

export function generateStaticParams() {
  return DOCUMENTS.map((document) => ({ document }));
}

export async function generateMetadata({ params }: LegalPageProps): Promise<Metadata> {
  const { locale, document } = await params;
  const content = resolve(locale, document);
  if (!content) return {};
  return { title: `${content.title} · ${siteConfig.name}`, description: content.description };
}

export default async function LegalPage({ params }: LegalPageProps) {
  const { locale, document } = await params;
  const content = resolve(locale, document);
  if (!content) notFound();
  setRequestLocale(locale as Locale);

  return (
    <div className="bg-app-bg text-app-fg min-h-dvh">
      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-6 sm:py-16">
        <Link href={siteConfig.routes.home} className="text-app-fg text-lg font-bold tracking-[-0.02em]">
          {siteConfig.name}
        </Link>

        <h1 className="font-display mt-10 mb-2 text-[32px] leading-tight font-bold tracking-[-0.03em]">
          {content.title}
        </h1>
        <p className="text-app-muted m-0 text-sm">{content.updated}</p>

        {content.sections.map((section) => (
          <section key={section.title} className="mt-9">
            <h2 className="m-0 mb-3 text-lg font-semibold tracking-[-0.01em]">{section.title}</h2>
            {section.blocks.map((block, index) =>
              typeof block === "string" ? (
                <p key={index} className="text-app-muted my-3 text-[15px] leading-relaxed">
                  {block}
                </p>
              ) : (
                <ul key={index} className="text-app-muted my-3 flex list-disc flex-col gap-2 pl-5 text-[15px] leading-relaxed">
                  {block.list.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ),
            )}
          </section>
        ))}
      </main>
    </div>
  );
}
