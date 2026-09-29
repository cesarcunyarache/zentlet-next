import type { LandingContent } from "../../content";
import { sectionHref } from "../../lib/format";

interface DesktopNavProps {
  links: LandingContent["nav"]["links"];
  label: string;
}

export function DesktopNav({ links, label }: DesktopNavProps) {
  return (
    <nav aria-label={label} className="hidden md:block">
      <ul className="m-0 flex list-none items-center gap-1 p-0">
        {links.map((link) => (
          <li key={link.section}>
            <a
              href={sectionHref(link.section)}
              className="text-app-muted hover:text-app-fg hover:bg-app-fill rounded-full px-3.5 py-2 text-sm font-medium transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
