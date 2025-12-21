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
    renderResults(data);
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

function renderResults(data, containerId = 'results') {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';

  data.forEach(f => {
    const row = document.createElement('div');
    row.className = 'result-row';

    const from = document.createElement('strong');
    from.textContent = f.departure?.airport || f.departure?.iata || '—';

    const to = document.createElement('strong');
    to.textContent = f.arrival?.airport || f.arrival?.iata || '—';

    const badge = document.createElement('span');
    badge.className = 'badge';
    let durationText = '';
    if (f.departure?.scheduled && f.arrival?.scheduled) {
      const d = new Date(f.departure.scheduled);
      const a = new Date(f.arrival.scheduled);
      const mins = Math.round((a - d) / 60000);
      if (!isNaN(mins)) durationText = `${mins} min`;
    }
    if (!durationText && f.flight?.number) durationText = f.flight.number;
    badge.textContent = durationText || '—';

    const btn = document.createElement('button');
    btn.textContent = 'Ticket kaufen';
    btn.addEventListener('click', () => {
      const q = `${from.textContent} ${to.textContent} ${f.flight?.iata || ''}`.trim();
      window.open('https://www.google.com/search?q=' + encodeURIComponent(q), '_blank');
    });

    row.append(from, to, badge, btn);
    container.appendChild(row);
  });
}


document.getElementById('searchBtn')?.addEventListener('click', callSearchApi);