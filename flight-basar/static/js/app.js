/* =========================================================
   app.js
   Zweck:
   - Laedt Wetter und Sehenswuerdigkeiten fuer den gewaehlten Ziel Flughafen
   - Update passiert NUR beim Flug Suchen (Custom Event aus util.js)
   ========================================================= */

/* -------------------- KONFIG -------------------- */

// Geoapify Key kommt aus dem HTML: <body data-geoapify-key="...">
const GEOAPIFY_KEY = document.body.dataset.geoapifyKey || "";

// Fallback Stadt, falls wir keinen Airport haben
const DEFAULT_CITY = "Zürich";

/* -------------------- STATE (globale Variablen) -------------------- */

// Leaflet Map Instanz (wird erst erstellt, wenn Places geladen werden)
let map = null;

// Layer fuer Marker (damit wir Marker bei neuem Ziel leeren koennen)
let markerLayer = null;

// Das ist die EINZIGE Quelle der Wahrheit fuer das aktuelle Ziel.
// Wir setzen es nur, wenn util.js das Event "arrivalAirportSelected" feuert.
let selectedArrivalAirport = null;

/* -------------------- HELFERFUNKTIONEN -------------------- */

// HTML escapen, damit keine ungewollten HTML Tags im UI landen
function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// Wettercode in Emoji umwandeln (Open Meteo Codes)
function codeToEmoji(code) {
  if (code == null) return "❓";
  if (code === 0) return "☀️";
  if (code === 1) return "🌤️";
  if (code === 2) return "⛅";
  if (code === 3) return "☁️";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "🌧️";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "❓";
}

/*
  Places API braucht typischerweise einen "City Namen".
  Falls du hier spaeter besser werden willst, koennte man:
  - airport.city oder airport.municipality verwenden (falls im airports.json vorhanden)
  - oder eine Geocoding API nutzen.
*/
function normalizeCityNameForPlaces(airportName) {
  const s = (airportName || "").trim();
  if (!s) return DEFAULT_CITY;

  // Entfernt " (XYZ)" am Ende, falls es doch vorkommt
  return s.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

/*
  UI in einen sauberen Ausgangszustand bringen.
  Das ist wichtig, weil wir NICHT mehr automatisch beim Tippen laden.
*/
function renderArrivalEmptyState() {
  // Wetter Elemente
  const titleEl = document.getElementById("weatherTitle");
  const iconEl = document.getElementById("weatherIcon");
  const nowTempEl = document.getElementById("weatherNowTemp");
  const textEl = document.getElementById("weatherText");
  const metaEl = document.getElementById("weatherMeta");
  const forecastEl = document.getElementById("forecastList");

  if (titleEl) titleEl.textContent = "🌤 Wetter am Ziel: Zielort wählen";
  if (iconEl) iconEl.textContent = "⛅";
  if (nowTempEl) nowTempEl.textContent = "–°C";
  if (textEl) textEl.textContent = "Suche zuerst einen Flug, dann lade ich Wetter und Sehenswürdigkeiten.";
  if (metaEl) metaEl.textContent = "";
  if (forecastEl) forecastEl.innerHTML = "";

  // Places Elemente
  const list = document.getElementById("poiList");
  if (list) list.innerHTML = `<li class="poi-loading">Suche zuerst einen Flug, dann lade ich Sehenswürdigkeiten.</li>`;

  // Map muss nicht zwingend geloescht werden. Wir lassen sie stehen, falls sie schon existiert.
  // Optional koennte man Marker leeren:
  if (markerLayer) markerLayer.clearLayers();
}

/* =========================================================
   WEATHER (nur Ziel)
   ========================================================= */

async function loadWeatherForSelectedArrival() {
  // Elemente aus dem DOM holen
  const titleEl = document.getElementById("weatherTitle");
  const iconEl = document.getElementById("weatherIcon");
  const nowTempEl = document.getElementById("weatherNowTemp");
  const textEl = document.getElementById("weatherText");
  const metaEl = document.getElementById("weatherMeta");
  const forecastEl = document.getElementById("forecastList");

  // Wenn die Wetter Sektion nicht existiert, dann abbrechen
  if (!titleEl || !textEl || !forecastEl) return;

  // Das aktuelle Ziel kommt NUR aus selectedArrivalAirport
  const airport = selectedArrivalAirport;

  // Label fuer den Titel
  const label = airport ? airport.name : "Zielort wählen";
  titleEl.textContent = `🌤 Wetter am Ziel: ${label}`;

  // Loading Zustand setzen
  textEl.textContent = "Lade Wetterdaten...";
  if (metaEl) metaEl.textContent = "";
  forecastEl.innerHTML = "";
  if (nowTempEl) nowTempEl.textContent = "–°C";
  if (iconEl) iconEl.textContent = "⛅";

  // Wenn noch kein Airport gesetzt ist, dann klarer Hinweis
  if (!airport) {
    textEl.textContent = "Suche zuerst einen Flug, damit ein Ziel gesetzt ist.";
    return;
  }

  // Ohne Koordinaten koennen wir kein Wetter laden
  if (airport.lat == null || airport.lon == null) {
    textEl.textContent = "Dieser Flughafen hat keine Koordinaten. Bitte pruefe airports.json.";
    return;
  }

  try {
    // Wir schicken lat lon und label an die Backend Weather Route
    const url = `/api/weather?lat=${airport.lat}&lon=${airport.lon}&label=${encodeURIComponent(airport.name)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      textEl.textContent = data.error || "Fehler beim Laden";
      return;
    }

    // UI befuellen
    if (iconEl) iconEl.textContent = codeToEmoji(data.weather_code);
    if (nowTempEl) nowTempEl.textContent = `${data.temperature}°C`;
    textEl.textContent = data.weather_text;
    if (metaEl) metaEl.textContent = `Wind: ${data.wind} km/h · Stand: ${data.time}`;

    // Forecast Cards bauen
    const fmt = new Intl.DateTimeFormat("de-CH", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit"
    });

    forecastEl.innerHTML = (data.forecast || []).map(d => {
      const day = fmt.format(new Date(d.date));
      const emoji = codeToEmoji(d.weather_code);
      const precip = (d.precipitation_sum == null) ? "–" : `${d.precipitation_sum} mm`;

      return `
        <div class="forecast-card">
          <div class="forecast-top">
            <div class="forecast-day">${day}</div>
            <div class="forecast-emoji">${emoji}</div>
          </div>

          <div class="forecast-mid">${escapeHtml(d.weather_text)}</div>

          <div class="forecast-temps">
            <div class="forecast-max">${d.tmax}°</div>
            <div class="forecast-min">${d.tmin}°</div>
          </div>

          <div class="forecast-extra">Niederschlag: ${precip}</div>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error(err);
    textEl.textContent = "Fehler beim Laden der Wetterdaten.";
  }
}

/* =========================================================
   PLACES + MAP (nur Ziel)
   ========================================================= */

function initMap(center) {
  // Leaflet muss global geladen sein (Script in base.html)
  if (typeof L === "undefined") {
    console.error("Leaflet (L) ist nicht geladen. Prüfe base.html!");
    return;
  }

  // Map erstellen, Center setzen
  map = L.map("poiMap", { scrollWheelZoom: false }).setView([center.lat, center.lon], 13);

  // Geoapify Tiles
  const style = "osm-bright";
  const tilesUrl = `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

  L.tileLayer(tilesUrl, {
    maxZoom: 20,
    attribution: "Map data © OpenStreetMap contributors · Powered by Geoapify"
  }).addTo(map);

  // Eigener Layer fuer Marker
  markerLayer = L.layerGroup().addTo(map);
}

async function loadPlacesForSelectedArrival() {
  const list = document.getElementById("poiList");
  const mapEl = document.getElementById("poiMap");
  if (!list || !mapEl) return;

  const airport = selectedArrivalAirport;

  // Ohne Airport: nichts laden
  if (!airport) {
    list.innerHTML = `<li class="poi-loading">Suche zuerst einen Flug, damit ein Ziel gesetzt ist.</li>`;
    return;
  }

  // City Name fuer Places bestimmen
  const cityName = normalizeCityNameForPlaces(airport.name);

  // Loading Zustand
  list.innerHTML = `<li class="poi-loading">Lade Sehenswürdigkeiten...</li>`;

  try {
    // Backend Route, die Geoapify Places nutzt und center + places liefert
    const res = await fetch(`/api/places?city=${encodeURIComponent(cityName)}`);
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = `<li class="poi-loading">${escapeHtml(data.error || "Fehler beim Laden")}</li>`;
      return;
    }

    // Map initialisieren oder auf neues Center setzen
    if (!map) initMap(data.center);
    if (map) map.setView([data.center.lat, data.center.lon], 13);

    // Marker und Liste leeren
    if (markerLayer) markerLayer.clearLayers();
    list.innerHTML = "";

    // Places rendern
    (data.places || []).forEach((p, i) => {
      if (p.lat == null || p.lon == null) return;

      const title = escapeHtml(p.name);
      const addr = escapeHtml(p.formatted);

      // Marker auf Karte
      let m = null;
      if (markerLayer) {
        m = L.marker([p.lat, p.lon]).addTo(markerLayer);
        m.bindPopup(`<strong>${title}</strong><br>${addr}`);
      }

      // List Item bauen
      const li = document.createElement("li");
      li.className = "poi-item";
      li.innerHTML = `
        <div class="poi-rank">${i + 1}</div>
        <div class="poi-text">
          <div class="poi-name">${title}</div>
          <div class="poi-addr">${addr}</div>
        </div>
      `;

      // Klick auf List Item zoomt zur Location und oeffnet Popup
      li.addEventListener("click", () => {
        if (map) map.setView([p.lat, p.lon], 15);
        if (m) m.openPopup();
      });

      list.appendChild(li);
    });

  } catch (err) {
    console.error(err);
    list.innerHTML = `<li class="poi-loading">Fehler beim Laden der Sehenswürdigkeiten.</li>`;
  }
}

/* =========================================================
   WIRING (Event und Update Logik)
   ========================================================= */
function setupServerTime() {
  const out = document.getElementById("server-time");
  if (!out) return;

  async function loadServerTime() {
    out.textContent = "…";
    try {
      const resp = await fetch("/time");
      if (!resp.ok) {
        out.textContent = "Fehler (" + resp.status + ")";
        return;
      }
      const data = await resp.json();
      out.textContent = data.server_time || "—";
    } catch (e) {
      out.textContent = "Fehler";
    }
  }

  // Klick auf die Zeit selbst
  out.addEventListener("click", loadServerTime);

  // einmal beim Laden holen
  loadServerTime();
}

document.addEventListener("DOMContentLoaded", setupServerTime);


// Debounce ist hier nicht zwingend, aber es verhindert doppelte schnelle Updates,
// falls aus irgendeinem Grund mehrere Events kurz nacheinander kommen.
let _debounce = null;

function updateArrivalModules() {
  clearTimeout(_debounce);

  _debounce = setTimeout(() => {
    // Wichtig: Beide Module nutzen selectedArrivalAirport als Input
    loadWeatherForSelectedArrival();
    loadPlacesForSelectedArrival();
  }, 150);
}

document.addEventListener("DOMContentLoaded", () => {
  // Beim Laden der Seite zeigen wir einen neutralen Zustand.
  // Wir laden NICHT automatisch Wetter oder Places, weil du nur beim Suchen updaten willst.
  renderArrivalEmptyState();

  /*
    Das ist die zentrale Verbindung zu util.js:

    util.js dispatcht:
      document.dispatchEvent(new CustomEvent("arrivalAirportSelected", { detail: { airport: arrAirport } }));

    Wir empfangen dieses Event hier, speichern den Airport als State
    und starten danach genau EIN Update.
  */
  document.addEventListener("arrivalAirportSelected", (e) => {
    // Airport Objekt aus dem Event lesen
    const airport = e.detail?.airport || null;

    // State setzen (einzige Quelle der Wahrheit)
    selectedArrivalAirport = airport;

    // Optional: Debug Log (kannst du spaeter entfernen)
    console.log("arrivalAirportSelected empfangen:", selectedArrivalAirport);

    // Jetzt Wetter und Places laden
    updateArrivalModules();
  });
});