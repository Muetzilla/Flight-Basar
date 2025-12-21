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
  } catch (err) {
    alert('Fehler: ' + err.message);
  }
}

document.getElementById('searchBtn')?.addEventListener('click', callSearchApi);