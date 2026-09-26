import { ImageResponse } from "next/og";

// PNG app icons for the web manifest (192 / 512), drawn at request time.
export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const size = (await ctx.params).size === "512" ? 512 : 192;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1b6e4a",
          fontSize: size * 0.6,
        }}
      >
        🌾
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=604800, immutable" } },
  );
}
