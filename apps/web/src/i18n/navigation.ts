import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Equivalentes de next/link y next/navigation que añaden el idioma a la URL. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
