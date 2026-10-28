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
| 12 | Instalação limpa a partir do GitHub | Implantação (clone novo) | `git clone https://github.com/pvdcm/Trabalho_Compiladores.git` numa pasta vazia (commit `89d133a`, sem `.env`), `docker compose build --no-cache --pull`, `docker compose up -d` e `docker compose ps` | **`backend` e `frontend` healthy**; `GET /` → 200, `GET /api/health` → `{"status":"ok"}`, `POST /api/analisar` com `let x = 10;` → 200 com `caracteres: 11, linhas: 1` | Clone feito no Windows com `core.autocrlf=true` (arquivos com CRLF): não causou problema. A porta foi definida com `FRONTEND_PORT=8082` só na sessão, porque a 8080 está ocupada nesta máquina. |
| 13 | Todas as suítes, a partir do clone | Regressão completa + ponta a ponta + implantação | `docker compose --profile test run --rm testes` | **94 aprovados, 0 reprovados** (35 + 27 + 25 + 7); 4 × `PASSOU`; código de saída 0; 52 s, incluindo a instalação do `playwright-core` do zero | — |

## Etapa 3 — analisador léxico — 23/10/2026

Execuções feitas **fora do Docker**, porque o Docker Desktop não ficou em execução nesta máquina durante o desenvolvimento (o processo abria e encerrava sozinho). A execução dentro do Docker está nas pendências.

| Item | Versão |
| --- | --- |
| Sistema | Windows 11 Home Single Language 10.0.26200 |
| Node.js | 20.11.1 (o projeto pede 22; as suítes foram chamadas com a lista de arquivos expandida pelo shell, porque o Node 20 não expande o glob de `--test`) |
| playwright-core | 1.56.0 |
| Navegador | Microsoft Edge 155.0.4283.62 (`NAVEGADOR=msedge`), em vez do Chromium do Playwright |

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| 14 | Analisador léxico, endpoint com tokens e regressão das etapas 1 e 2 | Unitário (scanner), endpoint, regressão | `cd backend && node --test test/*.test.js` | 1ª: **94 aprovados, 1 reprovado** | O teste "erro léxico retorna 200 com sucesso false" esperava 11 tokens para `let total = 10 @ 2;\nlet dobro = total * 2`. A contagem manual deu 12 (6 na primeira linha sem o `@`, 6 na segunda): o erro estava no valor esperado do teste, não no scanner. O teste foi corrigido, com a conta registrada nele. |
| 15 | Idem, depois do limite de 100 erros | Unitário, endpoint, regressão | `cd backend && node --test test/*.test.js` | **95 aprovados, 0 reprovados** | Ao medir o pior caso (10.000 caracteres inválidos), a resposta tinha 5,5 MB. Foi criado o limite de 100 erros (`LIMITE_DE_ERROS`), como o `-fmax-errors` do GCC, com dois testes novos. |
| 16 | Exemplos, validação, cliente da API (novo contrato) e funções de exibição dos tokens | Unitário | `cd frontend && node --test test/unit/*.test.js` | **42 aprovados, 0 reprovados** | — |
| 17 | Tela da análise léxica: tabela, cores, erros, passo a passo, abas, celular; e as funcionalidades da etapa 2 | Interface + integração (Edge com backend real) | `cd frontend && NAVEGADOR=msedge node --test --test-concurrency=1 test/ui/*.test.js` | **45 aprovados, 0 reprovados** (25 da etapa 2, atualizados, e 20 novos) | Problemas encontrados ao conferir a tela no navegador, antes dos testes: (a) a fonte Cascadia Code desenhava `>=` como `≥` e `===` como `≡` (ligaduras), o que esconde os caracteres reais num visualizador léxico, e as ligaduras foram desligadas; (b) no celular, o seletor de exemplos com títulos longos alargava a página, corrigido com `min-width: 0`; (c) a classe `.marca` criada para as cores já existia no cabeçalho e encolhia o título, então foi renomeada para `.amostra`. O teste "no celular a página não rola na horizontal" cobre o item (b). |
| 18 | Sensibilidade dos testes | Verificação por defeito proposital | Ver observação abaixo | Os defeitos foram detectados | Scanner sem a regra do maior lexema → **7 testes do backend falharam**. Passo a passo sem apagar os tokens ainda não lidos → **1 teste de interface falhou**. Os arquivos foram restaurados e as suítes voltaram a passar. |
| 19 | Implantação (contra servidor local que imita o Nginx) | Implantação | `BASE_URL=http://localhost:8090 node --test testes/implantacao.test.mjs` | **9 aprovados, 0 reprovados** | Execução de conferência apenas: a implantação real é contra os contêineres (ver pendências). |

**Observação sobre o item 18:** no primeiro defeito, o laço que estende o operador (`while (i < n && SIMBOLOS[lexema + c[i]])`) foi trocado por `while (false)`, então `>=` virava `>` e `=`. No segundo, a linha que marca os trechos pendentes em `interface.js` foi removida.

**Mudança intencional de testes da etapa 2:** o contrato da resposta mudou (saiu `recebido`; entraram `sucesso`, `tokens`, `erros` e `passos`). Por isso foram atualizados os testes que verificavam o formato antigo: "código válido retorna 200..." e "código com caracteres especiais e Unicode..." (backend), "resposta 200 válida vira ok" (cliente da API), "exemplo editado é enviado..." (interface, que agora confere 4 totais) e o teste de implantação do POST. Dois testes deixaram de existir porque descreviam o comportamento da etapa 2: "código com erro intencional também é aceito nesta etapa" (o caso agora é coberto pelos testes de erro léxico, que conferem o status 200 e o `sucesso: false`) e "processarCodigo confirma o recebimento e não afirma ter feito análises" (substituído por "a mensagem não afirma que a análise sintática foi feita").

## Etapa 3 — validação com o Docker — 28/10/2026

| Item | Versão |
| --- | --- |
| Sistema | Windows 11 Home Single Language 10.0.26200 |
| Docker | `Docker version 26.0.0` (cliente e servidor 26.0.0) |
| Docker Compose | `Docker Compose version v2.26.1-desktop.1` |
| Imagem de testes | `mcr.microsoft.com/playwright:v1.56.0-noble` (Node.js 22, Chromium do Playwright) |

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| 20 | Implantação do zero com o scanner | Implantação | `docker compose down --rmi local --remove-orphans` e `docker compose up --build -d` | Imagens reconstruídas e contêineres iniciados | — |
| 21 | Saúde dos serviços | Implantação | `docker compose ps` | **`backend` e `frontend` healthy**, interface em `0.0.0.0:8081->80/tcp` (porta definida no `.env`) | — |
| 22 | Todas as suítes + implantação, dentro do Docker | Scanner, endpoints, unitários, interface, ponta a ponta, implantação e regressão das etapas 1 e 2 | `docker compose --profile test run --rm testes` | **191 aprovados, 0 reprovados** (backend 95, frontend 42, interface 45, implantação 9); 4 × `PASSOU`; código de saída 0; 101 s | — |
| 23 | Fluxo completo da seção 9 do enunciado, no navegador, na aplicação do Docker | Manual | Navegador em `http://localhost:8081` | **Passou** (detalhes abaixo) | — |
| 24 | Ambiente limpo simulado (seção 9.1): clone dos commits da etapa 3 numa pasta vazia, sem `.env` | Implantação + regressão completa | `git clone` do repositório local (commit `d4b524f`), `docker compose build --no-cache --pull`, `docker compose up -d`, `docker compose ps`, `docker compose --profile test run --rm testes` | **healthy**; **191 aprovados, 0 reprovados**; 4 × `PASSOU`; código de saída 0; 127 s | Porta definida com `FRONTEND_PORT=8082` só na sessão, porque a 8080 está ocupada nesta máquina. O Docker Desktop imprimiu avisos `http2: server: error reading preface from client` durante o build, sem efeito no resultado. |

**Roteiro manual (item 23):**

1. Digitei um programa no editor (`let soma = 0; while (soma <= 10) { soma = soma + 2.5; }`, em 4 linhas) e usei Ctrl + Enter. Resultado: 19 tokens e 0 erros. A contagem foi conferida à mão: 5 + 7 + 6 + 1 tokens por linha, e a contagem por categoria bateu.
2. Escolhi "Todas as categorias de tokens", acrescentei `let extra = "fim";` no fim e analisei. Resultado: 79 tokens (74 do exemplo mais 5) e a linha nova aparece no código destacado, ou seja, a edição chegou ao servidor.
3. Passo a passo: Início e depois 5 × Próximo levaram ao `3.14` (linha 2, coluna 12), com o percurso INTEIRO → PONTO → REAL e o estado de aceitação. As abas "Tabela de tokens" (com a linha do token atual marcada) e "Código × tokens" mostraram os dados corretos.
4. "Erros léxicos variados": 6 erros listados com linha e coluna. Clicar em "string não fechada" levou ao passo 10, com o trecho `"Ana;` sublinhado e o autômato parado em STRING.
5. Celular (375 × 812): "Programa com erros intencionais" mostrou 1 erro léxico (o `@`, linha 4, coluna 16), a página não rolou na horizontal (largura 375 = 375) e os botões do passo a passo avançaram um passo por toque.

Os prints da entrega foram gerados a partir desta aplicação, com o Edge pelo Playwright: `etapa3-passo-a-passo.png`, `etapa3-tabela-tokens.png`, `etapa3-erros-lexicos.png` e `etapa3-celular.png`, em `docs/img/` e na pasta `Prints/` da disciplina.

## Pendências

- [x] **Executar com o Docker Compose real** e registrar aqui o resultado: feito em 20/10/2026 (itens 9 a 11), com a interface na porta 8081 porque a 8080 estava ocupada na máquina.
- [x] Validação de instalação limpa (seção do README) em outra pasta: feito em 20/10/2026 a partir de um clone do GitHub (itens 12 e 13).
- [x] **Etapa 3 no Docker:** feito em 28/10/2026 (itens 20 a 23): 191 de 191 testes e roteiro manual aprovado.
- [x] **Etapa 3 em ambiente limpo:** feito em 28/10/2026 a partir de um clone dos commits (item 24).
- [ ] Depois do push, repetir o item 24 clonando do GitHub (confirma que o remoto tem tudo).
- [ ] Testes de acessibilidade automatizados (ainda não implementados).

## Modelo para novas entradas

| # | Funcionalidade / módulo | Tipo de teste | Comando | Resultado | Falhas e correções |
| --- | --- | --- | --- | --- | --- |
| | | | | | |
