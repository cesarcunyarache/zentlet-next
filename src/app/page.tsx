import type { Metadata, Viewport } from "next";
import { getLandingContent } from "@/features/landing/content";
import { LandingPage } from "@/features/landing/components/landing-page";
import { buildLandingMetadata } from "@/features/landing/lib/seo";

const content = getLandingContent();

export const metadata: Metadata = buildLandingMetadata(content);

export const viewport: Viewport = {
  themeColor: "#f6f4f9",
};

export default function Home() {
  return <LandingPage content={content} />;
}
