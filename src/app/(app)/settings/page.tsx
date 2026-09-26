import { requireDevice } from "@/lib/device";
import { COMMODITIES } from "@/lib/catalog";
import { DISTRICTS, DIVISIONS } from "@/lib/geo";
import { t } from "@/lib/i18n";
import { SettingsForm } from "@/components/SettingsForm";

export default async function SettingsPage() {
  const device = await requireDevice();
  const lang = device.lang;
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t(lang, "settings_title")}</h1>
      <SettingsForm
        device={{ role: device.role, lang, district: device.district, commodities: device.commodities, pushes: device.pushes_per_day }}
        divisions={DIVISIONS}
        districts={DISTRICTS.map(({ key, division, name_en, name_bn }) => ({ key, division, name_en, name_bn }))}
        commodities={COMMODITIES.map(({ key, name_en, name_bn, icon }) => ({ key, name_en, name_bn, icon }))}
      />
      <section className="card p-4 text-sm">
        <h2 className="font-bold">{t(lang, "about")}</h2>
        <p className="mt-1 text-muted">{t(lang, "about_body")}</p>
        <p className="mt-2 text-xs text-muted">{t(lang, "attributions")}</p>
      </section>
    </div>
  );
}
