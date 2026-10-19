---
name: validar-entrega
description: Faz a validação final de uma etapa do VisuLex em ambiente limpo com Docker, roda todos os testes, confere o README e registra os resultados.
disable-model-invocation: true
---

Valide a entrega da etapa atual do VisuLex:

1. Rode `git status` e informe se há alterações não commitadas.
2. Derrube e reconstrua do zero: `docker compose down --rmi local --remove-orphans` e depois `docker compose up --build -d`.
3. Confira `docker compose ps`: `backend` e `frontend` devem estar `healthy`. Se não estiverem, mostre `docker compose logs` e investigue.
4. Rode `docker compose --profile test run --rm testes` e mostre o resumo PASSOU/FALHOU com as contagens de cada suíte.
5. Compare o README com o que está implementado: comandos, contrato da API, exemplos, contagem de testes e limitações. Aponte qualquer divergência.
6. Registre a execução em `docs/testes.md`, com data, versões de Docker e Compose (`docker --version`, `docker compose version`), comandos e resultados. Se houver itens em "Pendências" resolvidos por esta validação, marque-os.
7. Liste o que ainda falta para a entrega, incluindo o print da interface em `http://localhost:8080` e o push para o GitHub.

Não declare a etapa validada se alguma verificação não foi executada ou falhou. Diga claramente o que passou e o que está pendente.
