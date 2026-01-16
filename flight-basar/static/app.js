const GEOAPIFY_KEY = document.body.dataset.geoapifyKey;
const DEFAULT_CITY = window.APP_CONFIG?.defaultCity || "Zürich";

let map = null;
let markerLayer = null;

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function codeToEmoji(code){
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

/* -------- WEATHER -------- */

async function loadWeather(city) {
  const titleEl = document.getElementById("weatherTitle");
  const iconEl = document.getElementById("weatherIcon");
  const nowTempEl = document.getElementById("weatherNowTemp");
  const textEl = document.getElementById("weatherText");
  const metaEl = document.getElementById("weatherMeta");
  const forecastEl = document.getElementById("forecastList");

  titleEl.textContent = `🌤 Wetter in ${city}`;
  textEl.textContent = "Lade Wetterdaten...";
  metaEl.textContent = "";
  forecastEl.innerHTML = "";
  nowTempEl.textContent = "–°C";
  iconEl.textContent = "⛅";

  try {
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
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
      weekday: "short", day: "2-digit", month: "2-digit"
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

  } catch {
    textEl.textContent = "Fehler beim Laden der Wetterdaten.";
  }
}

/* -------- PLACES + MAP -------- */

function initMap(center) {
  map = L.map("poiMap", { scrollWheelZoom: false }).setView([center.lat, center.lon], 13);

  const style = "osm-bright";
  const tilesUrl = `https://maps.geoapify.com/v1/tile/${style}/{z}/{x}/{y}.png?apiKey=${encodeURIComponent(GEOAPIFY_KEY)}`;

  L.tileLayer(tilesUrl, {
    maxZoom: 20,
    attribution: 'Map data © OpenStreetMap contributors · Powered by Geoapify'
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
}

async function loadPlaces(city) {
  const list = document.getElementById("poiList");
  list.innerHTML = `<li class="poi-loading">Lade Sehenswürdigkeiten...</li>`;

  try {
    const res = await fetch(`/api/places?city=${encodeURIComponent(city)}`);
    const data = await res.json();

    if (!res.ok) {
      list.innerHTML = `<li class="poi-loading">${escapeHtml(data.error || "Fehler beim Laden")}</li>`;
      return;
    }

    if (!map) initMap(data.center);
    map.setView([data.center.lat, data.center.lon], 13);

    markerLayer.clearLayers();
    list.innerHTML = "";

    (data.places || []).forEach((p, i) => {
      if (p.lat == null || p.lon == null) return;

      const title = escapeHtml(p.name);
      const addr = escapeHtml(p.formatted);

      const m = L.marker([p.lat, p.lon]).addTo(markerLayer);
      m.bindPopup(`<strong>${title}</strong><br>${addr}`);

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
        map.setView([p.lat, p.lon], 15);
        m.openPopup();
      });

      list.appendChild(li);
    });

  } catch {
    list.innerHTML = `<li class="poi-loading">Fehler beim Laden der Sehenswürdigkeiten.</li>`;
  }
}

/* -------- WIRING -------- */

function getSelectedCity() {
  const select = document.getElementById("citySelect");
  return select?.value || DEFAULT_CITY;
}

function onCityChange() {
  const city = getSelectedCity();
  loadWeather(city);
  loadPlaces(city);
}

document.addEventListener("DOMContentLoaded", () => {
  const select = document.getElementById("citySelect");
  if (select) {
    select.addEventListener("change", onCityChange);
  }
  onCityChange();
});
