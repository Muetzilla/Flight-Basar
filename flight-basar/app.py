import os
from datetime import datetime

from flask import Flask, flash, jsonify, redirect, render_template, request, url_for

from weatherapi import weather_bp
from placesapi import places_bp
from util.api import call_flight_api
from util.message_manager import save_message, list_messages


# -------------------------------------------------------------------
# App Setup
# -------------------------------------------------------------------

app = Flask(__name__)

# Secret Key fuer Sessions und flash Messages.
# In einem echten Deployment NICHT hardcoden, sondern via Umgebungsvariable setzen.
# Beispiel (PowerShell):
#   $env:FLASK_SECRET_KEY="irgendein_geheimes_passwort"
app.config["SECRET_KEY"] = os.environ.get("FLASK_SECRET_KEY", "geheim")


# Blueprints registrieren (Modularisierung: Wetter und Orte sind ausgelagert)
app.register_blueprint(weather_bp)
app.register_blueprint(places_bp)


# -------------------------------------------------------------------
# Pages (HTML Rendering)
# -------------------------------------------------------------------

@app.get("/")
def index():
    """Startseite."""
    return render_template("index.html")


@app.get("/help")
def get_help():
    """Hilfeseite."""
    return render_template("help.html")


@app.get("/agb")
def get_agb():
    """AGB Seite."""
    return render_template("agb.html")


@app.get("/kontakt")
def get_kontakt():
    """Kontakt Formular Seite."""
    return render_template("kontakt.html")


@app.get("/footer")
def get_footer():
    """
    Footer als eigene Route.
    Normalerweise wird der Footer per Include gerendert, diese Route ist optional.
    """
    return render_template("footer.html")


@app.get("/messages")
def messages():
    """Zeigt gespeicherte Kontakt Nachrichten an."""
    msgs = list_messages()
    return render_template("messages.html", msgs=msgs)


# -------------------------------------------------------------------
# APIs (JSON Responses)
# -------------------------------------------------------------------

@app.get("/flights/<departure_destination>/<arrival_destination>")
def get_flights(departure_destination: str, arrival_destination: str):
    """
    API Endpoint fuer Flugsuche.
    Gibt eine JSON Liste zurueck oder eine Fehlermeldung mit Status Code.
    """
    try:
        # Limitiert Anzahl Resultate (hier fix 10)
        flights = call_flight_api(departure_destination, arrival_destination, 10)
        return jsonify(flights)

    except Exception as exc:
        # 502 bedeutet: Upstream Service (hier Flight API) hat ein Problem
        return jsonify({
            "error": "Flight API nicht erreichbar",
            "details": str(exc)
        }), 502


@app.get("/time")
def api_time():
    """Liefert die Serverzeit als JSON (wird z B im Footer angezeigt)."""
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return jsonify({"server_time": now})


# -------------------------------------------------------------------
# Forms (POST Handling)
# -------------------------------------------------------------------

@app.post("/kontakt")
def post_kontakt():
    """
    Empfaengt das Kontakt Formular, speichert die Message und leitet zurueck.
    """
    name = (request.form.get("name") or "").strip()
    email = (request.form.get("email") or "").strip()
    nachricht = (request.form.get("nachricht") or "").strip()

    # Minimal Validierung (verhindert leere Eintraege)
    if not name or not email or not nachricht:
        flash("Bitte fuelle alle Felder aus.", "error")
        return redirect(url_for("get_kontakt")), 400

    try:
        save_message(name, email, nachricht)
    except Exception:
        # Keine internen Details an Nutzer zeigen
        flash("Speichern fehlgeschlagen. Bitte versuche es spaeter erneut.", "error")
        return redirect(url_for("get_kontakt")), 500

    flash("Danke fuer deine Nachricht!", "success")
    return redirect(url_for("get_kontakt"))


# -------------------------------------------------------------------
# Local Development Start
# -------------------------------------------------------------------

if __name__ == "__main__":
    app.run(debug=True,port=5005)
