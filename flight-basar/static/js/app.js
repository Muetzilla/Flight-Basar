const GEOAPIFY_KEY = document.body.dataset.geoapifyKey || "";
const DEFAULT_CITY = "Zürich";

let map = null;
let markerLayer = null;

/* -------------------- HELPERS -------------------- */

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

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

function normalizeCityNameForPlaces(airportName) {
  const s = (airportName || "").trim();
  if (!s) return DEFAULT_CITY;

  // entfernt " (XYZ)" am Ende
  return s.replace(/\s*\([^)]+\)\s*$/, "").trim();
}

/* -------------------- WEATHER (nur Ziel) -------------------- */

async function loadWeatherForArrival() {
  const titleEl = document.getElementById("weatherTitle");
  const iconEl = document.getElementById("weatherIcon");
  const nowTempEl = document.getElementById("weatherNowTemp");
  const textEl = document.getElementById("weatherText");
  const metaEl = document.getElementById("weatherMeta");
  const forecastEl = document.getElementById("forecastList");

  if (!titleEl || !textEl || !forecastEl) return;

  const arrivalInput = document.getElementById("arrivalSearch");
  const rawArrival = arrivalInput?.value?.trim() || "";

  // findAirport kommt aus util.js
  const airport = (typeof findAirport === "function") ? findAirport(rawArrival) : null;

  const label = airport ? airport.name : (rawArrival || "Zielort wählen");
  titleEl.textContent = `🌤 Wetter am Ziel: ${label}`;

  textEl.textContent = "Lade Wetterdaten...";
  metaEl.textContent = "";
  forecastEl.innerHTML = "";
  nowTempEl.textContent = "–°C";
  iconEl.textContent = "⛅";

  if (!airport || airport.lat == null || airport.lon == null) {
    textEl.textContent = "Bitte wähle zuerst einen Zielort aus der Liste.";
    return;
  }

  try {
    const url = `/api/weather?lat=${airport.lat}&lon=${airport.lon}&label=${encodeURIComponent(airport.name)}`;
    const res = await fetch(url);
    const data = await res.json();

    if (!res.ok) {
      textEl.textContent = data.error || "Fehler beim Laden";
      return;
    }

    iconEl.textContent = codeToEmoji(data.weather_code);
    nowTempEl.textContent = `${data.temperature}°C`;
    textEl.textContent = data.weather_text;
    metaEl.textContent = `Wind: ${data.wind} km/h · Stand: ${data.time}`;

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

/* -------------------- PLACES + MAP -------------------- */

function initMap(center) {
  if (typeof L === "undefined") {
    console.error("Leaflet (L) ist nicht geladen. Prüfe base.html!");
    return;
  }

  map = L.map("poiMap", { scrollWheelZoom: false }).setView([center.lat, center.lon], 13);

  const style = "osm-bright";
  const tilesUrl = `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

  L.tileLayer(tilesUrl, {
    maxZoom: 20,
    attribution: "Map data © OpenStreetMap contributors · Powered by Geoapify"
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
}

async function loadPlacesForArrival() {
  const list = document.getElementById("poiList");
  const mapEl = document.getElementById("poiMap");
  if (!list || !mapEl) return;

  const arrivalInput = document.getElementById("arrivalSearch");
  const rawArrival = arrivalInput?.value?.trim() || "";

  const airport = (typeof findAirport === "function") ? findAirport(rawArrival) : null;

  // Places braucht "City Name", nicht "JFK"
  const cityName = normalizeCityNameForPlaces(airport ? airport.name : (rawArrival || DEFAULT_CITY));

  list.innerHTML = `<li class="poi-loading">Lade Sehenswürdigkeiten...</li>`;

  try {
    const res = await fetch(`/api/places?city=${encodeURIComponent(cityName)}`);
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = `<li class="poi-loading">${escapeHtml(data.error || "Fehler beim Laden")}</li>`;
      return;
    }

    if (!map) initMap(data.center);
    if (map) map.setView([data.center.lat, data.center.lon], 13);

    if (markerLayer) markerLayer.clearLayers();
    list.innerHTML = "";

    (data.places || []).forEach((p, i) => {
      if (p.lat == null || p.lon == null) return;

      const title = escapeHtml(p.name);
      const addr = escapeHtml(p.formatted);

      let m = null;
      if (markerLayer) {
        m = L.marker([p.lat, p.lon]).addTo(markerLayer);
        m.bindPopup(`<strong>${title}</strong><br>${addr}`);
      }

      const li = document.createElement("li");
      li.className = "poi-item";
      li.innerHTML = `
        <div class="poi-rank">${i + 1}</div>
        <div class="poi-text">
          <div class="poi-name">${title}</div>
          <div class="poi-addr">${addr}</div>
        </div>
      `;

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

/* -------------------- WIRING -------------------- */

let _debounce = null;

function updateArrivalModules() {
  clearTimeout(_debounce);
  _debounce = setTimeout(() => {
    loadWeatherForArrival();
    loadPlacesForArrival();
  }, 250);
}

document.addEventListener("DOMContentLoaded", async () => {
  // util.js lädt Airports -> wir warten nur drauf
  if (typeof ensureAirportsLoaded === "function") {
    await ensureAirportsLoaded();
  }

  const arrivalInput = document.getElementById("arrivalSearch");

  if (arrivalInput) {
    arrivalInput.addEventListener("input", updateArrivalModules);
    arrivalInput.addEventListener("change", updateArrivalModules);
  }

  // Wenn util.js nach Flug-Suche den Arrival fix gewählt hat
  document.addEventListener("arrivalAirportSelected", () => {
    updateArrivalModules();
  });

  // Initial
  updateArrivalModules();
});
