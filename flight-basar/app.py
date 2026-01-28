import os
import json
from datetime import datetime
import hashlib
from flask import Flask, render_template, request, flash, redirect, url_for
from flask import Flask, render_template, jsonify

from weatherapi import weather_bp
from placesapi import places_bp
from util.api import call_flight_api

app = Flask(__name__)
app.secret_key = "geheim"

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


@app.get("/help")
def get_help():
    return render_template("help.html")

@app.get("/agb")
def get_agb():
    return render_template("agb.html")

@app.get("/kontakt")
def get_kontakt():
    return render_template("kontakt.html")

@app.get("/footer")
def get_footer():
    return render_template("footer.html")

@app.post("/kontakt")
def post_kontakt():
    name = request.form.get("name")
    email = request.form.get("email")
    nachricht = request.form.get("nachricht")

    timestamp = datetime.now().isoformat()

    data = {
        "name": name,
        "email": email,
        "nachricht": nachricht,
        "timestamp": timestamp
    }

    hash_object = hashlib.md5(timestamp.encode())
    hex_hash = hash_object.hexdigest()

    if not os.path.exists("db"):
        os.makedirs("db")

    file_path = os.path.join("db", f"{hex_hash}.json")
    with open(file_path, "w") as f:
        json.dump(data, f, indent=4)


    flash("Danke für deine Nachricht!", "success")
    return redirect(url_for("get_kontakt"))


@app.route("/time", methods=["GET"])
def api_time():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return jsonify({"server_time": now})


if __name__ == "__main__":
    app.run(debug=True)
