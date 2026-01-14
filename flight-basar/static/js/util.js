async function callSearchApi() {
    const departureInput = document.getElementById("departureSearch");
    const arrivalInput = document.getElementById("arrivalSearch");

    const departureAirportCode = getAirportCode(departureInput.value);
    const arrivalAirportCode = getAirportCode(arrivalInput.value);

    if (!departureAirportCode || !arrivalAirportCode) {
        alert("Bitte wählen Sie einen gültigen Start- und Zielflughafen aus der Liste.");
        return;
    }

  try {
    const res = await fetch('/flights/'+departureAirportCode+'/' + arrivalAirportCode, { method: 'GET' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    renderFlights(data, departureAirportCode, arrivalAirportCode);
  } catch (err) {
    alert("Bei der Suche der Flüge von " + getAirportName(departureAirportCode) + "nach " + getAirportName(arrivalAirportCode) +" ist ein Fehler aufgetreten. Möglicherweise gibt es keine Flüge zwischen diesen Orten");
    console.error(err)
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
        <strong>${getAirportName(departure_destination_selector_value)}</strong> (${flight.departure.iata}) → <strong>${getAirportName(arrival_destination_selector_value)}</strong> (${flight.arrival.iata})
      </div>

      <div class="time">
        ${new Date(flight.departure.scheduled).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${flight.departure.timezone}) – ${new Date(flight.arrival.scheduled).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} (${flight.arrival.timezone}) | Abflug: ${new Date(flight.departure.scheduled).toLocaleDateString()}
      </div>

      <button class="buy-btn">Flug kopieren</button>
    `;

    const copyButton = row.querySelector('.buy-btn');
    copyButton.addEventListener('click', () => {
      const iata = flight.flight.iata;
      navigator.clipboard.writeText(iata).then(() => {
        copyButton.textContent = 'Kopiert!';
        setTimeout(() => {
          copyButton.textContent = 'Flug kopieren';
        }, 2000);
      }).catch(err => {
        console.error('Fehler beim Kopieren:', err);
        alert('Konnte den Flug nicht kopieren.');
      });
    });

    resultsDiv.appendChild(row);
  });
}

let ALL_AIRPORTS = [];

function getAirportName(code) {
  const airport = ALL_AIRPORTS.find(a => a.code === code);
  return airport ? airport.name : code;
}

function getAirportCode(airportName) {
  const airport = ALL_AIRPORTS.find(a => a.name.toLowerCase() === airportName.toLowerCase());
  return airport ? airport.code : null;
}

function renderAirportOptions(dataListEl, airports) {
  if (!dataListEl) return;
  dataListEl.innerHTML = '';
  airports.forEach(({ name }) => {
    const opt = document.createElement('option');
    opt.value = name;
    dataListEl.appendChild(opt);
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

    const depList = document.getElementById('departureAirportList');
    const arrList = document.getElementById('arrivalAirportList');

    renderAirportOptions(depList, ALL_AIRPORTS);
    renderAirportOptions(arrList, ALL_AIRPORTS);

    const depSearch = document.getElementById('departureSearch');
    const arrSearch = document.getElementById('arrivalSearch');

    depSearch?.addEventListener('input', () => {
      renderAirportOptions(depList, filterAirports(depSearch.value));
    });
    arrSearch?.addEventListener('input', () => {
      renderAirportOptions(arrList, filterAirports(arrSearch.value));
    });

  } catch (err) {
    console.error('Airports laden fehlgeschlagen:', err);
  }
}
document.addEventListener('DOMContentLoaded', () => {
  loadAirports();
  document.getElementById('searchBtn')?.addEventListener('click', callSearchApi);
});
