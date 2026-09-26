import math

import numpy as np
from fastapi.testclient import TestClient

from api.index import app, conformal_quantile, forecast_series, prepare_series


def _months(n, start_year=2015):
    return [f"{start_year + i // 12}-{i % 12 + 1:02d}" for i in range(n)]


def test_prepare_series_interpolates_short_gaps_and_cuts_long_ones():
    months = ["2020-01", "2020-02", "2020-04", "2021-06", "2021-07", "2021-08"]
    start, y = prepare_series(months, [10, 10, 12, 20, 21, 22])
    # Gap of 14 months cuts the series: only the last run remains.
    assert len(y) == 3
    assert math.isclose(math.exp(y[0]), 20)


def test_conformal_quantile_rank():
    res = np.arange(1, 40, dtype=float)  # 39 points
    # ceil(40 * 0.95) = 38 -> 38th smallest = 38
    assert conformal_quantile(res, 0.95) == 38


def test_insufficient_data():
    out = forecast_series(_months(10), [10.0] * 10, [1])
    assert out["ok"] is False


def test_intervals_cover_noisy_random_walk():
    rng = np.random.default_rng(7)
    n = 180
    y = np.exp(np.cumsum(rng.normal(0, 0.04, n)) + math.log(50))
    out = forecast_series(_months(n), y.tolist(), [1, 3, 6])
    assert out["ok"]
    for h in out["horizons"]:
        assert h["lo"] < h["point"] < h["hi"]
        assert h["coverage"] is not None and h["coverage"] >= 0.85


def test_seasonal_model_wins_on_seasonal_series():
    n = 120
    t = np.arange(n)
    y = np.exp(math.log(40) + 0.3 * np.sin(2 * math.pi * t / 12))
    out = forecast_series(_months(n), y.tolist(), [3])
    assert out["model"] in ("seasonal", "seasonal_drift")
    assert out["horizons"][0]["mape"] < 0.02


def test_forecast_endpoint():
    client = TestClient(app)
    body = {"series": [{"key": "x", "months": _months(40), "values": [50 + (i % 5) for i in range(40)]}], "horizons": [1, 2]}
    r = client.post("/api/py/forecast", json=body)
    assert r.status_code == 200
    assert r.json()["results"]["x"]["ok"] is True


def test_untestable_horizons_are_omitted_not_infinite():
    # 23 months cannot be backtested 12 months ahead; that horizon must be
    # dropped rather than returned with an infinite (non-JSON) interval.
    out = forecast_series(_months(23), [50.0 + (i % 7) for i in range(23)], list(range(1, 13)))
    assert out["ok"]
    hs = [h["horizon"] for h in out["horizons"]]
    assert 12 not in hs and 1 in hs
    for h in out["horizons"]:
        assert math.isfinite(h["lo"]) and math.isfinite(h["hi"])
