"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/i18n";

const ITEMS: { href: string; key: DictKey; icon: string; also?: string[] }[] = [
  { href: "/today", key: "nav_home", icon: "🏠" },
  { href: "/farmer", key: "nav_grow", icon: "🌱" },
  { href: "/trader", key: "nav_market", icon: "📈", also: ["/market"] },
  { href: "/settings", key: "nav_more", icon: "☰", also: ["/accuracy"] },
];

export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  // Traders see Market before Grow; everyone keeps all four tabs.
  const items = role === "trader" ? [ITEMS[0], ITEMS[2], ITEMS[1], ITEMS[3]] : ITEMS;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((i) => {
          const active = [i.href, ...(i.also ?? [])].some((h) => pathname.startsWith(h));
          return (
            <li key={i.href} className="flex-1">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs font-bold ${active ? "text-primary" : "text-muted"}`}
              >
                <span aria-hidden className={`text-xl leading-none ${active ? "" : "opacity-70 grayscale"}`}>{i.icon}</span>
                {t(i.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
