import { ImageResponse } from "next/og";

export const alt = "Covenant · Policy-bound payments for autonomous agents on Flare";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#fbfaf8",
          backgroundImage:
            "radial-gradient(1000px 500px at 90% -10%, rgba(139,92,255,0.12), transparent 60%), radial-gradient(900px 500px at 0% 0%, rgba(214,69,92,0.08), transparent 55%)",
          padding: "76px 84px",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="58" height="58" viewBox="0 0 30 30" fill="none">
            <path d="M12.4 6.5C8.6 9 8.6 21 12.4 23.5" stroke="#16140f" strokeWidth="1.7" strokeLinecap="round" />
            <path d="M17.6 6.5C21.4 9 21.4 21 17.6 23.5" stroke="#16140f" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="15" cy="15" r="2.8" fill="#16140f" />
          </svg>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600, color: "#16140f", letterSpacing: "-0.01em" }}>
            Covenant
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
          <div
            style={{
              display: "flex",
              fontSize: 78,
              fontWeight: 600,
              color: "#16140f",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: 960,
            }}
          >
            Let agents pay. But only under covenant.
          </div>
          <div style={{ display: "flex", fontSize: 30, color: "#6f6a60", maxWidth: 840, lineHeight: 1.4 }}>
            Policy-bound payments for autonomous AI agents, enforced on-chain on Flare.
          </div>
        </div>

        <div style={{ display: "flex", gap: 14 }}>
          {["x402", "Flare FTSO", "FXRP", "On-Chain Policy Vault"].map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                fontSize: 22,
                fontWeight: 600,
                color: "#3a3a3e",
                background: "#f3f1ed",
                padding: "10px 18px",
                borderRadius: 999,
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    { ...size },
  );
}
