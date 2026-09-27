import Link from "next/link";
import { cookies } from "next/headers";
import { requireDevice } from "@/lib/device";
import { COMMODITIES } from "@/lib/catalog";
import { DISTRICT_BY_KEY, DISTRICTS, DIVISIONS } from "@/lib/geo";
import { fmtNum, t } from "@/lib/i18n";
import { historyCoverage } from "@/lib/queries";
import { SettingsForm } from "@/components/SettingsForm";
import { StartOver } from "@/components/StartOver";

export default async function MorePage() {
  const device = await requireDevice();
  const lang = device.lang;
  const history = await historyCoverage();
  const pref = (await cookies()).get("fs_theme")?.value;
  const theme = pref === "light" || pref === "system" ? pref : "dark";
  return (
    <div className="space-y-5">
      <header className="rise">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">Krishi Bazar · AI</p>
        <h1 className="text-3xl font-bold">
          <span className="text-gradient">{t(lang, "more_title")}</span>
        </h1>
      </header>

      <section className="card-glow p-4">
        <h2 className="section-title">⟳ {t(lang, "auto_collect")}</h2>
        <p className="mt-1 text-sm text-muted">{t(lang, "auto_collect_hint")}</p>
      </section>

      <Link href="/accuracy" className="card row-tap rounded-2xl">
        <span className="text-2xl" aria-hidden>
          🎯
        </span>
        <span className="flex-1 font-bold">{t(lang, "see_accuracy")}</span>
        <span aria-hidden>→</span>
      </Link>

      <SettingsForm
        device={{
          role: device.role,
          lang,
          district: device.district,
          division: DISTRICT_BY_KEY.get(device.district)?.division ?? DIVISIONS[0].key,
          upazila: device.upazila_id,
          union: device.union_id,
          commodities: device.commodities,
          pushes: device.pushes_per_day,
          theme,
          lat: device.lat,
          lon: device.lon,
          place: device.place_name,
        }}
        divisions={DIVISIONS}
        districts={DISTRICTS.map(({ key, division, name_en, name_bn }) => ({ key, division, name_en, name_bn }))}
        commodities={COMMODITIES.map(({ key, name_en, name_bn, icon }) => ({ key, name_en, name_bn, icon }))}
      />

      <section className="card p-4 text-sm">
        <h2 className="section-title">ℹ️ {t(lang, "about")}</h2>
        <p className="mt-1 text-muted">{t(lang, "about_body")}</p>
        {history.days > 0 && (
          <p className="num mt-2 text-xs text-muted">
            {t(lang, "history_stored")}: {fmtNum(lang, history.districts)} / {fmtNum(lang, 64)} {t(lang, "district")} · {t(lang, "since")} {history.since}
          </p>
        )}
        <p className="mt-2 text-xs text-muted">{t(lang, "attributions")}</p>
      </section>

      <StartOver />
    </div>
  );
}
