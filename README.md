# Flight-Basar

Der **Flight-Basar** ist eine kleine Demo-Webanwendung auf Basis von **Flask**.  
Sie ermöglicht es, Flüge zu suchen und ergänzende Informationen rund um ein Reiseziel anzuzeigen.

---

## Funktionen

Der Flight-Basar bietet folgende Funktionen:

- Suche nach Flügen zwischen zwei Flughäfen (externe Flight-API, z. B. Aviationstack)
- Anzeige von aktuellem Wetter und einer 5-Tage-Vorhersage
- Anzeige von Sehenswürdigkeiten und interessanten Orten (POIs) über Geoapify
- Kontaktformular mit Speicherung der Nachrichten als JSON-Dateien

---

## Funktionsweise

### Flugsuche

Auf der Startseite wählen Sie einen **Start-** und **Zielflughafen** aus:

- Flughafendaten stammen aus `static/airports.json`
- Auswahl über Dropdowns mit Live-Filterfunktion

Nach dem Start der Suche passiert im Hintergrund:

1. Das Frontend ruft die Route `/flights/<departure>/<arrival>` auf
2. In `util/api.py` wird die Aviationstack-API angesprochen
3. Die gefundenen Flüge werden im Frontend als Karten dargestellt  
   (Airline, Abflug- und Ankunftszeiten)

### Zusatzinformationen zum Zielort

Zusätzlich zur Flugsuche werden automatisch geladen:

- **Wetter**
  - Aufruf über `weatherapi.py`
  - Anzeige von aktuellem Wetter und 5-Tage-Vorhersage

- **Sehenswürdigkeiten / Places**
  - Aufruf über `placesapi.py`
  - Nutzung der Geoapify-API
  - Anzeige als Liste und auf der Karte

Damit erhalten Sie alle relevanten Reiseinformationen auf einen Blick.

---

## Projektstruktur

Ab Projektwurzel (`project05/`):

```text
README.md

flight-basar/
  app.py                  # Haupt-Flask-App
  requirements.txt        # Python-Abhängigkeiten
  placesapi.py            # Geoapify / Places-Logik
  weatherapi.py           # Wetter-Logik

  db/                     # Gespeicherte Kontakt-Nachrichten
    <hash>.json

  static/
    style.css             # Zentrales Styling
    airports.json         # Flughafen-Daten
    js/
      app.js              # Frontend-Logik
      servertime.js       # Serverzeit im Footer
      util.js             # Hilfsfunktionen

  templates/
    base.html              # Basislayout
    index.html             # Startseite
    help.html              # Hilfe
    agb.html               # AGB
    kontakt.html           # Kontaktformular
    messages.html          # Nachrichtenübersicht
    footer.html
    partials/
      flight_search.html
      places.html
      weather.html

  util/
    api.py                # Flight-API (Aviationstack)
    message_manager.py    # Speichern & Laden von Nachrichten
````

---

## Voraussetzungen

* Python **3.10+**
* Internetverbindung
* API-Keys für:

  * Aviationstack (Flugsuche)
  * Geoapify (Places / Karten)

---

## Installation & Setup

### 1. Repository klonen

```bash
git clone https://github.com/Ergaenzungsfach-Informatik/EFI-HS25-I/tree/development
cd project05
```

### 2. Virtuelle Umgebung erstellen & aktivieren

```bash
python -m venv venv

# Windows
venv\Scripts\activate

```

### 3. Abhängigkeiten installieren

```bash
cd projekt05
pip install -r requirements.txt
```

---

## Konfiguration über `.env`

Die Anwendung verwendet **Environment Variables** für alle API-Keys.
Empfohlen wird die Nutzung einer **`.env`-Datei**.

### Speicherort der `.env`

```text
projekt05/.env
```

### Beispiel `.env`-Datei

```env
AVIATIONSTACK_API_KEY=IHR_AVIATIONSTACK_KEY
GEOAPIFY_API_KEY=IHR_GEOAPIFY_KEY
```

### Laden der `.env`-Datei

Installieren Sie `python-dotenv`:

```bash
pip install python-dotenv
```

Beispiel in `app.py`:

```python
from dotenv import load_dotenv
load_dotenv()
```

---

## App starten

Aus dem Verzeichnis `projekt05/`:

```bash
python app.py
```

Die App ist danach erreichbar unter:

```text
http://127.0.0.1:5005
```

(Der Port ist in `app.py` konfiguriert.)

---

## API-Keys erstellen

### Aviationstack

1. [https://aviationstack.com](https://aviationstack.com) aufrufen
2. Kostenlosen Account registrieren
3. API Key im Dashboard kopieren
4. In die `.env`-Datei eintragen:

```env
AVIATIONSTACK_API_KEY=IHR_KEY
```

---

### Geoapify

1. [https://myprojects.geoapify.com/projects](https://myprojects.geoapify.com/projects) aufrufen
2. Neues Projekt erstellen
3. Unter **API keys** einen Key generieren
4. Sicherstellen, dass **Map Tiles** aktiviert sind
5. Key in `.env` eintragen:

```env
GEOAPIFY_API_KEY=IHR_KEY
```

---

## Test

1. App neu starten (damit `.env` geladen wird)
2. Flugsuche durchführen
3. Wetter- und Places-Anzeige prüfen
