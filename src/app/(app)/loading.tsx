// Shown while a screen's data loads: shimmering placeholders in the shape of the page.
export default function Loading() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="skeleton h-7 w-40" />
      <div className="skeleton h-10 w-56" />
      <div className="skeleton h-40" />
      <div className="skeleton h-56" />
      <div className="grid grid-cols-3 gap-2">
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
        <div className="skeleton h-20" />
      </div>
      <div className="skeleton h-64" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
