"""Builds the marketing HTML sources (run from the repo root: python marketing/build.py).

Each asset is a self-contained HTML page at an exact platform size; export to
PNG with a headless browser (see marketing/README.md).
"""

from pathlib import Path

HERE = Path(__file__).parent

CSS = """
/* Shared styles for marketing assets (matches docs/brand-guidelines.md). */
@import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;600;700&family=Noto+Sans+Bengali:wght@400;600;700&display=swap");
* { box-sizing: border-box; margin: 0; }
html, body { width: 100%; height: 100%; }
body {
  font-family: "Inter", "Noto Sans Bengali", sans-serif;
  color: #eef3fb;
  background:
    radial-gradient(45% 60% at 12% 15%, rgba(16,185,129,.38), transparent 70%),
    radial-gradient(40% 55% at 88% 8%, rgba(34,211,238,.28), transparent 70%),
    radial-gradient(50% 55% at 70% 95%, rgba(139,92,246,.26), transparent 72%),
    #060a13;
  overflow: hidden;
}
.display { font-family: "Space Grotesk", "Noto Sans Bengali", sans-serif; font-weight: 700; letter-spacing: -0.02em; line-height: 1.12; }
.grad { background: linear-gradient(120deg, #34d399, #22d3ee 60%, #a78bfa); -webkit-background-clip: text; background-clip: text; color: transparent; }
.muted { color: #a9b6cb; }
.brand { display: flex; align-items: center; gap: .55em; font-family: "Space Grotesk", sans-serif; font-weight: 700; }
.brand img { height: 1.9em; width: 1.9em; }
.chips { display: flex; flex-wrap: wrap; gap: .5em; }
.chip { padding: .45em .9em; border-radius: 999px; border: 1px solid rgba(255,255,255,.16); background: rgba(255,255,255,.06); font-weight: 600; white-space: nowrap; }
.cta { display: inline-flex; align-items: center; gap: .4em; padding: .7em 1.3em; border-radius: 1em; font-weight: 700; color: #03140e; background: linear-gradient(120deg, #34d399, #22d3ee); box-shadow: 0 0 0 1px rgba(52,211,153,.4), 0 14px 40px -12px rgba(34,211,238,.6); }
.glass { background: rgba(255,255,255,.055); border: 1px solid rgba(255,255,255,.12); border-radius: 1.2em; }
.g { color: #4ade80; } .r { color: #f87171; } .o { color: #fbbf24; }
.dot { display: inline-block; width: .6em; height: .6em; border-radius: 50%; background: currentColor; }

/* Phone mock-up built in CSS */
.phone { border-radius: 2.2em; border: .35em solid #1b2536; background: #060a13; padding: .9em; box-shadow: 0 40px 90px -30px rgba(0,0,0,.9), 0 0 0 1px rgba(255,255,255,.08); display: flex; flex-direction: column; gap: .6em; }
.phone .brief { border-radius: 1em; padding: .8em; border: 1px solid transparent; background: linear-gradient(#0e1524,#0e1524) padding-box, linear-gradient(135deg,#34d399,#22d3ee,#a78bfa) border-box; }
.phone .brief small { letter-spacing: .08em; color: #93a1b8; font-weight: 700; font-size: .68em; }
.phone .brief p { font-weight: 600; font-size: .8em; margin-top: .45em; line-height: 1.35; }
.phone .btn { margin-top: .6em; text-align: center; padding: .55em; border-radius: .8em; font-weight: 700; font-size: .78em; color: #03140e; background: linear-gradient(120deg,#34d399,#22d3ee); }
.phone .wx { border-radius: 1em; padding: .8em; background: linear-gradient(160deg,#0f4f4a,#0a1a2f); border: 1px solid rgba(255,255,255,.12); display: flex; justify-content: space-between; align-items: center; }
.phone .wx b { font-family: "Space Grotesk", "Noto Sans Bengali", sans-serif; font-size: 2.2em; line-height: 1.1; }
.phone .row { display: flex; justify-content: space-between; align-items: center; padding: .55em .7em; font-size: .78em; font-weight: 600; }
.phone .row + .row { border-top: 1px solid rgba(255,255,255,.08); }
.pill { padding: .15em .6em; border-radius: 999px; font-weight: 700; font-size: .9em; }
.pill.g { background: rgba(74,222,128,.14); } .pill.r { background: rgba(248,113,113,.14); } .pill.o { background: rgba(251,191,36,.14); }
"""

LOGO = '<img src="../public/brand/logo-mark.svg" alt="">'
FLAGS = '<span class="chip"><span class="g dot"></span> <span class="r dot"></span> <span class="o dot"></span> লাভ-ক্ষতির সংকেত</span>'

# A simplified Home screen, with the kind of content the real app shows.
PHONE = """<div class="phone">
  <div class="brief"><small>আজকের সারসংক্ষেপ</small>
    <p>আজ বৃষ্টির সম্ভাবনা বেশি — স্প্রে পিছিয়ে দিন।</p>
    <p>এই সপ্তাহে শসার দাম বেড়েছে।</p>
    <div class="btn">আজকের ৩টি ট্যাপ দিন</div></div>
  <div class="wx"><div><div class="muted" style="font-size:.7em">বগুড়া</div><b>২৬°</b></div><div class="muted" style="font-size:.8em;text-align:right">পরিষ্কার আকাশ<br>বৃষ্টি ৮১%</div></div>
  <div class="glass">
    <div class="row"><span>শসা</span><span class="pill g">+৭.৭%</span></div>
    <div class="row"><span>পেঁয়াজ</span><span class="pill g">+৫.৩%</span></div>
    <div class="row"><span>মসুর ডাল</span><span class="pill r">−৩.৮%</span></div>
    <div class="row"><span>চাল</span><span class="pill o">০.০%</span></div>
  </div>
</div>"""


def page(lang: str, comment: str, body_style: str, inner: str) -> str:
    return f'<!doctype html><html lang="{lang}"><meta charset="utf-8"><link rel="stylesheet" href="brand.css">\n<!-- {comment} -->\n<body style="{body_style}">\n{inner}\n</body></html>\n'


ASSETS = {
    "facebook-cover": page(
        "bn",
        "Facebook cover 820x312. Key content sits in the central ~640px (mobile crop).",
        "display:flex;align-items:center;justify-content:center;gap:44px;padding:0 90px;font-size:15px",
        f"""  <div style="flex:1;min-width:0">
    <div class="brand" style="font-size:17px">{LOGO}Krishi Bazar AI</div>
    <h1 class="display" style="font-size:36px;margin-top:12px">আবহাওয়া, বাজারদর ও <span class="grad">পূর্বাভাস</span> — এক অ্যাপে</h1>
    <p class="muted" style="margin-top:8px;font-size:15px">কৃষক ও ব্যবসায়ীদের জন্য। কিছু লিখতে হবে না, শুধু ট্যাপ।</p>
    <div class="chips" style="margin-top:12px;font-size:12.5px"><span class="chip">৫ বছরের দামের ইতিহাস</span><span class="chip">প্রতিদিন স্বয়ংক্রিয় হালনাগাদ</span>{FLAGS}</div>
  </div>
  <div style="width:210px;font-size:11px;transform:rotate(3deg) translateY(40px)">{PHONE}</div>""",
    ),
    "social-post": page(
        "bn",
        "Square post 1080x1080 (Facebook / Instagram).",
        "display:flex;flex-direction:column;padding:72px;font-size:30px",
        f"""  <div class="brand" style="font-size:34px">{LOGO}Krishi Bazar AI</div>
  <h1 class="display" style="font-size:88px;margin-top:40px">কী চাষ করবেন?<br>কী <span class="grad">মজুত</span> করবেন?</h1>
  <p class="muted" style="margin-top:22px;font-size:34px;max-width:600px">আবহাওয়া, প্রতিদিনের বাজারদর আর পূর্বাভাস দেখে সিদ্ধান্ত নিন।</p>
  <div style="display:flex;align-items:flex-end;justify-content:space-between;margin-top:auto">
    <div>
      <div class="chips" style="font-size:25px;flex-direction:column;align-items:flex-start"><span class="chip">কিছু লিখতে হবে না</span><span class="chip">বাংলায়, বিনামূল্যে</span>{FLAGS}</div>
      <div class="cta" style="margin-top:34px;font-size:30px">farmer-and-stocks.vercel.app</div>
    </div>
    <div style="width:400px;font-size:21px;transform:rotate(4deg) translate(10px,60px)">{PHONE}</div>
  </div>""",
    ),
    "link-preview": page(
        "en",
        "Link preview / Open Graph 1200x630.",
        "display:flex;align-items:center;gap:60px;padding:0 80px;font-size:22px",
        f"""  <div style="flex:1;min-width:0">
    <div class="brand" style="font-size:30px">{LOGO}Krishi Bazar AI</div>
    <h1 class="display" style="font-size:62px;margin-top:26px">Weather, market prices and <span class="grad">forecasts</span> for Bangladesh</h1>
    <p class="muted" style="margin-top:18px;font-size:27px">কৃষক ও ব্যবসায়ীদের জন্য — কী চাষ করবেন, কী মজুত করবেন।</p>
    <div class="chips" style="margin-top:26px;font-size:20px"><span class="chip">Tap-only · বাংলা + English</span><span class="chip">Daily prices</span><span class="chip">Honest forecast ranges</span></div>
  </div>
  <div style="width:330px;font-size:17px;transform:rotate(3deg) translateY(60px)">{PHONE}</div>""",
    ),
}

(HERE / "brand.css").write_text(CSS.lstrip(), encoding="utf-8")
for name, html in ASSETS.items():
    (HERE / f"{name}.html").write_text(html, encoding="utf-8")
print("built", ", ".join(ASSETS))
