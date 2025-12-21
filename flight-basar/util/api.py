import requests
import os
from dotenv import load_dotenv

BASE_URL = "http://api.aviationstack.com/v1"
API_KEY = os.getenv("AVIATIONSTACK_API_KEY")
load_dotenv()

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

    return r.json().get("data", [])