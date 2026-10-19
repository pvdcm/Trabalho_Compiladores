// Busca a mensagem no backend. A rota /api é repassada pelo Nginx ao contêiner do backend,
// então o frontend nunca precisa saber o endereço interno do serviço.
const messageEl = document.getElementById('message');
const statusEl = document.getElementById('backend-status');

function setStatus(kind, text) {
  statusEl.innerHTML = `<span class="dot ${kind}"></span> ${text}`;
}

async function loadHello() {
  try {
    const res = await fetch('/api/hello');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    messageEl.textContent = data.message;
    setStatus('ok', 'respondendo');
  } catch (err) {
    messageEl.textContent = 'Não foi possível falar com o backend.';
    setStatus('error', `erro (${err.message})`);
  }
}

loadHello();
