// UI strings. Every key must exist in both `en` and `bn`
// (DictKey is derived from `en`, and `bn` is typed against it).

const en = {
  app_name: "Krishi Bazar AI",
  tagline: "Weather, prices and forecasts for Bangladesh farmers and traders",

  nav_today: "Today",
  nav_farmer: "Farm",
  nav_trader: "Trade",
  nav_accuracy: "Accuracy",
  nav_settings: "Settings",

  // Onboarding
  welcome_title: "Welcome",
  welcome_body: "Answer a few taps a day about weather and prices. In return, get forecasts for your area. No typing, no sign-up.",
  choose_language: "Choose language",
  who_are_you: "Who are you?",
  role_farmer: "Farmer",
  role_trader: "Trader / stockist",
  role_both: "Both",
  choose_division: "Your division",
  choose_district: "Your district",
  choose_commodities: "What do you grow or trade?",
  choose_commodities_hint: "Tap to select (up to 12)",
  how_many_reminders: "Daily reminders",
  reminders_hint: "How many short questions per day?",
  reminders_0: "None",
  start: "Start",
  next: "Next",
  back: "Back",
  error_generic: "Something went wrong. Please try again.",
  error_rate_limited: "Too many attempts. Please try later.",

  // Today / check-in
  today_title: "Today's check-in",
  slot_1: "Morning",
  slot_2: "Midday",
  slot_3: "Evening",
  q_rain: "Did it rain?",
  q_rain_evening: "Did it rain today?",
  rain_none: "No",
  rain_light: "A little",
  rain_heavy: "Heavy",
  q_heat: "How hot is it?",
  heat_1: "Cold",
  heat_2: "Cool",
  heat_3: "Normal",
  heat_4: "Hot",
  heat_5: "Very hot",
  q_storm: "Strong wind or storm?",
  yes: "Yes",
  no: "No",
  thanks_weather: "Thanks! Your weather report is saved.",
  change_answer: "Change answer",
  prices_title: "Prices in your market",
  prices_hint: "Tap ✓ if the price is right, or adjust it.",
  wholesale: "Wholesale",
  retail: "Retail",
  per: "per",
  looks_right: "Correct",
  saved: "Saved",
  flagged_note: "Saved — this price is far from other reports, we will double-check it.",
  price_from: "Suggested from",
  src_crowd: "local reports",
  src_tcb: "TCB Dhaka",
  src_wfp: "WFP",
  src_default: "typical price",
  enable_push: "Turn on reminders",
  enable_push_body: "Get 1–3 quick questions a day. You can change this in Settings.",
  push_on: "Reminders are on",
  push_unsupported: "This browser can't show reminders. On iPhone, first add this app to the Home Screen.",
  push_denied: "Notifications are blocked in your browser settings.",
  install_hint_ios: "To install: tap Share, then “Add to Home Screen”.",
  push_q_morning: "Good morning! Did it rain last night? Tap to answer.",
  push_q_midday: "How hot is it now? One tap to answer.",
  push_q_evening: "Did it rain today? And today's market prices?",

  // Farmer
  farmer_title: "Farm dashboard",
  weather_7day: "7-day weather",
  local_reports: "Local reports today",
  reports_count: "reports",
  rain_chance: "rain chance",
  no_weather_yet: "Weather data is loading. Check back soon.",
  crop_suggestions: "What to plant next",
  crop_suggestions_hint: "Ranked by climate fit in your division, expected price at harvest and forecast certainty.",
  plant_in: "Plant",
  harvest_in: "Harvest",
  score: "Score",
  climate_fit: "Climate fit",
  price_at_harvest: "Price at harvest",
  no_suggestions: "No crops are due for planting in the next 3 months.",
  reason_climate_good: "Temperatures suit this crop well",
  reason_climate_ok: "Temperatures are acceptable",
  reason_climate_poor: "Temperatures are outside the ideal range",
  reason_heavy_rain: "Heavy rain risk during growth",
  reason_needs_irrigation: "Needs irrigation (little rain)",
  reason_no_climate: "Climate data not loaded yet",
  reason_price_up: "Price expected to rise",
  reason_price_down: "Price expected to fall",
  reason_price_flat: "Price expected to stay similar",
  reason_no_price_forecast: "Not enough price history to forecast",
  your_prices: "Price outlook for your crops",

  // Trader
  trader_title: "Trader dashboard",
  stock_now: "What to stock now",
  stock_now_hint: "Buy today, sell after the holding period. Margins include storage cost and losses.",
  hold_months: "Hold for",
  months: "months",
  month: "month",
  storage_cost: "Storage cost / month",
  loss_pct: "Loss / spoilage",
  buy_price: "Your buy price",
  expected_sell: "Expected sell price",
  expected_margin: "Expected margin",
  margin_range: "95% range",
  prob_profit: "Chance of profit",
  break_even: "Break-even price",
  no_forecast: "No forecast yet",
  commodity: "Commodity",
  now: "Now",
  in_months: "in",
  details: "Details",

  // Forecast / chart
  forecast_title: "Price forecast",
  forecast_range: "95% range",
  history: "History",
  forecast: "Forecast",
  low_data: "Low data — range not yet verified",
  verified_coverage: "Past ranges held",
  typical_error: "typical error",
  source: "Source",
  model: "Model",
  as_of: "as of",
  show_table: "Show as table",
  month_col: "Month",
  price_col: "Price",
  low_col: "Low",
  high_col: "High",

  // Accuracy
  accuracy_title: "How accurate are we?",
  accuracy_intro:
    "Every forecast shows a 95% range. We test it on past months the model never saw: the range should contain the real price at least 95% of the time. Here is the measured result.",
  accuracy_target: "Target: range holds ≥ 95%",
  price_accuracy: "Price forecasts",
  weather_accuracy: "Weather",
  next_day_rain: "Next-day rain (yes/no) correct",
  tmax_error: "Max temperature error",
  crowd_agreement: "Local reports agree with measured rain",
  horizon: "Ahead",
  coverage: "Range held",
  mape: "Avg. error",
  direction: "Up/down right",
  tested_on: "tested months",
  data_sources: "Data sources",
  last_update: "Last update",
  status_ok: "OK",
  status_failed: "Failed",
  community: "Community",
  devices: "devices",
  weather_reports: "weather reports",
  price_reports: "price reports",
  not_enough_yet: "Not enough data yet",

  // Settings
  settings_title: "Settings",
  language: "Language",
  role: "Role",
  district: "District",
  commodities: "Crops & commodities",
  reminders: "Reminders per day",
  saved_settings: "Saved",
  about: "About",
  about_body:
    "Forecasts combine community reports with open data from Open-Meteo, WFP (HDX) and TCB. They are estimates, not financial advice.",
  attributions: "Weather: Open-Meteo.com (CC BY 4.0). Prices: WFP via HDX (CC BY-IGO), Trading Corporation of Bangladesh.",
  season: "Season",
} as const;

export type DictKey = keyof typeof en;

const bn: Record<DictKey, string> = {
  app_name: "কৃষি বাজার এআই",
  tagline: "বাংলাদেশের কৃষক ও ব্যবসায়ীদের জন্য আবহাওয়া, দাম ও পূর্বাভাস",

  nav_today: "আজ",
  nav_farmer: "খামার",
  nav_trader: "ব্যবসা",
  nav_accuracy: "নির্ভুলতা",
  nav_settings: "সেটিংস",

  welcome_title: "স্বাগতম",
  welcome_body: "প্রতিদিন আবহাওয়া ও দাম নিয়ে কয়েকটি ট্যাপ করুন। বিনিময়ে পান আপনার এলাকার পূর্বাভাস। কিছু লিখতে হবে না, অ্যাকাউন্ট লাগবে না।",
  choose_language: "ভাষা বেছে নিন",
  who_are_you: "আপনি কে?",
  role_farmer: "কৃষক",
  role_trader: "ব্যবসায়ী / মজুতদার",
  role_both: "দুটোই",
  choose_division: "আপনার বিভাগ",
  choose_district: "আপনার জেলা",
  choose_commodities: "আপনি কী চাষ বা ব্যবসা করেন?",
  choose_commodities_hint: "ট্যাপ করে বেছে নিন (সর্বোচ্চ ১২টি)",
  how_many_reminders: "দৈনিক রিমাইন্ডার",
  reminders_hint: "দিনে কয়টি ছোট প্রশ্ন পেতে চান?",
  reminders_0: "কোনোটি না",
  start: "শুরু করুন",
  next: "পরবর্তী",
  back: "পেছনে",
  error_generic: "কিছু একটা ভুল হয়েছে। আবার চেষ্টা করুন।",
  error_rate_limited: "অনেকবার চেষ্টা হয়েছে। পরে আবার চেষ্টা করুন।",

  today_title: "আজকের তথ্য",
  slot_1: "সকাল",
  slot_2: "দুপুর",
  slot_3: "সন্ধ্যা",
  q_rain: "বৃষ্টি হয়েছে?",
  q_rain_evening: "আজ বৃষ্টি হয়েছে?",
  rain_none: "না",
  rain_light: "অল্প",
  rain_heavy: "ভারী",
  q_heat: "কেমন গরম?",
  heat_1: "ঠান্ডা",
  heat_2: "হালকা ঠান্ডা",
  heat_3: "স্বাভাবিক",
  heat_4: "গরম",
  heat_5: "খুব গরম",
  q_storm: "জোরে বাতাস বা ঝড়?",
  yes: "হ্যাঁ",
  no: "না",
  thanks_weather: "ধন্যবাদ! আপনার আবহাওয়ার তথ্য সংরক্ষিত হয়েছে।",
  change_answer: "উত্তর বদলান",
  prices_title: "আপনার বাজারের দাম",
  prices_hint: "দাম ঠিক থাকলে ✓ চাপুন, না হলে ঠিক করে দিন।",
  wholesale: "পাইকারি",
  retail: "খুচরা",
  per: "প্রতি",
  looks_right: "ঠিক আছে",
  saved: "সংরক্ষিত",
  flagged_note: "সংরক্ষিত — এই দাম অন্যদের থেকে অনেক আলাদা, আমরা যাচাই করব।",
  price_from: "প্রস্তাবিত দামের উৎস",
  src_crowd: "স্থানীয় রিপোর্ট",
  src_tcb: "টিসিবি ঢাকা",
  src_wfp: "ডব্লিউএফপি",
  src_default: "সাধারণ দাম",
  enable_push: "রিমাইন্ডার চালু করুন",
  enable_push_body: "দিনে ১–৩টি ছোট প্রশ্ন পাবেন। সেটিংসে গিয়ে বদলাতে পারবেন।",
  push_on: "রিমাইন্ডার চালু আছে",
  push_unsupported: "এই ব্রাউজারে রিমাইন্ডার দেখানো যায় না। আইফোনে আগে অ্যাপটি হোম স্ক্রিনে যোগ করুন।",
  push_denied: "ব্রাউজারের সেটিংসে নোটিফিকেশন বন্ধ করা আছে।",
  install_hint_ios: "ইনস্টল করতে: শেয়ার চাপুন, তারপর “Add to Home Screen”।",
  push_q_morning: "শুভ সকাল! গত রাতে বৃষ্টি হয়েছে? উত্তর দিতে ট্যাপ করুন।",
  push_q_midday: "এখন কেমন গরম? এক ট্যাপে উত্তর দিন।",
  push_q_evening: "আজ বৃষ্টি হয়েছে? আর আজকের বাজারদর?",

  farmer_title: "খামার ড্যাশবোর্ড",
  weather_7day: "৭ দিনের আবহাওয়া",
  local_reports: "আজকের স্থানীয় রিপোর্ট",
  reports_count: "টি রিপোর্ট",
  rain_chance: "বৃষ্টির সম্ভাবনা",
  no_weather_yet: "আবহাওয়ার তথ্য আসছে। একটু পরে দেখুন।",
  crop_suggestions: "পরবর্তীতে কী চাষ করবেন",
  crop_suggestions_hint: "আপনার বিভাগের আবহাওয়া, ফসল তোলার সময়ের সম্ভাব্য দাম ও পূর্বাভাসের নিশ্চয়তা অনুযায়ী সাজানো।",
  plant_in: "রোপণ",
  harvest_in: "সংগ্রহ",
  score: "স্কোর",
  climate_fit: "আবহাওয়া উপযোগিতা",
  price_at_harvest: "সংগ্রহের সময় দাম",
  no_suggestions: "আগামী ৩ মাসে রোপণের মতো কোনো ফসল নেই।",
  reason_climate_good: "তাপমাত্রা এই ফসলের জন্য খুব উপযোগী",
  reason_climate_ok: "তাপমাত্রা চলনসই",
  reason_climate_poor: "তাপমাত্রা আদর্শ সীমার বাইরে",
  reason_heavy_rain: "বেড়ে ওঠার সময় ভারী বৃষ্টির ঝুঁকি",
  reason_needs_irrigation: "সেচ লাগবে (বৃষ্টি কম)",
  reason_no_climate: "আবহাওয়ার তথ্য এখনো আসেনি",
  reason_price_up: "দাম বাড়ার সম্ভাবনা",
  reason_price_down: "দাম কমার সম্ভাবনা",
  reason_price_flat: "দাম প্রায় একই থাকার সম্ভাবনা",
  reason_no_price_forecast: "পূর্বাভাসের জন্য যথেষ্ট দামের ইতিহাস নেই",
  your_prices: "আপনার ফসলের দামের পূর্বাভাস",

  trader_title: "ব্যবসায়ী ড্যাশবোর্ড",
  stock_now: "এখন কী মজুত করবেন",
  stock_now_hint: "আজ কিনে নির্দিষ্ট সময় পরে বিক্রি। মজুত খরচ ও ক্ষতি ধরে লাভ হিসাব করা হয়েছে।",
  hold_months: "মজুত রাখবেন",
  months: "মাস",
  month: "মাস",
  storage_cost: "মাসিক মজুত খরচ",
  loss_pct: "ক্ষতি / নষ্ট",
  buy_price: "আপনার কেনা দাম",
  expected_sell: "সম্ভাব্য বিক্রয়মূল্য",
  expected_margin: "সম্ভাব্য লাভ",
  margin_range: "৯৫% সীমা",
  prob_profit: "লাভের সম্ভাবনা",
  break_even: "লাভ-ক্ষতি সমান দাম",
  no_forecast: "এখনো পূর্বাভাস নেই",
  commodity: "পণ্য",
  now: "এখন",
  in_months: "পরে",
  details: "বিস্তারিত",

  forecast_title: "দামের পূর্বাভাস",
  forecast_range: "৯৫% সীমা",
  history: "ইতিহাস",
  forecast: "পূর্বাভাস",
  low_data: "তথ্য কম — সীমা এখনো যাচাই হয়নি",
  verified_coverage: "অতীতে সীমা ঠিক ছিল",
  typical_error: "সাধারণ ভুল",
  source: "উৎস",
  model: "মডেল",
  as_of: "পর্যন্ত",
  show_table: "টেবিল হিসেবে দেখুন",
  month_col: "মাস",
  price_col: "দাম",
  low_col: "নিম্ন",
  high_col: "উচ্চ",

  accuracy_title: "আমরা কতটা নির্ভুল?",
  accuracy_intro:
    "প্রতিটি পূর্বাভাসে ৯৫% সীমা দেখানো হয়। মডেল দেখেনি এমন অতীত মাসে আমরা তা পরীক্ষা করি: অন্তত ৯৫% ক্ষেত্রে আসল দাম সীমার মধ্যে থাকা উচিত। মাপা ফলাফল নিচে।",
  accuracy_target: "লক্ষ্য: সীমা ≥ ৯৫% ঠিক থাকবে",
  price_accuracy: "দামের পূর্বাভাস",
  weather_accuracy: "আবহাওয়া",
  next_day_rain: "পরদিন বৃষ্টি হবে কি না — সঠিক",
  tmax_error: "সর্বোচ্চ তাপমাত্রার ভুল",
  crowd_agreement: "স্থানীয় রিপোর্ট মাপা বৃষ্টির সাথে মিলেছে",
  horizon: "সামনে",
  coverage: "সীমা ঠিক",
  mape: "গড় ভুল",
  direction: "ওঠা/নামা ঠিক",
  tested_on: "মাসে পরীক্ষিত",
  data_sources: "তথ্যের উৎস",
  last_update: "সর্বশেষ হালনাগাদ",
  status_ok: "ঠিক আছে",
  status_failed: "ব্যর্থ",
  community: "কমিউনিটি",
  devices: "ডিভাইস",
  weather_reports: "আবহাওয়া রিপোর্ট",
  price_reports: "দামের রিপোর্ট",
  not_enough_yet: "এখনো যথেষ্ট তথ্য নেই",

  settings_title: "সেটিংস",
  language: "ভাষা",
  role: "ভূমিকা",
  district: "জেলা",
  commodities: "ফসল ও পণ্য",
  reminders: "দিনে রিমাইন্ডার",
  saved_settings: "সংরক্ষিত",
  about: "সম্পর্কে",
  about_body:
    "পূর্বাভাসে কমিউনিটির রিপোর্ট এবং Open-Meteo, WFP (HDX) ও টিসিবির উন্মুক্ত তথ্য ব্যবহার করা হয়। এগুলো অনুমান, আর্থিক পরামর্শ নয়।",
  attributions: "আবহাওয়া: Open-Meteo.com (CC BY 4.0)। দাম: WFP/HDX (CC BY-IGO), ট্রেডিং কর্পোরেশন অব বাংলাদেশ।",
  season: "মৌসুম",
};

export type Lang = "en" | "bn";

export function t(lang: Lang, key: DictKey): string {
  return (lang === "bn" ? bn : en)[key];
}

export function dict(lang: Lang): Record<DictKey, string> {
  return lang === "bn" ? bn : en;
}

const BN_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

export function toBnDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => BN_DIGITS[Number(d)]);
}

export function fmtNum(lang: Lang, n: number, digits = 0): string {
  const s = n.toLocaleString("en-IN", { maximumFractionDigits: digits, minimumFractionDigits: digits });
  return lang === "bn" ? toBnDigits(s) : s;
}

export function fmtTaka(lang: Lang, n: number): string {
  return `৳${fmtNum(lang, n, n < 20 ? 1 : 0)}`;
}

export function fmtPct(lang: Lang, x: number, signed = false): string {
  const v = x * 100;
  const s = `${signed && v > 0 ? "+" : ""}${fmtNum(lang, v, Math.abs(v) < 10 ? 1 : 0)}%`;
  return s;
}

const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTHS_BN = ["জানু", "ফেব্রু", "মার্চ", "এপ্রিল", "মে", "জুন", "জুলাই", "আগস্ট", "সেপ্টে", "অক্টো", "নভে", "ডিসে"];

export function monthName(lang: Lang, m: number): string {
  return (lang === "bn" ? MONTHS_BN : MONTHS_EN)[(m - 1 + 12) % 12];
}

/** "2026-09" -> "Sep 2026" / "সেপ্টে ২০২৬" */
export function fmtYm(lang: Lang, ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return `${monthName(lang, m)} ${lang === "bn" ? toBnDigits(String(y)) : y}`;
}

const DAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_BN = ["রবি", "সোম", "মঙ্গল", "বুধ", "বৃহঃ", "শুক্র", "শনি"];

export function dayName(lang: Lang, isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return (lang === "bn" ? DAYS_BN : DAYS_EN)[d];
}
