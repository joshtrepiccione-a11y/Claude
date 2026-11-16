import { ImageResponse } from "next/og";

export const alt = "The American Legion Frank M. Calletta Post 186, Hammonton, New Jersey";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** The preview card shown when a page is shared on Facebook, in texts and in email. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 84px",
          background: "linear-gradient(180deg, #1b3d6d 0%, #0e1e37 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 8, fontWeight: 700, opacity: 0.9 }}>
          THE AMERICAN LEGION
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.05, marginTop: 20 }}>
          FRANK M. CALLETTA
        </div>
        <div style={{ display: "flex", fontSize: 96, fontWeight: 800, lineHeight: 1.05 }}>POST 186</div>
        <div style={{ display: "flex", marginTop: 36 }}>
          <div style={{ width: 150, height: 10, background: "#d72131" }} />
          <div style={{ width: 150, height: 10, background: "#ffffff" }} />
          <div style={{ width: 150, height: 10, background: "#1f6caa" }} />
        </div>
        <div style={{ display: "flex", fontSize: 38, marginTop: 36, opacity: 0.95 }}>
          Hammonton, New Jersey · For God and Country
        </div>
      </div>
    ),
    size,
  );
}
