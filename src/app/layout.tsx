import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Bengali, Space_Grotesk } from "next/font/google";
import { cookies } from "next/headers";
import { getLang } from "@/lib/device";
import { isDbConfigured } from "@/lib/db";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bengali = Noto_Sans_Bengali({ variable: "--font-bengali", subsets: ["bengali"], weight: ["400", "600", "700"] });
const display = Space_Grotesk({ variable: "--font-grotesk", subsets: ["latin"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: "Krishi Bazar AI — কৃষি বাজার",
  description: "Weather, crop prices and AI forecasts for Bangladesh farmers and traders",
  appleWebApp: { capable: true, title: "Krishi Bazar", statusBarStyle: "default" },
  icons: { apple: "/pwa-icon/192" },
};

export const viewport: Viewport = {
  themeColor: "#060a13",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const configured = isDbConfigured();
  const lang = configured ? await getLang() : "bn";
  const pref = (await cookies()).get("fs_theme")?.value;
  const theme = pref === "light" || pref === "system" ? pref : "dark";
  return (
    <html lang={lang} data-theme={theme} className={`${inter.variable} ${bengali.variable} ${display.variable} h-full antialiased`}>
      <body className="min-h-full">
        {configured ? (
          children
        ) : (
          <main className="mx-auto max-w-md p-6">
            <h1 className="text-xl font-bold">Krishi Bazar AI</h1>
            <p className="mt-2 text-muted">
              Setup needed: DATABASE_URL is not configured. Add a Neon Postgres database (Vercel → Storage) and redeploy.
            </p>
          </main>
        )}
      </body>
    </html>
  );
}
