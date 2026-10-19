#!/usr/bin/env node
// Executa todas as suítes de testes em sequência e mostra um resumo.
//
//   node scripts/executar-testes.mjs
//       Testes locais: backend, unitários do frontend e interface (sobe servidores de teste).
//
//   BASE_URL=http://frontend node scripts/executar-testes.mjs
//       Também roda os testes de interface e de implantação contra a aplicação implantada.
//       É o modo usado por: docker compose --profile test run --rm testes
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = process.env.BASE_URL;
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function rodar(comando, args, cwd, env = {}) {
  console.log(`\n$ (${path.relative(raiz, cwd) || '.'}) ${comando} ${args.join(' ')}`);
  const r = spawnSync(comando, args, {
    cwd,
    stdio: 'inherit',
    env: { ...process.env, ...env },
    shell: process.platform === 'win32',
  });
  return r.status === 0;
}

const frontend = path.join(raiz, 'frontend');
if (!existsSync(path.join(frontend, 'node_modules', 'playwright-core'))) {
  rodar(npm, ['install', '--no-audit', '--no-fund', '--no-package-lock'], frontend);
}

const suites = [
  ['Backend: unitários, endpoints e regressão', 'node', ['--test', 'test/**/*.test.js'], path.join(raiz, 'backend')],
  ['Frontend: unitários', 'node', ['--test', 'test/unit/**/*.test.js'], frontend],
  [
    baseUrl ? `Interface e ponta a ponta (navegador → ${baseUrl})` : 'Interface e integração (navegador + backend local)',
    'node', ['--test', '--test-concurrency=1', 'test/ui/**/*.test.js'], frontend,
  ],
];
if (baseUrl) {
  suites.push([`Implantação (${baseUrl})`, 'node', ['--test', 'testes/implantacao.test.mjs'], raiz]);
}

const resultados = suites.map(([nome, cmd, args, cwd]) => [nome, rodar(cmd, args, cwd)]);

console.log('\n================ Resumo ================');
for (const [nome, ok] of resultados) console.log(`${ok ? 'PASSOU' : 'FALHOU'}  ${nome}`);
if (!baseUrl) console.log('(testes de implantação não executados: defina BASE_URL ou use o Docker Compose)');

process.exit(resultados.every(([, ok]) => ok) ? 0 : 1);
