 async function callSearchApi() {
              try {
                const res = await fetch('/flights/berlin/zürich', { method: 'GET' });
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                alert(JSON.stringify(data, null, 2));
              } catch (err) {
                alert('Fehler: ' + err.message);
              }
            }

            document.getElementById('searchBtn')?.addEventListener('click', callSearchApi);