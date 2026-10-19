---
name: nova-funcionalidade
description: Implementa uma funcionalidade do VisuLex seguindo o procedimento do professor (comportamento esperado, implementação, testes, regressão, registro). Use ao iniciar qualquer funcionalidade nova ou mudança relevante.
argument-hint: [descrição da funcionalidade]
disable-model-invocation: true
---

Funcionalidade solicitada: $ARGUMENTS

Siga este procedimento, na ordem, sem pular etapas:

1. **Comportamento esperado.** Leia o `CLAUDE.md`, o README e os arquivos envolvidos. Escreva em poucas linhas o que a funcionalidade deve fazer, quais entradas aceita, quais resultados produz e quais funcionalidades existentes podem ser afetadas. Se algo estiver ambíguo e mudar o resultado, pergunte antes de implementar.
2. **Implementação.** Respeite a arquitetura, os nomes e o contrato da API existentes. Prefira mudanças pequenas. Não adicione dependências sem perguntar.
3. **Testes.** Crie ou atualize os testes automatizados para os comportamentos novos, os casos inválidos e as situações de erro. Use o tipo adequado: unitário, endpoint, interface (`frontend/test/ui`) ou implantação.
4. **Execução.** Rode as suítes novas e também as existentes (`node scripts/executar-testes.mjs`). Se Dockerfile ou Compose mudaram, rode também `docker compose up --build -d` e `docker compose --profile test run --rm testes`.
5. **Falhas.** Para cada falha, investigue se o erro está no código ou na expectativa do teste. Nunca altere um teste só para ele passar.
6. **Correção e nova execução** dos testes afetados e da regressão.
7. **Registro.** Acrescente uma linha em `docs/testes.md` com a funcionalidade, o tipo, o comando, a quantidade de aprovados e reprovados, e as falhas com as correções. Atualize o README se o comportamento visível ou o contrato mudou.

Ao final, apresente: arquivos alterados, comandos executados, resultados reais (contagens) e o que ficou pendente. Proponha uma mensagem de commit em português, mas só faça o commit se eu pedir.
