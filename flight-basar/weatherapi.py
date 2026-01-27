from flask import Blueprint, request, jsonify
import time
import requests

weather_bp = Blueprint("weather_bp", __name__)

WEATHER_CODE_TEXT = {
    0: "Klar",
    1: "Überwiegend klar",
    2: "Teilweise bewölkt",
    3: "Bewölkt",
    45: "Nebel",
    48: "Nebel mit Raureif",
    51: "Leichter Nieselregen",
    53: "Mässiger Nieselregen",
    55: "Starker Nieselregen",
    61: "Leichter Regen",
    63: "Mässiger Regen",
    65: "Starker Regen",
    71: "Leichter Schneefall",
    73: "Mässiger Schneefall",
    75: "Starker Schneefall",
    80: "Leichte Regenschauer",
    81: "Mässige Regenschauer",
    82: "Starke Regenschauer",
    95: "Gewitter",
}

CACHE_TTL_SECONDS = 600
_cache = {}  # cache_key -> (timestamp, payload)


def _fetch_weather(lat: float, lon: float) -> dict:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,weather_code,wind_speed_10m",
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        "forecast_days": 5,
        "timezone": "auto",
    }
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    return r.json()


@weather_bp.get("/api/weather")
def api_weather():
    lat = request.args.get("lat", type=float)
    lon = request.args.get("lon", type=float)
    label = request.args.get("label", "") or "Ort"

    if lat is None or lon is None:
        return jsonify({"error": "Bitte lat und lon als Query Params senden"}), 400

    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return jsonify({"error": "Ungültige Koordinaten"}), 400

    cache_key = f"{lat:.4f},{lon:.4f}"
    now = time.time()

    cached = _cache.get(cache_key)
    if cached:
        ts, payload = cached
        if now - ts < CACHE_TTL_SECONDS:
            return jsonify(payload)

    try:
        raw = _fetch_weather(lat, lon)
    except requests.RequestException:
        return jsonify({"error": "Wetterdienst nicht erreichbar"}), 502

    current = raw.get("current", {})
    code = current.get("weather_code")

    daily = raw.get("daily", {})
    times = daily.get("time", [])
    tmax = daily.get("temperature_2m_max", [])
    tmin = daily.get("temperature_2m_min", [])
    dcode = daily.get("weather_code", [])
    precip = daily.get("precipitation_sum", [])

    forecast = []
    for i in range(min(len(times), len(tmax), len(tmin), len(dcode))):
        code_i = dcode[i]
        forecast.append({
            "date": times[i],
            "tmax": tmax[i],
            "tmin": tmin[i],
            "weather_code": code_i,
            "weather_text": WEATHER_CODE_TEXT.get(code_i, "Unbekannt"),
            "precipitation_sum": precip[i] if i < len(precip) else None,
        })

    payload = {
        "label": label,
        "lat": lat,
        "lon": lon,
        "temperature": current.get("temperature_2m"),
        "wind": current.get("wind_speed_10m"),
        "weather_code": code,
        "weather_text": WEATHER_CODE_TEXT.get(code, "Unbekannt"),
        "time": current.get("time"),
        "forecast": forecast,
    }

    _cache[cache_key] = (now, payload)
    return jsonify(payload)
