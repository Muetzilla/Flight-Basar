from flask import Blueprint, request, jsonify
import time
import requests

weather_bp = Blueprint("weather_bp", __name__)

CITY_COORDS = {
    "Zürich": (47.3769, 8.5417),
    "Basel": (47.5596, 7.5886),
    "Bern": (46.9480, 7.4474),
    "Genf": (46.2044, 6.1432),
    "Lausanne": (46.5197, 6.6323),
    "Luzern": (47.0502, 8.3093),
    "St. Gallen": (47.4245, 9.3767),
    "Lugano": (46.0037, 8.9511),
}

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

CACHE_TTL_SECONDS = 600  # 10 Minuten
_cache = {}  # city -> (timestamp, payload)


def get_cities():
    return list(CITY_COORDS.keys())


def _fetch_weather(lat: float, lon: float) -> dict:
    url = "https://api.open-meteo.com/v1/forecast"
    params = {
        "latitude": lat,
        "longitude": lon,

        # aktuell
        "current": "temperature_2m,weather_code,wind_speed_10m",

        # nächste 5 Tage (inkl. heute)
        "daily": "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum",
        "forecast_days": 5,

        # nötig sobald daily genutzt wird
        "timezone": "auto",
    }
    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    return r.json()



@weather_bp.get("/api/weather")
def api_weather():
    city = request.args.get("city", "")

    if city not in CITY_COORDS:
        return jsonify({"error": "Unbekannte Stadt"}), 400

    now = time.time()
    cached = _cache.get(city)
    if cached:
        ts, payload = cached
        if now - ts < CACHE_TTL_SECONDS:
            return jsonify(payload)

    lat, lon = CITY_COORDS[city]

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
            "date": times[i],  # ISO Datum
            "tmax": tmax[i],
            "tmin": tmin[i],
            "weather_code": code_i,
            "weather_text": WEATHER_CODE_TEXT.get(code_i, "Unbekannt"),
            "precipitation_sum": precip[i] if i < len(precip) else None,
        })

    payload = {
        "city": city,
        "temperature": current.get("temperature_2m"),
        "wind": current.get("wind_speed_10m"),
        "weather_code": code,
        "weather_text": WEATHER_CODE_TEXT.get(code, "Unbekannt"),
        "time": current.get("time"),
        "forecast": forecast,
    }

    _cache[city] = (now, payload)
    return jsonify(payload)
