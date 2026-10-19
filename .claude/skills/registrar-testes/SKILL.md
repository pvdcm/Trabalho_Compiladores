---
name: registrar-testes
description: Roda todas as suítes de testes do VisuLex e acrescenta o resultado real ao registro em docs/testes.md.
argument-hint: [funcionalidade ou observação]
disable-model-invocation: true
---

1. Rode `node scripts/executar-testes.mjs`. Se a aplicação estiver no ar pelo Docker, rode também a versão com `BASE_URL` apontando para `http://localhost:8080` (no PowerShell: `$env:BASE_URL="http://localhost:8080"`).
2. Anote, de cada suíte, a quantidade de testes aprovados e reprovados, exatamente como a ferramenta informou.
3. Acrescente uma linha na tabela da seção mais recente de `docs/testes.md`, com:
   - funcionalidade ou módulo: $ARGUMENTS;
   - tipo de teste;
   - comando;
   - resultado;
   - falhas e correções.
4. Se algo falhou, não corrija nada ainda: mostre a falha e explique a causa provável.
