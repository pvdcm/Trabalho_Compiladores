# Registro de testes

Histórico das execuções relevantes dos testes automatizados. Cada nova funcionalidade acrescenta uma entrada.

## Ambiente das execuções da etapa 2

| Item | Versão |
| --- | --- |
| Sistema | Linux (ambiente de desenvolvimento na nuvem) |
| Node.js | 22.22.0 |
| playwright-core | 1.56.0 |
| Navegador | Chromium (build 1194, headless) |
| Docker / Compose | 29.8.2 / 5.5.1 (só `docker compose config`; ver pendências) |

## Etapa 2 — 19/10/2026

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| 1 | Endpoint `POST /api/analisar`, validações e rotas da etapa 1 | Unitário, endpoint, regressão | `cd backend && npm test` | 34 aprovados, 1 reprovado | O teste "código válido retorna 200" esperava 27 caracteres para `let x = 10;\nlet y = x + 1;`. A contagem manual confirmou 26 (11 + 1 + 14): o erro estava no valor esperado do teste, não no código. O teste foi corrigido e documentado com a conta. |
| 2 | Idem | Unitário, endpoint, regressão | `cd backend && npm test` | **35 aprovados, 0 reprovados** | — |
| 3 | Exemplos, validação e cliente da API (frontend) | Unitário | `cd frontend && npm run test:unit` | **27 aprovados, 0 reprovados** | — |
| 4 | Tela principal, exemplos, envio e mensagens de erro | Interface + integração (Chromium com backend real) | `cd frontend && npm run test:ui` | **25 aprovados, 0 reprovados** | — |
| 5 | Sensibilidade dos testes | Verificação por defeito proposital | Ver observação abaixo | Os defeitos foram detectados | Botão não desabilitado durante o envio → 1 teste de interface falhou. Mensagem de validação alterada → 2 testes unitários falharam. Os defeitos foram revertidos. |
| 6 | Todas as suítes (modo local) | Regressão completa | `node scripts/executar-testes.mjs` | **87 aprovados, 0 reprovados** (35 + 27 + 25) | — |
| 7 | Todas as suítes + implantação | Ponta a ponta + implantação | `BASE_URL=http://127.0.0.1:8080 node scripts/executar-testes.mjs` | **94 aprovados, 0 reprovados** (35 + 27 + 25 + 7) | Executado contra uma réplica local (backend Node.js + servidor Node.js no papel do Nginx), não contra os contêineres. |
| 8 | Arquivos do Docker Compose | Validação de configuração | `docker compose config --quiet` e `docker compose --profile test config --quiet` | Válidos | — |

**Observação sobre o item 5:** para conferir que os testes realmente detectam regressões, dois defeitos foram introduzidos de propósito. O primeiro removeu a desabilitação do botão e a trava contra envio duplicado em `interface.js`. O segundo trocou o texto da mensagem de entrada vazia em `validacao.js`. Os testes que deveriam falhar falharam e o código foi restaurado.

## Pendências

- [ ] **Executar com o Docker Compose real** e registrar aqui o resultado:
  `docker compose up --build -d`, `docker compose ps` (serviços *healthy*) e `docker compose --profile test run --rm testes`.
  No ambiente de desenvolvimento, as imagens do Docker Hub (`nginx`, `node`) não puderam ser baixadas, e a imagem do Playwright (`mcr.microsoft.com`) não chegou a ser testada.
- [ ] Validação de instalação limpa (seção do README) em outra máquina ou pasta.
- [ ] Testes de acessibilidade automatizados (ainda não implementados).

## Modelo para novas entradas

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
