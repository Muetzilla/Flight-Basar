 async function callSearchApi() {
     let departure_destination_selector_element = document.getElementById("departureAirport");
     let departure_destination_selector_value = departure_destination_selector_element.value;
     let arrival_destination_selector_element = document.getElementById("arrivalAirport");
     let arrival_destination_selector_value = arrival_destination_selector_element.value;
  try {
    const res = await fetch('/flights/'+departure_destination_selector_value+'/' + arrival_destination_selector_value, { method: 'GET' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const data = await res.json();
    alert(JSON.stringify(data, null, 2));
    renderFlights(data);
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}
function renderFlights(flights) {
  const resultsDiv = document.querySelector(".results");
  resultsDiv.innerHTML = "";

  flights.forEach(flight => {
    const row = document.createElement("div");
    row.className = "flight-row";

    row.innerHTML = `
      <div class="route">
        <strong>${flight.from}</strong> → <strong>${flight.to}</strong>
      </div>

      <div class="time">
        ${flight.departureTime} – ${flight.arrivalTime}
      </div>

      <button class="buy-btn">Ticket kaufen</button>
    `;

    resultsDiv.appendChild(row);
  });
}



document.getElementById('searchBtn')?.addEventListener('click', callSearchApi);