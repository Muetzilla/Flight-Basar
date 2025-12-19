from flask import Flask, render_template, jsonify

app = Flask(__name__)


@app.get("/")
def index():
    return render_template("index.html")

@app.get("/flights/<start>/<destination>")
def get_flights(start, destination):
    return jsonify({"start": start, "destination": destination})

if __name__ == "__main__":
    app.run(debug=True)
