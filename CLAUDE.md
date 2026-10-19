# VisuLex — instruções para o Claude Code

Software educacional web que mostra as análises léxica e sintática de **MiniJS** (subconjunto de JavaScript, especificado em `docs/minijs.md`). Projeto da disciplina de Compiladores, desenvolvido em etapas. Responda e escreva textos, mensagens de commit e comentários em **português do Brasil**.

## Arquitetura

- `frontend/`: HTML, CSS e JavaScript puros (módulos ES) servidos pelo Nginx. **Sem frameworks e sem bundler.**
  - `public/js/exemplos.js` (programas de exemplo), `validacao.js` (validação antes do envio), `api.js` (comunicação com o backend), `interface.js` (comportamento da tela; recebe `doc` e as funções de API por parâmetro, para testes), `main.js` (ponto de entrada).
  - `nginx.conf` repassa `/api/` para `http://backend:3000`. O navegador só usa caminhos relativos (`/api/...`).
- `backend/`: Node.js 22 **sem dependências npm**, só módulos nativos (CommonJS).
  - `src/app.js` (rotas, leitura do corpo, tratamento de erros), `validacao.js`, `erros.js` (`ErroRequisicao`), `processamento.js` (onde os analisadores serão conectados), `server.js`.
- `docker-compose.yml`: serviços `backend` e `frontend` (porta 8080) e serviço `testes` no perfil `test`, com a imagem oficial do Playwright.

## Contrato da API (não quebrar sem atualizar testes e README)

- `POST /api/analisar` com `{ "codigo": string }`. Sucesso **200**: `{ recebido: true, mensagem, resumo: { caracteres, linhas } }`.
- Todo erro tem o formato `{ "erro": { "codigo": "CODIGO_EM_MAIUSCULAS", "mensagem": "texto para o usuário" } }`. A tabela completa está no README.
- Erros inesperados devolvem **500** genérico. Nunca exponha stack, caminhos ou variáveis de ambiente na resposta; os detalhes vão só para o log do servidor.
- Mensagens de validação do frontend e do backend são **idênticas**, e um teste verifica isso.
- `GET /api/health` e `GET /api/hello` existem e têm testes de regressão.

## Comandos

```bash
# Aplicação
docker compose up --build -d          # sobe em http://localhost:8080
docker compose ps                     # serviços devem estar "healthy"
docker compose down                   # encerra

# Testes
cd backend && npm test                                  # backend: unitários, endpoints, regressão
cd frontend && npm run test:unit                        # frontend: unitários
cd frontend && npm run test:ui                          # interface no Chromium (backend real)
node scripts/executar-testes.mjs                        # todas as suítes locais com resumo
docker compose --profile test run --rm testes           # tudo dentro do Docker, inclusive implantação
```

Preparação para os testes de interface fora do Docker (uma vez): `cd frontend && npm install && npx playwright-core install chromium`.

Ambiente do aluno: **Windows**. No PowerShell, variáveis de ambiente usam `$env:BASE_URL="http://localhost:8080"`.

## Regras de desenvolvimento (exigidas pelo professor)

1. **Toda funcionalidade nova vem com testes no mesmo trabalho**, nunca depois. Cubra o caminho feliz, as entradas inválidas e as falhas.
2. Antes de terminar, **rode todas as suítes** (regressão), não só a nova.
3. **Nunca afirme que um teste passou sem executá-lo.** Mostre o comando e a contagem de aprovados e reprovados.
4. **Nunca altere um teste só para ele passar.** Se um teste falhar, descubra se o erro está no código ou na expectativa e explique. Se o comportamento mudou de propósito, atualize o teste e registre a decisão.
5. Registre cada execução relevante em `docs/testes.md`: funcionalidade, tipo, comando, resultado e falhas com as correções.
6. O README deve refletir **só o que está implementado**. Não declare análise léxica, sintática ou semântica antes de ela existir.
7. Mudanças pequenas e verificáveis. Reaproveite a estrutura existente e não introduza frameworks ou dependências sem necessidade clara. Se precisar de uma, pergunte antes.
8. Ao mudar Dockerfile ou Compose, verifique com `docker compose up --build -d`, `docker compose ps` e a suíte de testes no Docker.

## Convenções de código

- Nomes de funções, variáveis e arquivos em português (`validarCodigo`, `enviarCodigo`, `processarCodigo`).
- Frontend: nada de `innerHTML` com dados do servidor ou do usuário; use `textContent`.
- Testes com `node:test` e `node:assert/strict`. Testes de interface usam `frontend/test/ui/ambiente.js`, que sobe o backend real, ou `BASE_URL` para rodar contra a aplicação implantada.
- Novos exemplos de programa vão em `exemplos.js`, com `construcoes` e `contemErros`, e entram na tabela de exemplos do README.

## Commits

Uma mensagem por funcionalidade, em português, com título curto no imperativo ou descritivo ("Backend: endpoint ..."), e um corpo com o que mudou e quais testes cobrem a mudança. Não faça commit nem push sem o aluno pedir.

## Próximas etapas previstas

1. Analisador léxico de MiniJS (AFD, tokens com linha e coluna, erros léxicos), exibido passo a passo.
2. Analisador sintático LL(1) descendente preditivo, com a árvore construída passo a passo.
3. Explicações teóricas na interface e avaliação com alunos (pré e pós-teste).
