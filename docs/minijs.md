# MiniJS — subconjunto de JavaScript analisado pelo VisuLex

Este documento define o que o VisuLex reconhece. O scanner só reconhece o que está documentado aqui: qualquer outro caractere gera um erro léxico.

## 1. Escopo léxico (implementado na etapa 3)

O analisador léxico está em [`backend/src/analisadorLexico.js`](../backend/src/analisadorLexico.js).

### Categorias de token

| Categoria (`tipo`) | Regra de formação | Exemplos |
| --- | --- | --- |
| `PALAVRA_RESERVADA` | Uma das 7 palavras: `let` `const` `if` `else` `while` `function` `return`. Diferencia maiúsculas de minúsculas. | `let`, `while`, `return` |
| `IDENTIFICADOR` | Começa com letra ou `_`, seguida de letras, dígitos ou `_`. Letras acentuadas valem, como em JavaScript. Não pode ser palavra reservada nem `true`/`false`. | `x`, `total`, `_tmp`, `valor2`, `ação` |
| `LITERAL_INTEIRO` | Um ou mais dígitos `0-9`. | `0`, `42`, `007` |
| `LITERAL_REAL` | Dígitos, um ponto e dígitos (os dois lados são obrigatórios). Sem notação científica. | `3.14`, `0.5`, `10.0` |
| `LITERAL_STRING` | Texto entre aspas duplas ou simples, na mesma linha. `\` escapa o caractere seguinte (`\"`, `\'`, `\\`, `\n`). As aspas fazem parte do lexema. | `"texto"`, `'Ana'`, `"diz \"oi\""` |
| `LITERAL_BOOLEANO` | `true` ou `false` (também são reservados: não podem ser nomes de variável). | `true`, `false` |
| `OPERADOR_ARITMETICO` | `+` `-` `*` `/` `%` | `a + b`, `n % 2` |
| `OPERADOR_RELACIONAL` | `==` `!=` `===` `!==` `<` `<=` `>` `>=` | `x >= 10` |
| `OPERADOR_LOGICO` | `&&` `\|\|` `!` | `a && !b` |
| `OPERADOR_ATRIBUICAO` | `=` | `x = 1` |
| `DELIMITADOR` | `(` `)` `{` `}` `,` `;` | `f(a, b);` |

Colchetes `[ ]` não fazem parte de MiniJS, porque não há arrays.

Não há literal de caractere: em JavaScript, ao contrário de C, não existe o tipo `char`. `'a'` é um `LITERAL_STRING` de tamanho 1, e aspas simples e duplas são equivalentes.

### O que não gera token

| Elemento | Tratamento |
| --- | --- |
| Espaços em branco (espaço, tabulação, `\n`, `\r\n`, `\r` e outros espaços Unicode) | Ignorados: só separam lexemas. Não aparecem nem nos passos. |
| Comentário de linha `// ...` | Ignorado até o fim da linha. Aparece nos passos como `IGNORADO`. |
| Comentário de bloco `/* ... */` | Ignorado, mesmo ocupando várias linhas. Aparece nos passos como `IGNORADO`. |

### Regras de leitura

- **Maior lexema possível:** o scanner sempre forma o maior token possível. `>=` é um token, e não `>` seguido de `=`. `====` vira `===` e `=`. `whilex` é um identificador, e não `while` seguido de `x`.
- **Posição:** `linha` e `coluna` começam em 1. Uma tabulação conta como 1 coluna. Caracteres fora do ASCII (acentos, emoji) contam como 1 coluna cada. `\r\n` conta como uma única quebra de linha.
- **Recuperação de erro:** depois de um erro léxico, o scanner continua a leitura e acumula todos os erros. Depois de **100 erros** a análise é interrompida, como fazem os compiladores reais (por exemplo, a opção `-fmax-errors` do GCC).

### Erros léxicos

Toda mensagem começa com `Erro léxico na linha L, coluna C:` e explica o problema sem expor detalhes internos.

| `codigo` | Quando acontece | Exemplo | Onde o scanner retoma a leitura |
| --- | --- | --- | --- |
| `CARACTERE_INVALIDO` | Caractere que não inicia nenhum token. `[` `]` `.` `` ` `` `?` `:` recebem uma dica específica; caracteres invisíveis aparecem com o código Unicode. | `@`, `#`, `$`, `[` | No próximo caractere |
| `NUMERO_MALFORMADO` | Número colado a letras ou `_`, ponto sem dígitos depois ou mais de um ponto. | `12abc`, `3.`, `1.2.3`, `5_000` | Depois do trecho inválido |
| `STRING_NAO_FECHADA` | A linha (ou o código) termina antes da aspa de fechamento. | `"Ana;` | Na próxima linha |
| `COMENTARIO_NAO_FECHADO` | `/*` sem `*/` correspondente. O lexema é resumido a 30 caracteres. | `/* sem fim` | Fim do código |
| `OPERADOR_INCOMPLETO` | `&` ou `\|` sozinhos (em MiniJS só existem `&&` e `\|\|`). | `a & b` | No próximo caractere |
| `LIMITE_DE_ERROS` | Aviso final quando a análise para depois de 100 erros. | — | A análise termina |

Palavras de JavaScript que não fazem parte de MiniJS (`var`, `for`, `class`...) são reconhecidas como `IDENTIFICADOR`. O uso indevido delas será apontado pela análise sintática, na próxima etapa.

### Autômato do scanner

Cada lexema é reconhecido por um autômato finito determinístico. Depois de cada caractere lido, o scanner registra o estado em que está (campo `estados` dos passos). A interface mostra esse percurso no passo a passo.

| Lexema | Percurso de estados (um por caractere) | Aceita? |
| --- | --- | --- |
| identificador ou palavra | `IDENTIFICADOR` enquanto houver letra, dígito ou `_`. No fim, a tabela de palavras reservadas decide a categoria. | sim |
| `42` | `INTEIRO` `INTEIRO` | sim |
| `3.14` | `INTEIRO` `PONTO` `REAL` `REAL` | sim |
| `12abc` | `INTEIRO` `INTEIRO` `NUMERO_MALFORMADO` ... | não (erro) |
| `"a\"b"` | `STRING` `STRING` `ESCAPE` `STRING` `STRING` `FIM_STRING` | sim, em `FIM_STRING` |
| `>=` | `MAIOR` `MAIOR_IGUAL` | sim |
| `===` | `IGUAL` `IGUAL_IGUAL` `IGUAL_ESTRITO` | sim |
| `!==` | `NEGACAO` `DIFERENTE` `DIFERENTE_ESTRITO` | sim |
| `&&` | `E_INCOMPLETO` `E_LOGICO` | sim (só `&` não aceita) |
| `// x` | `BARRA` `COMENTARIO_LINHA` ... | descartado |
| `/* x */` | `BARRA` `COMENTARIO_BLOCO` ... `ASTERISCO` `FIM_COMENTARIO` | descartado |
| delimitadores | `ABRE_PARENTESE`, `FECHA_CHAVE`, `PONTO_E_VIRGULA`... | sim |

## 2. Construções sintáticas (próxima etapa)

Ainda não são verificadas: um programa com erro de sintaxe, mas com tokens válidos, é tokenizado normalmente.

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

## 3. Fora do escopo

- Ponto e vírgula opcional (inserção automática de `;`): em MiniJS ele é obrigatório.
- Expressões regulares literais (`/abc/`), que tornam ambígua a leitura do `/`.
- Template strings, objetos, arrays, classes, arrow functions, `for`, `switch`, `var`.
- Números em notação científica (`1e3`), hexadecimais (`0xFF`) e que começam com ponto (`.5`).
- Análise semântica (tipos, escopo, variável não declarada).
