"""Forecasting + TCB ingest microservice (FastAPI on Vercel Python functions).

Routed by next.config.ts: /api/py/* -> this app (production) or
http://127.0.0.1:8000/api/py/* (local dev via `npm run dev`).

Kept dependency-light on purpose (fastapi, numpy, openpyxl) so the bundle
stays far below Vercel's function size limit.
"""

from __future__ import annotations

import io
import math
import os
import re
import ssl
import urllib.request
from datetime import date, datetime

import certifi
import numpy as np
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(docs_url="/api/py/docs", openapi_url="/api/py/openapi.json")

USER_AGENT = "Mozilla/5.0 (compatible; farmer-and-stocks/1.0; +https://github.com/sps1590/farmer_and_stocks)"


def _check_secret(secret: str | None) -> None:
    expected = os.environ.get("CRON_SECRET")
    # No secret configured = local dev; production always sets CRON_SECRET.
    if expected and secret != expected:
        raise HTTPException(status_code=401, detail="unauthorized")


@app.get("/api/py/health")
def health():
    return {"ok": True, "numpy": np.__version__}


# ---------------------------------------------------------------------------
# Forecasting
# ---------------------------------------------------------------------------

MIN_POINTS = 18          # below this, no forecast is produced at all
SEASONAL_MIN_POINTS = 30  # seasonal model needs >= ~2.5 years
QUANTILES = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95]


def _month_index(ym: str) -> int:
    y, m = ym.split("-")[:2]
    return int(y) * 12 + int(m) - 1


def _index_to_month(i: int) -> str:
    return f"{i // 12:04d}-{i % 12 + 1:02d}"


def prepare_series(months: list[str], values: list[float]) -> tuple[int, np.ndarray]:
    """Return (start_month_index, log-values) for the last contiguous stretch.

    Gaps of up to 3 months are linearly interpolated; a longer gap cuts the
    series so models only see an unbroken run of months.
    """
    pts = sorted(
        (_month_index(m), float(v)) for m, v in zip(months, values) if v is not None and v > 0
    )
    if not pts:
        return 0, np.array([])
    # Average duplicates of the same month.
    merged: dict[int, list[float]] = {}
    for i, v in pts:
        merged.setdefault(i, []).append(v)
    idx = sorted(merged)
    vals = [float(np.median(merged[i])) for i in idx]

    start = 0
    for k in range(1, len(idx)):
        if idx[k] - idx[k - 1] > 4:
            start = k
    idx, vals = idx[start:], vals[start:]

    full = np.arange(idx[0], idx[-1] + 1)
    logv = np.interp(full, idx, np.log(vals))
    return idx[0], logv


def _seasonal_profile(y: np.ndarray, start: int) -> np.ndarray:
    """Monthly seasonal offsets (log scale) from a 12-month moving-average detrend."""
    n = len(y)
    if n < 24:
        return np.zeros(12)
    kernel = np.ones(12) / 12
    ma = np.convolve(y, kernel, mode="valid")  # length n-11, aligned to centre ~ +5.5
    offs = [[] for _ in range(12)]
    for k in range(len(ma)):
        t = k + 6
        if t < n:
            offs[(start + t) % 12].append(y[t] - ma[k])
    prof = np.array([np.mean(o) if o else 0.0 for o in offs])
    return prof - prof.mean()


def _predict(model: str, y: np.ndarray, start: int, h: int) -> float:
    last = y[-1]
    if model == "naive":
        return last
    if model == "drift":
        w = y[-25:] if len(y) >= 25 else y
        slope = (w[-1] - w[0]) / max(len(w) - 1, 1)
        return last + 0.5 * slope * h  # damped: prices mean-revert
    if model == "seasonal":
        prof = _seasonal_profile(y, start)
        t_last = start + len(y) - 1
        return last + prof[(t_last + h) % 12] - prof[t_last % 12]
    if model == "seasonal_drift":
        return _predict("seasonal", y, start, h) + _predict("drift", y, start, h) - last
    raise ValueError(model)


def _candidate_models(n: int) -> list[str]:
    if n >= SEASONAL_MIN_POINTS:
        return ["naive", "drift", "seasonal", "seasonal_drift"]
    return ["naive", "drift"]


def _backtest(y: np.ndarray, start: int, model: str, horizons: list[int], origins: list[int]):
    """Residuals r[h] = actual - predicted (log scale) for each rolling origin."""
    res: dict[int, list[tuple[int, float]]] = {h: [] for h in horizons}
    for o in origins:  # o = number of points visible at forecast time
        train = y[:o]
        for h in horizons:
            if o + h - 1 < len(y):
                res[h].append((o, y[o + h - 1] - _predict(model, train, start, h)))
    return res


def conformal_quantile(abs_res: np.ndarray, level: float) -> float:
    """Split-conformal quantile: guarantees >= level coverage for exchangeable errors."""
    n = len(abs_res)
    if n == 0:
        return float("inf")
    k = math.ceil((n + 1) * level)
    if k > n:
        # Too few calibration points for a finite guarantee at this level:
        # fall back to the worst observed error, inflated.
        return float(abs_res.max()) * 1.5
    return float(np.sort(abs_res)[k - 1])


def forecast_series(months: list[str], values: list[float], horizons: list[int], level: float = 0.95) -> dict:
    start, y = prepare_series(months, values)
    n = len(y)
    if n < MIN_POINTS:
        return {"ok": False, "reason": "insufficient_data", "n": int(n)}

    max_h = max(horizons)
    min_train = max(12, min(SEASONAL_MIN_POINTS, n // 2))
    origins = list(range(min_train, n))
    candidates = _candidate_models(n)

    # Model selection on the older 2/3 of origins, evaluation on the newest 1/3.
    split = origins[: max(1, (2 * len(origins)) // 3)]
    holdout = origins[len(split):]

    scores = {}
    for m in candidates:
        r = _backtest(y, start, m, horizons, split)
        errs = [abs(e) for h in horizons for _, e in r[h]]
        scores[m] = float(np.mean(errs)) if errs else float("inf")
    model = min(scores, key=scores.get)

    residuals = _backtest(y, start, model, horizons, origins)

    out_h = []
    last_idx = start + n - 1
    for h in horizons:
        pairs = residuals[h]
        if not pairs:
            # Series too short to have ever been tested this far ahead: no
            # honest interval exists, so this horizon is simply not offered.
            continue
        cal =np.array([abs(e) for o, e in pairs if o in split]) if holdout else np.array([abs(e) for _, e in pairs])
        test = [(o, e) for o, e in pairs if o in holdout]

        # Honest out-of-sample metrics: interval width from calibration origins only,
        # scored on the untouched holdout origins.
        q_cal = conformal_quantile(cal, level)
        coverage = float(np.mean([abs(e) <= q_cal for _, e in test])) if test else None
        mape = None
        direction = None
        if test:
            ape, dir_ok = [], []
            for o, e in test:
                actual = y[o + h - 1]
                pred = actual - e
                ape.append(abs(math.exp(actual) - math.exp(pred)) / math.exp(actual))
                dir_ok.append(np.sign(actual - y[o - 1]) == np.sign(pred - y[o - 1]))
            mape = float(np.mean(ape))
            direction = float(np.mean(dir_ok))

        # Final interval uses every residual we have (bigger calibration set).
        all_abs = np.array([abs(e) for _, e in pairs])
        q = conformal_quantile(all_abs, level)
        point = _predict(model, y, start, h)
        raw = np.array([e for _, e in pairs]) if pairs else np.array([0.0])
        qs = {str(p): float(math.exp(point + np.quantile(raw, p))) for p in QUANTILES}

        out_h.append({
            "horizon": h,
            "target_month": _index_to_month(last_idx + h),
            "point": float(math.exp(point)),
            "lo": float(math.exp(point - q)),
            "hi": float(math.exp(point + q)),
            "quantiles": qs,
            "mape": mape,
            "coverage": coverage,
            "direction_accuracy": direction,
            "n_calibration": int(len(all_abs)),
            "n_test": len(test),
        })

    return {
        "ok": True,
        "model": model,
        "level": level,
        "n": int(n),
        "last_month": _index_to_month(last_idx),
        "last_value": float(math.exp(y[-1])),
        "scores": scores,
        "horizons": out_h,
        "max_horizon": max_h,
    }


class SeriesIn(BaseModel):
    key: str
    months: list[str]
    values: list[float]


class ForecastIn(BaseModel):
    series: list[SeriesIn]
    horizons: list[int] = Field(default_factory=lambda: [1, 2, 3, 4, 5, 6])
    level: float = 0.95


@app.post("/api/py/forecast")
def forecast(body: ForecastIn, x_internal_secret: str | None = Header(default=None)):
    _check_secret(x_internal_secret)
    horizons = sorted({h for h in body.horizons if 1 <= h <= 12}) or [1]
    level = min(max(body.level, 0.5), 0.99)
    results = {}
    for s in body.series:
        try:
            results[s.key] = forecast_series(s.months, s.values, horizons, level)
        except Exception as exc:  # one bad series must not sink the batch
            results[s.key] = {"ok": False, "reason": f"error: {exc}"}
    return {"results": results}


# ---------------------------------------------------------------------------
# TCB (Trading Corporation of Bangladesh) daily Dhaka retail prices
# ---------------------------------------------------------------------------

TCB_LIST_URL = "https://tcb.gov.bd/pages/daily-rmps"
BN_DIGITS = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")


def _ssl_context() -> ssl.SSLContext:
    """Verified TLS context: certifi roots plus intermediates that some Bangladeshi
    government servers fail to send (tcb.gov.bd omits Sectigo DV R36). Browsers and
    Windows fetch missing intermediates automatically; Linux/OpenSSL does not."""
    ctx = ssl.create_default_context(cafile=certifi.where())
    certs_dir = os.path.join(os.path.dirname(__file__), "certs")
    for name in sorted(os.listdir(certs_dir)) if os.path.isdir(certs_dir) else []:
        if name.endswith(".pem"):
            ctx.load_verify_locations(os.path.join(certs_dir, name))
    return ctx


_SSL = _ssl_context()


def _fetch(url: str, timeout: int = 40) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(req, timeout=timeout, context=_SSL) as r:  # noqa: S310 - fixed https hosts
        return r.read()


def tcb_xlsx_links(html: str) -> list[str]:
    links = re.findall(r'href="(https://[^"]+?\.xlsx)"', html)
    seen, out = set(), []
    for link in links:
        if link not in seen:
            seen.add(link)
            out.append(link)
    return out


def _num(v) -> float | None:
    return float(v) if isinstance(v, (int, float)) and not isinstance(v, bool) and v > 0 else None


def parse_tcb_xlsx(data: bytes) -> dict:
    """Parse one TCB sheet.

    Layout: a header row holds the observation dates (today, 1 week ago,
    1 month ago, 1 year ago) at fixed columns; each item row then has the
    min price at that column and the max price one column to the right.
    """
    import openpyxl

    ws = openpyxl.load_workbook(io.BytesIO(data), data_only=True, read_only=True).worksheets[0]
    date_cols: list[tuple[int, str]] = []
    rows = []
    seen = set()
    for row in ws.iter_rows(values_only=True):
        row = list(row)
        if not date_cols:
            found = [(i, c.date().isoformat()) for i, c in enumerate(row) if isinstance(c, datetime)]
            if len(found) >= 2:
                date_cols = found
            continue
        first = str(row[0]).strip() if row and row[0] is not None else ""
        if first.startswith("যে সকল") or first.startswith("মন্তব্য"):
            break  # summary section below repeats rows; stop at the first table
        if not first or len(row) < 4:
            continue
        points = []
        for col, d in date_cols:
            lo = _num(row[col]) if col < len(row) else None
            hi = _num(row[col + 1]) if col + 1 < len(row) else None
            if lo and hi:
                points.append({"date": d, "min": lo, "max": hi})
        if not points:
            continue
        name = re.sub(r"\s+", " ", first)
        unit = re.sub(r"\s+", " ", str(row[1] or "").strip())
        if (name, unit) in seen:
            continue
        seen.add((name, unit))
        rows.append({"name": name, "unit": unit, "points": points})
    return {"date": date_cols[0][1] if date_cols else None, "rows": rows}


@app.get("/api/py/tcb")
def tcb(limit: int = 1, page: int = 1, x_internal_secret: str | None = Header(default=None)):
    """Fetch and parse up to `limit` TCB daily sheets from listing page `page` (10 per page)."""
    _check_secret(x_internal_secret)
    limit = min(max(limit, 1), 10)
    page = min(max(page, 1), 200)
    html = _fetch(f"{TCB_LIST_URL}?page={page}").decode("utf-8", errors="replace")
    all_links = tcb_xlsx_links(html)
    links = all_links[:limit]
    sheets, errors = [], []
    for link in links:
        try:
            parsed = parse_tcb_xlsx(_fetch(link))
            if parsed["date"] and parsed["rows"]:
                parsed["source_url"] = link
                sheets.append(parsed)
        except Exception as exc:
            errors.append(f"{link}: {exc}")
    # "links" lets callers tell "past the last page" (0 files) from a page whose
    # files are one-off reports in another layout (files, but no daily sheets).
    return {"fetched_at": date.today().isoformat(), "links": len(all_links), "sheets": sheets, "errors": errors}
