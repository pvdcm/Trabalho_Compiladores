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

## Etapa 2 — validação com o Docker real — 20/10/2026

| Item | Versão |
| --- | --- |
| Sistema | Windows 11 Home Single Language 10.0.26200 (máquina do aluno) |
| Docker | `Docker version 26.0.0, build 2ae903e` |
| Docker Compose | `Docker Compose version v2.26.1-desktop.1` |
| Imagem de testes | `mcr.microsoft.com/playwright:v1.56.0-noble` (Node.js v22.20.0) |

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| 9 | Implantação completa a partir do zero | Implantação | `docker compose down --rmi local --remove-orphans` e `docker compose up --build -d` | 1ª tentativa: **falhou**. 2ª: imagens construídas e contêineres iniciados | Na 1ª tentativa o `frontend` não subiu: `Ports are not available: exposing port TCP 0.0.0.0:8080 ... bind: Only one usage of each socket address ... is normally permitted`. A porta 8080 estava ocupada por outro programa da máquina (processo `java`, alheio ao projeto). Não é defeito do VisuLex: foi criado um `.env` a partir do `.env.example` com `FRONTEND_PORT=8081`, e o README passou a explicar esse caso. |
| 10 | Saúde dos serviços | Implantação | `docker compose ps` | **`backend` e `frontend` healthy**, interface em `0.0.0.0:8081->80/tcp`; `GET http://localhost:8081/api/health` → `{"status":"ok"}` | — |
| 11 | Todas as suítes + implantação, dentro do Docker | Regressão completa + ponta a ponta + implantação | `docker compose --profile test run --rm testes` | **94 aprovados, 0 reprovados** (backend 35, frontend 27, interface 25, implantação 7); resumo com 4 × `PASSOU`; código de saída 0 | A 1ª execução levou mais de 10 minutos porque a imagem do Playwright (~2 GB) ainda não existia na máquina. A 2ª execução, com a imagem já baixada, levou 71 s e repetiu o resultado. |

## Pendências

- [x] **Executar com o Docker Compose real** e registrar aqui o resultado: feito em 20/10/2026 (itens 9 a 11), com a interface na porta 8081 porque a 8080 estava ocupada na máquina.
- [ ] Validação de instalação limpa (seção do README) em outra máquina ou pasta.
- [ ] Testes de acessibilidade automatizados (ainda não implementados).

## Modelo para novas entradas

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
