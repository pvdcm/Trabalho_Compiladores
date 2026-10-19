// Ambiente para os testes de interface.
//
// Sem a variável BASE_URL: sobe o backend real (createApp) e um servidor estático que serve
// frontend/public e repassa /api/ ao backend, reproduzindo o papel do Nginx. Assim os testes
// exercitam a integração real entre frontend e backend.
//
// Com BASE_URL (ex.: http://frontend no Docker Compose): os mesmos testes rodam contra a
// aplicação implantada, funcionando como testes de ponta a ponta.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const require = createRequire(import.meta.url);
const raizPublica = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public');
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
};

function ouvir(servidor) {
  return new Promise((resolve) => servidor.listen(0, '127.0.0.1', () => resolve(servidor.address().port)));
}

function criarServidorEstatico(portaBackend) {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost');

    if (url.pathname.startsWith('/api/')) {
      const repasse = http.request(
        { host: '127.0.0.1', port: portaBackend, path: req.url, method: req.method, headers: req.headers },
        (r) => { res.writeHead(r.statusCode, r.headers); r.pipe(res); },
      );
      repasse.on('error', () => { res.writeHead(502); res.end('Bad Gateway'); });
      req.pipe(repasse);
      return;
    }

    const relativo = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1);
    const arquivo = path.resolve(raizPublica, relativo);
    if (!arquivo.startsWith(raizPublica + path.sep)) {
      res.writeHead(403); res.end(); return;
    }
    try {
      const conteudo = await readFile(arquivo);
      res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] ?? 'application/octet-stream' });
      res.end(conteudo);
    } catch {
      res.writeHead(404); res.end();
    }
  });
}

export async function iniciarAmbiente() {
  const fechar = [];
  let baseUrl = process.env.BASE_URL;

  if (!baseUrl) {
    const { createApp } = require('../../../backend/src/app.js');
    const backend = createApp({ logger: { error() {} } });
    const portaBackend = await ouvir(backend);
    const estatico = criarServidorEstatico(portaBackend);
    baseUrl = `http://127.0.0.1:${await ouvir(estatico)}`;
    fechar.push(() => new Promise((r) => estatico.close(r)), () => new Promise((r) => backend.close(r)));
  }

  const navegador = await chromium.launch();
  fechar.unshift(() => navegador.close());

  return {
    baseUrl,
    navegador,
    async novaPagina() {
      const contexto = await navegador.newContext({ viewport: { width: 1280, height: 860 } });
      const pagina = await contexto.newPage();
      await pagina.goto(baseUrl);
      await pagina.locator('#status-servidor[data-online="true"], #status-servidor[data-online="false"]').waitFor();
      return pagina;
    },
    async encerrar() {
      for (const f of fechar) await f();
    },
  };
}
