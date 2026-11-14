import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { GAMES, TOTAL_LEVELS } from "@/lib/games";

export const alt = "Mind Arcade — 12 brain games with 264 levels";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const logo = `data:image/png;base64,${await readFile(join(process.cwd(), "public/icons/icon-512.png"), "base64")}`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          padding: "0 80px",
          background: "radial-gradient(900px 600px at 0% 0%, rgba(139,92,246,0.55), transparent 60%), radial-gradient(800px 600px at 100% 100%, rgba(244,63,94,0.45), transparent 60%), linear-gradient(135deg, #0b1024, #2a0b3d)",
          color: "#fff",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} width={300} height={300} alt="" style={{ borderRadius: 68 }} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 64 }}>
          <div style={{ fontSize: 110, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Mind Arcade</div>
          <div style={{ display: "flex", marginTop: 22, fontSize: 40, color: "#e9d5ff" }}>{`${GAMES.length} brain games · ${TOTAL_LEVELS} levels`}</div>
          <div style={{ display: "flex", flexWrap: "wrap", marginTop: 34, maxWidth: 680 }}>
            {GAMES.slice(0, 8).map((g) => (
              <div
                key={g.id}
                style={{
                  display: "flex",
                  marginRight: 12,
                  marginBottom: 12,
                  padding: "8px 18px",
                  borderRadius: 999,
                  fontSize: 24,
                  background: `linear-gradient(135deg, ${g.accent}, ${g.accent2})`,
                }}
              >
                {g.name}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    size,
  );
}
