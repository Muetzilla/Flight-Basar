from flask import Flask, render_template, jsonify
from util.api import call_flight_api
app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")

@app.get("/flights/<departure_destination>/<arrival_destination>")
def get_flights(departure_destination, arrival_destination):
    flights = call_flight_api(departure_destination, arrival_destination, 10)
    print(flights)
    return flights

if __name__ == "__main__":
    app.run(debug=True)
