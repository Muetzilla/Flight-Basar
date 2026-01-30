import os
import json
from datetime import datetime
import hashlib
from flask import Flask, render_template, request, flash, redirect, url_for
from flask import Flask, render_template, jsonify

from weatherapi import weather_bp
from placesapi import places_bp
from util.api import call_flight_api
from util.message_manager import save_message, list_messages

app = Flask(__name__)
app.secret_key = "geheim"

app.register_blueprint(weather_bp)
app.register_blueprint(places_bp)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_DIR = os.path.join(BASE_DIR, "db")

@app.get("/")
def index():
    return render_template("index.html")

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

    save_message(name, email, nachricht)

    flash("Danke für deine Nachricht!", "success")
    return redirect(url_for("get_kontakt"))

@app.route("/time", methods=["GET"])
def api_time():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return jsonify({"server_time": now})

@app.route("/messages", methods=["GET"])
def messages():
    msgs = list_messages()
    return render_template("messages.html", msgs=msgs)

if __name__ == "__main__":
    app.run(debug=True, port=5005)
