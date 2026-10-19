// Programas de exemplo em MiniJS. Cada um demonstra construções do subconjunto que será
// analisado nas próximas etapas (ver docs/minijs.md).
export const EXEMPLOS = [
  {
    id: 'variaveis',
    titulo: 'Declaração de variáveis',
    descricao: 'let e const com números inteiros e decimais, strings e booleanos.',
    construcoes: ['let', 'const', 'números', 'strings', 'booleanos', 'atribuição'],
    contemErros: false,
    codigo: `// Declaração e inicialização de variáveis
let idade = 20;
const nome = "Ana";
let aprovado = true;
let media = 7.5;`,
  },
  {
    id: 'aritmetica',
    titulo: 'Expressões aritméticas',
    descricao: 'Operadores + - * / % com precedência e parênteses.',
    construcoes: ['operadores aritméticos', 'precedência', 'parênteses'],
    contemErros: false,
    codigo: `// Operadores aritméticos e precedência
let a = 10;
let b = 3;
let soma = a + b;
let resto = a % b;
let resultado = (a + b) * 2 - soma / b;`,
  },
  {
    id: 'condicional',
    titulo: 'Estrutura condicional',
    descricao: 'if/else com operadores relacionais (>=) e lógicos (&&).',
    construcoes: ['if', 'else', 'operadores relacionais', 'operadores lógicos', 'blocos'],
    contemErros: false,
    codigo: `// if/else com operadores relacionais e lógicos
let nota = 8;
let frequencia = 80;
let situacao = "";
if (nota >= 7 && frequencia >= 75) {
  situacao = "aprovado";
} else {
  situacao = "reprovado";
}`,
  },
  {
    id: 'repeticao',
    titulo: 'Repetição com while',
    descricao: 'Cálculo do fatorial com while e atribuições.',
    construcoes: ['while', 'operadores relacionais', 'atribuição', 'comentários'],
    contemErros: false,
    codigo: `// Calcula o fatorial de 5
let n = 5;
let fatorial = 1;
while (n > 1) {
  fatorial = fatorial * n;
  n = n - 1;
}`,
  },
  {
    id: 'funcao',
    titulo: 'Declaração e chamada de função',
    descricao: 'function com parâmetros, return e chamada.',
    construcoes: ['function', 'parâmetros', 'return', 'chamada de função', 'if'],
    contemErros: false,
    codigo: `// Função que devolve o maior de dois números
function maior(x, y) {
  if (x > y) {
    return x;
  }
  return y;
}
let m = maior(4, 9);`,
  },
  {
    id: 'com-erros',
    titulo: 'Programa com erros intencionais',
    descricao: 'Contém um símbolo inválido e um ponto e vírgula ausente, para as próximas etapas.',
    construcoes: ['erro léxico: símbolo @', 'erro sintático: falta ;'],
    contemErros: true,
    codigo: `// Este programa contém erros de propósito:
// "@" não é um símbolo de MiniJS (erro léxico)
// falta o ";" no fim da última linha (erro sintático)
let total = 10 @ 2;
let dobro = total * 2`,
  },
];

export function buscarExemplo(id) {
  return EXEMPLOS.find((exemplo) => exemplo.id === id) ?? null;
}
