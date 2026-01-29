# Der Flight-Basar

Klar, hier ist die Anleitung mit dem fixen Pfad drin.

## Geoapify API Key erstellen und im `.env` File eintragen

### Ziel

Du erstellst auf Geoapify einen API Key und trägst ihn in die `.env` Datei ein, damit das Projekt Geoapify Requests machen kann.

---

## 1) Projekt auf Geoapify anlegen

1. Öffne: [https://myprojects.geoapify.com/projects](https://myprojects.geoapify.com/projects)
2. Klicke **Add a new project**.
3. Gib einen Projektnamen ein (zum Beispiel `Flugbasar`) und bestätige.

---

## 2) Map Tiles auswählen (wichtig)

1. Öffne dein Projekt.
2. Klicke links auf **API keys**.
3. Scrolle zum Bereich **Try API and generate code**.
4. Bei **Choose a Geoapify API** wähle **Map Tiles** aus.

---

## 3) API Key generieren und kopieren

1. Bleib auf der Seite **API keys**.
2. Im Bereich **API keys** klicke auf das **Plus Symbol**.
3. Kopiere den generierten Key.

---

## 4) API Key in die `.env` Datei eintragen

### Pfad zur Datei

Die `.env` Datei liegt hier:

**`flight-basar/.env`**

### Variable setzen

Öffne `flight-basar/.env` und trage den Key so ein:

```env
GEOAPIFY_API_KEY=DEIN_KEY_HIER
```

---

## 5) Test

1. App neu starten (damit die `.env` neu geladen wird).
2. Funktion testen, die Geoapify nutzt.

---

