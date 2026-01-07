import requests
import os
from dotenv import load_dotenv
from datetime import datetime


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

    r = requests.get(url, params=params)
    r.raise_for_status()

    response_data = r.json()
    flights_data = response_data.get("data", [])
    return filter_necessary_infos(flights_data)

def format_time(iso_str: str) -> str:
    return datetime.fromisoformat(iso_str.replace("Z", "+00:00")).strftime("%H:%M")

def filter_necessary_infos(flights: list[dict]) -> list[dict]:
    simplified = []
    print("Filtering necessary infos...")

    for f in flights:
        simplified.append({
            "from": f["departure"]["airport"],
            "to": f["arrival"]["airport"],
            "airline": f["airline"]["name"],
            "flight": f["flight"]["iata"],
            "departureTime": format_time(f["departure"]["scheduled"]),
            "arrivalTime": format_time(f["arrival"]["scheduled"]),
        })

    return simplified