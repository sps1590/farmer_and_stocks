// Bangladesh divisions and districts (64). Coordinates are approximate
// district-headquarters points, used for Open-Meteo lookups. `wfp` is the
// admin2 spelling used in the WFP/HDX food price dataset.

export type Division = { key: string; name_en: string; name_bn: string; lat: number; lon: number };
export type District = {
  key: string;
  division: string;
  name_en: string;
  name_bn: string;
  lat: number;
  lon: number;
  wfp?: string;
};

export const DIVISIONS: Division[] = [
  { key: "barishal", name_en: "Barishal", name_bn: "বরিশাল", lat: 22.7, lon: 90.37 },
  { key: "chattogram", name_en: "Chattogram", name_bn: "চট্টগ্রাম", lat: 22.36, lon: 91.78 },
  { key: "dhaka", name_en: "Dhaka", name_bn: "ঢাকা", lat: 23.81, lon: 90.41 },
  { key: "khulna", name_en: "Khulna", name_bn: "খুলনা", lat: 22.82, lon: 89.55 },
  { key: "mymensingh", name_en: "Mymensingh", name_bn: "ময়মনসিংহ", lat: 24.75, lon: 90.41 },
  { key: "rajshahi", name_en: "Rajshahi", name_bn: "রাজশাহী", lat: 24.37, lon: 88.6 },
  { key: "rangpur", name_en: "Rangpur", name_bn: "রংপুর", lat: 25.75, lon: 89.25 },
  { key: "sylhet", name_en: "Sylhet", name_bn: "সিলেট", lat: 24.89, lon: 91.87 },
];

const d = (
  key: string,
  division: string,
  name_en: string,
  name_bn: string,
  lat: number,
  lon: number,
  wfp?: string,
): District => ({ key, division, name_en, name_bn, lat, lon, wfp: wfp ?? name_en });

export const DISTRICTS: District[] = [
  d("barguna", "barishal", "Barguna", "বরগুনা", 22.15, 90.12),
  d("barishal", "barishal", "Barishal", "বরিশাল", 22.7, 90.37, "Barisal"),
  d("bhola", "barishal", "Bhola", "ভোলা", 22.69, 90.65),
  d("jhalokati", "barishal", "Jhalokati", "ঝালকাঠি", 22.64, 90.2),
  d("patuakhali", "barishal", "Patuakhali", "পটুয়াখালী", 22.36, 90.33),
  d("pirojpur", "barishal", "Pirojpur", "পিরোজপুর", 22.58, 89.97),

  d("bandarban", "chattogram", "Bandarban", "বান্দরবান", 22.2, 92.22),
  d("brahmanbaria", "chattogram", "Brahmanbaria", "ব্রাহ্মণবাড়িয়া", 23.96, 91.11, "Brahamanbaria"),
  d("chandpur", "chattogram", "Chandpur", "চাঁদপুর", 23.23, 90.67),
  d("chattogram", "chattogram", "Chattogram", "চট্টগ্রাম", 22.36, 91.78, "Chittagong"),
  d("cumilla", "chattogram", "Cumilla", "কুমিল্লা", 23.46, 91.18, "Comilla"),
  d("coxs_bazar", "chattogram", "Cox's Bazar", "কক্সবাজার", 21.43, 92.01, "Cox'S Bazar"),
  d("feni", "chattogram", "Feni", "ফেনী", 23.02, 91.4),
  d("khagrachhari", "chattogram", "Khagrachhari", "খাগড়াছড়ি", 23.12, 91.98),
  d("lakshmipur", "chattogram", "Lakshmipur", "লক্ষ্মীপুর", 22.94, 90.83),
  d("noakhali", "chattogram", "Noakhali", "নোয়াখালী", 22.87, 91.1),
  d("rangamati", "chattogram", "Rangamati", "রাঙ্গামাটি", 22.65, 92.18),

  d("dhaka", "dhaka", "Dhaka", "ঢাকা", 23.81, 90.41),
  d("faridpur", "dhaka", "Faridpur", "ফরিদপুর", 23.61, 89.84),
  d("gazipur", "dhaka", "Gazipur", "গাজীপুর", 24.0, 90.42),
  d("gopalganj", "dhaka", "Gopalganj", "গোপালগঞ্জ", 23.01, 89.83),
  d("kishoreganj", "dhaka", "Kishoreganj", "কিশোরগঞ্জ", 24.44, 90.78),
  d("madaripur", "dhaka", "Madaripur", "মাদারীপুর", 23.17, 90.19),
  d("manikganj", "dhaka", "Manikganj", "মানিকগঞ্জ", 23.86, 90.0),
  d("munshiganj", "dhaka", "Munshiganj", "মুন্সীগঞ্জ", 23.54, 90.53),
  d("narayanganj", "dhaka", "Narayanganj", "নারায়ণগঞ্জ", 23.62, 90.5),
  d("narsingdi", "dhaka", "Narsingdi", "নরসিংদী", 23.92, 90.72),
  d("rajbari", "dhaka", "Rajbari", "রাজবাড়ী", 23.76, 89.64),
  d("shariatpur", "dhaka", "Shariatpur", "শরীয়তপুর", 23.21, 90.35),
  d("tangail", "dhaka", "Tangail", "টাঙ্গাইল", 24.25, 89.92),

  d("bagerhat", "khulna", "Bagerhat", "বাগেরহাট", 22.65, 89.79),
  d("chuadanga", "khulna", "Chuadanga", "চুয়াডাঙ্গা", 23.64, 88.84),
  d("jashore", "khulna", "Jashore", "যশোর", 23.17, 89.21, "Jessore"),
  d("jhenaidah", "khulna", "Jhenaidah", "ঝিনাইদহ", 23.54, 89.15),
  d("khulna", "khulna", "Khulna", "খুলনা", 22.82, 89.55),
  d("kushtia", "khulna", "Kushtia", "কুষ্টিয়া", 23.9, 89.12),
  d("magura", "khulna", "Magura", "মাগুরা", 23.49, 89.42),
  d("meherpur", "khulna", "Meherpur", "মেহেরপুর", 23.76, 88.63),
  d("narail", "khulna", "Narail", "নড়াইল", 23.17, 89.51),
  d("satkhira", "khulna", "Satkhira", "সাতক্ষীরা", 22.72, 89.07),

  d("jamalpur", "mymensingh", "Jamalpur", "জামালপুর", 24.94, 89.94),
  d("mymensingh", "mymensingh", "Mymensingh", "ময়মনসিংহ", 24.75, 90.41),
  d("netrokona", "mymensingh", "Netrokona", "নেত্রকোণা", 24.88, 90.73, "Netrakona"),
  d("sherpur", "mymensingh", "Sherpur", "শেরপুর", 25.02, 90.02),

  d("bogura", "rajshahi", "Bogura", "বগুড়া", 24.85, 89.37, "Bogra"),
  d("chapai_nawabganj", "rajshahi", "Chapai Nawabganj", "চাঁপাইনবাবগঞ্জ", 24.6, 88.27, "Nawabganj"),
  d("joypurhat", "rajshahi", "Joypurhat", "জয়পুরহাট", 25.1, 89.02),
  d("naogaon", "rajshahi", "Naogaon", "নওগাঁ", 24.81, 88.93),
  d("natore", "rajshahi", "Natore", "নাটোর", 24.41, 89.0),
  d("pabna", "rajshahi", "Pabna", "পাবনা", 24.01, 89.24),
  d("rajshahi", "rajshahi", "Rajshahi", "রাজশাহী", 24.37, 88.6),
  d("sirajganj", "rajshahi", "Sirajganj", "সিরাজগঞ্জ", 24.45, 89.7),

  d("dinajpur", "rangpur", "Dinajpur", "দিনাজপুর", 25.63, 88.64),
  d("gaibandha", "rangpur", "Gaibandha", "গাইবান্ধা", 25.33, 89.53),
  d("kurigram", "rangpur", "Kurigram", "কুড়িগ্রাম", 25.81, 89.64),
  d("lalmonirhat", "rangpur", "Lalmonirhat", "লালমনিরহাট", 25.91, 89.45),
  d("nilphamari", "rangpur", "Nilphamari", "নীলফামারী", 25.93, 88.86),
  d("panchagarh", "rangpur", "Panchagarh", "পঞ্চগড়", 26.34, 88.55),
  d("rangpur", "rangpur", "Rangpur", "রংপুর", 25.75, 89.25),
  d("thakurgaon", "rangpur", "Thakurgaon", "ঠাকুরগাঁও", 26.03, 88.46),

  d("habiganj", "sylhet", "Habiganj", "হবিগঞ্জ", 24.37, 91.42),
  d("moulvibazar", "sylhet", "Moulvibazar", "মৌলভীবাজার", 24.48, 91.77, "Maulvibazar"),
  d("sunamganj", "sylhet", "Sunamganj", "সুনামগঞ্জ", 25.07, 91.4),
  d("sylhet", "sylhet", "Sylhet", "সিলেট", 24.89, 91.87),
];

export const DISTRICT_BY_KEY = new Map(DISTRICTS.map((x) => [x.key, x]));
export const DIVISION_BY_KEY = new Map(DIVISIONS.map((x) => [x.key, x]));
export const DISTRICT_BY_WFP = new Map(DISTRICTS.map((x) => [x.wfp!.toLowerCase(), x]));
