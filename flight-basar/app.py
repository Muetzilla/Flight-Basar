import os
from flask import Flask, render_template

from weatherapi import weather_bp, get_cities
from placesapi import places_bp

app = Flask(__name__)

app.register_blueprint(weather_bp)
app.register_blueprint(places_bp)

@app.get("/")
def index():
    return render_template(
        "index.html",
        cities=get_cities(),
        geoapify_key=os.environ.get("GEOAPIFY_API_KEY", "")
    )

if __name__ == "__main__":
    app.run(debug=True)
