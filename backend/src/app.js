// Aplicação HTTP do backend, sem dependências externas (apenas módulos nativos do Node.js).
const http = require('node:http');
const { ErroRequisicao, MENSAGEM_ERRO_INTERNO } = require('./erros');
const { interpretarJson, validarCodigo, validarContentType } = require('./validacao');
const { processarCodigo: processarCodigoPadrao } = require('./processamento');

const LIMITE_CORPO_BYTES = 64 * 1024;

function enviarJson(res, status, corpo, cabecalhos = {}) {
  const payload = JSON.stringify(corpo);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(payload),
    ...cabecalhos,
  });
  res.end(payload);
}

function lerCorpo(req, limiteBytes) {
  return new Promise((resolve, reject) => {
    const declarado = Number(req.headers['content-length']);
    let excedeu = Number.isFinite(declarado) && declarado > limiteBytes;
    const partes = [];
    let total = 0;

    req.on('data', (parte) => {
      if (excedeu) return; // continua drenando o fluxo, mas descarta os dados
      total += parte.length;
      if (total > limiteBytes) {
        excedeu = true;
        partes.length = 0;
        return;
      }
      partes.push(parte);
    });
    req.on('end', () => {
      if (excedeu) {
        reject(new ErroRequisicao(413, 'PAYLOAD_MUITO_GRANDE', 'A requisição é grande demais para ser processada.'));
        return;
      }
      resolve(Buffer.concat(partes).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function criarRotas({ processarCodigo }) {
  return {
    '/api/health': {
      GET: async () => ({ status: 200, corpo: { status: 'ok' } }),
    },
    '/api/hello': {
      GET: async () => ({ status: 200, corpo: { message: 'Hello, World!' } }),
    },
    '/api/analisar': {
      POST: async (req) => {
        validarContentType(req.headers['content-type']);
        const corpoTexto = await lerCorpo(req, LIMITE_CORPO_BYTES);
        const dados = interpretarJson(corpoTexto);
        const codigo = validarCodigo(dados.codigo);
        return { status: 200, corpo: await processarCodigo(codigo) };
      },
    },
  };
}

/**
 * Cria o servidor HTTP.
 * @param {object} [opcoes]
 * @param {(codigo: string) => object} [opcoes.processarCodigo] função que processa o código válido
 *        (injetável para testes e para os analisadores das próximas etapas).
 * @param {{ error: Function }} [opcoes.logger] destino dos logs de erros internos.
 */
function createApp({ processarCodigo = processarCodigoPadrao, logger = console } = {}) {
  const rotas = criarRotas({ processarCodigo });

  return http.createServer(async (req, res) => {
    const caminho = new URL(req.url, 'http://localhost').pathname;

    try {
      const rota = rotas[caminho];
      if (!rota) {
        throw new ErroRequisicao(404, 'ROTA_NAO_ENCONTRADA', 'Rota não encontrada.');
      }
      const handler = rota[req.method];
      if (!handler) {
        const permitidos = Object.keys(rota).join(', ');
        throw new ErroRequisicao(405, 'METODO_NAO_PERMITIDO', `Método não permitido. Use: ${permitidos}.`, {
          Allow: permitidos,
        });
      }
      const { status, corpo } = await handler(req);
      enviarJson(res, status, corpo);
    } catch (erro) {
      if (erro instanceof ErroRequisicao) {
        enviarJson(res, erro.status, { erro: { codigo: erro.codigo, mensagem: erro.message } }, erro.cabecalhos);
        return;
      }
      // Detalhes ficam só no log do servidor; o usuário recebe uma mensagem genérica.
      logger.error('[erro interno]', erro);
      if (!res.headersSent) {
        enviarJson(res, 500, { erro: { codigo: 'ERRO_INTERNO', mensagem: MENSAGEM_ERRO_INTERNO } });
      } else {
        res.end();
      }
    }
  });
}

module.exports = { createApp, LIMITE_CORPO_BYTES };
