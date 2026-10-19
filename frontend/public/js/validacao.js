// Validação da entrada antes do envio. O backend repete estas verificações:
// esta camada só evita requisições desnecessárias e responde mais rápido ao usuário.
export const LIMITE_CARACTERES = 10000;

export const MENSAGENS_VALIDACAO = {
  CODIGO_VAZIO: 'Informe um código-fonte antes de solicitar a análise.',
  CODIGO_SO_ESPACOS: 'O código contém apenas espaços em branco. Escreva ou selecione um programa MiniJS.',
  CODIGO_MUITO_GRANDE: `O código excede o limite de ${LIMITE_CARACTERES.toLocaleString('pt-BR')} caracteres.`,
};

export function contarCaracteres(texto) {
  return [...texto].length;
}

export function contarLinhas(texto) {
  return texto.length === 0 ? 0 : texto.split(/\r\n|\r|\n/).length;
}

export function validarCodigo(texto) {
  const valor = typeof texto === 'string' ? texto : '';
  let codigo = null;
  if (valor.length === 0) codigo = 'CODIGO_VAZIO';
  else if (valor.trim().length === 0) codigo = 'CODIGO_SO_ESPACOS';
  else if (contarCaracteres(valor) > LIMITE_CARACTERES) codigo = 'CODIGO_MUITO_GRANDE';

  return codigo
    ? { valido: false, codigo, mensagem: MENSAGENS_VALIDACAO[codigo] }
    : { valido: true };
}
