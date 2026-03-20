/**
 * Dynamic OG image for DockYard.
 *
 * Generated via @vercel/og (Satori) at build/request time.
 * 1200x630 with dark blue background matching the brand.
 */

import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DockYard — Open-source operations platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #072849 0%, #0a3f6e 40%, #054b85 100%)",
          fontFamily: "Geist, system-ui, sans-serif",
        }}
      >
        {/* Logo icon */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: "8px", marginBottom: "16px" }}>
          <div style={{ width: "20px", height: "80px", background: "#0c8ce9", borderRadius: "6px" }} />
          <div style={{ width: "20px", height: "56px", background: "#36a6ff", borderRadius: "6px" }} />
          <div style={{ width: "20px", height: "32px", background: "#7cc4ff", borderRadius: "6px" }} />
        </div>
        {/* Base beam */}
        <div style={{ width: "76px", height: "10px", background: "#0c8ce9", borderRadius: "5px", marginBottom: "40px" }} />

        {/* Title */}
        <div style={{ fontSize: "64px", fontWeight: 700, color: "#ffffff", letterSpacing: "-0.02em" }}>
          <span>Dock</span>
          <span style={{ color: "#36a6ff" }}>Yard</span>
        </div>

        {/* Tagline */}
        <div style={{ fontSize: "24px", color: "#7cc4ff", marginTop: "16px", opacity: 0.9 }}>
          Open-source operations platform
        </div>

        {/* Features row */}
        <div style={{ display: "flex", gap: "32px", marginTop: "40px" }}>
          {["Discovery", "Health", "Alerts", "Config", "AI Insights"].map((f) => (
            <div
              key={f}
              style={{
                fontSize: "16px",
                color: "#b9dfff",
                padding: "8px 16px",
                border: "1px solid rgba(185,223,255,0.2)",
                borderRadius: "8px",
              }}
            >
              {f}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size }
  );
}
