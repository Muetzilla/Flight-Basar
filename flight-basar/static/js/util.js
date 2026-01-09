async function callSearchApi() {
    let departure_destination_selector_element = document.getElementById("departureAirport");
    let departure_destination_selector_value = departure_destination_selector_element.value;
    let arrival_destination_selector_element = document.getElementById("arrivalAirport");
    let arrival_destination_selector_value = arrival_destination_selector_element.value;
  try {
    const res = await fetch('/flights/'+departure_destination_selector_value+'/' + arrival_destination_selector_value, { method: 'GET' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    // alert(JSON.stringify(data, null, 2));
    renderFlights(data, departure_destination_selector_value, arrival_destination_selector_value);
  } catch (err) {
    alert("Bei der Suche der Flüge von " + getAirportName(departure_destination_selector_value) + "nach " + getAirportName(arrival_destination_selector_value) +" ist ein Fehler aufgetreten. Möglicherweise gibt es keine Flüge zwischen diesen Orten");
  }
}
function renderFlights(flights, departure_destination_selector_value, arrival_destination_selector_value) {
  const resultsDiv = document.querySelector(".results");
  resultsDiv.innerHTML = "";

  flights.forEach(flight => {
    const row = document.createElement("div");
    row.className = "flight-row";

    row.innerHTML = `
      <div class="route">
        <strong>${getAirportName(departure_destination_selector_value)}</strong> ${flight.from} → <strong>${getAirportName(arrival_destination_selector_value)}</strong> ${flight.to}
      </div>

      <div class="time">
        ${flight.departureTime} – ${flight.arrivalTime} | Start Date ${flight.flightDate}
      </div>

      <button class="buy-btn">Ticket kaufen</button>
    `;

    resultsDiv.appendChild(row);
  });
}

let ALL_AIRPORTS = [];

function getAirportName(code) {
  const airport = ALL_AIRPORTS.find(a => a.code === code);
  return airport ? airport.name : code;
}

function renderAirportOptions(selectEl, airports) {
  if (!selectEl) return;
  selectEl.innerHTML = '';
  airports.forEach(({ code, name }) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = name;
    if (code === '') {
      opt.disabled = true;
      opt.selected = true;
    }
    selectEl.appendChild(opt);
  });
}

function filterAirports(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return ALL_AIRPORTS;
  return ALL_AIRPORTS.filter(a =>
    (a.name || '').toLowerCase().includes(q) || (a.code || '').toLowerCase().includes(q)
  );
}

async function loadAirports() {
  try {
    const res = await fetch('/static/airports.json');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    ALL_AIRPORTS = await res.json();

    const depSelect = document.getElementById('departureAirport');
    const arrSelect = document.getElementById('arrivalAirport');
    // Initiales Rendering
    renderAirportOptions(depSelect, ALL_AIRPORTS);
    renderAirportOptions(arrSelect, ALL_AIRPORTS);

    // Suchevents binden
    const depSearch = document.getElementById('departureSearch');
    const arrSearch = document.getElementById('arrivalSearch');
    depSearch?.addEventListener('input', () => {
      renderAirportOptions(depSelect, filterAirports(depSearch.value));
    });
    arrSearch?.addEventListener('input', () => {
      renderAirportOptions(arrSelect, filterAirports(arrSearch.value));
    });
  } catch (err) {
    console.error('Airports laden fehlgeschlagen:', err);
  }
}

// Beim Laden der Seite Dropdowns befüllen und Suche aktivieren
document.addEventListener('DOMContentLoaded', () => {
  loadAirports();
  document.getElementById('searchBtn')?.addEventListener('click', callSearchApi);
});
