/** Brand mark: a price trend line whose tip grows into a sprout. */
export function LogoMark({ size = 32, tile = true, animated = false, className }: { size?: number; tile?: boolean; animated?: boolean; className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width={size} height={size} className={className} role="img" aria-label="Krishi Bazar AI">
      <defs>
        <linearGradient id="kb-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0E1B2B" />
          <stop offset="1" stopColor="#060A13" />
        </linearGradient>
        <linearGradient id="kb-g" x1="10" y1="48" x2="56" y2="10" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34D399" />
          <stop offset="1" stopColor="#22D3EE" />
        </linearGradient>
      </defs>
      {tile && <rect width="64" height="64" rx="15" fill="url(#kb-bg)" stroke="rgba(255,255,255,0.12)" />}
      <path d="M11 46 L23 35 L31 41 L43 25" pathLength={1} className={animated ? "draw" : undefined} fill="none" stroke="url(#kb-g)" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M43 25 C43 15 50 10 57 10 C57 18 52 25 43 25 Z" fill="url(#kb-g)" className={animated ? "leaf" : undefined} />
      <path d="M43 25 C36 24 32 19 32 13 C38 13 43 18 43 25 Z" fill="#6EE7B7" className={animated ? "leaf leaf-2" : undefined} />
      <circle cx="11" cy="46" r="3.2" fill="#34D399" />
    </svg>
  );
}

/** Mark + wordmark, used at the top of every screen. */
export function BrandHeader({ name }: { name: string }) {
  return (
    <p className="flex items-center gap-2 text-sm font-bold tracking-tight">
      <LogoMark size={28} />
      <span>{name}</span>
    </p>
  );
}
