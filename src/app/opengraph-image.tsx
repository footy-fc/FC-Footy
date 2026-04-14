import { ImageResponse } from "next/og";

export const alt = "Footy App - scores, fan clubs, and fantasy";
export const size = {
  width: 600,
  height: 400,
};

export const contentType = "image/png";

const colors = {
  bg: "#050712",
  panel: "#171226",
  panelSoft: "#211834",
  text: "#F4EDFF",
  muted: "#C0B2F0",
  accent: "#BD195D",
  accentSoft: "#FEA282",
  lime: "#A2E634",
};

const chipStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "10px 16px",
  borderRadius: 999,
  border: `1px solid ${colors.lime}55`,
  background: "rgba(17, 12, 28, 0.88)",
  color: colors.text,
  fontSize: 18,
  fontWeight: 700,
  letterSpacing: "-0.03em",
} as const;

const statCardStyle = {
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  flex: 1,
  minWidth: 0,
  padding: "18px 18px 16px",
  borderRadius: 22,
  border: `1px solid ${colors.lime}3a`,
  background: "rgba(16, 11, 28, 0.96)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.03)",
} as const;

function Dot({ color }: { color: string }) {
  return (
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: 999,
        background: color,
        boxShadow: `0 0 22px ${color}`,
      }}
    />
  );
}

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          background: colors.bg,
          color: colors.text,
          fontFamily:
            'Manrope, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 14% 10%, rgba(189,25,93,0.34), transparent 32%), radial-gradient(circle at 86% 22%, rgba(162,230,52,0.12), transparent 24%), linear-gradient(140deg, #060713 0%, #100B1C 46%, #171226 100%)",
          }}
        />

        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: 999,
            background: "rgba(189,25,93,0.18)",
            filter: "blur(18px)",
          }}
        />

        <div
          style={{
            position: "absolute",
            left: -50,
            bottom: -80,
            width: 230,
            height: 230,
            borderRadius: 999,
            background: "rgba(254,162,130,0.12)",
            filter: "blur(16px)",
          }}
        />

        <div
          style={{
            position: "relative",
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "28px",
            gap: 18,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              width: "64%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 14,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    background:
                      "linear-gradient(135deg, rgba(189,25,93,0.96), rgba(254,162,130,0.82))",
                    color: "#fff",
                    fontSize: 22,
                    fontWeight: 800,
                  }}
                >
                  F
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 1,
                  }}
                >
                  <div
                    style={{
                      color: colors.accent,
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.28em",
                    }}
                  >
                    FOOTY APP
                  </div>
                  <div
                    style={{
                      color: colors.muted,
                      fontSize: 15,
                      fontWeight: 700,
                    }}
                  >
                    Mini app for football fandom
                  </div>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    fontSize: 46,
                    fontWeight: 800,
                    lineHeight: 0.94,
                    letterSpacing: "-0.06em",
                  }}
                >
                  <span>Scores, fan clubs,</span>
                  <span>fantasy.</span>
                </div>
                <div
                  style={{
                    maxWidth: 320,
                    color: colors.muted,
                    fontSize: 20,
                    fontWeight: 700,
                    lineHeight: 1.25,
                    letterSpacing: "-0.03em",
                  }}
                >
                  Follow your club, get match alerts, and track the Farcaster
                  FEPL table.
                </div>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={chipStyle}>Live scores</div>
              <div style={chipStyle}>Club alerts</div>
              <div style={chipStyle}>FEPL socials</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              width: "36%",
              minWidth: 0,
            }}
          >
            <div
              style={{
                ...statCardStyle,
                minHeight: 156,
                background:
                  "linear-gradient(180deg, rgba(33,24,52,0.96), rgba(15,11,26,0.98))",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    color: colors.accent,
                    fontSize: 13,
                    fontWeight: 800,
                    letterSpacing: "0.18em",
                  }}
                >
                  LIVE NOW
                </div>
                <Dot color={colors.lime} />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    fontSize: 36,
                    fontWeight: 800,
                    letterSpacing: "-0.06em",
                  }}
                >
                  <span>2</span>
                  <span style={{ color: colors.muted, fontSize: 16 }}>-</span>
                  <span>1</span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    color: colors.muted,
                    fontSize: 16,
                    fontWeight: 700,
                  }}
                >
                  <span>LIV</span>
                  <span>81&apos;</span>
                  <span>ARS</span>
                </div>
              </div>
            </div>

            <div style={{ ...statCardStyle, minHeight: 156 }}>
              <div
                style={{
                  color: colors.accentSoft,
                  fontSize: 13,
                  fontWeight: 800,
                  letterSpacing: "0.18em",
                }}
              >
                FAN CLUBS
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    letterSpacing: "-0.05em",
                  }}
                >
                  Favorite club
                </div>
                <div
                  style={{
                    color: colors.muted,
                    fontSize: 16,
                    fontWeight: 700,
                    lineHeight: 1.3,
                  }}
                >
                  Follow teams and get score notifications on matchday.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
