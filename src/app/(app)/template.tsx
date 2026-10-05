// A template re-mounts on every navigation, so each screen plays its
// entrance animation (sections fade up one after another).
export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
