"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/i18n";

const ITEMS: { href: string; key: DictKey; icon: string; also?: string[] }[] = [
  { href: "/today", key: "nav_home", icon: "◉" },
  { href: "/farmer", key: "nav_grow", icon: "❋" },
  { href: "/trader", key: "nav_market", icon: "↗" },
  { href: "/settings", key: "nav_more", icon: "☰", also: ["/accuracy"] },
];

/** Floating glass navigation pill. */
export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const market = { ...ITEMS[2], also: ["/market"] };
  // Traders see Market before Grow; everyone keeps all four tabs.
  const items = role === "trader" ? [ITEMS[0], market, ITEMS[1], ITEMS[3]] : [ITEMS[0], ITEMS[1], market, ITEMS[3]];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 px-3 pb-[calc(env(safe-area-inset-bottom)+0.6rem)]">
      <ul className="nav-pill mx-auto flex max-w-md p-1.5">
        {items.map((i) => {
          const active = [i.href, ...(i.also ?? [])].some((h) => pathname.startsWith(h));
          return (
            <li key={i.href} className="flex-1">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold transition-colors ${
                  active ? "bg-primary-soft text-primary" : "text-muted hover:text-foreground"
                }`}
              >
                <span aria-hidden className={`text-xl leading-none ${active ? "drop-shadow-[0_0_10px_var(--primary)]" : ""}`}>
                  {i.icon}
                </span>
                {t(i.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
