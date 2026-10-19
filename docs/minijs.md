# MiniJS — subconjunto de JavaScript analisado pelo VisuLex

Este documento define o que o analisador vai reconhecer. Tudo o que não está listado aqui é tratado como erro léxico ou sintático na versão atual.

## Versão 1 (próximas etapas)

### Tokens

| Categoria | Exemplos |
| --- | --- |
| Palavras reservadas | `let` `const` `if` `else` `while` `function` `return` `true` `false` |
| Identificadores | `x`, `total`, `_tmp`, `valor2` — começam com letra ou `_`, seguidos de letras, dígitos ou `_` |
| Números | `42`, `3.14` — inteiros e decimais, sem notação científica |
| Strings | `"texto"`, `'texto'` — sem quebra de linha e sem template strings |
| Operadores aritméticos | `+` `-` `*` `/` `%` |
| Operadores relacionais | `==` `!=` `===` `!==` `<` `<=` `>` `>=` |
| Operadores lógicos | `&&` `\|\|` `!` |
| Atribuição | `=` |
| Delimitadores | `(` `)` `{` `}` `,` `;` |
| Comentários (ignorados) | `// linha` e `/* bloco */` |

### Construções sintáticas

- Declaração de variáveis: `let x = 10;` e `const nome = "Ana";`
- Atribuição: `x = x + 1;`
- Expressões aritméticas, relacionais e lógicas com parênteses e precedência usual
- Condicional: `if (cond) { ... } else { ... }`
- Repetição: `while (cond) { ... }`
- Funções simples: `function soma(a, b) { return a + b; }` e chamadas `soma(1, 2);`

### Exemplo válido

```js
// calcula o fatorial de 5
let n = 5;
let resultado = 1;
while (n > 1) {
  resultado = resultado * n;
  n = n - 1;
}
```

## Fora do escopo (por enquanto)

- Ponto e vírgula opcional (inserção automática de `;`): em MiniJS ele é obrigatório.
- Expressões regulares literais (`/abc/`), que tornam ambígua a leitura do `/`.
- Template strings, objetos, arrays, classes, arrow functions, `for`, `switch`, `var`.
- Análise semântica (tipos, escopo, variável não declarada).
