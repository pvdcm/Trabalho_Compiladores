# Casos de teste planejados

Casos definidos em **17/11/2026**, antes da implementação do parser e de qualquer execução dos casos sintáticos (Tarefa 4, seção Materiais e Métodos). Se um caso ou um resultado esperado mudar, registre a mudança e a justificativa em [Alterações](#alterações).

**Situação:** `E3` = já implementado e coberto pela suíte da etapa 3; `P4` = planejado para a etapa 4 (parser e AST); `P5` = planejado para a etapa 5 (análise semântica).

A execução de cada caso é registrada em [testes.md](testes.md). Os critérios de avaliação estão em [plano-de-avaliacao.md](plano-de-avaliacao.md).

## Casos válidos

| ID | Entrada | Resultado esperado | Análise | Sit. |
| --- | --- | --- | --- | --- |
| CT-V01 | `let x;` | Declaração `let` sem filho | Sintática | P4 |
| CT-V02 | `const nome = 'Ana';` | Declaração `const` com literal de texto | Sintática | P4 |
| CT-V03 | `let x = 1;` `x = x + 1;` | Declaração e atribuição com operação binária | Sintática | P4 |
| CT-V04 | `let r = 10 + 5 * 2;` | `+` na raiz; `*` como filho direito | Precedência | P4 |
| CT-V05 | `let r = 20 - 5 - 3;` | `(20 - 5) - 3`: subtração interna à esquerda | Associatividade | P4 |
| CT-V06 | `let r = (10 + 5) * 2;` | `*` na raiz; nenhum nó para os parênteses | Precedência | P4 |
| CT-V07 | `let ok = a >= 7 && b < 3 \|\| !c;` | `\|\|` na raiz, `&&` à esquerda, `!` unário à direita | Precedência | P4 |
| CT-V08 | `let n = -5 * 2;` | Menos unário abaixo da multiplicação | Precedência | P4 |
| CT-V09 | `if (x > 0) { x = 0; }` | Condicional sem `else` | Sintática | P4 |
| CT-V10 | `if (a) { } else if (b) { } else { }` | Condicional aninhada no `else` | Sintática | P4 |
| CT-V11 | Exemplo "Repetição com while" | Repetição com bloco de duas atribuições | Sintática | P4 |
| CT-V12 | `{ { let y = 1; } }` | Blocos aninhados | Sintática | P4 |
| CT-V13 | Exemplo "Declaração e chamada de função" | Função com dois parâmetros; chamada como expressão | Sintática | P4 |
| CT-V14 | `mostrar(1, 2);` `f();` | Chamadas como comando, com e sem argumentos | Sintática | P4 |
| CT-V15 | `function f() { return; }` | Retorno sem expressão | Sintática | P4 |
| CT-V16 | Programa com declarações, condicional, repetição e função | Tokens corretos, AST de referência, nenhum erro | Léxica e sintática | P4 |

Todos os casos válidos também devem ser aceitos por `node --check` (verificador de sintaxe do Node.js), usado como referência independente.

## Erros léxicos

| ID | Entrada | Resultado esperado | Análise | Sit. |
| --- | --- | --- | --- | --- |
| CT-L01 | `let total = 10 @ 2;` | `CARACTERE_INVALIDO` na linha 1, coluna 16 | Léxica | E3 |
| CT-L02 | `let p = 12abc;` | `NUMERO_MALFORMADO` | Léxica | E3 |
| CT-L03 | `let s = 'Ana;` | `STRING_NAO_FECHADA` | Léxica | E3 |
| CT-L04 | `/* sem fim` | `COMENTARIO_NAO_FECHADO` | Léxica | E3 |
| CT-L05 | `let a = b & c;` | `OPERADOR_INCOMPLETO` | Léxica | E3 |
| CT-L06 | `let a = 1 @;` `let b = 2;` | Erro léxico apresentado; `sintatico.executado` falso, com aviso | Decisão de projeto | P4 |

## Erros sintáticos

| ID | Entrada | Resultado esperado | Análise | Sit. |
| --- | --- | --- | --- | --- |
| CT-S01 | `let x = 1` (fim do código) | Esperado `;`, encontrado fim do código | Sintática | P4 |
| CT-S02 | `let a = 1` ⏎ `let b = 2;` | Esperado `;`, encontrado `let` na linha 2, coluna 1 | Sintática | P4 |
| CT-S03 | `if (x > 1 { }` | Esperado `)` para fechar a condição do `if`, encontrado `{` | Sintática | P4 |
| CT-S04 | `while (x) { x = x - 1;` | Fim inesperado: bloco aberto na linha 1 sem `}` | Sintática | P4 |
| CT-S05 | `let y = 5 + ;` | Esperada expressão, encontrado `;` | Sintática | P4 |
| CT-S06 | `let y = 5 * / 2;` | Operadores consecutivos | Sintática | P4 |
| CT-S07 | `else { x = 1; }` | `else` sem `if` | Sintática | P4 |
| CT-S08 | `let while = 3;` | Esperado identificador, encontrado palavra reservada `while` | Sintática | P4 |
| CT-S09 | `const k;` | `const` sem inicialização | Sintática | P4 |
| CT-S10 | `let a = b = 1;` | Esperado `;`, encontrado `=` (atribuição não é expressão) | Sintática | P4 |
| CT-S11 | `if (x) x = 1;` | Esperado `{` (blocos obrigatórios em MiniJS) | Sintática | P4 |
| CT-S12 | `var x = 1;` | Erro com dica: `var` não faz parte de MiniJS | Sintática | P4 |
| CT-S13 | `let z = (1 + 2));` | Parêntese de fechamento sem abertura | Sintática | P4 |
| CT-S14 | `let a = ;` ⏎ `let b = 2 +;` | Dois erros, um por linha, sem erros em cascata | Recuperação | P4 |
| CT-S15 | Exemplo "Programa com erros intencionais" sem o `@` | Falta de `;` na última linha | Sintática | P4 |

## Erros semânticos (somente a partir da etapa 5)

| ID | Entrada | Resultado esperado | Análise | Sit. |
| --- | --- | --- | --- | --- |
| CT-M01 | `x = 1;` | Identificador `x` não declarado | Semântica | P5 |
| CT-M02 | `let a = 1;` `let a = 2;` | Redeclaração no mesmo escopo | Semântica | P5 |
| CT-M03 | `const k = 1;` `k = 2;` | Atribuição a constante | Semântica | P5 |
| CT-M04 | `{ let t = 1; }` `t = 2;` | Uso fora do escopo do bloco | Semântica | P5 |
| CT-M05 | `f();` | Função não declarada | Semântica | P5 |
| CT-M06 | `return 1;` | `return` fora de função | Semântica | P5 |

Incompatibilidade de tipos não está prevista: MiniJS, como JavaScript, não tem declaração de tipos.

## Casos de borda e validação de entrada

| ID | Entrada | Resultado esperado | Análise | Sit. |
| --- | --- | --- | --- | --- |
| CT-B01 | Campo vazio | Frontend barra sem requisição; backend responde 400 `CODIGO_VAZIO` | Validação | E3 |
| CT-B02 | Apenas espaços | 400 `CODIGO_SO_ESPACOS` | Validação | E3 |
| CT-B03 | `// só um comentário` | Nenhum token; AST com `PROGRAMA` sem filhos | Léxica e sintática | P4 |
| CT-B04 | `let x = 1;` | Programa de um único comando | Sintática | P4 |
| CT-B05 | 30 condicionais aninhadas | AST correta, sem lentidão perceptível | Robustez | P4 |
| CT-B06 | 150 pares de parênteses aninhados | Erro de limite de aninhamento, sem erro 500 | Robustez | P4 |
| CT-B07 | 10.001 caracteres | 400 `CODIGO_MUITO_GRANDE` | Validação | E3 |
| CT-B08 | Corpo acima de 64 KB | 413 `PAYLOAD_MUITO_GRANDE` | Validação | E3 |
| CT-B09 | Mais de 100 caracteres inválidos | `LIMITE_DE_ERROS`; parser não executado | Léxica e decisão | P4 |

## Fluxo completo e consistência

| ID | Entrada | Resultado esperado | Análise | Sit. |
| --- | --- | --- | --- | --- |
| CT-F01 | Cada exemplo da interface | Resultado esperado de cada exemplo (seis válidos sem erro; dois com erro léxico e parser não executado) | Fluxo completo | P4 |
| CT-F02 | Todos os exemplos válidos | Posições dos nós coincidem com as dos tokens | Consistência | P4 |
| CT-F03 | Entradas da suíte da etapa 3 | Mesmos tokens antes e depois da etapa 4 | Regressão | P4 |
| CT-F04 | Clone limpo do repositório | Serviços `healthy` e suíte completa aprovada | Reprodutibilidade | P4 |
| CT-F05 | Exemplo com AST em tela de 375 px | Árvore legível, sem rolagem horizontal da página | Interface | P4 |
| CT-F06 | Navegação da árvore só com teclado | Expandir, recolher e selecionar nós sem mouse | Acessibilidade | P4 |

## Modelo de registro (etapa 6)

| ID | Entrada utilizada | Resultado esperado | Resultado observado | Status | Defeito | Correção |
| --- | --- | --- | --- | --- | --- | --- |
| | | | | aprovado / reprovado / pendente | | |

## Alterações

| Data | Caso | Mudança | Justificativa |
| --- | --- | --- | --- |
| | | | |
