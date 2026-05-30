import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const runtime = "edge";
export const alt = "Pranshu Gupta — founding engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded social-share card (editorial-warm palette).
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          background: "#faf6ee",
          color: "#211c16",
          padding: "92px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#6f675b", letterSpacing: 2 }}>~ {SITE.role}</div>
        <div style={{ fontSize: 156, fontWeight: 700, lineHeight: 1, marginTop: 10 }}>
          {SITE.first}
        </div>
        <div style={{ fontSize: 40, marginTop: 30, maxWidth: 920, lineHeight: 1.3 }}>
          builds products people want — backend that holds up, ui that feels good.
        </div>
        <div style={{ width: 128, height: 8, background: "#c2410c", marginTop: 40, borderRadius: 4 }} />
        <div style={{ display: "flex", marginTop: 44, fontSize: 26, color: "#6f675b" }}>
          github.com/{SITE.handle}
        </div>
      </div>
    ),
    { ...size }
  );
}
