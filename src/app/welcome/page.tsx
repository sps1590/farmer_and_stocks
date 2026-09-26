import { redirect } from "next/navigation";
import { getDevice, getLang } from "@/lib/device";
import { dict } from "@/lib/i18n";
import { COMMODITIES } from "@/lib/catalog";
import { DISTRICTS, DIVISIONS } from "@/lib/geo";
import { Onboarding } from "./Onboarding";

export default async function WelcomePage() {
  if (await getDevice()) redirect("/today");
  const lang = await getLang();
  return (
    <main className="mx-auto max-w-lg px-4 py-6">
      <Onboarding
        initialLang={lang}
        dicts={{ en: dict("en"), bn: dict("bn") }}
        divisions={DIVISIONS}
        districts={DISTRICTS.map(({ key, division, name_en, name_bn }) => ({ key, division, name_en, name_bn }))}
        commodities={COMMODITIES.map(({ key, name_en, name_bn, icon }) => ({ key, name_en, name_bn, icon }))}
      />
    </main>
  );
}
