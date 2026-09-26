"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "./I18nProvider";
import type { DictKey } from "@/lib/i18n";

const ITEMS: { href: string; key: DictKey; icon: string; roles: string[] }[] = [
  { href: "/today", key: "nav_today", icon: "☀️", roles: ["farmer", "trader", "both"] },
  { href: "/farmer", key: "nav_farmer", icon: "🌾", roles: ["farmer", "both"] },
  { href: "/trader", key: "nav_trader", icon: "📦", roles: ["trader", "both"] },
  { href: "/accuracy", key: "nav_accuracy", icon: "🎯", roles: ["farmer", "trader", "both"] },
  { href: "/settings", key: "nav_settings", icon: "⚙️", roles: ["farmer", "trader", "both"] },
];

export function BottomNav({ role }: { role: string }) {
  const pathname = usePathname();
  const { t } = useI18n();
  const items = ITEMS.filter((i) => i.roles.includes(role));
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((i) => {
          const active = pathname.startsWith(i.href);
          return (
            <li key={i.href} className="flex-1">
              <Link
                href={i.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-primary" : "text-muted"}`}
              >
                <span aria-hidden className="text-lg leading-none">{i.icon}</span>
                {t(i.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
