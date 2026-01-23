let ALL_AIRPORTS = [];
let _airportsPromise = null;

/* -------------------- AIRPORT HELPERS -------------------- */

function airportDisplayName(a) {
  const name = (a?.name || "").trim();
  const code = (a?.code || "").toUpperCase();

  if (!name) return code || "";
  if (!code) return name;

  // Falls Name schon "(XYZ)" am Ende hat, nicht doppelt anhängen
  if (/\(([A-Z0-9]{3})\)\s*$/i.test(name)) return name;

  return `${name} (${code})`;
}

function dedupeAirports(list) {
  const seen = new Set();
  const out = [];

  for (const a of list || []) {
    const code = (a?.code || "").toUpperCase();
    const key = code || (a?.name || "").toLowerCase();
    if (!key) continue;
    if (seen.has(key)) continue;

    seen.add(key);
    out.push({ ...a, code });
  }
  return out;
}

/**
 * Lädt airports.json genau 1x (Promise Cache)
 */
async function ensureAirportsLoaded() {
  if (_airportsPromise) return _airportsPromise;

  _airportsPromise = (async () => {
    const res = await fetch("/static/airports.json");
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    ALL_AIRPORTS = dedupeAirports(data);
    return ALL_AIRPORTS;
  })().catch(err => {
    console.error("airports.json laden fehlgeschlagen:", err);
    ALL_AIRPORTS = [];
    return ALL_AIRPORTS;
  });

  return _airportsPromise;
}

/**
 * Findet einen Airport aus:
 * - "Zürich"
 * - "Zürich (ZRH)"
 * - "ZRH"
 */
function findAirport(input) {
  const raw = (input || "").trim();
  if (!raw) return null;

  // Code aus "(XYZ)" am Ende
  const m = raw.match(/\(([A-Z0-9]{3})\)\s*$/i);
  if (m) {
    const code = m[1].toUpperCase();
    const byCode = ALL_AIRPORTS.find(a => (a.code || "").toUpperCase() === code);
    if (byCode) return byCode;
  }

  // Nur Code
  if (/^[A-Z0-9]{3}$/i.test(raw)) {
    const code = raw.toUpperCase();
    return ALL_AIRPORTS.find(a => (a.code || "").toUpperCase() === code) || null;
  }

  // Exakter Name
  const lower = raw.toLowerCase();
  const exact = ALL_AIRPORTS.find(a => (a.name || "").trim().toLowerCase() === lower);
  if (exact) return exact;

  // Teilmatch nur wenn genau 1 Treffer
  const hits = ALL_AIRPORTS.filter(a => (a.name || "").toLowerCase().includes(lower));
  return hits.length === 1 ? hits[0] : null;
}

function getAirportName(code) {
  const c = (code || "").toUpperCase();
  const airport = ALL_AIRPORTS.find(a => (a.code || "").toUpperCase() === c);
  return airport ? airport.name : code;
}

/* -------------------- DATALIST -------------------- */

function renderAirportOptions(dataListEl, airports) {
  if (!dataListEl) return;

  dataListEl.innerHTML = "";

  airports.forEach(a => {
    const opt = document.createElement("option");
    opt.value = airportDisplayName(a); // z.B. Zürich (ZRH)
    dataListEl.appendChild(opt);
  });
}

function filterAirports(query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return ALL_AIRPORTS;

  return ALL_AIRPORTS.filter(a =>
    (a.name || "").toLowerCase().includes(q) ||
    (a.code || "").toLowerCase().includes(q)
  );
}

/* -------------------- FLIGHT SEARCH -------------------- */

async function callSearchApi() {
  const departureInput = document.getElementById("departureSearch");
  const arrivalInput = document.getElementById("arrivalSearch");

  const depAirport = findAirport(departureInput?.value);
  const arrAirport = findAirport(arrivalInput?.value);

  if (!depAirport || !arrAirport) {
    alert("Bitte wählen Sie einen gültigen Start- und Zielflughafen aus der Liste.");
    return;
  }

  // Optional: Input sauber formatieren
  departureInput.value = airportDisplayName(depAirport);
  arrivalInput.value = airportDisplayName(arrAirport);

  try {
    const res = await fetch(`/flights/${depAirport.code}/${arrAirport.code}`, { method: "GET" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    const data = await res.json();
    renderFlights(data, depAirport.code, arrAirport.code);

    // ✅ Signal an app.js: Ziel hat sich gesetzt
    document.dispatchEvent(new CustomEvent("arrivalAirportSelected", { detail: { airport: arrAirport } }));

  } catch (err) {
    alert(
      `Bei der Suche der Flüge von ${depAirport.name} nach ${arrAirport.name} ist ein Fehler aufgetreten. ` +
      `Möglicherweise gibt es keine Flüge zwischen diesen Orten.`
    );
    console.error(err);
  }
}

function getTimezoneAbbreviation(dateString, timeZone) {
  if (!dateString || !timeZone) return "";

  const formatter = new Intl.DateTimeFormat([], {
    timeZone,
    timeZoneName: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  const parts = formatter.formatToParts(new Date(dateString));
  const tzAbbr = parts.find(p => p.type === "timeZoneName")?.value || "";

  const time = new Date(dateString).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  });

  return `${time} (${tzAbbr})`;
}

function renderFlights(flights, departureCode, arrivalCode) {
  const resultsDiv = document.querySelector(".results");
  if (!resultsDiv) return;

  resultsDiv.innerHTML = "";

  (flights || []).forEach(flight => {
    const row = document.createElement("div");
    row.className = "flight-row";

    const departureTime = getTimezoneAbbreviation(flight.departure?.scheduled, flight.departure?.timezone);
    const arrivalTime = getTimezoneAbbreviation(flight.arrival?.scheduled, flight.arrival?.timezone);

    row.innerHTML = `
      <div class="route">
        <strong>${getAirportName(departureCode)}</strong> (${flight.departure?.iata || departureCode}) →
        <strong>${getAirportName(arrivalCode)}</strong> (${flight.arrival?.iata || arrivalCode})
      </div>

      <div class="time">
        ${departureTime} – ${arrivalTime} | Abflug: ${new Date(flight.departure?.scheduled).toLocaleDateString()}
      </div>

      <button class="buy-btn">Flug kopieren</button>
    `;

    const copyButton = row.querySelector(".buy-btn");
    copyButton.addEventListener("click", () => {
      const iata = flight.flight?.iata;
      if (!iata) return;

      navigator.clipboard.writeText(iata).then(() => {
        copyButton.textContent = "Kopiert!";
        setTimeout(() => (copyButton.textContent = "Flug kopieren"), 2000);
      }).catch(err => {
        console.error("Fehler beim Kopieren:", err);
        alert("Konnte den Flug nicht kopieren.");
      });
    });

    resultsDiv.appendChild(row);
  });
}

/* -------------------- INIT -------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  await ensureAirportsLoaded();

  const depList = document.getElementById("departureAirportList");
  const arrList = document.getElementById("arrivalAirportList");

  renderAirportOptions(depList, ALL_AIRPORTS);
  renderAirportOptions(arrList, ALL_AIRPORTS);

  const depSearch = document.getElementById("departureSearch");
  const arrSearch = document.getElementById("arrivalSearch");

  // ✅ Tippen = filtern
  depSearch?.addEventListener("input", () => {
    renderAirportOptions(depList, filterAirports(depSearch.value));
  });
  arrSearch?.addEventListener("input", () => {
    renderAirportOptions(arrList, filterAirports(arrSearch.value));
  });

  // ✅ Klick = IMMER alle anzeigen (so wie du willst)
  depSearch?.addEventListener("click", () => {
    renderAirportOptions(depList, ALL_AIRPORTS);
  });
  arrSearch?.addEventListener("click", () => {
    renderAirportOptions(arrList, ALL_AIRPORTS);
  });

  // Suche Button
  document.getElementById("searchBtn")?.addEventListener("click", callSearchApi);
});
