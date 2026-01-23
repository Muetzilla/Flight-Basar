import os
from flask import Flask, render_template, jsonify

from weatherapi import weather_bp
from placesapi import places_bp
from util.api import call_flight_api

app = Flask(__name__)

app.register_blueprint(weather_bp)
app.register_blueprint(places_bp)


@app.get("/")
def index():
    geoapify_key = os.getenv("GEOAPIFY_API_KEY", "")
    return render_template(
        "index.html",
        geoapify_key=geoapify_key
    )


@app.get("/flights/<departure_destination>/<arrival_destination>")
def get_flights(departure_destination, arrival_destination):
    try:
        flights = call_flight_api(departure_destination, arrival_destination, 10)
        return jsonify(flights)

    except Exception as e:
        return jsonify({"error": "Flight API nicht erreichbar", "details": str(e)}), 502


if __name__ == "__main__":
    app.run(debug=True)
