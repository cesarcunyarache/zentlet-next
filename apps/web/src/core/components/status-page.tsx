import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/lib/site";

/** Pantalla completa para 404 y errores, con el estilo de la app. */
export function StatusPage({
  code,
  title,
  body,
  home,
  children,
}: {
  code?: string;
  title: string;
  body: string;
  home: string;
  children?: React.ReactNode;
}) {
  return (
    <main className="bg-app-bg text-app-fg flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      {code && <p className="text-app-muted m-0 text-sm font-semibold tracking-[0.2em]">{code}</p>}
      <h1 className="font-display mt-3 mb-3 text-[28px] leading-tight font-bold tracking-[-0.03em]">{title}</h1>
      <p className="text-app-muted m-0 max-w-sm text-[15px] leading-relaxed">{body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2.5">
        {children}
        <Link
          href={siteConfig.routes.home}
          className="bg-app-fg text-app-bg inline-flex min-h-11 items-center rounded-xl px-5 text-sm font-semibold"
        >
          {home}
        </Link>
      </div>
    </main>
  );
}
