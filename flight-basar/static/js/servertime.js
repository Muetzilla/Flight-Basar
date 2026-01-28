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

