import { requireDevice } from "@/lib/device";
import { dict } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18nProvider";
import { BottomNav } from "@/components/BottomNav";
import { NavLoader } from "@/components/NavLoader";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const device = await requireDevice();
  return (
    <I18nProvider lang={device.lang} d={dict(device.lang)}>
      <main className="mx-auto max-w-2xl px-4 pb-32 pt-6">{children}</main>
      <BottomNav role={device.role} />
      <NavLoader />
    </I18nProvider>
  );
}
