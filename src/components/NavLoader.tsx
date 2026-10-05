"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { CropLoader } from "./CropLoader";

// If a navigation never lands (offline, server error), stop showing the loader.
const GIVE_UP_MS = 30_000;

function Watcher() {
  const pathname = usePathname();
  const qs = useSearchParams().toString();
  const here = pathname + (qs ? `?${qs}` : "");
  // The address the user was on when they tapped a link; cleared once it changes.
  const [leaving, setLeaving] = useState<string | null>(null);
  if (leaving !== null && leaving !== here) setLeaving(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onClick = (e: MouseEvent) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.hasAttribute("download") || (a.target && a.target !== "_self")) return;
      const to = new URL(a.href, location.href);
      if (to.origin !== location.origin) return;
      if (to.pathname === location.pathname && to.search === location.search) return;
      setLeaving(location.pathname + location.search);
      clearTimeout(timer);
      timer = setTimeout(() => setLeaving(null), GIVE_UP_MS);
    };
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("click", onClick);
      clearTimeout(timer);
    };
  }, []);

  return leaving === here ? <CropLoader delayed /> : null;
}

/**
 * Shows the growing-crop loader from the moment a link is tapped until the
 * next screen (or tab, e.g. /trader?view=stock) is ready. Screens that stream
 * hand over to `loading.tsx`, which shows the same loader.
 */
export function NavLoader() {
  return (
    <Suspense fallback={null}>
      <Watcher />
    </Suspense>
  );
}
