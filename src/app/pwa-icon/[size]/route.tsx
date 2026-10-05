import { ImageResponse } from "next/og";

// PNG app icons for the web manifest (192 / 512), drawn from the brand mark.
// Full-bleed background with the mark inside the maskable safe zone (~62%).
export async function GET(_req: Request, ctx: RouteContext<"/pwa-icon/[size]">) {
  const size = (await ctx.params).size === "512" ? 512 : 192;
  const mark = Math.round(size * 0.62);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0E1B2B, #060A13)",
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="6 6 56 46" width={mark} height={Math.round((mark * 46) / 56)}>
          <defs>
            <linearGradient id="g" x1="10" y1="48" x2="56" y2="10" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#34D399" />
              <stop offset="1" stopColor="#22D3EE" />
            </linearGradient>
          </defs>
          <path d="M11 46 L23 35 L31 41 L43 25" fill="none" stroke="url(#g)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M43 25 C43 15 50 10 57 10 C57 18 52 25 43 25 Z" fill="url(#g)" />
          <path d="M43 25 C36 24 32 19 32 13 C38 13 43 18 43 25 Z" fill="#6EE7B7" />
          <circle cx="11" cy="46" r="3.2" fill="#34D399" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "cache-control": "public, max-age=604800, immutable" } },
  );
}
