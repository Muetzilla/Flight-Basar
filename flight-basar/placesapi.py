# placesapi.py
import os
import requests
from flask import Blueprint, request, jsonify

places_bp = Blueprint("places", __name__)

# Nimm hier dieselbe City Liste wie beim Wetter
CITY_COORDS = {
    "Zürich": {"lat": 47.3769, "lon": 8.5417},
    "Basel": {"lat": 47.5596, "lon": 7.5886},
    "Bern": {"lat": 46.9480, "lon": 7.4474},
    "Genf": {"lat": 46.2044, "lon": 6.1432},
    "Luzern": {"lat": 47.0502, "lon": 8.3093},
}

# Kategorien für “Sehenswürdigkeiten”
# Geoapify Kategorien sind hierarchisch; tourism.* ist genau dafür gedacht. :contentReference[oaicite:1]{index=1}
DEFAULT_CATEGORIES = "tourism.sights,tourism.attraction"

@places_bp.get("/api/places")
def get_places():
    city = request.args.get("city", "Zürich")
    coords = CITY_COORDS.get(city, CITY_COORDS["Zürich"])
    lat = coords["lat"]
    lon = coords["lon"]

    api_key = os.environ.get("GEOAPIFY_API_KEY")
    if not api_key:
        return jsonify({"error": "GEOAPIFY_API_KEY fehlt (Environment Variable)."}), 500

    # Places API Endpoint :contentReference[oaicite:2]{index=2}
    url = "https://api.geoapify.com/v2/places"

    # Achtung: circle Filter erwartet lon,lat,radiusMeters :contentReference[oaicite:3]{index=3}
    params = {
        "categories": DEFAULT_CATEGORIES,
        "filter": f"circle:{lon},{lat},6000",
        "bias": f"proximity:{lon},{lat}",
        "limit": 12,
        "lang": "de",
        "apiKey": api_key,
    }

    r = requests.get(url, params=params, timeout=10)
    r.raise_for_status()
    data = r.json()  # GeoJSON FeatureCollection :contentReference[oaicite:4]{index=4}

    places = []
    for f in data.get("features", []):
        p = f.get("properties", {})
        places.append({
            "name": p.get("name") or "Ohne Name",
            "formatted": p.get("formatted") or "",
            "lat": p.get("lat"),
            "lon": p.get("lon"),
            "distance": p.get("distance"),
        })

    return jsonify({
        "city": city,
        "center": {"lat": lat, "lon": lon},
        "places": places
    })
