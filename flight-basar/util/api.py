import os
import requests
from dotenv import load_dotenv

load_dotenv()

BASE_URL = "http://api.aviationstack.com/v1"
API_KEY = os.getenv("AVIATIONSTACK_API_KEY")


def call_flight_api(departure_destination: str, arrival_destination: str, limit: int = 10):
    if not API_KEY:
        raise RuntimeError("AVIATIONSTACK_API_KEY ist nicht gesetzt")

    url = f"{BASE_URL}/flights"
    params = {
        "access_key": API_KEY,
        "dep_iata": departure_destination,
        "arr_iata": arrival_destination,
        "limit": limit
    }

    r = requests.get(url, params=params, timeout=15)
    r.raise_for_status()

    response_data = r.json()

    # Aviationstack liefert manchmal "error" im JSON, obwohl HTTP 200
    if isinstance(response_data, dict) and response_data.get("error"):
        raise RuntimeError(str(response_data.get("error")))

    flights_data = response_data.get("data", [])
    return filter_necessary_infos(flights_data)


def filter_necessary_infos(flights: list[dict]) -> list[dict]:
    simplified = []

    for f in flights:
        simplified.append({
            "departure": f.get("departure", {}),
            "arrival": f.get("arrival", {}),
            "airline": f.get("airline", {}),
            "flight": f.get("flight", {}),
            "flight_date": f.get("flight_date"),
        })

    # optional: neueste zuerst
    simplified.reverse()
    return simplified
