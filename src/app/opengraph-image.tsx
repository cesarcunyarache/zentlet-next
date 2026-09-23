import { ImageResponse } from "next/og";
import { getLandingContent } from "@/features/landing/content";

// Imagen para compartir en redes, generada en build con el copy de la landing.
const content = getLandingContent();

export const alt = content.meta.ogImageAlt;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  const { hero, common } = content;
  const entry = hero.demo.entries[0];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "#f6f4f9",
          color: "#27232f",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 620 }}>
          <div style={{ display: "flex", fontSize: 40, fontWeight: 800, letterSpacing: -1 }}>
            Zentlet<span style={{ color: "#dd3b3b" }}>.</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginTop: 48, fontSize: 76, fontWeight: 800, lineHeight: 1, letterSpacing: -3 }}>
            <span>{hero.titleLead}</span>
            <span style={{ color: "#dd3b3b" }}>{hero.titleWords[0]}</span>
          </div>
          <div style={{ marginTop: 32, fontSize: 28, color: "#6f6a7a", lineHeight: 1.35 }}>{content.meta.ogSubtitle}</div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 380,
            padding: 32,
            borderRadius: 32,
            background: "#fdfcfe",
            boxShadow: "0 40px 80px -32px rgba(39,35,47,0.45)",
            transform: "rotate(3deg)",
          }}
        >
          <div style={{ fontSize: 18, color: "#6f6a7a", fontWeight: 600 }}>{hero.demo.label}</div>
          <div style={{ marginTop: 18, padding: "16px 20px", borderRadius: 18, background: "#f6f4f9", fontSize: 26 }}>
            {entry.typed}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", marginTop: 26, fontSize: 56, fontWeight: 800, letterSpacing: -2 }}>
            <span style={{ fontSize: 26, color: "#6f6a7a", marginRight: 10 }}>− {common.currency}</span>
            {entry.amount.toFixed(2)}
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 20, fontWeight: 700 }}>
            <span style={{ padding: "6px 16px", borderRadius: 999, background: "#fbe7e5", color: "#dd3b3b" }}>
              {common.expense}
            </span>
            <span style={{ marginLeft: 10, padding: "6px 16px", borderRadius: 999, background: "#efedf2" }}>
              {entry.category.name}
            </span>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
