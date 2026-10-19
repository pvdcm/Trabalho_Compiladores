// Comunicação com o backend. Toda resposta é convertida em um resultado padronizado,
// para que a interface só precise distinguir: sucesso, problema de entrada,
// falha de comunicação ou erro inesperado.
//
// Contrato (documentado no README):
//   POST /api/analisar   { "codigo": "<texto>" }
//   200 -> { "recebido": true, "mensagem": "...", "resumo": { "caracteres": n, "linhas": n } }
//   4xx -> { "erro": { "codigo": "CODIGO_VAZIO", "mensagem": "..." } }

export const MENSAGEM_COMUNICACAO = 'Não foi possível comunicar com o servidor. Verifique a conexão e tente novamente.';
export const MENSAGEM_INESPERADO = 'Ocorreu um erro inesperado. Tente novamente em instantes.';

// Status que indicam que o servidor da aplicação não foi alcançado (ex.: Nginx sem backend).
const STATUS_INDISPONIVEL = new Set([502, 503, 504]);

async function lerJson(resposta) {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}

export async function enviarCodigo(codigo, { fetch: fetchImpl = globalThis.fetch, baseUrl = '', timeoutMs = 10000 } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);

  let resposta;
  try {
    resposta = await fetchImpl(`${baseUrl}/api/analisar`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigo }),
      signal: controlador.signal,
    });
  } catch {
    // Rede indisponível, servidor fora do ar ou tempo esgotado.
    return { ok: false, tipo: 'comunicacao', mensagem: MENSAGEM_COMUNICACAO };
  } finally {
    clearTimeout(temporizador);
  }

  if (STATUS_INDISPONIVEL.has(resposta.status)) {
    return { ok: false, tipo: 'comunicacao', mensagem: MENSAGEM_COMUNICACAO };
  }

  const dados = await lerJson(resposta);

  if (resposta.ok) {
    if (dados && dados.recebido === true && typeof dados.mensagem === 'string') {
      return { ok: true, dados };
    }
    return { ok: false, tipo: 'inesperado', mensagem: MENSAGEM_INESPERADO };
  }

  if (resposta.status >= 400 && resposta.status < 500 && dados?.erro?.mensagem) {
    return { ok: false, tipo: 'entrada', codigo: dados.erro.codigo, mensagem: dados.erro.mensagem };
  }

  return { ok: false, tipo: 'inesperado', mensagem: MENSAGEM_INESPERADO };
}

export async function verificarServidor({ fetch: fetchImpl = globalThis.fetch, baseUrl = '', timeoutMs = 5000 } = {}) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  try {
    const resposta = await fetchImpl(`${baseUrl}/api/health`, { signal: controlador.signal });
    const dados = await lerJson(resposta);
    return resposta.ok && dados?.status === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(temporizador);
  }
}
