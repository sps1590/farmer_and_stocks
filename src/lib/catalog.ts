// Commodities we track prices for, and the crops a farmer can be advised on.
//
// `wfp` = exact commodity names in the WFP/HDX Bangladesh retail price CSV.
// `tcb` = regexes matched against the (NFC-normalised, whitespace-collapsed)
//         item name in TCB's daily Dhaka retail sheet; `tcbDivisor` converts
//         TCB's unit to ours (eggs are quoted per hali = 4 pieces).
// `ref`  = fallback reference price (BDT per unit, Dhaka retail, Sep 2026)
//          used only to centre the price slider before any data is loaded.

export type Commodity = {
  key: string;
  name_en: string;
  name_bn: string;
  unit: "kg" | "L" | "piece" | "maund";
  icon: string;
  category: "cereal" | "pulse" | "vegetable" | "spice" | "oil" | "livestock" | "other" | "fibre";
  wfp: string[];
  tcb: RegExp[];
  tcbDivisor?: number;
  ref: number;
};

export const COMMODITIES: Commodity[] = [
  { key: "rice_coarse", name_en: "Rice (coarse)", name_bn: "মোটা চাল", unit: "kg", icon: "🍚", category: "cereal", wfp: ["Rice (coarse)"], tcb: [/^চাল \(মোটা\)/], ref: 52 },
  { key: "rice_medium", name_en: "Rice (medium)", name_bn: "মাঝারি চাল", unit: "kg", icon: "🍚", category: "cereal", wfp: ["Rice (BRRI-28)"], tcb: [/^চাল \(মাঝারী\)/], ref: 62 },
  { key: "rice_fine", name_en: "Rice (fine)", name_bn: "সরু চাল", unit: "kg", icon: "🍚", category: "cereal", wfp: [], tcb: [/^চাল সরু/], ref: 78 },
  { key: "atta", name_en: "Wheat flour (atta)", name_bn: "আটা", unit: "kg", icon: "🌾", category: "cereal", wfp: ["Wheat flour"], tcb: [/^আটা সাদা/], ref: 50 },
  { key: "lentil", name_en: "Lentil (masur)", name_bn: "মসুর ডাল", unit: "kg", icon: "🫘", category: "pulse", wfp: ["Lentils (masur)"], tcb: [/^মশুর ডাল \(বড়/, /^মসুর ডাল \(বড়/], ref: 98 },
  { key: "mung", name_en: "Mung dal", name_bn: "মুগ ডাল", unit: "kg", icon: "🫛", category: "pulse", wfp: ["Beans (mung, large grain)"], tcb: [/^মুগ ডাল/], ref: 150 },
  { key: "potato", name_en: "Potato", name_bn: "আলু", unit: "kg", icon: "🥔", category: "vegetable", wfp: ["Potatoes (Holland, white)"], tcb: [/^আলু/], ref: 28 },
  { key: "onion", name_en: "Onion (local)", name_bn: "দেশি পেঁয়াজ", unit: "kg", icon: "🧅", category: "spice", wfp: [], tcb: [/^পি[ঁ]?য়াজ \(দেশী\)/, /^পে[ঁ]?য়াজ \(দেশী\)/], ref: 50 },
  { key: "garlic", name_en: "Garlic (local)", name_bn: "দেশি রসুন", unit: "kg", icon: "🧄", category: "spice", wfp: [], tcb: [/^রসুন \(দেশী\)/], ref: 110 },
  { key: "ginger", name_en: "Ginger (local)", name_bn: "দেশি আদা", unit: "kg", icon: "🫚", category: "spice", wfp: [], tcb: [/^আদা \(দেশী\)/], ref: 130 },
  { key: "turmeric", name_en: "Turmeric (local)", name_bn: "দেশি হলুদ", unit: "kg", icon: "🟡", category: "spice", wfp: [], tcb: [/^হলুদ \(দেশী\)/], ref: 335 },
  { key: "dry_chili", name_en: "Dry chili (local)", name_bn: "শুকনা মরিচ", unit: "kg", icon: "🌶️", category: "spice", wfp: [], tcb: [/^শুকনা মরিচ \(দেশী\)/], ref: 350 },
  { key: "green_chili", name_en: "Green chili", name_bn: "কাঁচা মরিচ", unit: "kg", icon: "🌶️", category: "vegetable", wfp: ["Chili (green)"], tcb: [/^কাঁচা ?মরিচ/], ref: 150 },
  { key: "brinjal", name_en: "Brinjal", name_bn: "বেগুন", unit: "kg", icon: "🍆", category: "vegetable", wfp: ["Eggplants"], tcb: [/^বেগুন/], ref: 100 },
  { key: "tomato", name_en: "Tomato", name_bn: "টমেটো", unit: "kg", icon: "🍅", category: "vegetable", wfp: ["Tomatoes (red)"], tcb: [], ref: 90 },
  { key: "cauliflower", name_en: "Cauliflower", name_bn: "ফুলকপি", unit: "kg", icon: "🥦", category: "vegetable", wfp: ["Cauliflower"], tcb: [], ref: 60 },
  { key: "cabbage", name_en: "Cabbage", name_bn: "বাঁধাকপি", unit: "kg", icon: "🥬", category: "vegetable", wfp: ["Cabbage"], tcb: [], ref: 45 },
  { key: "pumpkin", name_en: "Pumpkin", name_bn: "মিষ্টি কুমড়া", unit: "kg", icon: "🎃", category: "vegetable", wfp: ["Pumpkin"], tcb: [], ref: 40 },
  { key: "bottle_gourd", name_en: "Bottle gourd", name_bn: "লাউ", unit: "kg", icon: "🥒", category: "vegetable", wfp: ["Gourd (bottle)"], tcb: [], ref: 50 },
  { key: "cucumber", name_en: "Cucumber", name_bn: "শসা", unit: "kg", icon: "🥒", category: "vegetable", wfp: ["Cucumber (short, khira)"], tcb: [/^শসা/], ref: 65 },
  { key: "soybean_oil", name_en: "Soybean oil (loose)", name_bn: "সয়াবিন তেল (খোলা)", unit: "L", icon: "🛢️", category: "oil", wfp: ["Oil (soybean, fortified)"], tcb: [/^সয়াবিন তেল \(লুজ\)/], ref: 192 },
  { key: "palm_oil", name_en: "Palm oil (loose)", name_bn: "পাম তেল (খোলা)", unit: "L", icon: "🛢️", category: "oil", wfp: ["Oil (palm)"], tcb: [/^পাম অয়েল \(লুজ\)/], ref: 172 },
  { key: "mustard_oil", name_en: "Mustard oil", name_bn: "সরিষার তেল", unit: "L", icon: "🌼", category: "oil", wfp: ["Oil (mustard)"], tcb: [], ref: 230 },
  { key: "sugar", name_en: "Sugar", name_bn: "চিনি", unit: "kg", icon: "🧂", category: "other", wfp: ["Sugar"], tcb: [/^চিনি/], ref: 112 },
  { key: "egg", name_en: "Egg (farm)", name_bn: "ডিম (ফার্ম)", unit: "piece", icon: "🥚", category: "livestock", wfp: ["Eggs (brown)"], tcb: [/^ডিম \(ফার্ম\)/], tcbDivisor: 4, ref: 13 },
  { key: "broiler", name_en: "Broiler chicken", name_bn: "ব্রয়লার মুরগি", unit: "kg", icon: "🐔", category: "livestock", wfp: ["Meat (chicken, broiler)"], tcb: [/^মুরগী ?\(ব্রয়লার\)/], ref: 175 },
  { key: "jute", name_en: "Jute (raw)", name_bn: "পাট", unit: "maund", icon: "🧶", category: "fibre", wfp: [], tcb: [], ref: 3200 },
];

export const COMMODITY_BY_KEY = new Map(COMMODITIES.map((c) => [c.key, c]));

export const UNIT_LABEL: Record<Commodity["unit"], { en: string; bn: string }> = {
  kg: { en: "kg", bn: "কেজি" },
  L: { en: "litre", bn: "লিটার" },
  piece: { en: "piece", bn: "পিস" },
  maund: { en: "maund", bn: "মণ" },
};

// ---------------------------------------------------------------------------
// Crop agronomy profiles for the farmer "what to plant" suggestions.
// Deliberately coarse, national-level rules of thumb (DAE / BRRI / BARI crop
// calendars). `plant` = months (1-12) when planting normally happens,
// `grow` = months from planting to harvest, `temp` = comfortable range of
// monthly mean temperature (°C) during growth, `water` = crop water need.
// ---------------------------------------------------------------------------

export type Season = "rabi" | "kharif1" | "kharif2";

export type Crop = {
  key: string;
  commodity: string;
  name_en: string;
  name_bn: string;
  season: Season;
  plant: number[];
  grow: number;
  temp: [number, number];
  water: "low" | "medium" | "high";
  floodTolerant?: boolean;
};

export const CROPS: Crop[] = [
  { key: "boro_rice", commodity: "rice_coarse", name_en: "Boro rice", name_bn: "বোরো ধান", season: "rabi", plant: [12, 1], grow: 5, temp: [18, 32], water: "high" },
  { key: "aman_rice", commodity: "rice_coarse", name_en: "Aman rice", name_bn: "আমন ধান", season: "kharif2", plant: [7, 8], grow: 4, temp: [22, 32], water: "high", floodTolerant: true },
  { key: "aus_rice", commodity: "rice_coarse", name_en: "Aus rice", name_bn: "আউশ ধান", season: "kharif1", plant: [4, 5], grow: 4, temp: [24, 33], water: "medium" },
  { key: "wheat", commodity: "atta", name_en: "Wheat", name_bn: "গম", season: "rabi", plant: [11, 12], grow: 4, temp: [12, 25], water: "low" },
  { key: "potato", commodity: "potato", name_en: "Potato", name_bn: "আলু", season: "rabi", plant: [11, 12], grow: 3, temp: [12, 24], water: "medium" },
  { key: "onion", commodity: "onion", name_en: "Onion", name_bn: "পেঁয়াজ", season: "rabi", plant: [11, 12], grow: 4, temp: [13, 27], water: "low" },
  { key: "garlic", commodity: "garlic", name_en: "Garlic", name_bn: "রসুন", season: "rabi", plant: [10, 11], grow: 5, temp: [12, 26], water: "low" },
  { key: "lentil", commodity: "lentil", name_en: "Lentil", name_bn: "মসুর", season: "rabi", plant: [10, 11], grow: 4, temp: [14, 27], water: "low" },
  { key: "mustard", commodity: "mustard_oil", name_en: "Mustard", name_bn: "সরিষা", season: "rabi", plant: [10, 11], grow: 3, temp: [13, 26], water: "low" },
  { key: "tomato", commodity: "tomato", name_en: "Tomato", name_bn: "টমেটো", season: "rabi", plant: [10, 11], grow: 3, temp: [15, 28], water: "medium" },
  { key: "cauliflower", commodity: "cauliflower", name_en: "Cauliflower", name_bn: "ফুলকপি", season: "rabi", plant: [9, 10, 11], grow: 3, temp: [12, 26], water: "medium" },
  { key: "cabbage", commodity: "cabbage", name_en: "Cabbage", name_bn: "বাঁধাকপি", season: "rabi", plant: [9, 10, 11], grow: 3, temp: [12, 26], water: "medium" },
  { key: "brinjal_rabi", commodity: "brinjal", name_en: "Brinjal (winter)", name_bn: "বেগুন (শীতকালীন)", season: "rabi", plant: [9, 10], grow: 4, temp: [18, 32], water: "medium" },
  { key: "brinjal_kharif", commodity: "brinjal", name_en: "Brinjal (summer)", name_bn: "বেগুন (গ্রীষ্মকালীন)", season: "kharif1", plant: [2, 3], grow: 4, temp: [20, 33], water: "medium" },
  { key: "green_chili", commodity: "green_chili", name_en: "Chili", name_bn: "মরিচ", season: "rabi", plant: [10, 11], grow: 4, temp: [18, 32], water: "medium" },
  { key: "pumpkin", commodity: "pumpkin", name_en: "Pumpkin", name_bn: "মিষ্টি কুমড়া", season: "rabi", plant: [10, 11], grow: 4, temp: [18, 32], water: "medium" },
  { key: "bottle_gourd", commodity: "bottle_gourd", name_en: "Bottle gourd", name_bn: "লাউ", season: "rabi", plant: [9, 10], grow: 3, temp: [18, 32], water: "medium" },
  { key: "cucumber", commodity: "cucumber", name_en: "Cucumber", name_bn: "শসা", season: "kharif1", plant: [2, 3], grow: 3, temp: [20, 33], water: "medium" },
  { key: "mung", commodity: "mung", name_en: "Mung bean", name_bn: "মুগ", season: "kharif1", plant: [2, 3], grow: 3, temp: [22, 34], water: "low" },
  { key: "jute", commodity: "jute", name_en: "Jute", name_bn: "পাট", season: "kharif1", plant: [3, 4], grow: 4, temp: [24, 35], water: "high", floodTolerant: true },
  { key: "ginger", commodity: "ginger", name_en: "Ginger", name_bn: "আদা", season: "kharif1", plant: [4, 5], grow: 8, temp: [20, 32], water: "medium" },
  { key: "turmeric", commodity: "turmeric", name_en: "Turmeric", name_bn: "হলুদ", season: "kharif1", plant: [4, 5], grow: 9, temp: [20, 32], water: "medium" },
];

export const SEASON_LABEL: Record<Season, { en: string; bn: string }> = {
  rabi: { en: "Rabi (winter)", bn: "রবি (শীত)" },
  kharif1: { en: "Kharif-1 (pre-monsoon)", bn: "খরিফ-১ (গ্রীষ্ম)" },
  kharif2: { en: "Kharif-2 (monsoon)", bn: "খরিফ-২ (বর্ষা)" },
};
