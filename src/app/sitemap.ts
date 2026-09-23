import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const { url, routes } = siteConfig;

  return [
    { url: `${url}${routes.home}`, changeFrequency: "weekly", priority: 1 },
    { url: `${url}${routes.signUp}`, changeFrequency: "yearly", priority: 0.6 },
    { url: `${url}${routes.signIn}`, changeFrequency: "yearly", priority: 0.4 },
  ];
}
