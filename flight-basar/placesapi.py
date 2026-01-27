import os
import requests
from functools import lru_cache
from flask import Blueprint, request, jsonify

places_bp = Blueprint("places", __name__)

DEFAULT_CATEGORIES = "tourism.sights,tourism.attraction"


@lru_cache(maxsize=256)
def geocode_city(city: str, api_key: str, countrycode: str = ""):
    url = "https://api.geoapify.com/v1/geocode/search"
    params = {
        "text": city,
        "type": "city",
        "limit": 1,
        "format": "json",
        "apiKey": api_key,
    }

    if countrycode:
        params["filter"] = f"countrycode:{countrycode.lower()}"

    r = requests.get(url, params=params, timeout=10)
    if r.status_code != 200:
        raise RuntimeError(f"Geoapify Geocoding Fehler: {r.status_code} {r.text}")

    data = r.json()
    results = data.get("results", [])
    if not results:
        return None

    first = results[0]
    return {
        "lat": first.get("lat"),
        "lon": first.get("lon"),
        "formatted": first.get("formatted", ""),
        "country": first.get("country", ""),
        "city": first.get("city", ""),
    }


@places_bp.get("/api/places")
def get_places():
    city = (request.args.get("city") or "Zürich").strip()
    country = (request.args.get("country") or "").strip()
    categories = (request.args.get("categories") or DEFAULT_CATEGORIES).strip()

    try:
        radius = int(request.args.get("radius") or 6000)
    except ValueError:
        radius = 6000

    try:
        limit = int(request.args.get("limit") or 12)
    except ValueError:
        limit = 12

    api_key = os.environ.get("GEOAPIFY_API_KEY")
    if not api_key:
        return jsonify({"error": "GEOAPIFY_API_KEY fehlt (Environment Variable)."}), 500

    try:
        coords = geocode_city(city, api_key, countrycode=country)
        if not coords:
            return jsonify({
                "error": "Stadt nicht gefunden",
                "city": city,
                "hint": "Probiere zB 'Paris' oder nutze country=fr"
            }), 404

        lat = coords["lat"]
        lon = coords["lon"]

        if lat is None or lon is None:
            return jsonify({"error": "Geocoding liefert keine gültigen Koordinaten"}), 502

    except Exception as e:
        return jsonify({"error": "City Geocoding fehlgeschlagen", "details": str(e)}), 502

    url = "https://api.geoapify.com/v2/places"
    params = {
        "categories": categories,
        "filter": f"circle:{lon},{lat},{radius}",
        "bias": f"proximity:{lon},{lat}",
        "limit": limit,
        "lang": "de",
        "apiKey": api_key,
    }

    try:
        r = requests.get(url, params=params, timeout=10)
        if r.status_code != 200:
            return jsonify({"error": "Geoapify Places Fehler", "status": r.status_code, "details": r.text}), 502

        data = r.json()

    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Geoapify Places Request fehlgeschlagen", "details": str(e)}), 502

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
