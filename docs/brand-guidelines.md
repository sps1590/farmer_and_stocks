# Krishi Bazar AI — Brand Guidelines

Source of truth for how the product looks and sounds. The tokens named here
live in `src/app/globals.css`; the logo files are in `public/brand/`.

## 1. What the brand stands for

**Krishi Bazar AI (কৃষি বাজার এআই)** helps Bangladesh's farmers and commodity
traders decide what to grow, when to sell and what to stock — from weather,
daily market prices and honest forecasts.

| Pillar | What it means in practice |
|---|---|
| **Honest** | Every forecast shows its range and how often past ranges held. We never claim certainty. |
| **Effortless** | Tap only. No typing, no sign-up, works in Bangla first. |
| **Local** | Prices and weather for your union, not just the capital. |
| **Clear** | One answer first, details on demand. Green / red / orange flags always carry a word and an arrow. |

## 2. Voice

- **Plain and direct.** "Rain is very likely today — hold off spraying." Not "Precipitation probability is elevated."
- **Bangla first**, everyday words; English mirrors it. Numbers use Bengali digits in Bangla.
- **Say what to do**, then why. Lead with the outcome.
- **No hype.** Avoid "guaranteed", "best", "100%". Say "expected", "likely", "about".
- **Never blame the user**; errors say what happened and what to try next.

| Do | Don't |
|---|---|
| "Onion is expected to rise about 12% in 3 months." | "Onion will make you rich!" |
| "Low data — range not yet verified." | Hiding uncertainty. |
| "Answer today's 3 taps" | "Submit meteorological observation" |

## 3. Logo

The mark is a **price trend line whose tip grows into a sprout**: market + farm in one stroke.

| File | Use |
|---|---|
| `public/brand/logo-mark.svg` | Primary mark on its midnight tile (app icon, favicon, avatars) |
| `public/brand/logo-mark-mono.svg` | Single-colour mark (`currentColor`) for print or one-colour contexts |
| `src/components/Logo.tsx` | `LogoMark` and `BrandHeader` for use in the app |

Rules:
- Clear space: at least ¼ of the mark's width on every side.
- Minimum size: 20 px (tile), 16 px (mono).
- Don't recolour the gradient, rotate, stretch, add shadows or place the tile on a busy photo.
- Wordmark: "Krishi Bazar AI" in Space Grotesk Bold / "কৃষি বাজার এআই" in Noto Sans Bengali Bold, set to the right of the mark.

## 4. Colour

Dark is the brand default ("Aurora"); light is the daylight theme for outdoor reading.

| Role | Token | Dark | Light | Meaning |
|---|---|---|---|---|
| Canvas | `--background` | `#060A13` midnight | `#F3F6FB` mist | Calm base |
| Primary | `--primary` | `#34D399` emerald | `#059669` | Growth, the main action |
| Secondary | `--primary-2` | `#22D3EE` cyan | `#0891B2` | Data, sky, water |
| Accent | `--accent` | `#A78BFA` violet | `#7C3AED` | Intelligence (sparingly) |
| Text | `--foreground` | `#EEF3FB` | `#0B1220` | |
| Muted text | `--muted` | `#93A1B8` | `#526179` | ≥ 4.5:1 on its background |

**Brand gradient:** emerald → cyan (120°), used for the primary button, the logo and headline accents only.

**Signal colours** (never used for decoration, always with icon + word):

| Flag | Token | Meaning |
|---|---|---|
| Green ↗ | `--flag-green` | Profitable / price rising |
| Red ↘ | `--flag-red` | Loss risk / price falling |
| Orange – | `--flag-orange` | Stable / uncertain |

## 5. Typography

| Use | Font | Notes |
|---|---|---|
| Headings, big numbers | **Space Grotesk** 500–700 | Tight tracking (−2%), tabular numerals |
| Body, UI (Latin) | **Inter** | 16 px base, never below 12 px |
| Bangla (all text) | **Noto Sans Bengali** 400/600/700 | Falls in automatically for Bengali script |

## 6. Shape, icons and motion

- **Radius:** controls 14 px, cards 20 px, hero/nav 24 px, chips full (`--radius-*`).
- **Surfaces:** frosted glass cards with a 1 px hairline border; one "glow" card per screen at most.
- **Icons:** Lucide, 2 px stroke, three sizes (16 / 20 / 24 px). One family everywhere.
  Commodity emoji (🍚 🥔 🧅) are product pictures, shown only inside the square item tile.
- **Touch targets:** minimum 44 × 44 px.
- **Motion:** 120 ms press, 200 ms state change, 350 ms entrance, ease-out; all motion is
  disabled under `prefers-reduced-motion`.

## 7. Token layers

```
Primitive  --emerald-400, --midnight-950, --radius-lg, --dur-base   (raw values)
   ↓
Semantic   --primary, --background, --flag-green, --muted          (per theme)
   ↓
Component  --button-radius, --card-radius, --control-min-height     (per component)
```

Components use semantic or component tokens only — never a raw hex.

## 8. Marketing assets

Sources and exports live in `marketing/` (HTML → PNG at exact platform sizes):
Facebook cover 820×312, square post 1080×1080, link preview 1200×630.
Keep one message and one call to action per asset; do not state accuracy percentages in ads.
